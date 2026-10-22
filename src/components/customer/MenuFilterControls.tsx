'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Flame, ArrowUpDown, Check, X, RotateCcw } from 'lucide-react';
import { DietaryIndicator } from './DietaryIndicator';

export type FoodTypeFilter = 'all' | 'veg' | 'non-veg';
export type SortOption = 'default' | 'price-asc' | 'price-desc' | 'bestseller' | 'name-asc';

// Keep DietaryFilter type alias for backward-compatibility if imported elsewhere
export type DietaryFilter = FoodTypeFilter | 'bestseller';

interface MenuFilterControlsProps {
  foodType: FoodTypeFilter;
  onFoodTypeChange: (type: FoodTypeFilter) => void;
  onlyBestsellers: boolean;
  onOnlyBestsellersChange: (val: boolean) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onResetAll: () => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Featured',
  bestseller: 'Best Sellers First',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'name-asc': 'Name: A to Z',
};

export function MenuFilterControls({
  foodType,
  onFoodTypeChange,
  onlyBestsellers,
  onOnlyBestsellersChange,
  activeSort,
  onSortChange,
  onResetAll,
}: MenuFilterControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeCount =
    (foodType !== 'all' ? 1 : 0) +
    (onlyBestsellers ? 1 : 0) +
    (activeSort !== 'default' ? 1 : 0);

  const hasActiveFilters = activeCount > 0;

  return (
    <div ref={containerRef} className="relative py-0 sm:py-0.5">
      {/* Consolidated Filter & Sort Trigger and Active Chips */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left side: Visible Selected Filter Chips (Instant Visibility & Clear Actions) */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {hasActiveFilters && (
            <>
              {foodType === 'veg' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <DietaryIndicator isVeg={true} size="sm" />
                  <span>Veg Only</span>
                  <button
                    type="button"
                    onClick={() => onFoodTypeChange('all')}
                    className="hover:text-emerald-950 p-0.5"
                    aria-label="Remove veg only filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {foodType === 'non-veg' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
                  <DietaryIndicator isVeg={false} size="sm" />
                  <span>Non-Veg</span>
                  <button
                    type="button"
                    onClick={() => onFoodTypeChange('all')}
                    className="hover:text-red-950 p-0.5"
                    aria-label="Remove non-veg filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {onlyBestsellers && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Best Sellers</span>
                  <button
                    type="button"
                    onClick={() => onOnlyBestsellersChange(false)}
                    className="hover:text-amber-950 p-0.5"
                    aria-label="Remove best sellers filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeSort !== 'default' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 text-[#1C1917] border border-[#E5E5DE] text-xs font-bold">
                  <ArrowUpDown className="w-3 h-3 text-[#78716C]" />
                  <span>{SORT_LABELS[activeSort]}</span>
                  <button
                    type="button"
                    onClick={() => onSortChange('default')}
                    className="hover:text-black p-0.5"
                    aria-label="Reset sorting"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={onResetAll}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#78716C] hover:text-[#E86326] px-2 py-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>

        {/* Right side: Main Consolidated Trigger Button */}
        <div className="ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label="Filter & Sort"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition shadow-2xs border ${
              hasActiveFilters || isOpen
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-white text-[#1C1917] border-[#E5E5DE] hover:bg-[#FAFAF8]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Filter & Sort</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#E86326] text-white text-[10px] font-black flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Popover Menu: Food Type, Additional Filters, and Sorting */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Filter and Sort Options"
          className="absolute right-0 mt-2 z-40 w-full sm:w-80 bg-white rounded-3xl border border-[#EAEAE5] shadow-modal p-4 space-y-4 animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EAEAE5] pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E86326]" />
              <h3 className="text-sm font-extrabold text-[#1C1917]">Filter & Sort</h3>
            </div>
            <div className="flex items-center gap-1">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="text-xs font-bold text-[#E86326] hover:underline px-2 py-1"
                >
                  Reset All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-[#78716C] hover:bg-[#FAFAF8] hover:text-[#1C1917]"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 1. Food Type Section */}
          <div className="space-y-2">
            <span className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Food Type
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {/* All */}
              <button
                type="button"
                onClick={() => onFoodTypeChange('all')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                  foodType === 'all'
                    ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-2xs'
                    : 'bg-[#FAFAF8] text-[#57534E] border-[#E5E5DE] hover:bg-white'
                }`}
              >
                <span>All</span>
              </button>

              {/* Veg Only */}
              <button
                type="button"
                onClick={() => onFoodTypeChange(foodType === 'veg' ? 'all' : 'veg')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                  foodType === 'veg'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-[#FAFAF8] text-emerald-800 border-[#E5E5DE] hover:bg-emerald-50/50'
                }`}
              >
                <DietaryIndicator isVeg={true} size="sm" />
                <span className="truncate">Veg</span>
              </button>

              {/* Non-Veg */}
              <button
                type="button"
                onClick={() => onFoodTypeChange(foodType === 'non-veg' ? 'all' : 'non-veg')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                  foodType === 'non-veg'
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                    : 'bg-[#FAFAF8] text-red-800 border-[#E5E5DE] hover:bg-red-50/50'
                }`}
              >
                <DietaryIndicator isVeg={false} size="sm" />
                <span className="truncate">Non-Veg</span>
              </button>
            </div>
          </div>

          {/* 2. Additional Filters Section */}
          <div className="space-y-2 border-t border-[#EAEAE5] pt-3">
            <span className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Additional Filters
            </span>
            <button
              type="button"
              onClick={() => onOnlyBestsellersChange(!onlyBestsellers)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                onlyBestsellers
                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                  : 'bg-[#FAFAF8] text-[#1C1917] border-[#E5E5DE] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flame className={`w-3.5 h-3.5 ${onlyBestsellers ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'}`} />
                <span>Best Sellers Only</span>
              </div>
              {onlyBestsellers && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>

          {/* 3. Sorting Options Section */}
          <div className="space-y-2 border-t border-[#EAEAE5] pt-3">
            <span className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Sort By
            </span>
            <div className="space-y-1">
              {(
                [
                  'default',
                  'bestseller',
                  'price-asc',
                  'price-desc',
                  'name-asc',
                ] as SortOption[]
              ).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSortChange(option)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between text-left ${
                    activeSort === option
                      ? 'bg-[#FFF7ED] text-[#E86326] border border-[#FED7AA]'
                      : 'text-[#57534E] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <span>{SORT_LABELS[option]}</span>
                  {activeSort === option && <Check className="w-3.5 h-3.5 text-[#E86326]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Done / Apply Button */}
          <div className="pt-2 border-t border-[#EAEAE5]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#322F2D] text-white text-xs font-bold transition shadow-2xs"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
