'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, Phone, Clock, Info, ChevronDown } from 'lucide-react';

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  currencySymbol: string;
}

export interface TableData {
  tableNumber: string;
  name?: string;
  capacity?: number;
  isValid?: boolean;
}

interface RestaurantHeaderProps {
  restaurant: RestaurantData;
  table: TableData | null;
}

export function RestaurantHeader({ restaurant, table }: RestaurantHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="relative bg-white border-b border-[#EAEAE5] overflow-hidden">
      {/* Cover Photo */}
      <div className="relative w-full h-36 sm:h-48 md:h-56 bg-[#F4F4F0] overflow-hidden">
        {restaurant.coverUrl ? (
          <Image
            src={restaurant.coverUrl}
            alt={restaurant.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#FFF7ED] to-[#FFEDD5]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Main Info Card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
        <div className="relative -mt-12 sm:-mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div className="flex items-end gap-3.5 sm:gap-4">
            {/* Restaurant Logo */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 shadow-card border border-[#E5E5DE] flex-shrink-0 overflow-hidden">
              {restaurant.logoUrl ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#FAFAF8]">
                  <Image
                    src={restaurant.logoUrl}
                    alt={`${restaurant.name} logo`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full rounded-xl bg-[#FFF7ED] flex items-center justify-center text-2xl font-bold text-[#E86326]">
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Title & Cuisine */}
            <div className="mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1C1917] tracking-tight">
                  {restaurant.name}
                </h1>
              </div>
              {restaurant.cuisine && (
                <p className="text-xs sm:text-sm font-medium text-[#78716C]">
                  {restaurant.cuisine}
                </p>
              )}
            </div>
          </div>

          {/* Table Pill */}
          <div className="self-start sm:self-end flex items-center gap-2">
            {table ? (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                  table.isValid !== false
                    ? 'bg-[#FFFDF8] border-[#FED7AA] text-[#9A3412]'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{table.name || `Table ${table.tableNumber}`}</span>
                <span className="text-[10px] font-medium text-[#78716C] border-l border-[#FED7AA] pl-2">
                  Dine-in
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAF8] border border-[#E5E5DE] text-[#57534E]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Digital Menu</span>
              </div>
            )}

            {/* Toggle Restaurant Info Button */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-1.5 rounded-full bg-[#FAFAF8] border border-[#E5E5DE] text-[#78716C] hover:text-[#1C1917] hover:bg-white transition"
              title="Restaurant info"
              aria-label="Toggle restaurant information"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Restaurant Details Drawer */}
        {showInfo && (
          <div className="mt-4 p-4 rounded-2xl bg-[#FFFDF8] border border-[#F5EAD4] animate-fade-in space-y-2 text-xs text-[#57534E]">
            {restaurant.description && (
              <p className="leading-relaxed text-[#1C1917] font-normal mb-2">
                {restaurant.description}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#F5EAD4]/80">
              {restaurant.openingHours && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <span>{restaurant.openingHours}</span>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <a href={`tel:${restaurant.phone}`} className="hover:underline">
                    {restaurant.phone}
                  </a>
                </div>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <span className="truncate">{restaurant.address}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
