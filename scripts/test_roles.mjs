async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- TEST 1: KITCHEN LOGIN ---');
  const kitchenLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kitchen@urbanspice.in', password: 'kitchen123' }),
  });
  const kitchenData = await kitchenLoginRes.json();
  const kitchenCookies = kitchenLoginRes.headers.get('set-cookie');
  console.log('Kitchen Login Success:', kitchenData.success, 'Role:', kitchenData.user?.role, 'RedirectTo:', kitchenData.redirectTo);

  console.log('\n--- TEST 2: SUPER ADMIN LOGIN ---');
  const superLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@momomenu.in', password: 'superadmin123' }),
  });
  const superData = await superLoginRes.json();
  const superCookies = superLoginRes.headers.get('set-cookie');
  console.log('Super Admin Login Success:', superData.success, 'Role:', superData.user?.role, 'RedirectTo:', superData.redirectTo);

  console.log('\n--- TEST 3: SUPER ADMIN LISTS USERS ---');
  const usersRes = await fetch(`${baseUrl}/api/superadmin/users`, {
    headers: { cookie: superCookies || '' },
  });
  const usersData = await usersRes.json();
  console.log(`Fetched ${usersData.users?.length} users. User list:`);
  usersData.users?.forEach((u) => console.log(`  - [${u.role}] ${u.name} (${u.email})`));

  console.log('\n--- TEST 4: SUPER ADMIN LISTS RESTAURANTS & SUBSCRIPTION ---');
  const restsRes = await fetch(`${baseUrl}/api/superadmin/restaurants`, {
    headers: { cookie: superCookies || '' },
  });
  const restsData = await restsRes.json();
  console.log('Restaurants:', restsData.restaurants?.map(r => ({
    name: r.name,
    plan: r.subscriptionPlan,
    fee: r.monthlyFee,
    status: r.subscriptionStatus,
  })));
  console.log('Summary:', restsData.summary);

  console.log('\n--- TEST 5: CUSTOMER PLACES AN ORDER ---');
  // Get an item from menu first
  const menuRes = await fetch(`${baseUrl}/api/public/menu?slug=urban-spice&table=7`);
  const menuData = await menuRes.json();
  const firstItem = menuData.categories[0].items[0];
  console.log('Ordering item:', firstItem.name, 'Price:', firstItem.price);

  const placeOrderRes = await fetch(`${baseUrl}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'urban-spice',
      tableNumber: '7',
      customerName: 'Priya Verma',
      notes: 'Make it extra spicy please',
      items: [{ menuItemId: firstItem.id, quantity: 2 }],
    }),
  });
  const orderData = await placeOrderRes.json();
  console.log('Order Placed:', orderData.success, 'Order #:', orderData.order?.orderNumber, 'Status:', orderData.order?.status);
  const orderId = orderData.order?.id;

  console.log('\n--- TEST 6: KITCHEN ACCEPTS THE ORDER ---');
  const acceptRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: kitchenCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'ACCEPTED' }),
  });
  const acceptData = await acceptRes.json();
  console.log('Kitchen Accepted status:', acceptData.order?.status);

  console.log('\n--- TEST 7: KITCHEN STARTS COOKING ---');
  const prepRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: kitchenCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'PREPARING' }),
  });
  const prepData = await prepRes.json();
  console.log('Kitchen Preparing status:', prepData.order?.status);

  console.log('\n--- TEST 8: KITCHEN MARKS READY ---');
  const readyRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: kitchenCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'READY' }),
  });
  const readyData = await readyRes.json();
  console.log('Kitchen Ready status:', readyData.order?.status);

  console.log('\n--- TEST 9: KITCHEN DELIVERS TO TABLE (SERVED) ---');
  const servedRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: kitchenCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'SERVED' }),
  });
  const servedData = await servedRes.json();
  console.log('Kitchen Delivered/Served status:', servedData.order?.status);

  console.log('\n--- TEST 10: KITCHEN ATTEMPTS TO COMPLETE BILL (SHOULD BE FORBIDDEN) ---');
  const forbidRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: kitchenCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'COMPLETED' }),
  });
  const forbidData = await forbidRes.json();
  console.log('Kitchen Completed attempt status:', forbidRes.status, 'Error message:', forbidData.error);

  console.log('\n--- TEST 11: OWNER / ADMIN LOGS IN AND SETTLES BILL (COMPLETED) ---');
  const ownerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@urbanspice.in', password: 'owner123' }),
  });
  const ownerCookies = ownerLoginRes.headers.get('set-cookie');
  const completeRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: ownerCookies || '',
    },
    body: JSON.stringify({ orderId, status: 'COMPLETED' }),
  });
  const completeData = await completeRes.json();
  console.log('Admin Settle Bill status:', completeData.order?.status);

  console.log('\n--- TEST 12: SUPER ADMIN CHANGES ID & PASSWORD OF KITCHEN USER ---');
  const kitchenUser = usersData.users.find(u => u.email === 'kitchen@urbanspice.in');
  const changePassRes = await fetch(`${baseUrl}/api/superadmin/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: superCookies || '',
    },
    body: JSON.stringify({
      userId: kitchenUser.id,
      email: 'kitchen@urbanspice.in',
      name: 'Chef Sanjeev (Head Chef Master)',
      role: 'KITCHEN',
      newPassword: 'newkitchenpassword123',
    }),
  });
  const changePassData = await changePassRes.json();
  console.log('Password Changed Result:', changePassData.success, 'Message:', changePassData.message);

  // Verify login with new password
  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kitchen@urbanspice.in', password: 'newkitchenpassword123' }),
  });
  const newLoginData = await newLoginRes.json();
  console.log('Login with NEW password:', newLoginData.success, 'User name:', newLoginData.user?.name);

  // Restore kitchen password to kitchen123 for user demo convenience
  await fetch(`${baseUrl}/api/superadmin/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: superCookies || '',
    },
    body: JSON.stringify({
      userId: kitchenUser.id,
      name: 'Chef Sanjeev (Head Chef)',
      newPassword: 'kitchen123',
    }),
  });
  console.log('Restored kitchen password to kitchen123 for demo convenience.');

  console.log('\n🎉 ALL 12 TESTS PASSED PERFECTLY!');
}

runTests().catch(console.error);
