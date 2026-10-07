async function test() {
  const baseUrl = 'http://localhost:3000';
  console.log('1. Testing Menu API...');
  const menuRes = await fetch(`${baseUrl}/api/public/menu?slug=urban-spice&table=7`);
  console.log('Menu status:', menuRes.status);
  const menu = await menuRes.json();
  console.log('Restaurant:', menu.restaurant?.name, 'Categories count:', menu.categories?.length);
  if (!menu.categories || menu.categories.length === 0) {
    console.error('ERROR: No categories returned!');
    return;
  }
  const item = menu.categories[0].items[0];
  console.log('Sample item:', item.name, 'Price:', item.price, 'ID:', item.id);

  console.log('\n2. Testing Placing Order API...');
  const orderRes = await fetch(`${baseUrl}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantSlug: 'urban-spice',
      tableNumber: '7',
      customerName: 'Test Customer',
      notes: 'Test note',
      items: [{ menuItemId: item.id, quantity: 2 }],
    }),
  });
  console.log('Order status:', orderRes.status);
  const order = await orderRes.json();
  console.log('Order response:', JSON.stringify(order, null, 2));

  if (!order.success) {
    console.error('ERROR: Order placement failed!');
    return;
  }

  console.log('\n3. Testing Kitchen getting order...');
  const kitchenLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kitchen@urbanspice.in', password: 'kitchen123' }),
  });
  const kitchenCookies = kitchenLoginRes.headers.get('set-cookie');
  const kitchenOrdersRes = await fetch(`${baseUrl}/api/orders`, {
    headers: { cookie: kitchenCookies || '' },
  });
  const kitchenOrders = await kitchenOrdersRes.json();
  console.log('Kitchen orders count:', kitchenOrders.orders?.length);
  const foundInKitchen = kitchenOrders.orders?.find(o => o.id === order.order.id);
  console.log('Found order in kitchen:', Boolean(foundInKitchen), 'Status:', foundInKitchen?.status);

  console.log('\n4. Testing Admin getting order...');
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@urbanspice.in', password: 'owner123' }),
  });
  const adminCookies = adminLoginRes.headers.get('set-cookie');
  const adminOrdersRes = await fetch(`${baseUrl}/api/orders`, {
    headers: { cookie: adminCookies || '' },
  });
  const adminOrders = await adminOrdersRes.json();
  console.log('Admin orders count:', adminOrders.orders?.length);
  const foundInAdmin = adminOrders.orders?.find(o => o.id === order.order.id);
  console.log('Found order in admin:', Boolean(foundInAdmin), 'Status:', foundInAdmin?.status);
}

test().catch(console.error);
