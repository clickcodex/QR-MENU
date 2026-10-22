import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ORDER_MODIFICATION_WINDOW_MS,
  resolveTableSession,
  expireStaleReservations,
} from '@/lib/reservation';
import {
  formatCancellationNote,
  formatModificationNote,
  formatAdditionNote,
} from '@/lib/orderNotes';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tableNumber, customerName, notes, items } = body;
    const restaurantSlug = body.restaurantSlug || body.slug;
    const clientToken =
      req.headers.get('x-controller-token') || body.controllerToken || null;

    if (!restaurantSlug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    // 1. Resolve restaurant
    const cleanSlug = restaurantSlug.toLowerCase().trim();
    let restaurant = await prisma.restaurant.findUnique({
      where: { slug: cleanSlug },
    });
    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [{ slug: 'the-momos-wala' }, { slug: 'urban-spice' }, { isActive: true }],
        },
      });
    }
    if (!restaurant || !restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurant not found or currently closed' }, { status: 404 });
    }

    // 2. Resolve table & verify Controller permissions
    let tableId: string | null = null;
    const cleanTable = String(tableNumber || 'Takeaway').trim();
    const normalizedTable = cleanTable.replace(/^table\s*/i, '').trim();

    let tableSession = null;
    if (tableNumber) {
      tableSession = await resolveTableSession({
        restaurantId: restaurant.id,
        tableNumber: cleanTable,
        clientToken,
        customerName: customerName?.trim() || undefined,
      });

      if (tableSession) {
        tableId = tableSession.table.id;

        // Security check: If another customer owns the controller session, reject
        if (!tableSession.isController) {
          return NextResponse.json(
            {
              error:
                'Only the primary guest (table controller) can submit orders for this table. You are viewing in guest mode.',
              code: 'CONTROLLER_REQUIRED',
            },
            { status: 403 }
          );
        }
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

    // 6. Generate sequential order number & Authoritative 5-minute modification deadline
    const now = new Date();
    const confirmedAt = now;
    const modificationDeadline = new Date(now.getTime() + ORDER_MODIFICATION_WINDOW_MS); // exactly 5 mins
    const controllerToken = tableSession?.controllerToken || clientToken || null;

    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        where: { restaurantId: restaurant.id },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
      const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          restaurantId: restaurant.id,
          tableId,
          tableNumber: cleanTable,
          customerName: customerName?.trim() || null,
          notes: notes?.trim() || null,
          status: 'PENDING',
          controllerToken,
          reservationId: tableSession?.reservation?.id || null,
          confirmedAt,
          modificationDeadline,
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

      // Update reservation to CONFIRMED and table to OCCUPIED
      if (tableSession?.reservation?.id) {
        await tx.reservation.update({
          where: { id: tableSession.reservation.id },
          data: { status: 'CONFIRMED' },
        });
      }

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: {
            status: 'OCCUPIED',
            currentControllerToken: controllerToken,
            controllerName: customerName?.trim() || null,
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully.',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        notes: order.notes,
        status: order.status,
        isAccepted: false,
        canRemoveDishes: true,
        canAddDishes: true,
        confirmedAt: order.confirmedAt?.toISOString() || confirmedAt.toISOString(),
        modificationDeadline: order.modificationDeadline?.toISOString() || modificationDeadline.toISOString(),
        remainingModSeconds: Math.floor(ORDER_MODIFICATION_WINDOW_MS / 1000),
        isModifiable: true,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        currencySymbol: restaurant.currencySymbol,
        orderItems: order.orderItems,
        createdAt: order.createdAt,
      },
      controllerToken,
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
    const clientToken = req.headers.get('x-controller-token') || searchParams.get('token');

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

      // If order is cancelled, treat as no active order
      if (order && order.status === 'CANCELLED') {
        return NextResponse.json({ order: null });
      }
    } else if (slug && tableNumber) {
      const cleanSlug = slug.toLowerCase().trim();
      let restaurant = await prisma.restaurant.findUnique({
        where: { slug: cleanSlug },
        select: { id: true, name: true, currencySymbol: true },
      });
      if (!restaurant) {
        restaurant = await prisma.restaurant.findFirst({
          where: {
            OR: [{ slug: 'the-momos-wala' }, { slug: 'urban-spice' }, { isActive: true }],
          },
          select: { id: true, name: true, currencySymbol: true },
        });
      }

      if (restaurant) {
        const cleanTable = String(tableNumber).trim();
        const normalized = cleanTable.replace(/^table\s*/i, '').trim();
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

        order = await prisma.order.findFirst({
          where: {
            restaurantId: restaurant.id,
            tableNumber: { in: [cleanTable, normalized, `Table ${normalized}`] },
            status: { in: ['PENDING', 'ACCEPTED', 'DELIVERED', 'PREPARING', 'READY', 'SERVED'] },
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

    const now = new Date();
    const confirmedTime = order.confirmedAt || order.createdAt;
    const deadline = order.modificationDeadline || new Date(confirmedTime.getTime() + ORDER_MODIFICATION_WINDOW_MS);
    const remainingModMs = Math.max(0, deadline.getTime() - now.getTime());
    const isLocked = ['SERVED', 'COMPLETED', 'CANCELLED'].includes(order.status);
    const isModifiable = remainingModMs > 0 && !isLocked;
    const isAccepted = order.status !== 'PENDING';
    const canRemoveDishes = !isAccepted && isModifiable;
    const canAddDishes = isModifiable;
    const isController = Boolean(clientToken && order.controllerToken && clientToken === order.controllerToken);

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        notes: order.notes,
        status: order.status,
        isAccepted,
        canRemoveDishes,
        canAddDishes,
        confirmedAt: confirmedTime.toISOString(),
        modificationDeadline: deadline.toISOString(),
        remainingModSeconds: Math.floor(remainingModMs / 1000),
        isModifiable,
        isController,
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

/**
 * 5-Minute Order Modification Endpoint (PATCH / DELETE)
 * Authoritative server-side enforcement:
 * 1. Checks controllerToken matches order.controllerToken.
 * 2. Checks server time Date.now() <= order.modificationDeadline.
 * 3. Checks order is not locked (SERVED / COMPLETED).
 * 4. Adds items, updates quantities, removes items, or cancels entire order and recalculates subtotal, tax, and total.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderItemId,
      menuItemId,
      items,
      action = 'REMOVE_ITEM',
      quantityDelta = -1,
      newQuantity,
      quantity = 1,
    } = body;
    const clientToken =
      req.headers.get('x-controller-token') || body.controllerToken || null;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    const isCancellingAll = action === 'CANCEL_ORDER' || action === 'REMOVE_ALL';
    const isAddingItem = action === 'ADD_ITEM';
    const isAddingBatch = action === 'ADD_BATCH_ITEMS' || action === 'ADD_ITEMS';

    if (isAddingItem && !menuItemId) {
      return NextResponse.json(
        { error: 'menuItemId is required when adding a dish to the order' },
        { status: 400 }
      );
    }

    if (isAddingBatch && (!items || !Array.isArray(items) || items.length === 0)) {
      return NextResponse.json(
        { error: 'items array is required when adding multiple dishes' },
        { status: 400 }
      );
    }

    if (!isCancellingAll && !isAddingItem && !isAddingBatch && !orderItemId && !menuItemId) {
      return NextResponse.json(
        { error: 'orderItemId or menuItemId is required when updating or removing an individual item' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        restaurant: { select: { currencySymbol: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 1. Verify caller is the authorized controller
    if (!clientToken || !order.controllerToken || clientToken !== order.controllerToken) {
      return NextResponse.json(
        {
          error: 'Only the table order controller is authorized to modify this order.',
          code: 'UNAUTHORIZED_CONTROLLER',
        },
        { status: 403 }
      );
    }

    // 2. Authoritative 5-minute modification window validation on server
    const now = new Date();
    const confirmedTime = order.confirmedAt || order.createdAt;
    const deadline = order.modificationDeadline || new Date(confirmedTime.getTime() + ORDER_MODIFICATION_WINDOW_MS);

    if (now.getTime() > deadline.getTime()) {
      return NextResponse.json(
        {
          error:
            'The 5-minute modification window for this order has expired. Items cannot be added or removed.',
          code: 'MODIFICATION_EXPIRED',
          remainingModSeconds: 0,
        },
        { status: 403 }
      );
    }

    // 3. Status lock check
    if (['SERVED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      return NextResponse.json(
        {
          error: `Order has already been ${order.status.toLowerCase()} and cannot be modified.`,
          code: 'ORDER_LOCKED',
        },
        { status: 400 }
      );
    }

    // 4. Admin acceptance check: Dishes can only be removed/cancelled before order is accepted
    const isOrderAccepted = order.status !== 'PENDING';

    if (isCancellingAll && isOrderAccepted) {
      return NextResponse.json(
        {
          error: 'Order cannot be cancelled because it has already been accepted by the restaurant staff.',
          code: 'ORDER_ALREADY_ACCEPTED',
        },
        { status: 400 }
      );
    }

    if (action === 'REMOVE_ITEM' && isOrderAccepted) {
      return NextResponse.json(
        {
          error: 'Dishes can only be removed before the order is accepted by the restaurant staff.',
          code: 'ORDER_ALREADY_ACCEPTED',
        },
        { status: 400 }
      );
    }

    // Perform modification atomically
    const result = await prisma.$transaction(async (tx) => {
      // CASE A: User requested to cancel/remove all dishes from the order
      if (isCancellingAll) {
        const dishesSummary = order.orderItems
          .map((oi) => `${oi.name} (${oi.quantity}×)`)
          .join(', ');

        await tx.orderItem.deleteMany({
          where: { orderId: order.id },
        });

        const updatedNotes = formatCancellationNote(order.notes, dishesSummary);

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: 0,
            tax: 0,
            total: 0,
            status: 'CANCELLED',
            notes: updatedNotes,
          },
          include: {
            orderItems: true,
          },
        });

        // Release table status back to RESERVED for this controller so they can immediately place a new order
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: {
              status: 'RESERVED',
              currentControllerToken: order.controllerToken,
            },
          });

          // Create or update temporary reservation so customer maintains controller session
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
          await tx.reservation.create({
            data: {
              restaurantId: order.restaurantId,
              tableId: order.tableId,
              tableNumber: order.tableNumber,
              controllerToken: order.controllerToken || clientToken || '',
              status: 'TEMPORARY',
              reservationType: 'QR_SCAN',
              expiresAt,
            },
          });
        }

        return { updatedOrder, orderCancelled: true, message: 'All dishes removed. Order cancelled successfully.' };
      }

      // CASE B: Add new item or batch of items to the order
      if (isAddingItem || isAddingBatch) {
        const itemsToAdd: Array<{ menuItemId: string; quantity: number }> = isAddingItem
          ? [{ menuItemId: menuItemId!, quantity: Math.max(1, parseInt(String(quantity)) || 1) }]
          : items!.map((it: any) => ({
              menuItemId: it.menuItemId,
              quantity: Math.max(1, parseInt(String(it.quantity)) || 1),
            }));

        const uniqueMenuIds = itemsToAdd
          .map((it) => it.menuItemId)
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        const dbMenuItems = await tx.menuItem.findMany({
          where: {
            id: { in: uniqueMenuIds },
            restaurantId: order.restaurantId,
          },
        });
        const menuItemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

        const addedLogs: string[] = [];

        for (const reqItem of itemsToAdd) {
          const dbItem = menuItemMap.get(reqItem.menuItemId);
          if (!dbItem) continue;

          // Check if item already exists in current order
          const existingOrderItem = order.orderItems.find(
            (oi) => oi.menuItemId === dbItem.id || oi.name.toLowerCase() === dbItem.name.toLowerCase()
          );

          if (existingOrderItem) {
            const newQty = existingOrderItem.quantity + reqItem.quantity;
            const newTotal = Math.round(newQty * dbItem.price * 100) / 100;
            await tx.orderItem.update({
              where: { id: existingOrderItem.id },
              data: {
                quantity: newQty,
                total: newTotal,
                price: dbItem.price,
              },
            });
            addedLogs.push(`${dbItem.name} (+${reqItem.quantity} to ${newQty})`);
          } else {
            const lineTotal = Math.round(reqItem.quantity * dbItem.price * 100) / 100;
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                menuItemId: dbItem.id,
                name: dbItem.name,
                price: dbItem.price,
                quantity: reqItem.quantity,
                isVeg: dbItem.isVeg,
                total: lineTotal,
              },
            });
            addedLogs.push(`${dbItem.name} (${reqItem.quantity}×)`);
          }
        }

        if (addedLogs.length === 0) {
          throw new Error('None of the requested menu items were found');
        }

        // Fetch updated list of order items
        const allItems = await tx.orderItem.findMany({
          where: { orderId: order.id },
        });

        const subtotal = allItems.reduce((acc, it) => acc + it.total, 0);
        const tax = Math.round(subtotal * 0.05 * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;
        const dishesSummary = allItems
          .map((i) => `${i.name} (${i.quantity}×)`)
          .join(', ');

        const updatedNotes = formatAdditionNote(
          order.notes,
          addedLogs.join(', '),
          dishesSummary
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal,
            tax,
            total,
            notes: updatedNotes,
          },
          include: {
            orderItems: true,
          },
        });

        return {
          updatedOrder,
          orderCancelled: false,
          message: `Added ${addedLogs.join(', ')} to Order #${order.orderNumber}.`,
        };
      }

      // CASE C: Modify / remove an existing item
      const targetItem = order.orderItems.find(
        (oi) => (orderItemId ? oi.id === orderItemId : oi.menuItemId === menuItemId)
      );
      if (!targetItem) {
        throw new Error('Order item not found in this order');
      }

      let newQty: number;
      if (action === 'REMOVE_ITEM') {
        newQty = 0;
      } else if (newQuantity !== undefined) {
        newQty = Math.max(0, parseInt(String(newQuantity)) || 0);
      } else {
        newQty = targetItem.quantity + quantityDelta;
      }

      const shouldDelete = newQty <= 0;

      if (isOrderAccepted && (shouldDelete || newQty < targetItem.quantity)) {
        throw new Error('Dishes can only be removed or reduced before the order is accepted by the restaurant staff.');
      }

      if (shouldDelete) {
        await tx.orderItem.delete({
          where: { id: targetItem.id },
        });
      } else {
        const newTotal = Math.round(newQty * targetItem.price * 100) / 100;
        await tx.orderItem.update({
          where: { id: targetItem.id },
          data: {
            quantity: newQty,
            total: newTotal,
          },
        });
      }

      // Fetch remaining items to recalculate bill
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      const orderCancelled = remainingItems.length === 0;
      const subtotal = remainingItems.reduce((acc, it) => acc + it.total, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const newStatus = orderCancelled ? 'CANCELLED' : order.status;

      let updatedNotes = order.notes || '';
      if (orderCancelled) {
        updatedNotes = formatCancellationNote(
          order.notes,
          `${targetItem.name} (${targetItem.quantity}×)`
        );
      } else {
        const updatedDishesSummary = remainingItems
          .map((i) => `${i.name} (${i.quantity}×)`)
          .join(', ');

        if (newQty > targetItem.quantity) {
          const addedDesc = `${targetItem.name} (Qty increased by ${newQty - targetItem.quantity} to ${newQty})`;
          updatedNotes = formatAdditionNote(
            order.notes,
            addedDesc,
            updatedDishesSummary
          );
        } else {
          const removedDesc = shouldDelete
            ? `${targetItem.name} (${targetItem.quantity}×)`
            : `${targetItem.name} (Qty reduced by ${targetItem.quantity - newQty} to ${newQty})`;
          updatedNotes = formatModificationNote(
            order.notes,
            removedDesc,
            updatedDishesSummary
          );
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal,
          tax,
          total,
          status: newStatus,
          notes: updatedNotes,
        },
        include: {
          orderItems: true,
        },
      });

      // If all items are gone, release table back to RESERVED for this controller
      if (orderCancelled && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: {
            status: 'RESERVED',
            currentControllerToken: order.controllerToken,
          },
        });

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await tx.reservation.create({
          data: {
            restaurantId: order.restaurantId,
            tableId: order.tableId,
            tableNumber: order.tableNumber,
            controllerToken: order.controllerToken || clientToken || '',
            status: 'TEMPORARY',
            reservationType: 'QR_SCAN',
            expiresAt,
          },
        });
      }

      return {
        updatedOrder,
        orderCancelled,
        message: shouldDelete
          ? `${targetItem.name} removed from order.`
          : `Updated ${targetItem.name} quantity to ${newQty}.`,
      };
    });

    const { updatedOrder, orderCancelled, message } = result;

    if (orderCancelled) {
      return NextResponse.json({
        success: true,
        orderCancelled: true,
        message: 'All dishes removed. Order cancelled successfully. You can now select new dishes.',
        order: null,
      });
    }

    const remainingModMs = Math.max(0, deadline.getTime() - Date.now());

    return NextResponse.json({
      success: true,
      orderCancelled: false,
      message: message || 'Order updated successfully within the 5-minute window.',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        tableNumber: updatedOrder.tableNumber,
        customerName: updatedOrder.customerName,
        notes: updatedOrder.notes,
        status: updatedOrder.status,
        isAccepted: updatedOrder.status !== 'PENDING',
        canRemoveDishes: updatedOrder.status === 'PENDING' && remainingModMs > 0 && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(updatedOrder.status),
        canAddDishes: remainingModMs > 0 && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(updatedOrder.status),
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        total: updatedOrder.total,
        confirmedAt: (order.confirmedAt || order.createdAt).toISOString(),
        modificationDeadline: deadline.toISOString(),
        remainingModSeconds: Math.floor(remainingModMs / 1000),
        isModifiable: remainingModMs > 0 && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(updatedOrder.status),
        orderItems: updatedOrder.orderItems,
        currencySymbol: order.restaurant?.currencySymbol || '₹',
      },
    });
  } catch (error: any) {
    console.error('Error modifying order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to modify order.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  return PATCH(req);
}
