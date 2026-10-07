import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.restaurant.id },
    include: {
      _count: {
        select: {
          categories: true,
          menuItems: true,
          tables: true,
        },
      },
    },
  });

  return NextResponse.json({ restaurant });
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const {
      name,
      slug,
      description,
      cuisine,
      address,
      phone,
      openingHours,
      logoUrl,
      coverUrl,
      currencySymbol,
    } = data;

    // Check slug uniqueness if changed
    if (slug && slug !== session.restaurant.slug) {
      const existing = await prisma.restaurant.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json({ error: 'This restaurant URL slug is already taken' }, { status: 400 });
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id: session.restaurant.id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        description: description !== undefined ? description : undefined,
        cuisine: cuisine !== undefined ? cuisine : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        openingHours: openingHours !== undefined ? openingHours : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        coverUrl: coverUrl !== undefined ? coverUrl : undefined,
        currencySymbol: currencySymbol || '₹',
      },
    });

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json({ error: 'Failed to update restaurant profile' }, { status: 500 });
  }
}
