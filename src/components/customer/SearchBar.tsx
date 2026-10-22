'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function SearchBarComponent({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C]">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search dishes (e.g. paneer, tikka, biryani, naan)..."
        className="w-full pl-10 pr-9 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326] focus:ring-2 focus:ring-[#E86326]/10 transition shadow-subtle"
        aria-label="Search menu dishes"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#78716C] hover:text-[#1C1917]"
          aria-label="Clear search query"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export const SearchBar = React.memo(SearchBarComponent);
