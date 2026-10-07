import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { restaurantId: session.restaurant.id },
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: {
        select: { menuItems: true },
      },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description, displayOrder } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        displayOrder: Number(displayOrder) || 0,
        restaurantId: session.restaurant.id,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, description, displayOrder, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: session.restaurant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        description: description !== undefined ? description : undefined,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
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
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: session.restaurant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
