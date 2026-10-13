import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signAdminToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        restaurants: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        restaurant: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Resolve restaurant
    let restaurant = (user.restaurant || user.restaurants[0] || null) as any;
    if (!restaurant && user.role === 'SUPERADMIN') {
      restaurant = await prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    // Determine redirect destination based on role
    let redirectTo = '/admin';
    if (user.role === 'SUPERADMIN') {
      redirectTo = '/superadmin';
    } else if (user.role === 'KITCHEN') {
      redirectTo = '/kitchen/orders';
    }

    const token = signAdminToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: restaurant?.id || '',
    });

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
