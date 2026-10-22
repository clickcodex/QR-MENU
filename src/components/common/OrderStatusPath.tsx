'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export const ORDER_STATUS_STEPS: Array<{ key: string; label: string; shortDesc: string }> = [
  { key: 'PENDING', label: '1. PENDING', shortDesc: 'New Order' },
  { key: 'ACCEPTED', label: '2. ACCEPTED', shortDesc: 'Preparing' },
  { key: 'DELIVERED', label: '3. DELIVERED', shortDesc: 'Served to Table' },
];

interface OrderStatusPathProps {
  currentStatus: OrderStatus | string;
  size?: 'sm' | 'md';
  compact?: boolean;
}

export function OrderStatusPath({ currentStatus, size = 'md', compact = false }: OrderStatusPathProps) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 uppercase tracking-wider">
          <span>Order Status</span>
          <span className="text-[10px] text-rose-500 font-semibold normal-case">
            Fully Cancelled
          </span>
        </div>
        <div className="w-full py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Order Fully Cancelled</span>
          </span>
          <span className="text-[11px] font-medium text-rose-600">Dishes Removed</span>
        </div>
      </div>
    );
  }

  // Normalize status into the 3 core stages
  let normalizedKey = 'PENDING';
  if (currentStatus === 'ACCEPTED' || currentStatus === 'PREPARING' || currentStatus === 'READY') {
    normalizedKey = 'ACCEPTED';
  } else if (
    currentStatus === 'DELIVERED' ||
    currentStatus === 'SERVED' ||
    currentStatus === 'COMPLETED'
  ) {
    normalizedKey = 'DELIVERED';
  }

  const currentIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === normalizedKey);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#E86326] uppercase tracking-wider">
        <span>Order Status</span>
        <span className="text-[10px] text-[#78716C] font-normal normal-case">
          Pending → Accepted → Delivered
        </span>
      </div>

      {/* Breadcrumb Stepper Strip */}
      <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#D34F15]/30 bg-[#FFF7ED] text-center shadow-xs">
        {ORDER_STATUS_STEPS.map((step, idx) => {
          const isCurrent = idx === currentIndex;
          const isPassed = idx < currentIndex;

          let bgClasses = 'bg-[#FAFAF8] text-[#A8A29E]';
          if (isCurrent) {
            bgClasses = 'bg-[#E86326] text-white font-black shadow-inner';
          } else if (isPassed) {
            bgClasses = 'bg-[#16A34A] text-white font-bold';
          } else {
            bgClasses = 'bg-[#F5F5F0] text-[#78716C] font-semibold opacity-70';
          }

          return (
            <div
              key={step.key}
              className={`py-2 px-1.5 flex flex-col items-center justify-center border-r border-white/20 last:border-r-0 transition-colors ${bgClasses}`}
            >
              <div className="flex items-center gap-1">
                {isPassed && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                <span
                  className={`${
                    size === 'sm' ? 'text-[10px] sm:text-[11px]' : 'text-xs sm:text-xs'
                  } tracking-wider font-extrabold truncate`}
                >
                  {step.label}
                </span>
              </div>
              {!compact && (
                <span
                  className={`text-[9px] ${
                    isCurrent ? 'text-white/90' : isPassed ? 'text-white/80' : 'text-[#A8A29E]'
                  }`}
                >
                  {step.shortDesc}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
