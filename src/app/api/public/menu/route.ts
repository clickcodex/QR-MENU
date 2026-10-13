import { NextResponse } from 'next/server';
import { getPublicMenuData } from '@/lib/menu';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const tableNumber = searchParams.get('table');

    if (!slug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 });
    }

    const result = await getPublicMenuData(slug, tableNumber || undefined);

    if (result.error) {
      const status = result.isUnavailable ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(
      {
        success: true,
        restaurant: result.restaurant,
        table: result.table,
        categories: result.categories,
        totalItems: result.totalItems,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json(
      { error: 'Failed to load restaurant menu. Please try again shortly.' },
      { status: 500 }
    );
  }
}
