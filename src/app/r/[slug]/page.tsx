import React from 'react';
import type { Metadata } from 'next';
import { CustomerMenuView } from '@/components/customer/CustomerMenuView';
import { getPublicMenuData, getCachedRestaurantMenu } from '@/lib/menu';

export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCachedRestaurantMenu(params.slug);

  if (!data?.restaurant) {
    return {
      title: 'Restaurant Not Found — MOMO MENU',
    };
  }

  const { restaurant } = data;

  return {
    title: `${restaurant.name} — Digital Menu | MOMO MENU`,
    description:
      restaurant.description ||
      `Browse digital menu for ${restaurant.name} (${restaurant.cuisine}). Instant contactless mobile menu.`,
  };
}

export default async function RestaurantMenuPage({ params }: PageProps) {
  const initialData = await getPublicMenuData(params.slug);
  return <CustomerMenuView slug={params.slug} initialData={initialData} />;
}
