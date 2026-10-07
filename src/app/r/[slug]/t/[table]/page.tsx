import React from 'react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { CustomerMenuView } from '@/components/customer/CustomerMenuView';

interface PageProps {
  params: {
    slug: string;
    table: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    select: { name: true, cuisine: true },
  });

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found — MOMO MENU',
    };
  }

  return {
    title: `${restaurant.name} (Table ${params.table}) — Digital QR Menu | MOMO MENU`,
    description: `Browse live table menu for ${restaurant.name} at Table ${params.table}. Instant mobile food menu powered by MOMO MENU.`,
  };
}

export default function TableMenuPage({ params }: PageProps) {
  return <CustomerMenuView slug={params.slug} tableNumber={params.table} />;
}
