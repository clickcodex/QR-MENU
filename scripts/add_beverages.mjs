import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Adding Beverages category and menu items...");

  // Find all restaurants (primarily The Momo's Wala)
  const restaurants = await prisma.restaurant.findMany();

  if (restaurants.length === 0) {
    console.error("No restaurants found in database!");
    return;
  }

  for (const restaurant of restaurants) {
    console.log(`Processing restaurant: ${restaurant.name} (${restaurant.id})`);

    // 1. Create or update category "Beverages"
    let category = await prisma.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: { equals: 'Beverages' },
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Beverages',
          description: 'Refreshing hot teas, aromatic coffees, and thick chilled shakes',
          displayOrder: 8,
          isActive: true,
          restaurantId: restaurant.id,
        },
      });
      console.log(`Created Beverages category (${category.id})`);
    } else {
      category = await prisma.category.update({
        where: { id: category.id },
        data: {
          name: 'Beverages',
          description: 'Refreshing hot teas, aromatic coffees, and thick chilled shakes',
          displayOrder: 8,
          isActive: true,
        },
      });
      console.log(`Updated existing Beverages category (${category.id})`);
    }

    // 2. Define the 6 beverage items from the menu card
    const beverageItems = [
      {
        name: 'Chai',
        description: 'Traditional Indian kadak masala milk tea brewed with fresh ginger, cardamom & aromatic herbs',
        price: 10,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        isAvailable: true,
        displayOrder: 1,
      },
      {
        name: 'Kullad Chai',
        description: 'Desi fragrant masala tea served in an authentic earthen clay kullad for that earthy aroma and rich flavor',
        price: 15,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        isAvailable: true,
        displayOrder: 2,
      },
      {
        name: 'Hot Coffee',
        description: 'Freshly brewed piping hot coffee with a rich aroma and velvety froth',
        price: 15,
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: false,
        isAvailable: true,
        displayOrder: 3,
      },
      {
        name: 'Cold Coffee',
        description: 'Classic thick blended chilled coffee served cold with frothy chocolate layer',
        price: 70,
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        isAvailable: true,
        displayOrder: 4,
      },
      {
        name: 'Cold Coffee with Ice-Cream',
        description: 'Rich indulgent cold coffee topped with a generous scoop of creamy vanilla ice cream & chocolate drizzle',
        price: 90,
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        isAvailable: true,
        displayOrder: 5,
      },
      {
        name: 'Oreo Shake',
        description: 'Thick gourmet milkshake loaded with crushed crunchy Oreo cookies and chocolate drizzle',
        price: 100,
        imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        isAvailable: true,
        displayOrder: 6,
      },
    ];

    for (const item of beverageItems) {
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
        },
      });

      if (existingItem) {
        await prisma.menuItem.update({
          where: { id: existingItem.id },
          data: {
            ...item,
            categoryId: category.id,
            restaurantId: restaurant.id,
          },
        });
        console.log(`Updated item: ${item.name} (₹${item.price})`);
      } else {
        await prisma.menuItem.create({
          data: {
            ...item,
            categoryId: category.id,
            restaurantId: restaurant.id,
          },
        });
        console.log(`Created item: ${item.name} (₹${item.price})`);
      }
    }
  }

  console.log("Successfully added Beverages and all items to database!");
}

main()
  .catch((e) => {
    console.error("Error adding beverages:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
