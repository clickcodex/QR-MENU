import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Cancel old stale pending test orders (older than 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const updated = await prisma.order.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: fifteenMinutesAgo },
    },
    data: {
      status: 'CANCELLED',
    },
  });

  console.log('Stale pending test orders cancelled:', updated.count);

  // Set tables back to AVAILABLE if they have no active orders
  const tables = await prisma.table.findMany();
  for (const t of tables) {
    const active = await prisma.order.findFirst({
      where: {
        tableId: t.id,
        status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'SERVED'] },
      },
    });
    if (!active) {
      await prisma.table.update({
        where: { id: t.id },
        data: {
          status: 'AVAILABLE',
          currentReservationId: null,
          currentControllerToken: null,
          controllerName: null,
        },
      });
    }
  }

  console.log('Tables refreshed and set to AVAILABLE where appropriate.');
  await prisma.$disconnect();
}

main();
