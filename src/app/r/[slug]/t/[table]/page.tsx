import React from 'react';
import type { Metadata } from 'next';
import { CustomerMenuView } from '@/components/customer/CustomerMenuView';
import { getPublicMenuData, getCachedRestaurantMenu } from '@/lib/menu';

export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
    table: string;
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
    title: `${restaurant.name} (Table ${params.table}) — Digital QR Menu | MOMO MENU`,
    description: `Browse live table menu for ${restaurant.name} at Table ${params.table}. Instant mobile food menu powered by MOMO MENU.`,
  };
}

export default async function TableMenuPage({ params }: PageProps) {
  const initialData = await getPublicMenuData(params.slug, params.table);
  return <CustomerMenuView slug={params.slug} tableNumber={params.table} initialData={initialData} />;
}
