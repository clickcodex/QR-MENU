import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING' },
    select: { id: true, orderNumber: true, tableNumber: true, createdAt: true },
  });
  console.log('Pending orders count:', pendingOrders.length);
  console.log('Pending orders:', pendingOrders);
  await prisma.$disconnect();
}

main();
