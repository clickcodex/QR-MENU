import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const tableNumber = searchParams.get('table');

    if (!slug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
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
      return NextResponse.json(
        { error: 'Restaurant not found. Please verify the URL or ask the restaurant staff.' },
        { status: 404 }
      );
    }

    if (!restaurant.isActive) {
      return NextResponse.json(
        { error: 'This restaurant menu is currently unavailable. Please ask a member of our staff for assistance.' },
        { status: 403 }
      );
    }

    // Resolve table if specified
    let tableInfo = null;
    if (tableNumber) {
      const cleanTable = String(tableNumber).trim();
      const tableRecord = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId: restaurant.id,
            tableNumber: cleanTable,
          },
        },
        include: {
          qrTokens: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      });

      if (tableRecord) {
        tableInfo = {
          tableNumber: tableRecord.tableNumber,
          name: tableRecord.name || `Table ${tableRecord.tableNumber}`,
          capacity: tableRecord.capacity,
          isValid: true,
        };

        // Asynchronously update scan count if qrToken exists
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
      } else {
        tableInfo = {
          tableNumber: cleanTable,
          name: `Table ${cleanTable}`,
          isValid: false,
        };
      }
    }

    const sanitizedRestaurant = {
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

    const categories = restaurant.categories.map((cat) => ({
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

    return NextResponse.json({
      success: true,
      restaurant: sanitizedRestaurant,
      table: tableInfo,
      categories,
      totalItems,
    });
  } catch (error) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json(
      { error: 'Failed to load restaurant menu. Please try again shortly.' },
      { status: 500 }
    );
  }
}
