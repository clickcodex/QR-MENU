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

  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurant.id },
    orderBy: { tableNumber: 'asc' },
    include: {
      qrTokens: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Attach enriched URLs
  const enrichedTables = tables.map((t) => {
    const networkUrl = `${lanBaseUrl}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;
    const localUrl = `${localBaseUrl}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;
    const prodUrl = `${prodBaseUrl.replace(/\/$/, '')}/r/${encodeURIComponent(session.restaurant.slug)}/t/${encodeURIComponent(t.tableNumber)}`;
    return {
      ...t,
      networkUrl,
      localUrl,
      prodUrl,
      // Default QR to networkUrl so phone scans work out-of-the-box on local Wi-Fi
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
