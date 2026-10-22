import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { buildTableMenuUrl, buildLocalTableMenuUrl } from '@/lib/qr';
import { getLocalNetworkIp } from '@/lib/network';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Detect current running host and port
  const hostHeader = req.headers.get('host') || 'localhost:3000';
  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '3000';
  const lanIp = getLocalNetworkIp();
  const lanBaseUrl = `http://${lanIp}:${port}`;
  const localBaseUrl = `http://localhost:${port}`;
  const prodBaseUrl = process.env.NEXT_PUBLIC_PROD_URL || 'https://menu.clickcodex.in';

  // Run lazy cleanup for expired reservations
  const { expireStaleReservations, ORDER_MODIFICATION_WINDOW_MS } = await import('@/lib/reservation');
  await expireStaleReservations(session.restaurant.id);

  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurant.id },
    orderBy: { tableNumber: 'asc' },
    include: {
      qrTokens: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      reservations: {
        where: { status: 'TEMPORARY', expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      orders: {
        where: {
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
          createdAt: { gte: fourHoursAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          orderItems: true,
        },
      },
    },
  });

  // Attach enriched URLs and live statuses
  const enrichedTables = tables.map((t) => {
    const networkUrl = `${lanBaseUrl}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;
    const localUrl = `${localBaseUrl}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;
    const prodUrl = `${prodBaseUrl.replace(/\/$/, '')}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;

    const activeRes = t.reservations[0] || null;
    const activeOrd = t.orders[0] || null;

    let computedStatus = t.status || 'AVAILABLE';
    if (activeOrd) {
      computedStatus = activeOrd.status === 'SERVED' ? 'AWAITING_CHECKOUT' : 'OCCUPIED';
    } else if (activeRes) {
      computedStatus = 'RESERVED';
    } else {
      computedStatus = 'AVAILABLE';
    }

    let activeOrderData = null;
    if (activeOrd) {
      const confirmedTime = activeOrd.confirmedAt || activeOrd.createdAt;
      const deadline = activeOrd.modificationDeadline || new Date(confirmedTime.getTime() + ORDER_MODIFICATION_WINDOW_MS);
      const remainingModMs = Math.max(0, deadline.getTime() - now.getTime());
      const isLocked = ['SERVED', 'COMPLETED', 'CANCELLED'].includes(activeOrd.status);

      activeOrderData = {
        id: activeOrd.id,
        orderNumber: activeOrd.orderNumber,
        status: activeOrd.status,
        customerName: activeOrd.customerName,
        total: activeOrd.total,
        itemsCount: activeOrd.orderItems.reduce((acc, item) => acc + item.quantity, 0),
        confirmedAt: confirmedTime.toISOString(),
        modificationDeadline: deadline.toISOString(),
        remainingModSeconds: Math.floor(remainingModMs / 1000),
        isModifiable: remainingModMs > 0 && !isLocked,
      };
    }

    let activeReservationData = null;
    if (activeRes) {
      const remainingMs = Math.max(0, activeRes.expiresAt.getTime() - now.getTime());
      activeReservationData = {
        id: activeRes.id,
        customerName: activeRes.customerName,
        status: activeRes.status,
        reservationType: activeRes.reservationType,
        expiresAt: activeRes.expiresAt.toISOString(),
        remainingSeconds: Math.floor(remainingMs / 1000),
        createdAt: activeRes.createdAt.toISOString(),
      };
    }

    return {
      id: t.id,
      tableNumber: t.tableNumber,
      name: t.name,
      capacity: t.capacity,
      isActive: t.isActive,
      status: computedStatus,
      currentControllerToken: t.currentControllerToken,
      controllerName: t.controllerName,
      activeReservation: activeReservationData,
      activeOrder: activeOrderData,
      networkUrl,
      localUrl,
      prodUrl,
      qrUrl: networkUrl,
    };
  });

  return NextResponse.json({
    tables: enrichedTables,
    networkInfo: {
      lanIp,
      port,
      lanBaseUrl,
      localBaseUrl,
      prodBaseUrl,
    },
    restaurant: {
      name: session.restaurant.name,
      slug: session.restaurant.slug,
      logoUrl: session.restaurant.logoUrl,
    },
  });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tableNumber, name, capacity } = await req.json();
    if (!tableNumber || !String(tableNumber).trim()) {
      return NextResponse.json({ error: 'Table number or identifier is required' }, { status: 400 });
    }

    const cleanNumber = String(tableNumber).trim();

    // Check if table already exists for this restaurant
    const existing = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: session.restaurant.id,
          tableNumber: cleanNumber,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Table "${cleanNumber}" already exists in this restaurant` }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: {
        tableNumber: cleanNumber,
        name: name?.trim() || `Table ${cleanNumber}`,
        capacity: Number(capacity) || 4,
        restaurantId: session.restaurant.id,
      },
    });

    const prodUrl = buildTableMenuUrl(session.restaurant.slug, cleanNumber);
    const qrToken = await prisma.qRToken.create({
      data: {
        token: `qr-${session.restaurant.slug}-t${cleanNumber}-${Date.now().toString(36)}`,
        tableId: table.id,
        targetUrl: prodUrl,
      },
    });

    return NextResponse.json({
      success: true,
      table: {
        ...table,
        qrTokens: [qrToken],
        prodUrl,
        localUrl: buildLocalTableMenuUrl(session.restaurant.slug, cleanNumber),
        qrUrl: prodUrl,
      },
    });
  } catch (error) {
    console.error('Create table error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.table.findFirst({
      where: { id, restaurantId: session.restaurant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Table not found or access denied' }, { status: 404 });
    }

    await prisma.table.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete table error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
