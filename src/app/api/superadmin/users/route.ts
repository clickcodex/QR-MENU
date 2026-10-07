import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET all users across the platform
export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      restaurantId: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      restaurants: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

// POST create a new user (any role)
export async function POST(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const { email, password, name, role, restaurantId } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const validRole = ['SUPERADMIN', 'ADMIN', 'KITCHEN'].includes(role) ? role : 'ADMIN';

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name.trim(),
        role: validRole,
        restaurantId: restaurantId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        restaurantId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT update ANY user (email, name, role, restaurant, and NEW PASSWORD)
export async function PUT(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const { userId, email, name, role, restaurantId, newPassword } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailConflict = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (emailConflict && emailConflict.id !== userId) {
        return NextResponse.json({ error: 'This email is already taken by another user' }, { status: 400 });
      }
      updateData.email = cleanEmail;
    }

    if (name) {
      updateData.name = name.trim();
    }

    if (role && ['SUPERADMIN', 'ADMIN', 'KITCHEN'].includes(role)) {
      updateData.role = role;
    }

    if (restaurantId !== undefined) {
      updateData.restaurantId = restaurantId || null;
    }

    // Direct password change for anyone!
    if (newPassword && newPassword.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
    } else if (newPassword && newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        restaurantId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.email} updated successfully`,
      user: updatedUser,
      passwordChanged: Boolean(newPassword),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE delete user
export async function DELETE(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own Super Admin account' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
