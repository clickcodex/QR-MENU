'use client';

import React from 'react';

interface DietaryIndicatorProps {
  isVeg: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function DietaryIndicator({ isVeg, size = 'md', showLabel = false }: DietaryIndicatorProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const dotClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  }[size];

  return (
    <div className="inline-flex items-center gap-1.5" title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}>
      <span
        className={`inline-flex items-center justify-center rounded-sm border bg-white flex-shrink-0 ${sizeClasses} ${
          isVeg ? 'border-emerald-600' : 'border-rose-600'
        }`}
      >
        {isVeg ? (
          <span className={`rounded-full bg-emerald-600 ${dotClasses}`} />
        ) : (
          <span
            className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5.5px] border-l-transparent border-r-transparent border-b-rose-600 inline-block"
          />
        )}
      </span>
      {showLabel && (
        <span
          className={`font-semibold tracking-wider text-[11px] uppercase ${
            isVeg ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {isVeg ? 'VEG' : 'NON-VEG'}
        </span>
      )}
    </div>
  );
}
