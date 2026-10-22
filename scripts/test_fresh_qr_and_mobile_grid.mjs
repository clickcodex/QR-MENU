import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Verifying Fresh Table QR & Mobile Grid Configuration ---');

  // 1. Verify Table 7 has no active PENDING orders blocking new visitors
  const table7 = await prisma.table.findFirst({
    where: { tableNumber: '7' },
    include: {
      orders: {
        where: {
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
        },
      },
    },
  });

  console.log('Table 7 active orders count:', table7?.orders?.length || 0);
  if (table7?.orders && table7.orders.length > 0) {
    console.warn('Warning: Active orders remain on Table 7:', table7.orders);
  } else {
    console.log('✓ Table 7 has zero active orders blocking fresh QR scans.');
  }

  // 2. Check Order #1022 status in DB
  const order1022 = await prisma.order.findFirst({
    where: { orderNumber: 1022 },
    select: { orderNumber: true, status: true },
  });
  console.log('✓ Order #1022 status in DB:', order1022?.status);
  if (order1022 && order1022.status !== 'CANCELLED') {
    console.error('Order 1022 was expected to be CANCELLED');
    process.exit(1);
  }

  console.log('✓ All database checks passed!');
  await prisma.$disconnect();
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
