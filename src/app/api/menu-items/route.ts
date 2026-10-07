import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');

  const items = await prisma.menuItem.findMany({
    where: {
      restaurantId: session.restaurant.id,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const {
      name,
      description,
      price,
      imageUrl,
      isVeg,
      isSpicy,
      isBestseller,
      isAvailable,
      displayOrder,
      categoryId,
    } = data;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }
    if (price === undefined || isNaN(Number(price))) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Verify category belongs to this restaurant
    const category = await prisma.category.findFirst({
      where: { id: categoryId, restaurantId: session.restaurant.id },
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        imageUrl: imageUrl?.trim() || null,
        isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
        isSpicy: Boolean(isSpicy),
        isBestseller: Boolean(isBestseller),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        displayOrder: Number(displayOrder) || 0,
        categoryId,
        restaurantId: session.restaurant.id,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Create menu item error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Verify item ownership
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Menu item not found or access denied' }, { status: 404 });
    }

    // If changing category, check it belongs to this restaurant
    if (updates.categoryId && updates.categoryId !== existing.categoryId) {
      const validCategory = await prisma.category.findFirst({
        where: { id: updates.categoryId, restaurantId: session.restaurant.id },
      });
      if (!validCategory) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(updates.name ? { name: updates.name.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description?.trim() || null } : {}),
        ...(updates.price !== undefined ? { price: parseFloat(updates.price) } : {}),
        ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl?.trim() || null } : {}),
        ...(updates.isVeg !== undefined ? { isVeg: Boolean(updates.isVeg) } : {}),
        ...(updates.isSpicy !== undefined ? { isSpicy: Boolean(updates.isSpicy) } : {}),
        ...(updates.isBestseller !== undefined ? { isBestseller: Boolean(updates.isBestseller) } : {}),
        ...(updates.isAvailable !== undefined ? { isAvailable: Boolean(updates.isAvailable) } : {}),
        ...(updates.displayOrder !== undefined ? { displayOrder: Number(updates.displayOrder) } : {}),
        ...(updates.categoryId ? { categoryId: updates.categoryId } : {}),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Update menu item error:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Menu item not found or access denied' }, { status: 404 });
    }

    await prisma.menuItem.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
