'use client';

import React from 'react';
import { ShoppingBag, ArrowRight, Receipt, Utensils } from 'lucide-react';
import type { CartItem } from './CartDrawer';

interface FloatingCartBarProps {
  totalCount: number;
  cart: CartItem[];
  onOpenCart: () => void;
  isController?: boolean;
}

export function FloatingCartBar({
  totalCount,
  cart,
  onOpenCart,
  isController = true,
}: FloatingCartBarProps) {
  if (totalCount === 0 || cart.length === 0) return null;

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-40 animate-slide-up">
      <div
        onClick={onOpenCart}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenCart();
          }
        }}
        className="bg-[#1C1917] text-white p-3 sm:p-3.5 rounded-2xl shadow-float flex items-center justify-between cursor-pointer hover:bg-[#292524] transition active:scale-[0.99] border border-white/10 gap-3"
      >
        {/* Left: Quantity Badge + Numbered Dishes Preview */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-9 h-9 rounded-xl bg-[#E86326] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <ShoppingBag className="w-4 h-4" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[#1C1917] text-[10px] font-black flex items-center justify-center shadow-sm">
              {totalCount}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">
                {totalCount} {totalCount === 1 ? 'Item' : 'Items'} Selected
              </span>
              {!isController && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium">
                  Guest View
                </span>
              )}
            </div>

            {/* Clear Numbered Item List (1., 2., 3...) without displaying prices */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-1 text-[11px] text-[#D6D3D1]">
              {cart.map((cartItem, idx) => (
                <span
                  key={cartItem.item.id}
                  className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md flex-shrink-0 text-white font-medium text-[10px] sm:text-[11px]"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#E86326]/60 text-[9px] font-bold flex items-center justify-center text-white flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[120px] sm:max-w-[150px]">
                    {cartItem.item.name}
                  </span>
                  <span className="text-[#A8A29E] font-bold">({cartItem.quantity})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Distinct "View Bill / Order" Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCart();
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold shadow-sm transition active:scale-95"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">View Order ({totalCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
