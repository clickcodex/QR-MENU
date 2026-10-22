import prisma from './prisma';
import crypto from 'crypto';

export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'AWAITING_CHECKOUT';
export type ReservationStatus = 'TEMPORARY' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export const QR_RESERVATION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const ADVANCE_RESERVATION_DURATION_MS = 60 * 60 * 1000; // 60 minutes
export const ORDER_MODIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface ControllerSessionResult {
  table: {
    id: string;
    tableNumber: string;
    name: string | null;
    capacity: number;
    status: TableStatus;
  };
  isController: boolean;
  controllerToken: string;
  tableStatus: TableStatus;
  reservation: {
    id: string;
    status: ReservationStatus;
    customerName: string | null;
    expiresAt: string;
    remainingSeconds: number;
    reservationType: string;
  } | null;
  activeOrder: {
    id: string;
    orderNumber: number;
    status: string;
    confirmedAt: string | null;
    modificationDeadline: string | null;
    remainingModSeconds: number;
    isModifiable: boolean;
    isAccepted?: boolean;
    canRemoveDishes?: boolean;
    canAddDishes?: boolean;
    subtotal: number;
    tax: number;
    total: number;
    itemsCount: number;
  } | null;
  guestMessage?: string;
}

/**
 * Lazy cleanup: Idempotently expires stale temporary reservations on the server.
 * Ensures expired reservations cannot leave tables marked as reserved.
 */
export async function expireStaleReservations(restaurantId?: string) {
  const now = new Date();
  const where: any = {
    status: 'TEMPORARY',
    expiresAt: { lte: now },
  };
  if (restaurantId) {
    where.restaurantId = restaurantId;
  }

  const staleReservations = await prisma.reservation.findMany({
    where,
    select: { id: true, tableId: true },
  });

  if (staleReservations.length === 0) return 0;

  const reservationIds = staleReservations.map((r) => r.id);
  const tableIds = Array.from(new Set(staleReservations.map((r) => r.tableId)));

  await prisma.$transaction(async (tx) => {
    // 1. Mark reservations expired
    await tx.reservation.updateMany({
      where: { id: { in: reservationIds } },
      data: { status: 'EXPIRED' },
    });

    // 2. Inspect each table: if no active confirmed order, release table to AVAILABLE
    for (const tId of tableIds) {
      const activeOrder = await tx.order.findFirst({
        where: {
          tableId: tId,
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
      });

      if (!activeOrder) {
        await tx.table.update({
          where: { id: tId },
          data: {
            status: 'AVAILABLE',
            currentReservationId: null,
            currentControllerToken: null,
            controllerName: null,
          },
        });
      }
    }
  });

  return staleReservations.length;
}

/**
 * Generates a secure, unique customer controller token.
 */
export function generateControllerToken(): string {
  return `ct_${Date.now().toString(36)}_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Resolves or establishes an authoritative table session for a scanning customer.
 * - If table is AVAILABLE: First customer claims table atomically as controller (30m temporary reservation).
 * - If table is RESERVED: matching token is controller; other customers are view-only guests.
 * - If table is OCCUPIED (active order): matching token is controller; others view existing order as guests.
 * - Server-enforced timestamps and atomic transactions prevent duplicate controller assignments.
 */
export async function resolveTableSession(params: {
  restaurantId: string;
  tableNumber: string;
  clientToken?: string | null;
  customerName?: string | null;
}): Promise<ControllerSessionResult | null> {
  const { restaurantId, tableNumber, customerName } = params;
  let clientToken = params.clientToken?.trim() || null;

  // Run lazy expiration for this restaurant first
  await expireStaleReservations(restaurantId);

  const cleanTable = String(tableNumber || 'Takeaway').trim();
  const normalizedTable = cleanTable.replace(/^table\s*/i, '').trim();

  // Find table record
  let table = await prisma.table.findUnique({
    where: {
      restaurantId_tableNumber: {
        restaurantId,
        tableNumber: cleanTable,
      },
    },
  });

  if (!table && normalizedTable) {
    table = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId,
          tableNumber: normalizedTable,
        },
      },
    });
  }

  if (!table) return null;

  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Check for active orders for this table
  const activeOrder = await prisma.order.findFirst({
    where: {
      restaurantId,
      tableId: table.id,
      status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
      createdAt: { gte: fourHoursAgo },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: true,
    },
  });

  // Calculate order modification window if active order exists
  let orderInfo: ControllerSessionResult['activeOrder'] = null;
  if (activeOrder) {
    const confirmedTime = activeOrder.confirmedAt || activeOrder.createdAt;
    const deadline = activeOrder.modificationDeadline || new Date(confirmedTime.getTime() + ORDER_MODIFICATION_WINDOW_MS);
    const remainingModMs = Math.max(0, deadline.getTime() - now.getTime());
    const isLocked = activeOrder.status === 'SERVED' || activeOrder.status === 'COMPLETED' || activeOrder.status === 'CANCELLED';
    const isModifiable = remainingModMs > 0 && !isLocked;
    const isAccepted = activeOrder.status !== 'PENDING';

    orderInfo = {
      id: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      status: activeOrder.status,
      isAccepted,
      canRemoveDishes: !isAccepted && isModifiable,
      canAddDishes: isModifiable,
      confirmedAt: confirmedTime.toISOString(),
      modificationDeadline: deadline.toISOString(),
      remainingModSeconds: Math.floor(remainingModMs / 1000),
      isModifiable,
      subtotal: activeOrder.subtotal,
      tax: activeOrder.tax,
      total: activeOrder.total,
      itemsCount: activeOrder.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // CASE 1: Table has an active confirmed order (Table is OCCUPIED)
  if (activeOrder) {
    const isController = Boolean(
      clientToken &&
      ((activeOrder.controllerToken && clientToken === activeOrder.controllerToken) ||
        (table.currentControllerToken && clientToken === table.currentControllerToken))
    );

    return {
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        status: 'OCCUPIED',
      },
      isController,
      controllerToken: isController ? (clientToken as string) : (table.currentControllerToken || activeOrder.controllerToken || ''),
      tableStatus: 'OCCUPIED',
      reservation: null,
      activeOrder: orderInfo,
      guestMessage: isController
        ? undefined
        : 'This table currently has an active order placed by the primary guest. You are viewing in guest mode.',
    };
  }

  // Check for active temporary reservation
  const activeReservation = await prisma.reservation.findFirst({
    where: {
      tableId: table.id,
      status: 'TEMPORARY',
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  // CASE 2: Active temporary reservation exists
  if (activeReservation) {
    const remainingMs = Math.max(0, activeReservation.expiresAt.getTime() - now.getTime());
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const isController = Boolean(clientToken && clientToken === activeReservation.controllerToken);

    return {
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        status: 'RESERVED',
      },
      isController,
      controllerToken: isController ? (clientToken as string) : activeReservation.controllerToken,
      tableStatus: 'RESERVED',
      reservation: {
        id: activeReservation.id,
        status: activeReservation.status as ReservationStatus,
        customerName: activeReservation.customerName,
        expiresAt: activeReservation.expiresAt.toISOString(),
        remainingSeconds,
        reservationType: activeReservation.reservationType,
      },
      activeOrder: null,
      guestMessage: isController
        ? undefined
        : 'This table was claimed by another guest. You are viewing the menu in guest mode.',
    };
  }

  // CASE 3: Table is AVAILABLE -> Atomically claim table for this customer!
  const assignedToken = clientToken || generateControllerToken();
  const expiresAt = new Date(now.getTime() + QR_RESERVATION_DURATION_MS); // 30 minutes

  const claimedResult = await prisma.$transaction(async (tx) => {
    // Re-verify table status inside atomic transaction to prevent race conditions
    const currentTable = await tx.table.findUnique({
      where: { id: table!.id },
    });

    if (!currentTable) return null;

    // Check if another customer claimed it in a parallel transaction
    const raceReservation = await tx.reservation.findFirst({
      where: {
        tableId: currentTable.id,
        status: 'TEMPORARY',
        expiresAt: { gt: new Date() },
      },
    });

    if (raceReservation) {
      // Parallel claim happened; caller is a guest
      const remainingMs = Math.max(0, raceReservation.expiresAt.getTime() - Date.now());
      return {
        table: currentTable,
        reservation: raceReservation,
        isController: false,
        controllerToken: raceReservation.controllerToken,
        remainingSeconds: Math.floor(remainingMs / 1000),
      };
    }

    // Create 30-minute temporary reservation
    const newReservation = await tx.reservation.create({
      data: {
        restaurantId,
        tableId: currentTable.id,
        tableNumber: currentTable.tableNumber,
        controllerToken: assignedToken,
        customerName: customerName?.trim() || null,
        status: 'TEMPORARY',
        reservationType: 'QR_SCAN',
        expiresAt,
      },
    });

    const updatedTable = await tx.table.update({
      where: { id: currentTable.id },
      data: {
        status: 'RESERVED',
        currentReservationId: newReservation.id,
        currentControllerToken: assignedToken,
        controllerName: customerName?.trim() || null,
      },
    });

    return {
      table: updatedTable,
      reservation: newReservation,
      isController: true,
      controllerToken: assignedToken,
      remainingSeconds: Math.floor(QR_RESERVATION_DURATION_MS / 1000),
    };
  });

  if (!claimedResult) return null;

  return {
    table: {
      id: claimedResult.table.id,
      tableNumber: claimedResult.table.tableNumber,
      name: claimedResult.table.name,
      capacity: claimedResult.table.capacity,
      status: 'RESERVED',
    },
    isController: claimedResult.isController,
    controllerToken: claimedResult.controllerToken,
    tableStatus: 'RESERVED',
    reservation: {
      id: claimedResult.reservation.id,
      status: claimedResult.reservation.status as ReservationStatus,
      customerName: claimedResult.reservation.customerName,
      expiresAt: claimedResult.reservation.expiresAt.toISOString(),
      remainingSeconds: claimedResult.remainingSeconds,
      reservationType: claimedResult.reservation.reservationType,
    },
    activeOrder: null,
    guestMessage: claimedResult.isController
      ? undefined
      : 'This table was claimed by another guest. You are viewing the menu in guest mode.',
  };
}
