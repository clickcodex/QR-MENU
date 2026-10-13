'use client';

import React, { useRef, useEffect } from 'react';

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
}

function CategoryBarComponent({
  categories,
  selectedCategoryId,
  totalItems,
  onSelectCategory,
}: CategoryBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAEAE5] shadow-subtle py-2.5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          role="tablist"
          aria-label="Menu categories"
        >
          {/* ALL tab */}
          <button
            role="tab"
            aria-selected={selectedCategoryId === 'all'}
            onClick={(e) => handleSelect('all', e)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
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
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
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
    </div>
  );
}

export const CategoryBar = React.memo(CategoryBarComponent);
