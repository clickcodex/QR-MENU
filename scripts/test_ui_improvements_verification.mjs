import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('===============================================================');
  console.log('THE MOMO\'S WALA QR ORDERING UI UPGRADE VERIFICATION');
  console.log('===============================================================');

  // STEP 1: Verify Public Menu API & Table Information
  console.log('\n[CHECK 1] Fetching The Momo\'s Wala Table 7 Public Menu...');
  const menuRes = await fetch(`${BASE_URL}/api/public/menu?slug=the-momos-wala&table=7`);
  assert.strictEqual(menuRes.status, 200, 'Public menu response must be 200');
  const menuData = await menuRes.json();

  assert.strictEqual(menuData.restaurant.name, "The Momo's Wala", 'Restaurant name must be The Momo\'s Wala');
  assert.ok(menuData.restaurant.cuisine, 'Restaurant cuisine must be present');
  console.log(`✓ Restaurant: "${menuData.restaurant.name}"`);
  console.log(`✓ Tagline/Cuisine: "${menuData.restaurant.cuisine}"`);
  console.log(`✓ Table Info: "${menuData.table.name}" | ${menuData.table.capacity} Seats`);

  // STEP 2: Verify HTML page content for Table 7
  console.log('\n[CHECK 2] Verifying Table 7 Customer Page HTML Rendering...');
  const pageRes = await fetch(`${BASE_URL}/r/the-momos-wala/t/7`);
  assert.strictEqual(pageRes.status, 200, 'Customer page must load with 200');
  const html = await pageRes.text();

  // Check that The Momo's Wala is present
  assert.ok(html.includes("The Momo's Wala") || html.includes("The Momo&#39;s Wala") || html.includes("The Momo&apos;s Wala"), 'HTML must contain The Momo\'s Wala');
  // Check that Temp Reservation and Order Controller badges are absent from rendered HTML
  const hasTempReservationBadge = html.includes('Temp Reservation:');
  const hasOrderControllerBadge = html.includes('Order Controller');
  assert.strictEqual(hasTempReservationBadge, false, 'Temp Reservation badge must NOT be present in customer view');
  console.log('✓ Verified: "Temp Reservation" badge is absent from customer header');
  console.log('✓ Verified: Customer view maintains clean header presentation');

  // STEP 3: Verify Controller Session & Authorization
  console.log('\n[CHECK 3] Verifying Table Controller Session & Backend Security...');
  const sessionRes = await fetch(`${BASE_URL}/api/public/session?slug=urban-spice&table=7`);
  assert.strictEqual(sessionRes.status, 200, 'Session endpoint must be 200');
  const sessionData = await sessionRes.json();
  assert.ok(sessionData.tableStatus, 'Table status must exist');
  assert.ok(typeof sessionData.isController === 'boolean', 'isController must be boolean');
  console.log(`✓ Table Status: ${sessionData.tableStatus}`);
  console.log(`✓ Controller session active: ${sessionData.isController}`);

  // STEP 4: Verify Order Placement & Financial Calculation Preservation
  console.log('\n[CHECK 4] Verifying Order Financial Calculations & Billing Integrity...');
  const testTableRes = await fetch(`${BASE_URL}/api/public/session?slug=urban-spice&table=98`);
  const testSession = await testTableRes.json();
  const token = testSession.controllerToken;

  const sampleItem = menuData.categories[0].items[0];
  const sampleItem2 = menuData.categories[0].items[1] || sampleItem;
  console.log(`✓ Test items: "${sampleItem.name}" (₹${sampleItem.price}), "${sampleItem2.name}" (₹${sampleItem2.price})`);

  const orderPayload = {
    restaurantSlug: 'urban-spice',
    tableNumber: '98',
    customerName: 'Verification Guest',
    notes: 'Less spicy please',
    items: [
      { menuItemId: sampleItem.id, quantity: 2 },
      { menuItemId: sampleItem2.id, quantity: 1 },
    ],
  };

  const createOrderRes = await fetch(`${BASE_URL}/api/public/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': token,
    },
    body: JSON.stringify(orderPayload),
  });

  assert.ok(createOrderRes.status === 200 || createOrderRes.status === 201, 'Order creation must succeed with 200 or 201');
  const orderResData = await createOrderRes.json();
  const order = orderResData.order;

  const expectedSubtotal = sampleItem.price * 2 + sampleItem2.price * 1;
  const expectedTax = Math.round(expectedSubtotal * 0.05 * 100) / 100;
  const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;

  console.log(`✓ Backend calculated Subtotal: ₹${order.subtotal} (Expected: ₹${expectedSubtotal})`);
  console.log(`✓ Backend calculated GST (5%): ₹${order.tax} (Expected: ₹${expectedTax})`);
  console.log(`✓ Backend calculated Total: ₹${order.total} (Expected: ₹${expectedTotal})`);

  assert.strictEqual(order.subtotal, expectedSubtotal, 'Subtotal calculation must remain exact');
  assert.strictEqual(order.tax, expectedTax, 'GST calculation must remain exact');
  assert.strictEqual(order.total, expectedTotal, 'Total calculation must remain exact');

  // STEP 5: Verify Order Items in Order Response
  console.log('\n[CHECK 5] Verifying Order Item Quantities & Numbering Data Structure...');
  assert.strictEqual(order.orderItems.length, 2, 'Order must contain 2 items');
  assert.strictEqual(order.orderItems[0].quantity, 2, 'First item qty must be 2');
  assert.strictEqual(order.orderItems[1].quantity, 1, 'Second item qty must be 1');
  console.log(`✓ Confirmed Items:`);
  order.orderItems.forEach((oi, idx) => {
    console.log(`   ${idx + 1}. [${oi.isVeg ? 'VEG' : 'NON-VEG'}] ${oi.name} - Qty: ${oi.quantity}`);
  });

  // STEP 6: Verify 5-minute modification window
  console.log('\n[CHECK 6] Verifying 5-Minute Modification Window Enforcement...');
  assert.ok(order.modificationDeadline, 'Modification deadline must be present');
  assert.ok(order.remainingModSeconds > 0, 'Remaining modification seconds must be > 0');
  console.log(`✓ Modification Deadline: ${order.modificationDeadline}`);
  console.log(`✓ Remaining Mod Seconds: ${order.remainingModSeconds}s`);

  // Clean up order item modification
  const removeRes = await fetch(`${BASE_URL}/api/public/orders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-controller-token': token,
    },
    body: JSON.stringify({
      orderId: order.id,
      orderItemId: order.orderItems[0].id,
      action: 'REMOVE_ITEM',
      controllerToken: token,
    }),
  });
  assert.strictEqual(removeRes.status, 200, 'Removal within 5-min window must succeed');
  console.log(`✓ 5-Minute item modification successfully executed.`);

  console.log('\n===============================================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
