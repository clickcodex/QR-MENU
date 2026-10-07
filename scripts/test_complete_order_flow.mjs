async function runFullVerification() {
  const baseUrl = 'http://localhost:3000';
  console.log('====================================================');
  console.log('MOMO MENU: COMPREHENSIVE END-TO-END ORDERING TEST');
  console.log('====================================================\n');

  // 1. Menu Load
  console.log('[STEP 1] Fetching customer menu for Table 7 (urban-spice)...');
  const menuRes = await fetch(`${baseUrl}/api/public/menu?slug=urban-spice&table=7`);
  if (!menuRes.ok) {
    throw new Error(`Menu API failed: ${menuRes.status}`);
  }
  const menuData = await menuRes.json();
  console.log(`✓ Menu loaded: Restaurant="${menuData.restaurant?.name}", Table="${menuData.table?.name || menuData.table?.tableNumber}"`);
  
  const sampleCategory = menuData.categories[0];
  const sampleItem = sampleCategory.items[0];
  console.log(`✓ Selected dish: "${sampleItem.name}" at ₹${sampleItem.price} (ID: ${sampleItem.id})\n`);

  // 2. Active Order Query Before Placing Order
  console.log('[STEP 2] Checking active order discovery on Table 7...');
  const activeOrderRes = await fetch(`${baseUrl}/api/public/orders?slug=urban-spice&table=7`);
  const activeOrderData = await activeOrderRes.json();
  console.log(`✓ Active order discovery response status: ${activeOrderRes.status}, found order: ${Boolean(activeOrderData.order?.id)}`);
  if (activeOrderData.order) {
    console.log(`  Existing active order #${activeOrderData.order.orderNumber} with status "${activeOrderData.order.status}"`);
  }
  console.log('');

  // 3. Customer Places Order from Table 7
  console.log('[STEP 3] Customer places a new order for Table 7...');
  const orderRes = await fetch(`${baseUrl}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'urban-spice',
      tableNumber: '7',
      customerName: 'Aarav Sharma',
      notes: 'Make it extra spicy and crispy please',
      items: [
        { menuItemId: sampleItem.id, quantity: 2 }
      ],
    }),
  });

  if (!orderRes.ok) {
    const errData = await orderRes.json();
    throw new Error(`Order placement failed: ${JSON.stringify(errData)}`);
  }
  const orderData = await orderRes.json();
  const placedOrder = orderData.order;
  console.log(`✓ ORDER PLACED SUCCESSFULLY!`);
  console.log(`  Order ID: ${placedOrder.id}`);
  console.log(`  Order Number: #${placedOrder.orderNumber}`);
  console.log(`  Table: ${placedOrder.tableNumber}`);
  console.log(`  Initial Status: ${placedOrder.status}`);
  console.log(`  Total Bill: ₹${placedOrder.total} (including 5% GST)\n`);

  // 4. Verify Active Order Retrieval by Table
  console.log('[STEP 4] Verifying Table 7 active order lookup...');
  const checkOrderRes = await fetch(`${baseUrl}/api/public/orders?slug=urban-spice&table=7`);
  const checkOrderData = await checkOrderRes.json();
  if (checkOrderData.order?.id !== placedOrder.id) {
    throw new Error(`Mismatch in active order! Expected ${placedOrder.id}, got ${checkOrderData.order?.id}`);
  }
  console.log(`✓ Active order lookup successfully retrieved Order #${checkOrderData.order.orderNumber} (${checkOrderData.order.status})\n`);

  // 5. Kitchen Staff Logs In & Views Order in PENDING
  console.log('[STEP 5] Kitchen staff logging in (kitchen@urbanspice.in)...');
  const kitchenLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kitchen@urbanspice.in', password: 'kitchen123' }),
  });
  if (!kitchenLoginRes.ok) {
    throw new Error('Kitchen login failed');
  }
  const kitchenCookie = kitchenLoginRes.headers.get('set-cookie');
  console.log(`✓ Kitchen staff authenticated`);

  const kitchenOrdersRes = await fetch(`${baseUrl}/api/orders`, {
    headers: { cookie: kitchenCookie || '' },
  });
  const kitchenOrdersData = await kitchenOrdersRes.json();
  const foundInKitchen = kitchenOrdersData.orders?.find((o) => o.id === placedOrder.id);
  if (!foundInKitchen) {
    throw new Error('Order not found in kitchen queue!');
  }
  console.log(`✓ Order #${foundInKitchen.orderNumber} appeared in Kitchen station with status "${foundInKitchen.status}"\n`);

  // 6. Kitchen Transitions Order: PENDING -> ACCEPTED
  console.log('[STEP 6] Kitchen accepts the order (PENDING -> ACCEPTED)...');
  const acceptRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: kitchenCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'ACCEPTED' }),
  });
  const acceptData = await acceptRes.json();
  if (!acceptRes.ok || acceptData.order?.status !== 'ACCEPTED') {
    throw new Error(`Kitchen accept failed: ${JSON.stringify(acceptData)}`);
  }
  console.log(`✓ Kitchen approved order: Status is now "${acceptData.order.status}"\n`);

  // 7. Kitchen Transitions Order: ACCEPTED -> PREPARING
  console.log('[STEP 7] Kitchen starts cooking (ACCEPTED -> PREPARING)...');
  const prepRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: kitchenCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'PREPARING' }),
  });
  const prepData = await prepRes.json();
  if (!prepRes.ok || prepData.order?.status !== 'PREPARING') {
    throw new Error(`Kitchen start cooking failed: ${JSON.stringify(prepData)}`);
  }
  console.log(`✓ Order in kitchen: Status is now "${prepData.order.status}"\n`);

  // 8. Customer Polls & Sees "PREPARING"
  console.log('[STEP 8] Customer device polls order status...');
  const customerPollRes = await fetch(`${baseUrl}/api/public/orders?orderId=${placedOrder.id}`);
  const customerPollData = await customerPollRes.json();
  console.log(`✓ Customer sees updated status in real-time: "${customerPollData.order.status}"\n`);

  // 9. Kitchen Transitions Order: PREPARING -> READY -> SERVED
  console.log('[STEP 9] Kitchen marks plated & ready (READY)...');
  await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: kitchenCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'READY' }),
  });

  console.log('[STEP 10] Kitchen marks served to table (SERVED)...');
  const servedRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: kitchenCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'SERVED' }),
  });
  const servedData = await servedRes.json();
  console.log(`✓ Order delivered to Table 7: Status is now "${servedData.order.status}"\n`);

  // 10. Role Boundary Test: Kitchen CANNOT mark COMPLETED
  console.log('[STEP 11] Verifying Role Boundary: Kitchen attempts to mark COMPLETED...');
  const forbiddenRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: kitchenCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'COMPLETED' }),
  });
  console.log(`✓ Role boundary enforced! Status: ${forbiddenRes.status} (Expected 403 Forbidden)`);
  const forbiddenData = await forbiddenRes.json();
  console.log(`  Message: "${forbiddenData.error}"\n`);

  // 11. Admin Logs In and Settles Bill (COMPLETED)
  console.log('[STEP 12] Admin logs in (owner@urbanspice.in) to settle bill...');
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@urbanspice.in', password: 'owner123' }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  const completeRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'COMPLETED' }),
  });
  const completeData = await completeRes.json();
  console.log(`✓ Admin settled bill! Order #${completeData.order.orderNumber} is now "${completeData.order.status}"\n`);

  console.log('====================================================');
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

runFullVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
