import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'clickcodex_smart_menu_jwt_secret_key_default';
export const AUTH_COOKIE_NAME = 'ccx_admin_token';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId?: string;
  iat?: number;
  exp?: number;
}

export type AdminJwtPayload = AuthJwtPayload;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAdminToken(payload: { userId: string; email: string; role?: string; restaurantId?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AuthJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyAdminToken(token);
    if (!decoded?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        restaurants: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        restaurant: true,
      },
    });

    if (!user) return null;

    // Resolve active restaurant:
    // If Kitchen staff, they have user.restaurant
    // If Admin/Owner, they have user.restaurants[0]
    // If Superadmin, fallback to first restaurant in DB if none owned
    let activeRestaurant = user.restaurant || user.restaurants[0] || null;
    if (!activeRestaurant && user.role === 'SUPERADMIN') {
      activeRestaurant = await prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: activeRestaurant,
    };
  } catch (err) {
    console.error('Error fetching session:', err);
    return null;
  }
}

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;
  // Admin portal accessible to ADMIN and SUPERADMIN
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
    return null;
  }
  return session;
}

export async function getSuperAdminSession() {
  const session = await getSession();
  if (!session) return null;
  if (session.user.role !== 'SUPERADMIN') {
    return null;
  }
  return session;
}

export async function getKitchenSession() {
  const session = await getSession();
  if (!session) return null;
  // Kitchen orders portal accessible to KITCHEN, ADMIN, and SUPERADMIN
  if (session.user.role !== 'KITCHEN' && session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
    return null;
  }
  return session;
}
