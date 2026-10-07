'use client';

import React from 'react';

export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] animate-fade-in pb-16">
      {/* Header Skeleton */}
      <div className="w-full h-44 bg-[#EFEFEA] shimmer-effect" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-10 flex items-end gap-3 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white p-1 border border-[#E5E5DE] shadow-sm">
            <div className="w-full h-full rounded-xl bg-[#EAEAE5] shimmer-effect" />
          </div>
          <div className="space-y-2 flex-1 pb-1">
            <div className="w-48 h-6 bg-[#E5E5DE] rounded shimmer-effect" />
            <div className="w-32 h-4 bg-[#EFEFEA] rounded shimmer-effect" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="w-full h-10 bg-white border border-[#E5E5DE] rounded-xl mb-4 shimmer-effect" />

        {/* Category Pills Skeleton */}
        <div className="flex gap-2 overflow-hidden mb-6">
          {[80, 100, 110, 90, 85].map((width, idx) => (
            <div
              key={idx}
              className="h-8 rounded-full bg-[#EFEFEA] shimmer-effect flex-shrink-0"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>

        {/* Item Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white border border-[#EAEAE5] flex flex-col sm:flex-row gap-3.5"
            >
              <div className="w-full sm:w-28 h-32 rounded-xl bg-[#F4F4F0] shimmer-effect flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="w-12 h-3.5 bg-[#EFEFEA] rounded" />
                <div className="w-3/4 h-5 bg-[#EAEAE5] rounded" />
                <div className="w-full h-3.5 bg-[#F4F4F0] rounded" />
                <div className="w-1/2 h-3.5 bg-[#F4F4F0] rounded" />
                <div className="pt-2 flex justify-between items-center">
                  <div className="w-16 h-5 bg-[#EAEAE5] rounded" />
                  <div className="w-12 h-3.5 bg-[#EFEFEA] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
