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

  // Calculate live summary stats
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const acceptedOrders = orders.filter(
    (o) => o.status === 'ACCEPTED' || o.status === 'PREPARING' || o.status === 'READY'
  );
  const deliveredOrders = orders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'SERVED' || o.status === 'COMPLETED'
  );
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    orders,
    metrics: {
      totalOrders: orders.length,
      pendingCount: pendingOrders.length,
      acceptedCount: acceptedOrders.length,
      deliveredCount: deliveredOrders.length,
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
const VALID_STATUSES = ['PENDING', 'ACCEPTED', 'DELIVERED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];

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
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If not super admin, must match assigned/owned restaurant
    if (session.user.role !== 'SUPERADMIN' && existing.restaurantId !== session.restaurant?.id) {
      return NextResponse.json({ error: 'Access denied to this order' }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        orderItems: true,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
