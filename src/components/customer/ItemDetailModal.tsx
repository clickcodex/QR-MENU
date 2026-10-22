'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Flame, CheckCircle2, AlertCircle } from 'lucide-react';
import { MenuItemData } from './FoodCard';
import { DietaryIndicator } from './DietaryIndicator';

interface ItemDetailModalProps {
  item: MenuItemData | null;
  currencySymbol?: string;
  tableName?: string | null;
  cartQty?: number;
  isController?: boolean;
  onClose: () => void;
  onAddToCart?: (item: MenuItemData) => void;
  onUpdateCartQty?: (itemId: string, delta: number) => void;
}

export function ItemDetailModal({
  item,
  currencySymbol = '₹',
  tableName,
  cartQty = 0,
  isController = true,
  onClose,
  onAddToCart,
  onUpdateCartQty,
}: ItemDetailModalProps) {
  const [imgError, setImgError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (item) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Card / Bottom Sheet */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-modal overflow-hidden animate-slide-up sm:animate-scale-in max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[#D2D2C8] rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-[#57534E] hover:text-[#1C1917] hover:bg-white transition"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto no-scrollbar flex-1">
          {/* Header Image */}
          <div className="relative w-full h-56 sm:h-64 bg-[#F4F4F0]">
            {item.imageUrl && !imgError ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F5F0] text-[#A8A29E]">
                <span className="text-4xl mb-2">🍽️</span>
                <span className="text-xs font-medium">The Momo&apos;s Wala Signature Recipe</span>
              </div>
            )}

            {/* Availability overlay if sold out */}
            {!item.isAvailable && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-[#1C1917] text-white text-xs uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg shadow-lg">
                  Currently Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Dietary & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-[#FAFAF8] border border-[#E5E5DE] inline-flex items-center gap-1.5">
                <DietaryIndicator isVeg={item.isVeg} size="md" showLabel />
              </div>

              {item.isBestseller && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Chef&apos;s Bestseller
                </span>
              )}

              {item.isSpicy && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <Flame className="w-3 h-3 text-rose-600" />
                  Spicy Preparation
                </span>
              )}

              {item.isAvailable ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ml-auto">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Freshly Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200 ml-auto">
                  <AlertCircle className="w-3 h-3 text-stone-500" />
                  Out of Stock
                </span>
              )}
            </div>

            {/* Title & Price */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] leading-tight">
                {item.name}
              </h2>
              <div className="text-xl sm:text-2xl font-black text-[#E86326] flex-shrink-0">
                {currencySymbol}{item.price}
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-[#57534E] leading-relaxed border-t border-[#F0F0EA] pt-3">
              {item.description || 'Prepared fresh with premium ingredients, aromatic spices, and traditional recipes.'}
            </div>

            {/* Dining Table Note */}
            <div className="bg-[#FFFDF8] border border-[#F5EAD4] rounded-2xl p-3.5 flex items-center justify-between text-xs text-[#78716C]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {tableName ? `Ordering for ${tableName}` : 'Dine-in Digital Menu'}
                </span>
              </div>
              <span className="font-semibold text-[#1C1917]">Contact-free Order</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom CTA */}
        <div className="p-4 sm:p-5 border-t border-[#EFEFEA] bg-[#FAFAF8] flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#78716C]">Price per dish</div>
            <div className="text-lg font-black text-[#1C1917]">
              {currencySymbol}{item.price}
            </div>
          </div>

          {item.isAvailable ? (
            !isController ? (
              <div className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200">
                Guest View Only
              </div>
            ) : cartQty > 0 ? (
              <div className="flex items-center gap-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-3 py-1.5 shadow-sm">
                <button
                  onClick={() => onUpdateCartQty && onUpdateCartQty(item.id, -1)}
                  className="w-8 h-8 rounded-xl bg-white text-[#9A3412] font-black flex items-center justify-center hover:bg-[#FFEDD5] border border-[#FED7AA]"
                  aria-label="Decrease"
                >
                  -
                </button>
                <div className="text-center px-1">
                  <span className="block text-xs font-black text-[#9A3412]">{cartQty}</span>
                  <span className="block text-[9px] text-[#C2410C] font-semibold">in cart</span>
                </div>
                <button
                  onClick={() => onUpdateCartQty && onUpdateCartQty(item.id, 1)}
                  className="w-8 h-8 rounded-xl bg-[#E86326] text-white font-black flex items-center justify-center hover:bg-[#D34F15]"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onAddToCart) onAddToCart(item);
                }}
                className="px-6 py-3 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition shadow-hover flex items-center gap-2"
              >
                <span>+ Add to Table Order</span>
              </button>
            )
          ) : (
            <button
              disabled
              className="px-5 py-2.5 rounded-xl bg-stone-200 text-stone-500 text-xs font-semibold cursor-not-allowed"
            >
              Sold Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
