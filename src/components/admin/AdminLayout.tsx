'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  FolderTree,
  QrCode,
  Store,
  Settings,
  LogOut,
  ExternalLink,
  Menu as MenuIcon,
  X,
  Sparkles,
  Receipt,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { playKitchenChime } from '@/lib/audio';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<{ name: string; slug: string; logoUrl?: string } | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Global live orders notification state
  const [pendingCount, setPendingCount] = useState(0);
  const [globalToast, setGlobalToast] = useState<{
    id: string;
    orderNumber: number;
    tableNumber: string;
    total: number;
    itemsCount: number;
  } | null>(null);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstCheckRef = React.useRef<boolean>(true);

  // Fetch session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/admin/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated) {
          setRestaurant(data.restaurant);
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push('/admin/login');
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, [router]);

  // Polling for incoming pending orders every 4 seconds
  useEffect(() => {
    const checkOrders = async () => {
      try {
        const res = await fetch('/api/orders?status=PENDING');
        if (!res.ok) return;
        const data = await res.json();
        const orders = data.orders || [];
        setPendingCount(orders.length);

        if (!isFirstCheckRef.current) {
          const brandNew = orders.find((o: any) => !knownOrderIdsRef.current.has(o.id));
          if (brandNew) {
            playKitchenChime();
            setGlobalToast({
              id: brandNew.id,
              orderNumber: brandNew.orderNumber,
              tableNumber: brandNew.tableNumber,
              total: brandNew.total,
              itemsCount: brandNew.orderItems?.length || 1,
            });
          }
        }

        const idSet = new Set<string>();
        orders.forEach((o: any) => idSet.add(o.id));
        knownOrderIdsRef.current = idSet;
        isFirstCheckRef.current = false;
      } catch (err) {
        // silent fail on network hiccups
      }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error(err);
      router.push('/admin/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Orders & History', href: '/admin/orders', icon: Receipt, badge: pendingCount },
    { name: 'Menu Items', href: '/admin/menu', icon: Utensils },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree },
    { name: 'Tables & QR Codes', href: '/admin/tables', icon: QrCode },
    { name: 'Restaurant Profile', href: '/admin/profile', icon: Store },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    ...(user && (user as any).role === 'SUPERADMIN'
      ? [{ name: '👑 Super Admin SaaS', href: '/superadmin', icon: ShieldCheck }]
      : []),
  ];

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E86326] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#78716C]">Loading MOMO MENU Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-[#EAEAE5] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E86326] flex items-center justify-center text-white font-bold text-xs">
            MM
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#1C1917] leading-tight">MOMO MENU</h1>
            <p className="text-[10px] text-[#78716C]">Smart Menu Admin</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-[#57534E] hover:bg-[#F4F4F0]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-full md:h-screen w-64 bg-white border-r border-[#EAEAE5] flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-[#EFEFEA]">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E86326] to-[#D34F15] flex items-center justify-center text-white shadow-sm font-black text-sm group-hover:scale-105 transition-transform">
                MM
              </div>
              <div>
                <span className="block text-sm font-extrabold text-[#1C1917] tracking-tight">
                  MOMO MENU
                </span>
                <span className="block text-[10px] font-semibold text-[#E86326] tracking-wider uppercase">
                  SMART DIGITAL MENU
                </span>
              </div>
            </Link>

            {/* Restaurant Badge & Monthly Subscription Status */}
            {restaurant && (
              <div className="mt-4 p-2.5 rounded-xl bg-[#FFFDF8] border border-[#F5EAD4] space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] text-[#E86326] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1C1917] truncate leading-tight">
                      {restaurant.name}
                    </p>
                    <p className="text-[10px] text-[#78716C] truncate">
                      /r/{restaurant.slug}
                    </p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-[#F5EAD4] flex items-center justify-between text-[10px]">
                  <span className="text-[#78716C]">Subscription:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    PRO ACTIVE (₹999/mo)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#FFF7ED] text-[#E86326] font-bold shadow-subtle border border-[#FED7AA]/50'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-[#E86326]' : 'text-[#78716C]'}`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E86326] text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#EFEFEA] space-y-2">
          {restaurant && (
            <a
              href={`/r/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-semibold text-[#1C1917] transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E86326]" />
              <span>Preview Live Menu</span>
            </a>
          )}

          {/* User profile & Logout */}
          <div className="pt-2 flex items-center justify-between px-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1C1917] truncate">
                {user?.name || 'Restaurant Admin'}
              </p>
              <p className="text-[10px] text-[#78716C] truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 transition"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {/* Floating Global Incoming Order Toast */}
        {globalToast && (
          <div className="fixed top-4 right-4 sm:right-8 z-50 max-w-sm w-full bg-[#1C1917] text-white p-4 rounded-2xl shadow-float border border-white/10 animate-slide-up flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E86326] flex items-center justify-center font-bold text-white flex-shrink-0 animate-bounce">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">
                    Table {globalToast.tableNumber} Order Received!
                  </h4>
                  <p className="text-[11px] text-[#A8A29E]">
                    #{globalToast.orderNumber} • {globalToast.itemsCount} dishes • ₹{globalToast.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGlobalToast(null)}
                className="text-[#78716C] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/10 justify-end">
              <button
                onClick={() => setGlobalToast(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A8A29E] hover:text-white"
              >
                Dismiss
              </button>
              <Link
                href="/admin/orders"
                onClick={() => setGlobalToast(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition flex items-center gap-1 shadow-sm"
              >
                <span>View Order</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Desktop Top Sub-header */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-[#EAEAE5]">
          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <span className="font-semibold text-[#1C1917]">Restaurant Workspace</span>
            <span>/</span>
            <span className="font-medium text-[#E86326]">{restaurant?.name || 'Urban Spice'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Orders Quick Indicator */}
            <Link
              href="/admin/orders"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                pendingCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                  : 'bg-[#FAFAF8] text-[#57534E] border-[#E5E5DE] hover:bg-[#F2F2ED]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#E86326]" />
              <span>{pendingCount > 0 ? `${pendingCount} In Pipeline` : 'Orders Radar'}</span>
            </Link>

            {restaurant && (
              <a
                href={`/r/${restaurant.slug}/t/7`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF7ED] text-[#E86326] border border-[#FED7AA] hover:bg-[#FFEDD5] transition shadow-subtle"
              >
                <span>Test Table 7 Menu</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <div className="text-[11px] font-medium text-[#78716C] bg-[#FAFAF8] px-2.5 py-1 rounded-md border border-[#E5E5DE]">
              v1.0 Production Ready
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>

        {/* Admin Footer */}
        <footer className="px-6 py-4 border-t border-[#EAEAE5] bg-white text-center text-xs text-[#78716C]">
          <span>MOMO MENU • </span>
          <span className="font-semibold text-[#E86326]">SMART DIGITAL HOSPITALITY</span>
          <span> • SCAN | ORDER | ENJOY</span>
        </footer>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
