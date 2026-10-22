import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: 'the-momos-wala' },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          menuItems: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!restaurant) {
    console.log('No restaurant found');
    return;
  }

  console.log(`\n========================================`);
  console.log(`Restaurant: ${restaurant.name}`);
  console.log(`Total Categories: ${restaurant.categories.length}`);
  console.log(`========================================\n`);

  for (const cat of restaurant.categories) {
    console.log(`[Category #${cat.displayOrder}] ${cat.name} (${cat.menuItems.length} items)`);
    console.log(`Description: ${cat.description || 'N/A'}`);
    for (const item of cat.menuItems) {
      console.log(`   ${item.displayOrder}. ${item.name.padEnd(30)} ₹${String(item.price).padEnd(5)} | Veg: ${item.isVeg ? '🌱' : '🍗'} | Bestseller: ${item.isBestseller ? '⭐' : '  '}`);
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
