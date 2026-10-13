'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED';

export const ORDER_STATUS_STEPS: Array<{ key: OrderStatus; label: string; shortDesc: string }> = [
  { key: 'PENDING', label: 'PENDING', shortDesc: 'Order Received' },
  { key: 'ACCEPTED', label: 'ACCEPTED', shortDesc: 'Confirmed' },
  { key: 'PREPARING', label: 'PREPARING', shortDesc: 'In Kitchen' },
  { key: 'READY', label: 'READY', shortDesc: 'Food Ready' },
  { key: 'SERVED', label: 'SERVED', shortDesc: 'Served to Table' },
  { key: 'COMPLETED', label: 'COMPLETED', shortDesc: 'Bill Settled' },
];

interface OrderStatusPathProps {
  currentStatus: OrderStatus | string;
  size?: 'sm' | 'md';
  compact?: boolean;
}

export function OrderStatusPath({ currentStatus, size = 'md', compact = false }: OrderStatusPathProps) {
  const currentIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#E86326] uppercase tracking-wider">
        <span>Order Status Path</span>
        <span className="text-[10px] text-[#78716C] font-normal normal-case">
          Statuses never skip or go backwards
        </span>
      </div>

      {/* Breadcrumb Stepper Strip */}
      <div className="grid grid-cols-6 rounded-xl overflow-hidden border border-[#D34F15]/30 bg-[#FFF7ED] text-center shadow-xs">
        {ORDER_STATUS_STEPS.map((step, idx) => {
          const isCurrent = idx === currentIndex;
          const isPassed = idx < currentIndex;
          const isUpcoming = idx > currentIndex;

          let bgClasses = 'bg-[#FAFAF8] text-[#A8A29E]';
          if (isCurrent) {
            bgClasses = 'bg-[#E86326] text-white font-black shadow-inner';
          } else if (isPassed) {
            bgClasses = 'bg-[#C2410C] text-white/90 font-bold';
          } else {
            bgClasses = 'bg-[#F5F5F0] text-[#78716C] font-semibold opacity-70';
          }

          return (
            <div
              key={step.key}
              className={`py-2 px-1 flex flex-col items-center justify-center border-r border-white/20 last:border-r-0 transition-colors ${bgClasses}`}
            >
              <div className="flex items-center gap-1">
                {isPassed && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                <span
                  className={`${
                    size === 'sm' ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'
                  } tracking-wider font-extrabold truncate`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
