'use client';

import React from 'react';
import {
  Receipt,
  ArrowRight,
  Clock,
  Trash2,
  CheckCircle2,
  Flame,
  UtensilsCrossed,
  Plus,
} from 'lucide-react';

interface OrderTrackingSectionProps {
  order: any;
  currencySymbol?: string;
  isController: boolean;
  remainingModSeconds: number;
  isModifiable: boolean;
  onOpenTracking: () => void;
  onOpenModify: () => void;
}

export function OrderTrackingSection({
  order,
  currencySymbol = '₹',
  isController,
  remainingModSeconds,
  isModifiable,
  onOpenTracking,
  onOpenModify,
}: OrderTrackingSectionProps) {
  if (
    !order ||
    order.status === 'COMPLETED' ||
    order.status === 'CANCELLED' ||
    !order.orderItems ||
    order.orderItems.length === 0
  ) {
    return null;
  }

  const isOrderAccepted = Boolean(order?.status && order.status !== 'PENDING');

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ACCEPTED':
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'READY':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DELIVERED':
      case 'SERVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <section
      aria-label="Active order tracking"
      className="bg-[#FFF7ED] border-b border-[#FED7AA] px-4 py-2 sm:py-2.5"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Order Info & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#E86326] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
            <Receipt className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-[#1C1917]">
                Order #{order.orderNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>

              {/* 5-Minute Window Tag */}
              {isModifiable && remainingModSeconds > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isOrderAccepted
                      ? 'text-orange-900 bg-orange-100/90 border border-orange-300'
                      : 'text-amber-800 bg-amber-100/90 border border-amber-300 animate-pulse'
                  }`}
                >
                  <Clock className={`w-3 h-3 ${isOrderAccepted ? 'text-[#E86326]' : 'text-amber-700'}`} />
                  <span>
                    {isOrderAccepted
                      ? `+Add Dishes: ${formatCountdown(remainingModSeconds)} left`
                      : `5-min Edit: ${formatCountdown(remainingModSeconds)} left`}
                  </span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#78716C] truncate mt-0.5">
              {order.status === 'PENDING'
                ? 'Order received • Reviewing by staff (Dishes can be removed)'
                : order.status === 'ACCEPTED' || order.status === 'PREPARING'
                ? 'Order accepted by kitchen • You can add more dishes'
                : order.status === 'READY'
                ? 'Food is ready & being served'
                : 'Delivered to table ✓'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          {/* Add Dishes Button (when accepted) or Modify/Remove Button (when pending) */}
          {isController && isModifiable && remainingModSeconds > 0 && (
            isOrderAccepted ? (
              <button
                onClick={onOpenModify}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] shadow-2xs transition"
                title="Order accepted by kitchen • Add more dishes to this order"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Dishes</span>
              </button>
            ) : (
              <button
                onClick={onOpenModify}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-bold text-amber-950 hover:bg-[#FFFDF8] shadow-2xs transition"
                title="Add dishes or remove mistakenly added items before order is accepted"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#E86326]" />
                <span>Modify / Remove Dishes</span>
              </button>
            )
          )}

          {/* Track Live Detail Button */}
          <button
            onClick={onOpenTracking}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-bold text-[#E86326] hover:bg-[#FFFDF8] shadow-2xs transition"
          >
            <span>Track Live</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
