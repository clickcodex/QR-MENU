import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.restaurant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, tableId, reservationId, reason } = await req.json();
    if (!action || !tableId) {
      return NextResponse.json({ error: 'Action and tableId are required' }, { status: 400 });
    }

    // Verify table belongs to admin's restaurant
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId: session.restaurant.id },
      include: {
        reservations: {
          where: { status: 'TEMPORARY' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (action === 'cancel-reservation') {
      const resId = reservationId || table.currentReservationId || table.reservations[0]?.id;

      await prisma.$transaction(async (tx) => {
        if (resId) {
          await tx.reservation.update({
            where: { id: resId },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelledBy: `${session.user.name} (${session.user.role})`,
              cancellationReason: reason?.trim() || 'Manual cancellation by restaurant staff',
            },
          });
        }

        await tx.table.update({
          where: { id: table.id },
          data: {
            status: 'AVAILABLE',
            currentReservationId: null,
            currentControllerToken: null,
            controllerName: null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Reservation for Table ${table.tableNumber} cancelled successfully. Table is now Available.`,
      });
    }

    if (action === 'release-table') {
      // Release table back to AVAILABLE
      await prisma.$transaction(async (tx) => {
        // If there's an active temporary reservation, cancel it
        if (table.currentReservationId) {
          await tx.reservation.updateMany({
            where: { id: table.currentReservationId, status: 'TEMPORARY' },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: session.user.name },
          });
        }

        await tx.table.update({
          where: { id: table.id },
          data: {
            status: 'AVAILABLE',
            currentReservationId: null,
            currentControllerToken: null,
            controllerName: null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Table ${table.tableNumber} released and marked Available.`,
      });
    }

    if (action === 'reassign-controller') {
      // Clear controller token so a new customer or staff device can claim
      await prisma.$transaction(async (tx) => {
        if (table.currentReservationId) {
          await tx.reservation.updateMany({
            where: { id: table.currentReservationId, status: 'TEMPORARY' },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Controller session reset by staff' },
          });
        }

        await tx.table.update({
          where: { id: table.id },
          data: {
            status: 'AVAILABLE',
            currentReservationId: null,
            currentControllerToken: null,
            controllerName: null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Controller session for Table ${table.tableNumber} has been reset. A new guest can now claim the table.`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Table action error:', error);
    return NextResponse.json({ error: 'Failed to execute table action' }, { status: 500 });
  }
}
