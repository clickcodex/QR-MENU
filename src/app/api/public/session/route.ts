import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveTableSession } from '@/lib/reservation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const tableNumber = searchParams.get('table') || searchParams.get('tableNumber');
    const clientToken = req.headers.get('x-controller-token') || searchParams.get('token');
    const customerName = searchParams.get('customerName');

    if (!slug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 });
    }
    if (!tableNumber) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim();
    let restaurant = await prisma.restaurant.findUnique({
      where: { slug: cleanSlug },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [
            { slug: 'the-momos-wala' },
            { slug: 'urban-spice' },
            { isActive: true }
          ]
        },
        select: { id: true, name: true, slug: true, isActive: true },
      });
    }

    if (!restaurant || !restaurant.isActive) {
      return NextResponse.json({ error: 'Restaurant not found or closed' }, { status: 404 });
    }

    const session = await resolveTableSession({
      restaurantId: restaurant.id,
      tableNumber,
      clientToken,
      customerName: customerName || undefined,
    });

    if (!session) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...session,
    });
  } catch (error) {
    console.error('Error resolving table session:', error);
    return NextResponse.json(
      { error: 'Failed to resolve table session. Please notify staff.' },
      { status: 500 }
    );
  }
}
