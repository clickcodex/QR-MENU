import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import type { RestaurantData, TableData } from '@/components/customer/RestaurantHeader';
import type { CategoryData } from '@/components/customer/CategoryBar';

export interface PublicMenuPayload {
  restaurant: RestaurantData | null;
  table: TableData | null;
  categories: CategoryData[];
  totalItems: number;
  error?: string;
  isUnavailable?: boolean;
}

/**
 * Fetch and cache the restaurant info, active categories, and menu items.
 * Cached for 60 seconds across all guests and table scans to maximize throughput and minimize DB load.
 */
export const getCachedRestaurantMenu = unstable_cache(
  async (slug: string) => {
    const cleanSlug = slug.toLowerCase().trim();
    let restaurant = await prisma.restaurant.findUnique({
      where: { slug: cleanSlug },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            menuItems: {
              orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [{ slug: 'the-momos-wala' }, { slug: 'urban-spice' }, { isActive: true }],
        },
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
              menuItems: {
                orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
              },
            },
          },
        },
      });
    }

    if (!restaurant) {
      return null;
    }

    const sanitizedRestaurant: RestaurantData = {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      logoUrl: restaurant.logoUrl,
      coverUrl: restaurant.coverUrl,
      address: restaurant.address,
      phone: restaurant.phone,
      openingHours: restaurant.openingHours,
      currencySymbol: restaurant.currencySymbol || '₹',
    };

    const categories: CategoryData[] = restaurant.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      displayOrder: cat.displayOrder,
      items: cat.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        isSpicy: item.isSpicy,
        isBestseller: item.isBestseller,
        isAvailable: item.isAvailable,
        displayOrder: item.displayOrder,
      })),
    }));

    const totalItems = categories.reduce((acc, cat) => acc + cat.items.length, 0);

    return {
      restaurant: sanitizedRestaurant,
      isActive: restaurant.isActive,
      categories,
      totalItems,
    };
  },
  ['public-restaurant-menu'],
  {
    revalidate: 60, // 60 seconds ISR cache
    tags: ['restaurant-menu'],
  }
);

/**
 * Resolves table metadata and updates scan statistics.
 */
export async function getTableInfo(restaurantId: string, tableNumber: string): Promise<TableData | null> {
  const cleanTable = String(tableNumber).trim();
  try {
    const tableRecord = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId,
          tableNumber: cleanTable,
        },
      },
      include: {
        qrTokens: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (tableRecord) {
      // Async scan counter update without blocking page render
      if (tableRecord.qrTokens[0]) {
        prisma.qRToken
          .update({
            where: { id: tableRecord.qrTokens[0].id },
            data: {
              scansCount: { increment: 1 },
              lastScannedAt: new Date(),
            },
          })
          .catch(() => {});
      }

      return {
        tableNumber: tableRecord.tableNumber,
        name: tableRecord.name || `Table ${tableRecord.tableNumber}`,
        capacity: tableRecord.capacity,
        isValid: true,
      };
    }

    return {
      tableNumber: cleanTable,
      name: `Table ${cleanTable}`,
      isValid: false,
    };
  } catch (err) {
    return {
      tableNumber: cleanTable,
      name: `Table ${cleanTable}`,
      isValid: false,
    };
  }
}

/**
 * Complete public menu data loader used by both SSR Server Components and public API route.
 */
export async function getPublicMenuData(slug: string, tableNumber?: string): Promise<PublicMenuPayload> {
  if (!slug) {
    return {
      restaurant: null,
      table: null,
      categories: [],
      totalItems: 0,
      error: 'Restaurant slug is required',
    };
  }

  const data = await getCachedRestaurantMenu(slug);
  if (!data) {
    return {
      restaurant: null,
      table: null,
      categories: [],
      totalItems: 0,
      error: 'Restaurant not found. Please verify the URL or ask the restaurant staff.',
    };
  }

  if (!data.isActive) {
    return {
      restaurant: null,
      table: null,
      categories: [],
      totalItems: 0,
      isUnavailable: true,
      error: 'This restaurant menu is currently unavailable. Please ask a member of our staff for assistance.',
    };
  }

  let tableInfo: TableData | null = null;
  if (tableNumber) {
    tableInfo = await getTableInfo(data.restaurant.id, tableNumber);
  }

  return {
    restaurant: data.restaurant,
    table: tableInfo,
    categories: data.categories,
    totalItems: data.totalItems,
  };
}
