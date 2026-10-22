import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting Dish Removal & Live Tracking Clear Test ---');
  
  const restaurant = await prisma.restaurant.findFirst({
    where: { isActive: true },
    include: {
      menuItems: { where: { isAvailable: true }, take: 4 },
      tables: { take: 2 },
    },
  });

  if (!restaurant || restaurant.menuItems.length < 2) {
    console.error('Restaurant or items not found');
    process.exit(1);
  }

  const table = restaurant.tables[0];
  const item1 = restaurant.menuItems[0];
  const item2 = restaurant.menuItems[1];
  const item3 = restaurant.menuItems[2];

  console.log(`Using restaurant: ${restaurant.name} (${restaurant.slug}), Table: ${table.tableNumber}`);

  // Test 1: Place an order
  const orderRes = await fetch('http://localhost:3000/api/public/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: restaurant.slug,
      tableNumber: table.tableNumber,
      customerName: 'Test Diner',
      items: [
        { menuItemId: item1.id, quantity: 1 },
        { menuItemId: item2.id, quantity: 2 },
      ],
    }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok || !orderData.order) {
    console.error('Order placement failed:', orderData);
    process.exit(1);
  }

  console.log('✓ Order placed successfully:', orderData.order.orderNumber);
  const controllerToken = orderData.controllerToken;
  const orderId = orderData.order.id;
  const orderItems = orderData.order.orderItems;

  console.log(`Order has ${orderItems.length} items. Controller token: ${controllerToken.slice(0, 10)}...`);

  // Test 2: Remove 1 dish
  console.log('\n--- Test 2: Remove 1 dish ---');
  const remove1Res = await fetch('http://localhost:3000/api/public/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': controllerToken,
    },
    body: JSON.stringify({
      orderId,
      orderItemId: orderItems[0].id,
      action: 'REMOVE_ITEM',
      controllerToken,
    }),
  });

  const remove1Data = await remove1Res.json();
  if (!remove1Res.ok || remove1Data.orderCancelled) {
    console.error('Failed to remove 1 item:', remove1Data);
    process.exit(1);
  }
  console.log(`✓ First dish removed. Remaining items: ${remove1Data.order.orderItems.length}`);
  if (remove1Data.order.orderItems.length !== 1) {
    console.error('Expected 1 item remaining!');
    process.exit(1);
  }

  // Test 3: Remove the last dish (should cancel the order and clear everything)
  console.log('\n--- Test 3: Remove last dish (should clear order completely) ---');
  const remove2Res = await fetch('http://localhost:3000/api/public/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': controllerToken,
    },
    body: JSON.stringify({
      orderId,
      orderItemId: remove1Data.order.orderItems[0].id,
      action: 'REMOVE_ITEM',
      controllerToken,
    }),
  });

  const remove2Data = await remove2Res.json();
  if (!remove2Res.ok) {
    console.error('Failed to remove last item:', remove2Data);
    process.exit(1);
  }
  console.log('✓ Last dish removed response:', remove2Data);
  if (!remove2Data.orderCancelled || remove2Data.order !== null) {
    console.error('Expected orderCancelled: true and order: null!');
    process.exit(1);
  }

  // Test 4: Verify GET /api/public/orders returns order: null (so track live section will not show)
  console.log('\n--- Test 4: Verify GET order returns null ---');
  const getOrderRes = await fetch(`http://localhost:3000/api/public/orders?orderId=${orderId}`);
  const getOrderData = await getOrderRes.json();
  console.log('✓ GET order by ID returned:', getOrderData);
  if (getOrderData.order !== null) {
    console.error('Expected order to be null in GET response!');
    process.exit(1);
  }

  const getTableOrderRes = await fetch(
    `http://localhost:3000/api/public/orders?slug=${restaurant.slug}&table=${table.tableNumber}`
  );
  const getTableOrderData = await getTableOrderRes.json();
  console.log('✓ GET order by Table returned:', getTableOrderData);
  if (getTableOrderData.order !== null) {
    console.error('Expected table active order to be null!');
    process.exit(1);
  }

  // Test 5: Verify controller can immediately place new dishes
  console.log('\n--- Test 5: Verify controller can immediately place new dishes ---');
  const newOrderRes = await fetch('http://localhost:3000/api/public/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': controllerToken,
    },
    body: JSON.stringify({
      restaurantSlug: restaurant.slug,
      tableNumber: table.tableNumber,
      customerName: 'Test Diner',
      controllerToken,
      items: [{ menuItemId: item3.id, quantity: 3 }],
    }),
  });

  const newOrderData = await newOrderRes.json();
  if (!newOrderRes.ok || !newOrderData.order) {
    console.error('Failed to place new order after clearing:', newOrderData);
    process.exit(1);
  }
  console.log('✓ Placed new order with new dishes immediately! Order #:', newOrderData.order.orderNumber);

  // Test 6: Verify CANCEL_ORDER action (Remove All Dishes button)
  console.log('\n--- Test 6: Verify Remove All Dishes (CANCEL_ORDER action) ---');
  const cancelAllRes = await fetch('http://localhost:3000/api/public/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': newOrderData.controllerToken,
    },
    body: JSON.stringify({
      orderId: newOrderData.order.id,
      action: 'CANCEL_ORDER',
      controllerToken: newOrderData.controllerToken,
    }),
  });

  const cancelAllData = await cancelAllRes.json();
  if (!cancelAllRes.ok || !cancelAllData.orderCancelled || cancelAllData.order !== null) {
    console.error('Failed to cancel all dishes:', cancelAllData);
    process.exit(1);
  }
  console.log('✓ CANCEL_ORDER succeeded! Response:', cancelAllData);

  // Test 7: Verify again that GET returns order: null
  const getOrderAfterCancel = await fetch(`http://localhost:3000/api/public/orders?orderId=${newOrderData.order.id}`);
  const getOrderAfterCancelData = await getOrderAfterCancel.json();
  if (getOrderAfterCancelData.order !== null) {
    console.error('Expected order to be null after CANCEL_ORDER!');
    process.exit(1);
  }
  console.log('✓ GET order returns null. Track Live section will not display on menu.');

  console.log('\n========================================');
  console.log('ALL DISH REMOVAL & LIVE TRACKING TESTS PASSED!');
  console.log('========================================');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
