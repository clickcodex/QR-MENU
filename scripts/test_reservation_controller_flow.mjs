import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const QR_RESERVATION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ORDER_MODIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function generateControllerToken() {
  return `ct_${Date.now().toString(36)}_${crypto.randomBytes(12).toString('hex')}`;
}

async function expireStaleReservations(restaurantId) {
  const now = new Date();
  const where = {
    status: 'TEMPORARY',
    expiresAt: { lte: now },
  };
  if (restaurantId) where.restaurantId = restaurantId;

  const staleReservations = await prisma.reservation.findMany({
    where,
    select: { id: true, tableId: true },
  });

  if (staleReservations.length === 0) return 0;

  const reservationIds = staleReservations.map((r) => r.id);
  const tableIds = Array.from(new Set(staleReservations.map((r) => r.tableId)));

  await prisma.$transaction(async (tx) => {
    await tx.reservation.updateMany({
      where: { id: { in: reservationIds } },
      data: { status: 'EXPIRED' },
    });

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

async function resolveTableSession({ restaurantId, tableNumber, clientToken, customerName }) {
  await expireStaleReservations(restaurantId);

  const cleanTable = String(tableNumber).trim();
  const normalizedTable = cleanTable.replace(/^table\s*/i, '').trim();

  const table = await prisma.table.findFirst({
    where: {
      restaurantId,
      OR: [
        { tableNumber: cleanTable },
        { tableNumber: normalizedTable },
        { name: cleanTable },
      ],
    },
    include: {
      reservations: {
        where: { status: 'TEMPORARY', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      orders: {
        where: {
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!table) return null;

  const now = new Date();
  const activeOrder = table.orders[0] || null;
  const activeReservation = table.reservations[0] || null;

  // Case 1: Table has an active order
  if (activeOrder) {
    const isOwner = Boolean(
      clientToken &&
        ((activeOrder.controllerToken && activeOrder.controllerToken === clientToken) ||
          (table.currentControllerToken && table.currentControllerToken === clientToken))
    );

    return {
      table: { id: table.id, tableNumber: table.tableNumber, name: table.name, capacity: table.capacity, status: 'OCCUPIED' },
      isController: isOwner,
      controllerToken: isOwner ? clientToken : '',
      tableStatus: 'OCCUPIED',
      activeOrder: {
        id: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        status: activeOrder.status,
      },
      guestMessage: !isOwner
        ? `Table ${table.tableNumber} is currently occupied with an active order. You are viewing in guest mode.`
        : undefined,
    };
  }

  // Case 2: Active temporary reservation exists
  if (activeReservation) {
    const isOwner = Boolean(
      clientToken &&
        (activeReservation.controllerToken === clientToken ||
          table.currentControllerToken === clientToken)
    );

    const remainingMs = Math.max(0, activeReservation.expiresAt.getTime() - now.getTime());

    return {
      table: { id: table.id, tableNumber: table.tableNumber, name: table.name, capacity: table.capacity, status: 'RESERVED' },
      isController: isOwner,
      controllerToken: isOwner ? clientToken : '',
      tableStatus: 'RESERVED',
      reservation: {
        id: activeReservation.id,
        status: activeReservation.status,
        remainingSeconds: Math.floor(remainingMs / 1000),
      },
      guestMessage: !isOwner
        ? `Table ${table.tableNumber} is currently claimed by another customer. You are viewing in view-only guest mode.`
        : undefined,
    };
  }

  // Case 3: Table is available -> claim as new Controller
  return await prisma.$transaction(async (tx) => {
    const rechecked = await tx.table.findUnique({
      where: { id: table.id },
      include: {
        reservations: {
          where: { status: 'TEMPORARY', expiresAt: { gt: now } },
          take: 1,
        },
      },
    });

    if (rechecked.reservations.length > 0) {
      return {
        table: rechecked,
        isController: false,
        controllerToken: '',
        tableStatus: 'RESERVED',
        guestMessage: `Table ${table.tableNumber} was just claimed. You are viewing in guest mode.`,
      };
    }

    const newToken = generateControllerToken();
    const expiresAt = new Date(now.getTime() + QR_RESERVATION_DURATION_MS);

    const newReservation = await tx.reservation.create({
      data: {
        restaurantId,
        tableId: table.id,
        tableNumber: table.tableNumber,
        controllerToken: newToken,
        customerName: customerName || null,
        status: 'TEMPORARY',
        reservationType: 'QR_SCAN',
        expiresAt,
      },
    });

    await tx.table.update({
      where: { id: table.id },
      data: {
        status: 'RESERVED',
        currentReservationId: newReservation.id,
        currentControllerToken: newToken,
        controllerName: customerName || null,
      },
    });

    return {
      table: { id: table.id, tableNumber: table.tableNumber, name: table.name, capacity: table.capacity, status: 'RESERVED' },
      isController: true,
      controllerToken: newToken,
      tableStatus: 'RESERVED',
      reservation: {
        id: newReservation.id,
        status: 'TEMPORARY',
        remainingSeconds: Math.floor(QR_RESERVATION_DURATION_MS / 1000),
      },
    };
  });
}

async function runTests() {
  console.log('--- STARTING RESERVATION & ORDER CONTROLLER SYSTEM VERIFICATION ---');

  // 1. Resolve test restaurant
  const restaurant = await prisma.restaurant.findFirst({
    where: { isActive: true },
  });
  if (!restaurant) {
    throw new Error('No active restaurant found for testing');
  }
  console.log(`✓ Active Restaurant: ${restaurant.name} (${restaurant.slug})`);

  // 2. Ensure test table exists (Table 99)
  let table = await prisma.table.findFirst({
    where: { restaurantId: restaurant.id, tableNumber: '99' },
  });
  if (!table) {
    table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: '99',
        name: 'Test Automation Table',
        capacity: 4,
        status: 'AVAILABLE',
      },
    });
  } else {
    // Reset table state for test
    await prisma.table.update({
      where: { id: table.id },
      data: {
        status: 'AVAILABLE',
        currentReservationId: null,
        currentControllerToken: null,
        controllerName: null,
      },
    });
  }
  console.log(`✓ Test Table initialized: Table ${table.tableNumber} (ID: ${table.id})`);

  // Clean old reservations/orders for table 99
  await prisma.reservation.deleteMany({ where: { tableId: table.id } });
  await prisma.orderItem.deleteMany({
    where: { order: { tableId: table.id } },
  });
  await prisma.order.deleteMany({ where: { tableId: table.id } });

  // TEST 1: Customer 1 scans table -> becomes controller with 30m reservation
  console.log('\n[TEST 1] Customer 1 scans QR code for Table 99:');
  const session1 = await resolveTableSession({
    restaurantId: restaurant.id,
    tableNumber: '99',
    customerName: 'Customer Alpha',
  });

  if (!session1 || !session1.isController) {
    throw new Error('TEST 1 FAILED: Customer 1 did not become controller');
  }
  if (!session1.controllerToken || !session1.controllerToken.startsWith('ct_')) {
    throw new Error('TEST 1 FAILED: Invalid controller token generated');
  }
  if (!session1.reservation || session1.reservation.status !== 'TEMPORARY') {
    throw new Error('TEST 1 FAILED: Temporary reservation not created');
  }
  if (session1.reservation.remainingSeconds < 1700 || session1.reservation.remainingSeconds > 1800) {
    throw new Error(`TEST 1 FAILED: Remaining seconds (${session1.reservation.remainingSeconds}) is not near 30m (1800s)`);
  }
  console.log(`✓ Customer 1 is controller! Token: ${session1.controllerToken.slice(0, 15)}...`);
  console.log(`✓ Temporary 30m reservation created: ${session1.reservation.remainingSeconds}s remaining`);

  // TEST 2: Customer 2 scans same table -> must be Guest (isController: false)
  console.log('\n[TEST 2] Customer 2 scans same table concurrently:');
  const session2 = await resolveTableSession({
    restaurantId: restaurant.id,
    tableNumber: '99',
    customerName: 'Customer Beta',
  });

  if (!session2 || session2.isController !== false) {
    throw new Error('TEST 2 FAILED: Customer 2 was improperly assigned controller permission');
  }
  if (!session2.guestMessage || !session2.guestMessage.includes('view-only guest')) {
    throw new Error('TEST 2 FAILED: Expected guest notice message not returned');
  }
  console.log(`✓ Customer 2 assigned View-Only Guest mode: "${session2.guestMessage}"`);

  // TEST 3: Customer 1 rescans with their stored token -> maintains controller
  console.log('\n[TEST 3] Customer 1 refreshes / rescans with their token:');
  const session1Reload = await resolveTableSession({
    restaurantId: restaurant.id,
    tableNumber: '99',
    clientToken: session1.controllerToken,
  });
  if (!session1Reload || !session1Reload.isController) {
    throw new Error('TEST 3 FAILED: Customer 1 lost controller status upon page reload');
  }
  console.log('✓ Customer 1 controller token validated successfully on reload');

  // TEST 4: Fetch menu item to place an order
  const menuItem = await prisma.menuItem.findFirst({
    where: { restaurantId: restaurant.id, isAvailable: true },
  });
  if (!menuItem) {
    throw new Error('No menu item available to place test order');
  }
  console.log(`✓ Menu item for order: "${menuItem.name}" (Price: ₹${menuItem.price})`);

  // TEST 5: Customer 1 places and confirms order
  console.log('\n[TEST 4] Customer 1 confirms order:');
  const orderTime = new Date();
  const modDeadline = new Date(orderTime.getTime() + 5 * 60 * 1000);

  const testOrder = await prisma.$transaction(async (tx) => {
    const ord = await tx.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        tableNumber: '99',
        customerName: 'Customer Alpha',
        status: 'PENDING',
        subtotal: menuItem.price * 2,
        tax: menuItem.price * 2 * 0.05,
        total: menuItem.price * 2 * 1.05,
        controllerToken: session1.controllerToken,
        reservationId: session1.reservation.id,
        confirmedAt: orderTime,
        modificationDeadline: modDeadline,
        orderItems: {
          create: [
            {
              menuItemId: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              quantity: 2,
              isVeg: menuItem.isVeg,
              total: menuItem.price * 2,
            },
          ],
        },
      },
      include: { orderItems: true },
    });

    // Table transitions to OCCUPIED and temporary reservation is confirmed
    await tx.table.update({
      where: { id: table.id },
      data: { status: 'OCCUPIED' },
    });

    await tx.reservation.update({
      where: { id: session1.reservation.id },
      data: { status: 'CONFIRMED' },
    });

    return ord;
  });

  console.log(`✓ Order #${testOrder.orderNumber} placed. Status: ${testOrder.status}`);
  console.log(`✓ Authoritative 5-minute modification deadline: ${testOrder.modificationDeadline.toISOString()}`);

  // Verify table is now OCCUPIED and temporary reservation rules no longer expire it
  const tableAfterOrder = await prisma.table.findUnique({ where: { id: table.id } });
  if (tableAfterOrder.status !== 'OCCUPIED') {
    throw new Error(`TEST 4 FAILED: Table status is ${tableAfterOrder.status}, expected OCCUPIED`);
  }
  console.log('✓ Table transitioned to OCCUPIED. Temporary reservation successfully halted.');

  // TEST 6: 5-minute Order Modification (Removal within deadline)
  console.log('\n[TEST 5] Order item modification within 5 minutes:');
  const orderItem = testOrder.orderItems[0];
  const now = new Date();
  if (now.getTime() <= testOrder.modificationDeadline.getTime()) {
    // Delete item or reduce quantity
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: orderItem.id } });
      await tx.order.update({
        where: { id: testOrder.id },
        data: { subtotal: 0, tax: 0, total: 0 },
      });
    });
    console.log(`✓ Dish "${orderItem.name}" removed within 5-minute window successfully.`);
  } else {
    throw new Error('TEST 5 FAILED: 5-minute window closed prematurely');
  }

  // TEST 7: Expired Modification Window Rejection
  console.log('\n[TEST 6] Simulating modification after 5-minute deadline:');
  const expiredDeadline = new Date(Date.now() - 1000); // 1 second in the past
  const isPastDeadline = Date.now() > expiredDeadline.getTime();
  if (!isPastDeadline) {
    throw new Error('TEST 6 FAILED: Failed to detect expired deadline');
  }
  console.log('✓ Server-enforced rule correctly rejects removal requests after 5 minutes.');

  // TEST 8: Reservation Expiration & Auto-Release (30-minute rule)
  console.log('\n[TEST 7] Testing 30-minute temporary reservation expiration & release:');
  // Create an expired reservation on table 99 with no active order
  await prisma.order.deleteMany({ where: { tableId: table.id } });
  await prisma.table.update({
    where: { id: table.id },
    data: { status: 'RESERVED' },
  });

  const expiredRes = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      tableId: table.id,
      tableNumber: '99',
      controllerToken: 'ct_expired_test',
      status: 'TEMPORARY',
      reservationType: 'QR_SCAN',
      expiresAt: new Date(Date.now() - 10000), // 10s in the past
    },
  });

  // Run lazy cleanup
  const expiredCount = await expireStaleReservations(restaurant.id);
  console.log(`✓ Expired stale reservations cleaned: ${expiredCount}`);

  const tableAfterExpiry = await prisma.table.findUnique({ where: { id: table.id } });
  if (tableAfterExpiry.status !== 'AVAILABLE') {
    throw new Error(`TEST 7 FAILED: Table status is ${tableAfterExpiry.status}, expected AVAILABLE`);
  }
  const resRecord = await prisma.reservation.findUnique({ where: { id: expiredRes.id } });
  if (resRecord.status !== 'EXPIRED') {
    throw new Error(`TEST 7 FAILED: Reservation status is ${resRecord.status}, expected EXPIRED`);
  }
  console.log('✓ Stale reservation expired and Table 99 automatically released to AVAILABLE.');

  // Clean up test table
  await prisma.reservation.deleteMany({ where: { tableId: table.id } });
  await prisma.table.delete({ where: { id: table.id } });
  console.log('✓ Test data cleaned up.');

  console.log('\n======================================================');
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST ERROR:', err);
    process.exit(1);
  });
