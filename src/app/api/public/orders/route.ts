import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantSlug, tableNumber, customerName, notes, items } = body;

    if (!restaurantSlug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    // 1. Resolve restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase().trim() },
    });
    if (!restaurant || !restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurant not found or currently closed' }, { status: 404 });
    }

    // 2. Resolve table
    let tableId: string | null = null;
    const cleanTable = String(tableNumber || 'Takeaway').trim();
    const normalizedTable = cleanTable.replace(/^table\s*/i, '').trim();

    if (tableNumber) {
      let table = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId: restaurant.id,
            tableNumber: cleanTable,
          },
        },
      });

      if (!table && normalizedTable) {
        table = await prisma.table.findUnique({
          where: {
            restaurantId_tableNumber: {
              restaurantId: restaurant.id,
              tableNumber: normalizedTable,
            },
          },
        });
      }

      if (table) {
        tableId = table.id;
      }
    }

    // 3. Query all ordered items from database to compute tamper-proof prices
    const itemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
      },
    });

    const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

    // 4. Validate and calculate subtotal
    let subtotal = 0;
    const orderItemsData: Array<{
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
      isVeg: boolean;
      total: number;
    }> = [];

    for (const reqItem of items) {
      const dbItem = dbItemMap.get(reqItem.menuItemId);
      if (!dbItem) continue;
      const qty = Math.max(1, parseInt(reqItem.quantity) || 1);
      const lineTotal = dbItem.price * qty;
      subtotal += lineTotal;

      orderItemsData.push({
        menuItemId: dbItem.id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: qty,
        isVeg: dbItem.isVeg,
        total: lineTotal,
      });
    }

    if (orderItemsData.length === 0) {
      return NextResponse.json({ error: 'None of the ordered items could be found' }, { status: 400 });
    }

    // 5. Calculate GST (5% standard restaurant tax)
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // 6. Generate sequential order number
    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;

    // 7. Create Order & OrderItems
    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        restaurantId: restaurant.id,
        tableId,
        tableNumber: cleanTable,
        customerName: customerName?.trim() || null,
        notes: notes?.trim() || null,
        status: 'PENDING',
        subtotal,
        tax,
        total,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully and sent to kitchen',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        notes: order.notes,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        currencySymbol: restaurant.currencySymbol,
        orderItems: order.orderItems,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Error placing order:', error);
    return NextResponse.json(
      { error: 'Failed to place order. Please ask your table server.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const slug = searchParams.get('slug') || searchParams.get('restaurantSlug');
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber');

    if (!orderId && (!slug || !tableNumber)) {
      return NextResponse.json(
        { error: 'orderId or (slug and tableNumber) parameter is required' },
        { status: 400 }
      );
    }

    let order = null;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true,
          restaurant: {
            select: {
              name: true,
              currencySymbol: true,
            },
          },
        },
      });
    } else if (slug && tableNumber) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: slug.toLowerCase().trim() },
        select: { id: true, name: true, currencySymbol: true },
      });

      if (restaurant) {
        const cleanTable = String(tableNumber).trim();
        const normalized = cleanTable.replace(/^table\s*/i, '').trim();
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

        order = await prisma.order.findFirst({
          where: {
            restaurantId: restaurant.id,
            tableNumber: { in: [cleanTable, normalized, `Table ${normalized}`] },
            status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
            createdAt: { gte: fourHoursAgo },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            orderItems: true,
            restaurant: {
              select: {
                name: true,
                currencySymbol: true,
              },
            },
          },
        });
      }
    }

    if (!order) {
      return NextResponse.json({ order: null });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        notes: order.notes,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        currencySymbol: order.restaurant?.currencySymbol || '₹',
        orderItems: order.orderItems,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
  }
}

