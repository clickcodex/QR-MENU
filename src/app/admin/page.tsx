'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Utensils,
  FolderTree,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  ExternalLink,
  Printer,
  ChevronRight,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalCategories: 0,
    totalTables: 0,
    availableItems: 0,
    unavailableItems: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [restaurant, setRestaurant] = useState<{
    name: string;
    slug: string;
    cuisine?: string;
    currencySymbol: string;
  } | null>(null);
  const [recentCategories, setRecentCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [profRes, catRes, itemRes, tableRes, orderRes] = await Promise.all([
          fetch('/api/restaurant/profile'),
          fetch('/api/categories'),
          fetch('/api/menu-items'),
          fetch('/api/tables'),
          fetch('/api/orders'),
        ]);

        const profData = await profRes.json();
        const catData = await catRes.json();
        const itemData = await itemRes.json();
        const tableData = await tableRes.json();
        const orderData = await orderRes.json();

        if (profData.restaurant) {
          setRestaurant(profData.restaurant);
        }

        const items = itemData.items || [];
        const cats = catData.categories || [];
        const tables = tableData.tables || [];
        const orderMetrics = orderData.metrics || {};

        const available = items.filter((i: any) => i.isAvailable).length;
        const unavailable = items.length - available;

        setStats({
          totalItems: items.length,
          totalCategories: cats.length,
          totalTables: tables.length,
          availableItems: available,
          unavailableItems: unavailable,
          pendingOrders: orderMetrics.pendingCount || 0,
          totalRevenue: orderMetrics.totalRevenue || 0,
        });

        setRecentCategories(cats);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#E86326] text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-[#E86326]" />
              <span>DINE-IN DIGITAL PLATFORM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
              Welcome back, {restaurant?.name || "The Momo's Wala"}
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Your digital menu is live and ready for guests to scan and browse without friction.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {restaurant && (
              <a
                href={`/r/${restaurant.slug}/t/7`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition shadow-sm inline-flex items-center gap-2"
              >
                <span>Live Table 7 Menu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 5 Core Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Total Menu Items */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716C]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Menu Items</span>
              <div className="p-2 rounded-xl bg-[#FFF7ED] text-[#E86326]">
                <Utensils className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {loading ? '—' : stats.totalItems}
              </div>
              <p className="text-[11px] text-[#78716C] mt-0.5">Across all categories</p>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716C]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Categories</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <FolderTree className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {loading ? '—' : stats.totalCategories}
              </div>
              <p className="text-[11px] text-[#78716C] mt-0.5">Menu sections</p>
            </div>
          </div>

          {/* Active Tables */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716C]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tables</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-700">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {loading ? '—' : stats.totalTables}
              </div>
              <p className="text-[11px] text-[#78716C] mt-0.5">With permanent QR codes</p>
            </div>
          </div>

          {/* Available Dishes */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716C]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {loading ? '—' : stats.availableItems}
              </div>
              <p className="text-[11px] text-emerald-600 mt-0.5">Ready to order</p>
            </div>
          </div>

          {/* Sold Out / Unavailable */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-[#78716C]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Unavailable</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-700">
                {loading ? '—' : stats.unavailableItems}
              </div>
              <p className="text-[11px] text-rose-600 mt-0.5">Marked sold out</p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Menu Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAE5] shadow-subtle space-y-4">
            <h2 className="text-base font-bold text-[#1C1917]">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                href="/admin/orders"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-xs font-bold text-[#E86326] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E86326] flex items-center justify-center text-white shadow-subtle">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Live Orders & Billing</span>
                    <span className="text-[10px] text-[#C2410C] font-normal">
                      {stats.pendingOrders > 0
                        ? `${stats.pendingOrders} pending confirmation`
                        : 'Table orders & history'}
                    </span>
                  </div>
                </div>
                {stats.pendingOrders > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E86326] text-white animate-pulse">
                    {stats.pendingOrders}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#E86326] group-hover:translate-x-0.5 transition" />
                )}
              </Link>

              <Link
                href="/admin/menu"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FAFAF8] hover:bg-[#FFF7ED] border border-[#E5E5DE] hover:border-[#FED7AA] text-xs font-semibold text-[#1C1917] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#E86326] shadow-subtle">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>Add or Edit Dishes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#78716C] group-hover:text-[#E86326] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/categories"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FAFAF8] hover:bg-[#FFF7ED] border border-[#E5E5DE] hover:border-[#FED7AA] text-xs font-semibold text-[#1C1917] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#E86326] shadow-subtle">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <span>Organize Categories</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#78716C] group-hover:text-[#E86326] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/tables"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FAFAF8] hover:bg-[#FFF7ED] border border-[#E5E5DE] hover:border-[#FED7AA] text-xs font-semibold text-[#1C1917] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#E86326] shadow-subtle">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span>Print Table Stand QR Cards</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#78716C] group-hover:text-[#E86326] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/profile"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FAFAF8] hover:bg-[#FFF7ED] border border-[#E5E5DE] hover:border-[#FED7AA] text-xs font-semibold text-[#1C1917] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#E86326] shadow-subtle">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Update Restaurant Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#78716C] group-hover:text-[#E86326] group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          {/* Categories Overview List */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#EAEAE5] shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1917]">Category Breakdown</h2>
                <p className="text-xs text-[#78716C]">Current active sections in your digital menu</p>
              </div>
              <Link
                href="/admin/categories"
                className="text-xs font-semibold text-[#E86326] hover:underline"
              >
                Manage All
              </Link>
            </div>

            <div className="space-y-2">
              {recentCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#EFEFEA]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white border border-[#E5E5DE] text-[#78716C] flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#1C1917]">{cat.name}</p>
                      {cat.description && (
                        <p className="text-[11px] text-[#78716C] truncate max-w-xs">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#57534E]">
                      {cat._count?.menuItems ?? cat.menuItems?.length ?? 0} items
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
