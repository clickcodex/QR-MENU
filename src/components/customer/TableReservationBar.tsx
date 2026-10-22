'use client';

import React from 'react';
import {
  ShieldCheck,
  Eye,
  Clock,
  Users,
  AlertTriangle,
  Utensils,
  CheckCircle2,
} from 'lucide-react';
import type { TableData } from './RestaurantHeader';
import type { TableStatus, ReservationStatus } from '@/lib/reservation';

interface TableReservationBarProps {
  table: TableData | null;
  tableStatus?: TableStatus;
  isController: boolean;
  reservation?: {
    id: string;
    status: ReservationStatus;
    customerName: string | null;
    expiresAt: string;
    remainingSeconds: number;
    reservationType: string;
  } | null;
  hasActiveOrder?: boolean;
}

export function TableReservationBar({
  table,
  tableStatus = 'AVAILABLE',
  isController,
  reservation,
  hasActiveOrder = false,
}: TableReservationBarProps) {
  // Presentation-only removal: Customer badges (Temp Reservation and Order Controller)
  // are removed from the customer header. Table information is rendered directly in RestaurantHeader.
  // Underlying reservation logic, expiration, table status, and controller tokens remain active.
  return null;
}
