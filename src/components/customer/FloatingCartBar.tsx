'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingCartBarProps {
  totalCount: number;
  subtotal: number;
  currencySymbol?: string;
  onOpenCart: () => void;
}

export function FloatingCartBar({
  totalCount,
  subtotal,
  currencySymbol = '₹',
  onOpenCart,
}: FloatingCartBarProps) {
  if (totalCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 animate-slide-up">
      <div
        onClick={onOpenCart}
        className="bg-[#1C1917] text-white p-3.5 sm:p-4 rounded-2xl shadow-float flex items-center justify-between cursor-pointer hover:bg-[#2C2825] transition active:scale-[0.98] border border-white/10"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-[#E86326] flex items-center justify-center text-white">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[#1C1917] text-[10px] font-black flex items-center justify-center shadow-sm">
              {totalCount}
            </span>
          </div>

          <div>
            <div className="text-xs text-[#A8A29E] font-medium leading-tight">
              {totalCount} {totalCount === 1 ? 'item' : 'items'} in table cart
            </div>
            <div className="text-sm font-bold text-white tracking-tight">
              {currencySymbol}{subtotal.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E86326] text-white text-xs font-bold shadow-sm">
          <span>View Bill & Order</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
