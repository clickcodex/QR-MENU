'use client';

import React from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { DietaryIndicator } from './DietaryIndicator';

export type DietaryFilter = 'all' | 'veg' | 'non-veg' | 'bestseller';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: DietaryFilter;
  onFilterChange: (filter: DietaryFilter) => void;
}

function SearchBarComponent({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: SearchBarProps) {
  return (
    <div className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search dishes (e.g. paneer, tikka, biryani)..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E5E5DE] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326] focus:ring-2 focus:ring-[#E86326]/10 transition shadow-subtle"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#78716C] hover:text-[#1C1917]"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dietary Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
            activeFilter === 'all'
              ? 'bg-[#1C1917] text-white'
              : 'bg-white border border-[#E5E5DE] text-[#57534E] hover:bg-[#F2F2ED]'
          }`}
        >
          All Flavors
        </button>

        <button
          onClick={() => onFilterChange('veg')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5 ${
            activeFilter === 'veg'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white border border-[#E5E5DE] text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <DietaryIndicator isVeg={true} size="sm" />
          <span>Veg Only</span>
        </button>

        <button
          onClick={() => onFilterChange('non-veg')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5 ${
            activeFilter === 'non-veg'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white border border-[#E5E5DE] text-rose-800 hover:bg-rose-50'
          }`}
        >
          <DietaryIndicator isVeg={false} size="sm" />
          <span>Non-Veg</span>
        </button>

        <button
          onClick={() => onFilterChange('bestseller')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 ${
            activeFilter === 'bestseller'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white border border-[#E5E5DE] text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Bestsellers</span>
        </button>
      </div>
    </div>
  );
}

export const SearchBar = React.memo(SearchBarComponent);
