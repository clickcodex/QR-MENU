import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const restaurants = await prisma.restaurant.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      staff: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          tables: true,
          orders: true,
          menuItems: true,
          categories: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate SaaS aggregate stats
  const activeCount = restaurants.filter((r) => r.subscriptionStatus === 'ACTIVE').length;
  const expiredCount = restaurants.filter((r) => r.subscriptionStatus === 'EXPIRED').length;
  const monthlyRevenue = restaurants
    .filter((r) => r.subscriptionStatus === 'ACTIVE')
    .reduce((sum, r) => sum + r.monthlyFee, 0);

  return NextResponse.json({
    restaurants,
    summary: {
      totalRestaurants: restaurants.length,
      activeSubscriptions: activeCount,
      expiredSubscriptions: expiredCount,
      estimatedMonthlyRevenue: monthlyRevenue,
    },
  });
}

// PUT update subscription or restaurant settings
export async function PUT(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const {
      restaurantId,
      name,
      subscriptionStatus,
      subscriptionPlan,
      monthlyFee,
      renewalDate,
      isActive,
    } = await req.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;
    if (typeof monthlyFee === 'number') updateData.monthlyFee = monthlyFee;
    if (renewalDate) updateData.renewalDate = new Date(renewalDate);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription for ${updated.name} updated successfully`,
      restaurant: updated,
    });
  } catch (error) {
    console.error('Error updating restaurant subscription:', error);
    return NextResponse.json({ error: 'Failed to update restaurant subscription' }, { status: 500 });
  }
}
