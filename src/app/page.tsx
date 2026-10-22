'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  QrCode,
  Smartphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Zap,
  UtensilsCrossed,
  Printer,
  ExternalLink,
} from 'lucide-react';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';
import { LiveQrScannerTest } from '@/components/home/LiveQrScannerTest';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1917] flex flex-col selection:bg-[#FED7AA] selection:text-[#9A3412]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAEAE5] shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86326] to-[#D34F15] flex items-center justify-center text-white shadow-sm font-black text-sm">
              MM
            </div>
            <div>
              <span className="block text-base font-extrabold text-[#1C1917] tracking-tight leading-tight">
                MOMO MENU
              </span>
              <span className="block text-[10px] font-bold text-[#E86326] tracking-wider uppercase">
                SMART DIGITAL HOSPITALITY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFF7ED] text-[#E86326] border border-[#FED7AA] hover:bg-[#FFEDD5] text-xs font-bold transition"
            >
              <span>Owner Admin</span>
            </Link>

            <Link
              href="/superadmin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-xs font-black transition border border-amber-300"
            >
              <span>👑 Super Admin</span>
            </Link>

            <Link
              href="/r/the-momos-wala/t/7"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1C1917] text-white hover:bg-[#322F2D] text-xs font-bold transition shadow-sm"
            >
              <span>Scan Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[#E86326] text-xs font-bold shadow-subtle animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#E86326] animate-pulse" />
            <span>INSTANT ZERO-FRICTION DIGITAL RESTAURANT MENU</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#1C1917] tracking-tight leading-[1.12]">
            Every diner&apos;s menu,{' '}
            <span className="text-[#E86326] underline decoration-[#FED7AA] decoration-wavy decoration-2">
              instantly on their own phone.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#57534E] leading-relaxed">
            No more waiting for paper cards. When a group of 15 sits down, everyone scans the small table QR with their normal phone camera. 
            <strong className="text-[#1C1917] font-semibold"> No app download, no account, no phone number required.</strong>
          </p>

          {/* Quick Access CTA Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/r/the-momos-wala/t/7"
              className="py-3 px-6 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition shadow-hover flex items-center gap-2 group"
            >
              <Smartphone className="w-4 h-4" />
              <span>Experience Table 7 Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/r/the-momos-wala/t/1"
              className="py-3 px-5 rounded-2xl bg-white hover:bg-[#FAFAF8] border border-[#E5E5DE] text-[#1C1917] text-xs sm:text-sm font-bold transition shadow-subtle flex items-center gap-2"
            >
              <span>Try Table 1</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#78716C]" />
            </Link>

            <Link
              href="/admin/login"
              className="py-3 px-5 rounded-2xl bg-[#FFFDF8] hover:bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] text-xs sm:text-sm font-bold transition flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#E86326]" />
              <span>Admin Dashboard</span>
            </Link>
          </div>

          {/* Interactive Live QR Scan Test Box */}
          <LiveQrScannerTest />

          {/* Value Props Bar */}
          <div className="pt-4 flex flex-wrap justify-center gap-6 text-xs text-[#78716C]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero App Downloads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>No Registration or Passwords</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Permanent QR Architecture</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Mobile & Table Preview Section */}
      <section className="py-12 px-4 sm:px-6 bg-white border-y border-[#EAEAE5]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
              A World-Class Dining Experience
            </h2>
            <p className="text-xs sm:text-sm text-[#78716C]">
              Engineered with warm luxury aesthetics, instant live search, and print-ready table QR stands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Customer Mobile Experience */}
            <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#F5EAD4] space-y-4 shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#E86326] flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1C1917]">
                Mobile-First Customer Menu
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Smooth horizontal category scrolling, authentic Veg/Non-Veg indicators, spice level badges, and silky dish detail bottom sheets.
              </p>
              <div className="pt-2">
                <Link
                  href="/r/the-momos-wala/t/7"
                  className="text-xs font-bold text-[#E86326] hover:underline inline-flex items-center gap-1"
                >
                  <span>Launch Live Mobile Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Permanent QR Architecture */}
            <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#F5EAD4] space-y-4 shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1C1917]">
                Permanent Dynamic QR URLs
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                QR codes store pure URLs (<code className="text-[#1C1917]">/r/the-momos-wala/t/7</code>). Modify prices, dishes, or images in the admin without ever reprinting your table cards.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/tables"
                  className="text-xs font-bold text-[#E86326] hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore Table QR Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 3: Restaurant Admin Command */}
            <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#F5EAD4] space-y-4 shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#D34F15] flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1C1917]">
                Clean Restaurant Admin
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Light, refined interface for non-technical restaurant owners: instant 86/sold-out toggles, category reordering, and 1-click stand card printing.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="text-xs font-bold text-[#E86326] hover:underline inline-flex items-center gap-1"
                >
                  <span>Access Admin Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Real Problem & Solution */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-[#EAEAE5] shadow-card space-y-8">
          <div className="border-b border-[#EFEFEA] pb-6">
            <span className="text-[11px] font-bold text-[#E86326] uppercase tracking-wider">
              THE HOSPITALITY PROBLEM WE SOLVE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] mt-1">
              Why Physical Paper Menus Fail Large Groups
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 p-5 rounded-2xl bg-rose-50/50 border border-rose-100">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <span>❌ The Old Way (Physical Paper Cards)</span>
              </div>
              <ul className="text-xs text-[#57534E] space-y-2">
                <li>• 15–20 guests sit at one large banquet or table</li>
                <li>• Waiter delivers only 3–4 physical paper menus</li>
                <li>• Diners repeatedly pass menus across the table</li>
                <li>• Awkward waiting, friction, and delays in ordering</li>
                <li>• Food prices or 86&apos;d dishes cannot be updated in real time</li>
              </ul>
            </div>

            <div className="space-y-3 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <span>✓ The MOMO MENU Way</span>
              </div>
              <ul className="text-xs text-[#57534E] space-y-2">
                <li>• One compact QR stand card placed on Table 7</li>
                <li>• Every guest scans with their default smartphone camera</li>
                <li>• Website opens instantly: The Momo&apos;s Wala, Table 7 identified</li>
                <li>• 15 diners simultaneously browse appetizers, breads, & drinks</li>
                <li>• Instant search, dietary filters, and sold-out updates</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-[#EAEAE5] bg-white text-center">
        <div className="max-w-md mx-auto px-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E86326] text-white flex items-center justify-center font-bold text-xs">
              MM
            </div>
            <span className="font-bold text-sm text-[#1C1917]">MOMO MENU</span>
          </div>

          <p className="text-xs font-bold text-[#E86326] tracking-widest uppercase">
            SMART DIGITAL HOSPITALITY
          </p>
          <p className="text-[11px] text-[#78716C] tracking-wider uppercase">
            SCAN • ORDER • ENJOY
          </p>

          <div className="pt-2 text-xs text-[#78716C] flex items-center justify-center gap-4">
            <Link href="/r/the-momos-wala/t/7" className="hover:text-[#1C1917]">
              Customer Menu (Table 7)
            </Link>
            <span>•</span>
            <Link href="/admin/login" className="hover:text-[#1C1917]">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
