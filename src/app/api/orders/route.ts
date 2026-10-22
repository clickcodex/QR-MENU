import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const tableFilter = searchParams.get('table');
  const targetRestaurantId = searchParams.get('restaurantId') || session.restaurant?.id;

  if (!targetRestaurantId && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No active restaurant assigned' }, { status: 400 });
  }

  const whereClause: any = {};
  if (targetRestaurantId) {
    whereClause.restaurantId = targetRestaurantId;
  }
  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }
  if (tableFilter) {
    whereClause.tableNumber = tableFilter;
  }

  // Auto-delete delivered/cancelled orders older than retention period if requested
  const autoDeleteDays = searchParams.get('autoDeleteDays');
  if (autoDeleteDays && ['7', '15', '30'].includes(autoDeleteDays)) {
    const days = parseInt(autoDeleteDays, 10);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    try {
      const oldOrders = await prisma.order.findMany({
        where: {
          ...(targetRestaurantId ? { restaurantId: targetRestaurantId } : {}),
          createdAt: { lte: cutoffDate },
          status: { in: ['DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED'] },
        },
        select: { id: true },
      });
      if (oldOrders.length > 0) {
        const ids = oldOrders.map((o) => o.id);
        await prisma.$transaction(async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId: { in: ids } } });
          await tx.order.deleteMany({ where: { id: { in: ids } } });
        });
      }
    } catch (e) {
      console.error('Error during auto-delete in GET /api/orders:', e);
    }
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      orderItems: true,
      table: {
        select: {
          id: true,
          tableNumber: true,
          name: true,
          capacity: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const now = new Date();
  const { ORDER_MODIFICATION_WINDOW_MS } = await import('@/lib/reservation');

  const enrichedOrders = orders.map((o) => {
    const confirmedTime = o.confirmedAt || o.createdAt;
    const deadline = o.modificationDeadline || new Date(confirmedTime.getTime() + ORDER_MODIFICATION_WINDOW_MS);
    const remainingModMs = Math.max(0, deadline.getTime() - now.getTime());
    const isLocked = ['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.status);

    return {
      ...o,
      confirmedAt: confirmedTime.toISOString(),
      modificationDeadline: deadline.toISOString(),
      remainingModSeconds: Math.floor(remainingModMs / 1000),
      isModifiable: remainingModMs > 0 && !isLocked,
    };
  });

  // Calculate live summary stats
  const pendingOrders = enrichedOrders.filter((o) => o.status === 'PENDING');
  const acceptedOrders = enrichedOrders.filter(
    (o) => o.status === 'ACCEPTED' || o.status === 'PREPARING' || o.status === 'READY'
  );
  const deliveredOrders = enrichedOrders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'SERVED' || o.status === 'COMPLETED'
  );
  const cancelledOrders = enrichedOrders.filter((o) => o.status === 'CANCELLED');
  const totalRevenue = enrichedOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    orders: enrichedOrders,
    metrics: {
      totalOrders: enrichedOrders.length,
      pendingCount: pendingOrders.length,
      acceptedCount: acceptedOrders.length,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      currencySymbol: session.restaurant?.currencySymbol || '₹',
    },
    userRole: session.user.role,
    restaurant: session.restaurant ? {
      id: session.restaurant.id,
      name: session.restaurant.name,
      slug: session.restaurant.slug,
      address: session.restaurant.address,
      phone: session.restaurant.phone,
    } : null,
  });
}

// Supported order lifecycle statuses
const VALID_STATUSES = ['PENDING', 'ACCEPTED', 'DELIVERED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify order exists and user has permission to this restaurant
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If not super admin, must match assigned/owned restaurant
    if (session.user.role !== 'SUPERADMIN' && existing.restaurantId !== session.restaurant?.id) {
      return NextResponse.json({ error: 'Access denied to this order' }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          orderItems: true,
        },
      });

      // Synchronize table status with order status
      if (existing.tableId) {
        if (status === 'COMPLETED') {
          // Table becomes available when order is fully completed / paid
          await tx.table.update({
            where: { id: existing.tableId },
            data: {
              status: 'AVAILABLE',
              currentReservationId: null,
              currentControllerToken: null,
              controllerName: null,
            },
          });
        } else if (status === 'SERVED' || status === 'DELIVERED') {
          await tx.table.update({
            where: { id: existing.tableId },
            data: { status: 'AWAITING_CHECKOUT' },
          });
        }
      }

      return ord;
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const autoDeleteDays = searchParams.get('autoDeleteDays');
  const targetRestaurantId = searchParams.get('restaurantId') || session.restaurant?.id;

  if (!targetRestaurantId && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No active restaurant assigned' }, { status: 400 });
  }

  try {
    // CASE A: Auto-delete delivered/cancelled orders older than X days
    if (autoDeleteDays) {
      const days = parseInt(autoDeleteDays, 10);
      if (isNaN(days) || days <= 0) {
        return NextResponse.json({ error: 'Invalid autoDeleteDays value' }, { status: 400 });
      }

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const whereClause: any = {
        createdAt: { lte: cutoffDate },
        status: { in: ['DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED'] },
      };
      if (targetRestaurantId) {
        whereClause.restaurantId = targetRestaurantId;
      }

      const ordersToDelete = await prisma.order.findMany({
        where: whereClause,
        select: { id: true },
      });

      if (ordersToDelete.length === 0) {
        return NextResponse.json({
          success: true,
          deletedCount: 0,
          message: `No delivered orders found older than ${days} days.`,
        });
      }

      const ids = ordersToDelete.map((o) => o.id);

      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: ids } },
        });
        await tx.order.deleteMany({
          where: { id: { in: ids } },
        });
      });

      return NextResponse.json({
        success: true,
        deletedCount: ids.length,
        message: `Successfully auto-deleted ${ids.length} delivered order(s) older than ${days} days.`,
      });
    }

    // CASE B: Single order delete (for delivered or cancelled orders)
    if (!orderId) {
      return NextResponse.json({ error: 'orderId or autoDeleteDays is required' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (session.user.role !== 'SUPERADMIN' && existing.restaurantId !== session.restaurant?.id) {
      return NextResponse.json({ error: 'Access denied to this order' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId },
      });
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order #${existing.orderNumber} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
