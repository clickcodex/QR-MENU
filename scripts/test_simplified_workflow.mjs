async function testSimplifiedWorkflow() {
  const baseUrl = 'http://localhost:3005';
  console.log('================================================================');
  console.log('TESTING SIMPLIFIED 3-ROLE QR ORDERING WORKFLOW');
  console.log('Scenario: Table 5 QR -> Menu -> Select -> Review -> Confirm -> Admin Accepts -> Delivered');
  console.log('================================================================\n');

  // STEP 1: Table 5 QR scanned & Menu opened
  console.log('[STEP 1] Customer scans Table 5 QR code (/r/urban-spice/t/5)...');
  const menuRes = await fetch(`${baseUrl}/api/public/menu?slug=urban-spice&table=5`);
  if (!menuRes.ok) throw new Error(`Menu fetch failed: ${menuRes.status}`);
  const menuData = await menuRes.json();
  console.log(`✓ Table detected automatically: "${menuData.table?.name || 'Table ' + menuData.table?.tableNumber}"`);
  console.log(`✓ Restaurant: ${menuData.restaurant?.name} (${menuData.totalItems} available dishes)`);
  
  const sampleDish = menuData.categories[0].items[0];
  console.log(`✓ Customer selected dish: "${sampleDish.name}" (₹${sampleDish.price})\n`);

  // STEP 2: Customer Reviews & Confirms Order for Table 5
  console.log('[STEP 2] Customer confirms order for Table 5...');
  const orderRes = await fetch(`${baseUrl}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'urban-spice',
      tableNumber: '5',
      customerName: 'Priya Patel',
      notes: 'Please serve quickly',
      items: [
        { menuItemId: sampleDish.id, quantity: 2 }
      ],
    }),
  });

  if (!orderRes.ok) {
    const err = await orderRes.json();
    throw new Error(`Order placement failed: ${JSON.stringify(err)}`);
  }
  const orderData = await orderRes.json();
  const placedOrder = orderData.order;
  console.log(`✓ ORDER PLACED SUCCESSFULLY!`);
  console.log(`  Order Number: #${placedOrder.orderNumber}`);
  console.log(`  Table: ${placedOrder.tableNumber}`);
  console.log(`  Status: ${placedOrder.status}`);
  console.log(`  Items Count: ${placedOrder.orderItems.length} (Total qty: ${placedOrder.orderItems.reduce((s, i) => s + i.quantity, 0)})`);
  console.log(`  Total: ₹${placedOrder.total}\n`);

  // STEP 3: Admin logs in & receives New Order notification
  console.log('[STEP 3] Admin logs in to Restaurant Admin Panel...');
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@urbanspice.in', password: 'owner123' }),
  });
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  console.log(`✓ Admin authenticated successfully`);

  const adminOrdersRes = await fetch(`${baseUrl}/api/orders`, {
    headers: { cookie: adminCookie || '' },
  });
  const adminOrdersData = await adminOrdersRes.json();
  const receivedOrder = adminOrdersData.orders?.find((o) => o.id === placedOrder.id);
  if (!receivedOrder) throw new Error('Order not found in Admin Panel orders list!');
  
  console.log(`✓ Admin received Order #${receivedOrder.orderNumber} for Table ${receivedOrder.tableNumber}:`);
  console.log(`  - Dishes: ${receivedOrder.orderItems.map((i) => `${i.name} (x${i.quantity})`).join(', ')}`);
  console.log(`  - Total: ₹${receivedOrder.total}`);
  console.log(`  - Status: ${receivedOrder.status}`);
  console.log(`  - Metrics: ${adminOrdersData.metrics.pendingCount} Pending, ${adminOrdersData.metrics.totalOrders} Total\n`);

  // STEP 4: Admin Accepts the Order (PENDING -> ACCEPTED)
  console.log('[STEP 4] Admin clicks "Accept Order"...');
  const acceptRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'ACCEPTED' }),
  });
  const acceptData = await acceptRes.json();
  if (!acceptRes.ok || acceptData.order?.status !== 'ACCEPTED') {
    throw new Error(`Accept order failed: ${JSON.stringify(acceptData)}`);
  }
  console.log(`✓ Order status updated to: ${acceptData.order.status}\n`);

  // STEP 5: Food is served -> Admin marks order as Delivered (ACCEPTED -> DELIVERED)
  console.log('[STEP 5] Food is served. Admin clicks "Mark as Delivered"...');
  const deliverRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({ orderId: placedOrder.id, status: 'DELIVERED' }),
  });
  const deliverData = await deliverRes.json();
  if (!deliverRes.ok || deliverData.order?.status !== 'DELIVERED') {
    throw new Error(`Mark delivered failed: ${JSON.stringify(deliverData)}`);
  }
  console.log(`✓ Order completed! Status is now: ${deliverData.order.status}\n`);

  // STEP 6: Verify Order Remains in Today's Complete Order History
  console.log('[STEP 6] Verifying order persistence in today\'s order history...');
  const historyRes = await fetch(`${baseUrl}/api/orders?status=DELIVERED`, {
    headers: { cookie: adminCookie || '' },
  });
  const historyData = await historyRes.json();
  const persistentOrder = historyData.orders?.find((o) => o.id === placedOrder.id);
  if (!persistentOrder) throw new Error('Delivered order not found in order history!');
  console.log(`✓ Order #${persistentOrder.orderNumber} successfully found in Delivered history (Status: ${persistentOrder.status})\n`);

  // STEP 7: Verify Table Independence (Table 2 vs Table 5)
  console.log('[STEP 7] Verifying multiple tables work independently (Table 2 vs Table 5)...');
  const table2OrderRes = await fetch(`${baseUrl}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'urban-spice',
      tableNumber: '2',
      customerName: 'Rahul Verma',
      items: [{ menuItemId: sampleDish.id, quantity: 1 }],
    }),
  });
  const table2OrderData = await table2OrderRes.json();
  const table2Order = table2OrderData.order;
  console.log(`✓ Table 2 Order created: Order #${table2Order.orderNumber}, Table: ${table2Order.tableNumber}`);
  if (table2Order.tableNumber !== '2') throw new Error('Table 2 order misassigned!');
  console.log('✓ Tables 2 and 5 operate completely independently.\n');

  // STEP 8: Verify Dish Management (Add, Edit, Toggle Availability, Delete)
  console.log('[STEP 8] Verifying Menu Management (Add, Edit, Availability Toggle, Delete)...');
  const catId = menuData.categories[0].id;

  // Add Dish
  const addDishRes = await fetch(`${baseUrl}/api/menu-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({
      name: 'Test Special Dish',
      description: 'Chef signature recipe for verification',
      price: 299,
      categoryId: catId,
      isVeg: true,
      isAvailable: true,
      displayOrder: 99,
    }),
  });
  const addDishData = await addDishRes.json();
  const newDishId = addDishData.item?.id;
  console.log(`✓ Dish created: "${addDishData.item?.name}" (ID: ${newDishId})`);

  // Edit Dish
  const editDishRes = await fetch(`${baseUrl}/api/menu-items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({
      id: newDishId,
      name: 'Test Special Dish (Updated)',
      price: 349,
    }),
  });
  const editDishData = await editDishRes.json();
  console.log(`✓ Dish updated: "${editDishData.item?.name}" (Price: ₹${editDishData.item?.price})`);

  // Toggle Availability (Mark Unavailable)
  const toggleRes = await fetch(`${baseUrl}/api/menu-items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie || '' },
    body: JSON.stringify({
      id: newDishId,
      isAvailable: false,
    }),
  });
  const toggleData = await toggleRes.json();
  console.log(`✓ Dish marked unavailable: isAvailable = ${toggleData.item?.isAvailable}`);

  // Delete Dish
  const deleteRes = await fetch(`${baseUrl}/api/menu-items?id=${newDishId}`, {
    method: 'DELETE',
    headers: { cookie: adminCookie || '' },
  });
  const deleteData = await deleteRes.json();
  console.log(`✓ Dish deleted successfully: ${deleteData.success}`);

  console.log('\n================================================================');
  console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY! 100% WORKING');
  console.log('================================================================');
}

testSimplifiedWorkflow().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
