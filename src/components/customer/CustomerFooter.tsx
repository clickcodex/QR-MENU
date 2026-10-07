'use client';

import React from 'react';

export function CustomerFooter() {
  return (
    <footer className="mt-16 py-8 border-t border-[#EAEAE5] bg-[#FAFAF8] text-center">
      <div className="max-w-md mx-auto px-4 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#78716C]">
          <span>Powered by</span>
          <span className="font-black text-[#1C1917] tracking-tight">MOMO MENU</span>
        </div>
        <p className="text-[11px] font-bold tracking-widest text-[#E86326] uppercase">
          SMART DIGITAL HOSPITALITY
        </p>
        <p className="text-[10px] text-[#A8A29E] tracking-wider uppercase">
          SCAN • ORDER • ENJOY
        </p>
        <div className="pt-2 text-[10px] text-[#78716C]">
          No app download or sign-up needed. Digital contactless hospitality.
        </div>
      </div>
    </footer>
  );
}
