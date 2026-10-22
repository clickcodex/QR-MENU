'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Flame, Eye, Plus, Minus, Lock } from 'lucide-react';
import { DietaryIndicator } from './DietaryIndicator';

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isSpicy: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  displayOrder?: number;
}

interface FoodCardProps {
  item: MenuItemData;
  currencySymbol?: string;
  cartQty?: number;
  priority?: boolean;
  isController?: boolean;
  onSelect: (item: MenuItemData) => void;
  onAddToCart?: (item: MenuItemData) => void;
  onUpdateCartQty?: (itemId: string, delta: number) => void;
}

function FoodCardComponent({
  item,
  currencySymbol = '₹',
  cartQty = 0,
  priority = false,
  isController = true,
  onSelect,
  onAddToCart,
  onUpdateCartQty,
}: FoodCardProps) {
  const [imgError, setImgError] = useState(false);
  const isAvailable = item.isAvailable;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isController) return;
    if (onAddToCart) onAddToCart(item);
  };

  const handleQtyClick = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!isController) return;
    if (onUpdateCartQty) onUpdateCartQty(item.id, delta);
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative flex flex-col sm:flex-row gap-2.5 sm:gap-3.5 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-[#EAEAE5] food-card-hover cursor-pointer transition-all duration-200 select-none ${
        !isAvailable ? 'opacity-70 bg-[#FAF9F5]' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
    >
      {/* Food Image Container */}
      <div className="relative w-full sm:w-32 h-28 sm:h-32 rounded-lg sm:rounded-xl overflow-hidden bg-[#F4F4F0] flex-shrink-0">
        {item.imageUrl && !imgError ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, 128px"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              !isAvailable ? 'grayscale' : ''
            }`}
            onError={() => setImgError(true)}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F5F0] text-[#A8A29E] p-2 text-center">
            <span className="text-xl sm:text-2xl mb-1">🍽️</span>
            <span className="text-[9px] sm:text-[10px] font-medium tracking-tight text-[#8E8E86]">Restaurant Special</span>
          </div>
        )}

        {/* Dietary symbol floating badge on mobile */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-xs sm:hidden">
          <DietaryIndicator isVeg={item.isVeg} size="sm" />
        </div>

        {/* Badges on Image (Bestseller or Spicy) */}
        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
          {item.isBestseller && (
            <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#FEF3C7]/95 text-[#B45309] shadow-xs backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" />
              <span className="hidden xs:inline">Chef&apos;s Pick</span>
              <span className="xs:hidden">Top</span>
            </span>
          )}
          {item.isSpicy && (
            <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#FEE2E2]/95 text-[#B91C1C] shadow-xs backdrop-blur-sm">
              <Flame className="w-2.5 h-2.5 text-rose-600" />
              <span>Spicy</span>
            </span>
          )}
        </div>

        {/* Unavailable overlay if marked sold out */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-[#1C1917]/90 text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md shadow">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Desktop Dietary indicator and tags */}
          <div className="hidden sm:flex items-center gap-2 mb-1.5">
            <DietaryIndicator isVeg={item.isVeg} size="sm" showLabel />
            {item.isBestseller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-2.5 h-2.5" /> Bestseller
              </span>
            )}
            {item.isSpicy && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <Flame className="w-2.5 h-2.5" /> Spicy
              </span>
            )}
          </div>

          <h3 className="font-bold text-xs sm:text-[15px] sm:text-[16px] text-[#1C1917] group-hover:text-[#E86326] transition-colors leading-tight line-clamp-2 sm:line-clamp-1 mt-0.5 sm:mt-0">
            {item.name}
          </h3>

          {item.description && (
            <p className="mt-1 text-xs text-[#57534E] line-clamp-2 leading-relaxed hidden sm:block">
              {item.description}
            </p>
          )}
        </div>

        {/* Bottom row: Price and Cart / Add Button */}
        <div className="mt-2 pt-1.5 sm:mt-2.5 sm:pt-2 border-t border-[#F0F0EA] flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs sm:text-base font-bold sm:font-extrabold text-[#1C1917] tracking-tight">
              {currencySymbol}{item.price}
            </span>
          </div>

          {/* Cart Stepper or Add button */}
          {isAvailable && (
            <div>
              {!isController ? (
                <div
                  title="Only the primary table controller can add items"
                  className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-stone-100 text-stone-500 text-[10px] sm:text-[11px] font-semibold border border-stone-200 flex items-center gap-1"
                >
                  <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-400" />
                  <span>View</span>
                </div>
              ) : cartQty > 0 ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 sm:gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg sm:rounded-xl px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={(e) => handleQtyClick(e, -1)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md bg-white text-[#9A3412] flex items-center justify-center font-bold hover:bg-[#FFEDD5]"
                    aria-label="Decrease"
                  >
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                  <span className="w-3 sm:w-4 text-center text-[11px] sm:text-xs font-bold text-[#9A3412]">
                    {cartQty}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleQtyClick(e, 1)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md bg-[#E86326] text-white flex items-center justify-center font-bold hover:bg-[#D34F15]"
                    aria-label="Increase"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-[#E86326] text-[11px] sm:text-xs font-bold transition flex items-center gap-0.5 sm:gap-1 shadow-subtle active:scale-95"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Add</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const FoodCard = React.memo(FoodCardComponent);
