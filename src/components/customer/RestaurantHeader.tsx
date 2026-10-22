'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, Phone, Clock, Info, X } from 'lucide-react';

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
  table?: TableData | null;
}

function RestaurantHeaderComponent({ restaurant, table }: RestaurantHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="bg-white border-b border-[#EAEAE5] shadow-2xs sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3">
        {/* Left: Larger Logo & Restaurant Branding with Table Information */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex-shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
            {restaurant.logoUrl ? (
              <Image
                src={restaurant.logoUrl}
                alt={`${restaurant.name} logo`}
                fill
                sizes="(max-width: 640px) 56px, 64px"
                className="object-cover"
                priority
              />
            ) : (
              <span className="text-xl sm:text-2xl font-black text-[#E86326]">
                {restaurant.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-base sm:text-lg font-black text-[#1C1917] tracking-tight truncate leading-tight">
              {restaurant.name}
            </h1>
            {restaurant.cuisine && (
              <p className="text-[11px] sm:text-xs text-[#78716C] font-medium truncate leading-tight mt-0.5">
                {restaurant.cuisine}
              </p>
            )}
            {table && (
              <div className="text-[11px] sm:text-xs text-[#E86326] font-bold truncate leading-tight flex items-center gap-1.5 pt-0.5">
                <span>{table.name || `Table ${table.tableNumber}`}</span>
                {table.capacity ? (
                  <>
                    <span className="text-[#D6D3D1] font-normal">|</span>
                    <span className="text-[#57534E] font-medium">{table.capacity} Seats</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info Trigger Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#E5E5DE] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF8] transition flex items-center gap-1.5 text-xs font-semibold"
            title="Restaurant info"
            aria-label="Toggle restaurant information"
          >
            {showInfo ? <X className="w-4 h-4" /> : <Info className="w-4 h-4 text-[#E86326]" />}
            <span className="hidden sm:inline text-xs font-bold">Info</span>
          </button>
        </div>
      </div>

      {/* Collapsible Info Drawer */}
      {showInfo && (
        <div className="border-t border-[#F5EAD4] bg-[#FFFDF8] px-4 py-3 text-xs text-[#57534E] animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-2">
            {restaurant.description && (
              <p className="leading-relaxed text-[#1C1917] font-normal">
                {restaurant.description}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#F5EAD4]/80 text-[11px]">
              {restaurant.openingHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <span>{restaurant.openingHours}</span>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <a href={`tel:${restaurant.phone}`} className="hover:underline">
                    {restaurant.phone}
                  </a>
                </div>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E86326] flex-shrink-0" />
                  <span className="truncate">{restaurant.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export const RestaurantHeader = React.memo(RestaurantHeaderComponent);
