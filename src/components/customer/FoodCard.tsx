'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Flame, Eye, Plus, Minus } from 'lucide-react';
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
  onSelect: (item: MenuItemData) => void;
  onAddToCart?: (item: MenuItemData) => void;
  onUpdateCartQty?: (itemId: string, delta: number) => void;
}

export function FoodCard({
  item,
  currencySymbol = '₹',
  cartQty = 0,
  onSelect,
  onAddToCart,
  onUpdateCartQty,
}: FoodCardProps) {
  const [imgError, setImgError] = useState(false);
  const isAvailable = item.isAvailable;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(item);
  };

  const handleQtyClick = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (onUpdateCartQty) onUpdateCartQty(item.id, delta);
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative flex flex-col sm:flex-row gap-3.5 p-3.5 rounded-2xl bg-white border border-[#EAEAE5] food-card-hover cursor-pointer transition-all duration-200 select-none ${
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
      <div className="relative w-full sm:w-32 h-36 sm:h-32 rounded-xl overflow-hidden bg-[#F4F4F0] flex-shrink-0">
        {item.imageUrl && !imgError ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 128px"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              !isAvailable ? 'grayscale' : ''
            }`}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F5F0] text-[#A8A29E] p-2 text-center">
            <span className="text-2xl mb-1">🍽️</span>
            <span className="text-[10px] font-medium tracking-tight text-[#8E8E86]">Urban Spice</span>
          </div>
        )}

        {/* Dietary symbol floating badge on mobile */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-sm sm:hidden">
          <DietaryIndicator isVeg={item.isVeg} size="sm" />
        </div>

        {/* Badges on Image (Bestseller or Spicy) */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {item.isBestseller && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7]/95 text-[#B45309] shadow-sm backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" />
              Chef&apos;s Pick
            </span>
          )}
          {item.isSpicy && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2]/95 text-[#B91C1C] shadow-sm backdrop-blur-sm">
              <Flame className="w-2.5 h-2.5 text-rose-600" />
              Spicy
            </span>
          )}
        </div>

        {/* Unavailable overlay if marked sold out */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-[#1C1917]/90 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md shadow">
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

          <h3 className="font-semibold text-[15px] sm:text-[16px] text-[#1C1917] group-hover:text-[#E86326] transition-colors leading-snug truncate">
            {item.name}
          </h3>

          {item.description && (
            <p className="mt-1 text-xs text-[#57534E] line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Bottom row: Price and Cart / Add Button */}
        <div className="mt-2.5 pt-2 border-t border-[#F0F0EA] flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold text-[#1C1917] tracking-tight">
              {currencySymbol}{item.price}
            </span>
          </div>

          {/* Cart Stepper or Add button */}
          {isAvailable && (
            <div>
              {cartQty > 0 ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-2 py-1 shadow-sm"
                >
                  <button
                    onClick={(e) => handleQtyClick(e, -1)}
                    className="w-5 h-5 rounded-md bg-white text-[#9A3412] flex items-center justify-center font-bold hover:bg-[#FFEDD5]"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-4 text-center text-xs font-bold text-[#9A3412]">
                    {cartQty}
                  </span>
                  <button
                    onClick={(e) => handleQtyClick(e, 1)}
                    className="w-5 h-5 rounded-md bg-[#E86326] text-white flex items-center justify-center font-bold hover:bg-[#D34F15]"
                    aria-label="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddClick}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-[#E86326] text-xs font-bold transition flex items-center gap-1 shadow-subtle active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
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
