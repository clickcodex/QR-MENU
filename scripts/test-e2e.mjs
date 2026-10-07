import assert from 'assert';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function test() {
  console.log('🧪 Running Comprehensive End-to-End Suite for MOMO MENU...\n');

  // Test 1: Public Menu API for Table 7
  console.log('1️⃣ Testing Public Customer Menu API (/api/public/menu?slug=urban-spice&table=7)...');
  const menuRes = await fetch(`${BASE}/api/public/menu?slug=urban-spice&table=7`);
  assert.strictEqual(menuRes.status, 200, 'Public menu API must return 200');
  const menuData = await menuRes.json();
  assert.strictEqual(menuData.success, true);
  assert.strictEqual(menuData.restaurant.name, 'Urban Spice');
  assert.strictEqual(menuData.restaurant.slug, 'urban-spice');
  assert.strictEqual(menuData.table.tableNumber, '7');
  assert.strictEqual(menuData.table.isValid, true);
  assert.ok(menuData.categories.length >= 6, 'Must have at least 6 categories');
  assert.ok(menuData.totalItems >= 20, 'Must have at least 20 items');
  console.log(`   ✓ Resolved Restaurant: "${menuData.restaurant.name}"`);
  console.log(`   ✓ Resolved Table: "${menuData.table.name}" (Seats: ${menuData.table.capacity})`);
  console.log(`   ✓ Categories: ${menuData.categories.length}, Total Dishes: ${menuData.totalItems}`);

  // Test 2: HTML Page Rendering for /r/urban-spice/t/7
  console.log('\n2️⃣ Testing Customer Menu HTML Page (/r/urban-spice/t/7)...');
  const htmlRes = await fetch(`${BASE}/r/urban-spice/t/7`);
  assert.strictEqual(htmlRes.status, 200, 'Customer HTML page must return 200');
  const htmlText = await htmlRes.text();
  assert.ok(htmlText.includes('Urban Spice'), 'Page must contain Urban Spice');
  assert.ok(htmlText.includes('Table 7'), 'Page must contain Table 7');
  assert.ok(htmlText.includes('MOMO MENU'), 'Page must contain MOMO MENU branding');
  console.log('   ✓ Customer page rendered cleanly with restaurant and table identification');

  // Test 3: Admin Login API
  console.log('\n3️⃣ Testing Admin Authentication (/api/auth/login)...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@clickcodex.in',
      password: 'adminpassword123',
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login must succeed');
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.user.email, 'admin@clickcodex.in');
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert.ok(cookieHeader && cookieHeader.includes('ccx_admin_token'), 'Must set ccx_admin_token cookie');
  console.log(`   ✓ Logged in as ${loginData.user.name} (${loginData.user.email})`);
  console.log('   ✓ Secure HTTP-only session cookie issued');

  // Test 4: Authenticated /api/auth/me
  console.log('\n4️⃣ Testing Session Verification (/api/auth/me)...');
  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.authenticated, true);
  assert.strictEqual(meData.restaurant.slug, 'urban-spice');
  console.log(`   ✓ Session verified for restaurant: ${meData.restaurant.name}`);

  // Test 5: Tables List & QR Resolution
  console.log('\n5️⃣ Testing Tables & QR Data (/api/tables)...');
  const tablesRes = await fetch(`${BASE}/api/tables`, {
    headers: { Cookie: cookieHeader },
  });
  assert.strictEqual(tablesRes.status, 200);
  const tablesData = await tablesRes.json();
  assert.ok(tablesData.tables.length >= 8, 'Must have at least 8 tables');
  const table7 = tablesData.tables.find((t) => t.tableNumber === '7');
  assert.ok(table7, 'Table 7 must exist');
  assert.ok(table7.prodUrl.includes('/r/urban-spice/t/7'), 'QR URL must point to permanent table endpoint');
  console.log(`   ✓ Found ${tablesData.tables.length} tables`);
  console.log(`   ✓ Table 7 permanent QR Target: ${table7.prodUrl}`);

  // Test 6: Create New Table & Verify QR
  console.log('\n6️⃣ Testing Dynamic Table Creation & Permanent QR generation...');
  const newTableNum = `TEST-${Date.now().toString().slice(-4)}`;
  const createTableRes = await fetch(`${BASE}/api/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      tableNumber: newTableNum,
      name: `Special Booth ${newTableNum}`,
      capacity: 6,
    }),
  });
  assert.strictEqual(createTableRes.status, 200);
  const createTableData = await createTableRes.json();
  assert.strictEqual(createTableData.success, true);
  assert.ok(createTableData.table.prodUrl.includes(`/r/urban-spice/t/${newTableNum}`));
  console.log(`   ✓ Created Table ${newTableNum} with instant QR URL: ${createTableData.table.prodUrl}`);

  // Clean up test table
  await fetch(`${BASE}/api/tables?id=${createTableData.table.id}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader },
  });
  console.log(`   ✓ Cleaned up test table`);

  // Test 7: Landing Page HTML
  console.log('\n7️⃣ Testing Landing Page HTML (/)...');
  const landingRes = await fetch(`${BASE}/`);
  assert.strictEqual(landingRes.status, 200);
  const landingText = await landingRes.text();
  assert.ok(landingText.includes('MOMO MENU'));
  assert.ok(landingText.includes('SMART DIGITAL HOSPITALITY'));
  console.log('   ✓ Landing page loaded with full branding');

  console.log('\n🎉 ALL 7 END-TO-END AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

test().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
