import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order1022 = await prisma.order.findFirst({
    where: { orderNumber: 1022 },
  });
  console.log('Order 1022:', order1022);
  await prisma.$disconnect();
}

main();
