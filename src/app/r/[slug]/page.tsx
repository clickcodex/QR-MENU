import React from 'react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { CustomerMenuView } from '@/components/customer/CustomerMenuView';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    select: { name: true, cuisine: true, description: true },
  });

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found — MOMO MENU',
    };
  }

  return {
    title: `${restaurant.name} — Digital Menu | MOMO MENU`,
    description: restaurant.description || `Browse digital menu for ${restaurant.name} (${restaurant.cuisine}). Instant contactless mobile menu.`,
  };
}

export default function RestaurantMenuPage({ params }: PageProps) {
  return <CustomerMenuView slug={params.slug} />;
}
