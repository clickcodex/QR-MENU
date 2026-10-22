import assert from 'assert';

const BASE = 'http://localhost:3000';

async function testOrderAcceptanceDishRestriction() {
  console.log('========================================================================');
  console.log('VERIFYING DISH REMOVAL RESTRICTION ONCE ORDER IS ACCEPTED BY ADMIN');
  console.log('========================================================================\n');

  // 1. Get menu to pick items
  const menuRes = await fetch(`${BASE}/api/public/menu?slug=the-momos-wala&table=7`);
  assert.strictEqual(menuRes.status, 200);
  const menuData = await menuRes.json();
  const item1 = menuData.categories[0].items[0];
  const item2 = menuData.categories[0].items[1];

  // 2. Resolve Table Session
  const testTable = `9${Math.floor(Math.random() * 89 + 10)}`;
  const sessionRes = await fetch(`${BASE}/api/public/session?slug=the-momos-wala&table=${testTable}`);
  const sessionData = await sessionRes.json();
  const clientToken = sessionData.controllerToken;

  // 3. Place an order in PENDING status
  console.log(`1️⃣ Placing initial order with 2 dishes on Table ${testTable} in PENDING state...`);
  const orderRes = await fetch(`${BASE}/api/public/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': clientToken,
    },
    body: JSON.stringify({
      slug: 'the-momos-wala',
      tableNumber: testTable,
      customerName: 'Test Diner',
      items: [
        { menuItemId: item1.id, quantity: 2 },
        { menuItemId: item2.id, quantity: 1 },
      ],
    }),
  });
  if (orderRes.status !== 200) {
    const errText = await orderRes.text();
    console.error('Order creation failed:', orderRes.status, errText);
  }
  assert.strictEqual(orderRes.status, 200);
  const orderData = await orderRes.json();
  const orderId = orderData.order.id;
  console.log(`   ✓ Order created: ${orderData.order.orderNumber} (Status: ${orderData.order.status})`);
  assert.strictEqual(orderData.order.status, 'PENDING');
  assert.strictEqual(orderData.order.canRemoveDishes, true);
  assert.strictEqual(orderData.order.canAddDishes, true);

  // 4. While PENDING, removal / reducing is allowed
  console.log('2️⃣ Verifying dish reduction IS allowed while PENDING...');
  const modRes1 = await fetch(`${BASE}/api/public/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': clientToken,
    },
    body: JSON.stringify({
      slug: 'the-momos-wala',
      tableNumber: testTable,
      orderId,
      action: 'UPDATE_QUANTITY',
      orderItemId: orderData.order.orderItems[0].id,
      menuItemId: item1.id,
      delta: -1,
    }),
  });
  if (modRes1.status !== 200) {
    const err = await modRes1.text();
    console.error('modRes1 failed:', modRes1.status, err);
  }
  assert.strictEqual(modRes1.status, 200, 'Pending order reduction should be permitted');
  const modData1 = await modRes1.json();
  console.log(`   ✓ Reduced item quantity while PENDING successfully.`);

  // 5. Simulate Admin accepting the order (setting status to ACCEPTED / PREPARING)
  console.log('\n3️⃣ Admin panel accepts order (Status -> PREPARING / ACCEPTED)...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@clickcodex.in',
      password: 'adminpassword123',
    }),
  });
  assert.strictEqual(loginRes.status, 200);
  const cookieHeader = loginRes.headers.get('set-cookie');

  const updateStatusRes = await fetch(`${BASE}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      orderId,
      status: 'PREPARING',
    }),
  });
  assert.strictEqual(updateStatusRes.status, 200);
  console.log(`   ✓ Admin updated order status to PREPARING.`);

  // 6. Verify client fetches order status and receives canRemoveDishes = false
  console.log('\n4️⃣ Checking Client perspective when order is ACCEPTED...');
  const checkRes = await fetch(`${BASE}/api/public/orders?slug=the-momos-wala&table=${testTable}`, {
    headers: { 'x-controller-token': clientToken },
  });
  assert.strictEqual(checkRes.status, 200);
  const checkData = await checkRes.json();
  assert.strictEqual(checkData.order.isAccepted, true);
  assert.strictEqual(checkData.order.canRemoveDishes, false);
  assert.strictEqual(checkData.order.canAddDishes, true);
  console.log(`   ✓ Server returned isAccepted: true`);
  console.log(`   ✓ Server returned canRemoveDishes: false (Removal disabled)`);
  console.log(`   ✓ Server returned canAddDishes: true (+ Add Dishes enabled)`);

  // 7. Verify attempt to remove dish is BLOCKED
  console.log('\n5️⃣ Testing that client CANNOT remove dishes once accepted...');
  const blockRemoveRes = await fetch(`${BASE}/api/public/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': clientToken,
    },
    body: JSON.stringify({
      slug: 'the-momos-wala',
      tableNumber: testTable,
      orderId,
      action: 'REMOVE_ITEM',
      orderItemId: orderData.order.orderItems[0].id,
      menuItemId: item1.id,
    }),
  });
  assert.strictEqual(blockRemoveRes.status, 400);
  const blockRemoveData = await blockRemoveRes.json();
  console.log(`   ✓ Backend correctly rejected REMOVE_ITEM with: "${blockRemoveData.error}"`);
  assert.ok(blockRemoveData.error.toLowerCase().includes('accepted'));

  // 8. Verify attempt to reduce quantity is BLOCKED
  console.log('\n6️⃣ Testing that client CANNOT reduce quantity once accepted...');
  const blockReduceRes = await fetch(`${BASE}/api/public/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': clientToken,
    },
    body: JSON.stringify({
      slug: 'the-momos-wala',
      tableNumber: testTable,
      orderId,
      action: 'UPDATE_QUANTITY',
      orderItemId: orderData.order.orderItems[0].id,
      menuItemId: item1.id,
      delta: -1,
    }),
  });
  assert.strictEqual(blockReduceRes.status, 400);
  const blockReduceData = await blockReduceRes.json();
  console.log(`   ✓ Backend correctly rejected negative delta with: "${blockReduceData.error}"`);
  assert.ok(blockReduceData.error.toLowerCase().includes('accepted'));

  // 9. Verify client CAN STILL ADD DISHES
  console.log('\n7️⃣ Testing that client CAN STILL ADD DISHES once accepted...');
  const addDishRes = await fetch(`${BASE}/api/public/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': clientToken,
    },
    body: JSON.stringify({
      slug: 'the-momos-wala',
      tableNumber: testTable,
      orderId,
      action: 'ADD_ITEMS',
      items: [{ menuItemId: item2.id, quantity: 2 }],
    }),
  });
  assert.strictEqual(addDishRes.status, 200, 'Adding dishes must succeed even when order is accepted');
  const addDishData = await addDishRes.json();
  console.log(`   ✓ Added dishes successfully. New total: ₹${addDishData.order.totalAmount}`);

  console.log('\n========================================================================');
  console.log('✅ ALL ADMIN ACCEPTANCE & REMOVAL RESTRICTION TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

testOrderAcceptanceDishRestriction().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
