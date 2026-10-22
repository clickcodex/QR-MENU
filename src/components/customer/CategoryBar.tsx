'use client';

import React, { useRef, useState, useEffect } from 'react';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { DietaryIndicator } from './DietaryIndicator';

export type FoodTypeFilter = 'all' | 'veg' | 'non-veg';

export interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  items: any[];
}

interface CategoryBarProps {
  categories: CategoryData[];
  selectedCategoryId: string; // 'all' or category id
  totalItems: number;
  onSelectCategory: (categoryId: string) => void;
  foodType: FoodTypeFilter;
  onFoodTypeChange: (type: FoodTypeFilter) => void;
}

function CategoryBarComponent({
  categories,
  selectedCategoryId,
  totalItems,
  onSelectCategory,
  foodType,
  onFoodTypeChange,
}: CategoryBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Close filter popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Close filter popover on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isFilterOpen) {
        setIsFilterOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen]);

  // Auto-scroll selected button into view
  const handleSelect = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    onSelectCategory(id);
    const target = e.currentTarget;
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-white border border-[#EAEAE5] rounded-2xl shadow-2xs py-1 px-1.5 sm:px-2 flex items-center gap-1.5">
      {/* 1. Filter Button in FIRST PLACE beside All Items */}
      <div ref={filterContainerRef} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          aria-expanded={isFilterOpen}
          aria-haspopup="dialog"
          aria-label="Filter dishes"
          className={`flex-shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 select-none ${
            foodType === 'veg'
              ? 'bg-emerald-600 text-white shadow-xs'
              : foodType === 'non-veg'
              ? 'bg-red-600 text-white shadow-xs'
              : isFilterOpen
              ? 'bg-[#1C1917] text-white'
              : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {foodType === 'veg' ? 'Veg Only' : foodType === 'non-veg' ? 'Non-Veg' : 'Filter'}
          </span>
          {foodType !== 'all' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onFoodTypeChange('all');
              }}
              className="p-0.5 rounded-full hover:bg-white/20 transition -mr-1"
              title="Clear dish filter"
              role="button"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Filter Dishes Popover (Only dish filtering: All, Veg, Non-Veg) */}
        {isFilterOpen && (
          <div
            role="dialog"
            aria-label="Filter dishes"
            className="absolute left-0 top-full mt-2 z-50 w-64 sm:w-72 bg-white rounded-2xl border border-[#EAEAE5] shadow-modal p-3 space-y-2.5 animate-scale-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EAEAE5] pb-2">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E86326]" />
                <h3 className="text-xs font-black text-[#1C1917]">Filter Dishes</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {foodType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      onFoodTypeChange('all');
                      setIsFilterOpen(false);
                    }}
                    className="text-[11px] font-bold text-[#E86326] hover:underline px-1 py-0.5"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 rounded-full text-[#78716C] hover:bg-[#FAFAF8] hover:text-[#1C1917]"
                  aria-label="Close filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dish Dietary Options */}
            <div className="space-y-1">
              {/* All Dishes */}
              <button
                type="button"
                onClick={() => {
                  onFoodTypeChange('all');
                  setIsFilterOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
                  foodType === 'all'
                    ? 'bg-[#1C1917] text-white'
                    : 'bg-[#FAFAF8] text-[#1C1917] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🍽️</span>
                  <span>All Dishes</span>
                </div>
                {foodType === 'all' && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              {/* Veg Only */}
              <button
                type="button"
                onClick={() => {
                  onFoodTypeChange('veg');
                  setIsFilterOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
                  foodType === 'veg'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100/60 border border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DietaryIndicator isVeg={true} size="sm" />
                  <span>Veg Only</span>
                </div>
                {foodType === 'veg' && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              {/* Non-Veg Only */}
              <button
                type="button"
                onClick={() => {
                  onFoodTypeChange('non-veg');
                  setIsFilterOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${
                  foodType === 'non-veg'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50/50 text-red-900 hover:bg-red-100/60 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DietaryIndicator isVeg={false} size="sm" />
                  <span>Non-Veg Only</span>
                </div>
                {foodType === 'non-veg' && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thin Separator */}
      <div className="h-4 w-px bg-[#EAEAE5] flex-shrink-0" />

      {/* 2. Scrollable Category Tabs: All Items + Categories */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0"
        role="tablist"
        aria-label="Menu categories"
      >
        {/* ALL tab */}
        <button
          role="tab"
          aria-selected={selectedCategoryId === 'all'}
          onClick={(e) => handleSelect('all', e)}
          className={`flex-shrink-0 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
            selectedCategoryId === 'all'
              ? 'bg-[#E86326] text-white shadow-sm'
              : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
          }`}
        >
          <span>All Items</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategoryId === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-[#EAEAE5] text-[#78716C]'
            }`}
          >
            {totalItems}
          </span>
        </button>

        {/* Category Tabs */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = cat.items.length;
          if (count === 0) return null;

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isSelected}
              onClick={(e) => handleSelect(cat.id, e)}
              className={`flex-shrink-0 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#E86326] text-white shadow-sm'
                  : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-[#EAEAE5] text-[#78716C]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const CategoryBar = React.memo(CategoryBarComponent);
