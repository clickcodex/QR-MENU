'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  UtensilsCrossed,
  ArrowRight,
  LogOut,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { playKitchenChime } from '@/lib/audio';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';
import { OrderStatusPath, OrderStatus } from '@/components/common/OrderStatusPath';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  total: number;
}

interface OrderData {
  id: string;
  orderNumber: number;
  tableNumber: string;
  customerName: string | null;
  notes: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

export default function KitchenOrdersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'ALL'>('PENDING');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [newOrderBanner, setNewOrderBanner] = useState<OrderData | null>(null);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // 1. Verify kitchen user session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/kitchen/login');
          return;
        }
        const data = await res.json();
        if (!data.authenticated) {
          router.push('/kitchen/login');
          return;
        }
        setCurrentUser(data.user);
        setRestaurant(data.restaurant);
      } catch {
        router.push('/kitchen/login');
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch live kitchen orders
  const fetchKitchenOrders = useCallback(async (manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
      const res = await fetch('/api/orders');
      if (res.status === 401 || res.status === 403) {
        router.push('/kitchen/login');
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      const incoming: OrderData[] = data.orders || [];

      // Check for incoming PENDING orders for audible chime alert
      if (initialLoadDoneRef.current) {
        const freshPending = incoming.find(
          (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'PENDING'
        );
        if (freshPending) {
          if (soundEnabled) {
            playKitchenChime();
          }
          setNewOrderBanner(freshPending);
        }
      }

      const newIds = new Set<string>();
      incoming.forEach((o) => newIds.add(o.id));
      knownOrderIdsRef.current = newIds;
      initialLoadDoneRef.current = true;

      setOrders(incoming);
      if (data.restaurant) setRestaurant(data.restaurant);
    } catch (err) {
      console.error('Kitchen orders fetch error:', err);
    } finally {
      setLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, [router, soundEnabled]);

  // Polling every 3.5 seconds
  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(() => {
      fetchKitchenOrders();
    }, 3500);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  // Handle status update strictly for kitchen role (up to SERVED)
  const handleKitchenStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      setActionLoadingId(orderId);
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update order status');
        return;
      }

      // If this was in the new order banner, dismiss it
      if (newOrderBanner?.id === orderId) {
        setNewOrderBanner(null);
      }

      // Refetch orders immediately
      await fetchKitchenOrders();
    } catch (err) {
      console.error('Status transition error:', err);
      alert('Error updating order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/kitchen/login');
  };

  // Filter orders by active tab
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const cookingOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const servedOrders = orders.filter((o) => o.status === 'SERVED');

  let filteredOrders = orders;
  if (activeTab === 'PENDING') filteredOrders = pendingOrders;
  else if (activeTab === 'COOKING') filteredOrders = cookingOrders;
  else if (activeTab === 'READY') filteredOrders = readyOrders;
  else if (activeTab === 'SERVED') filteredOrders = servedOrders;
  else if (activeTab === 'ALL') filteredOrders = orders.filter((o) => o.status !== 'COMPLETED');

  const getTimeElapsed = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white tracking-wide">
                  {restaurant?.name || 'MOMO MENU'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
                  Kitchen Station
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logged in: <strong className="text-slate-200">{currentUser?.name || 'Kitchen Staff'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) playKitchenChime();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                soundEnabled
                  ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Chime ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span>Chime Muted</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchKitchenOrders(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Prominent New Order Approval Banner (plays chime and requires approval) */}
      {newOrderBanner && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-3 shadow-xl border-b border-amber-400 animate-bounce">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm sm:text-base leading-tight">
                  🔔 NEW ORDER APPROVAL REQUEST: TABLE {newOrderBanner.tableNumber} (Order #{newOrderBanner.orderNumber})
                </p>
                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                  {newOrderBanner.orderItems.length} dish{newOrderBanner.orderItems.length > 1 ? 'es' : ''} waiting for kitchen acceptance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleKitchenStatusUpdate(newOrderBanner.id, 'ACCEPTED')}
                disabled={actionLoadingId === newOrderBanner.id}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>ACCEPT ORDER & APPROVE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setNewOrderBanner(null)}
                className="px-3 py-2 bg-black/20 hover:bg-black/30 text-slate-950 font-bold text-xs rounded-xl"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col">
        {/* Stage Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Needs Approval</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'PENDING' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'
            }`}>
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COOKING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'COOKING'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Cooking / In Kitchen</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'COOKING' ? 'bg-blue-950 text-blue-200' : 'bg-slate-800 text-slate-300'
            }`}>
              {cookingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('READY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'READY'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-purple-300" />
            <span>Ready for Pass</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'READY' ? 'bg-purple-950 text-purple-200' : 'bg-slate-800 text-slate-300'
            }`}>
              {readyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SERVED')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'SERVED'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Delivered to Table</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'SERVED' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-300'
            }`}>
              {servedOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ml-auto ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>All Active</span>
          </button>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold">Connecting to Kitchen Display radar...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <ChefHat className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">No Orders in this Section</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {activeTab === 'PENDING'
                ? 'No pending orders waiting for approval. Kitchen is all caught up!'
                : activeTab === 'COOKING'
                ? 'No orders currently cooking on the stoves.'
                : activeTab === 'READY'
                ? 'No plated orders waiting on the pass.'
                : 'New incoming orders will chime and appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'PENDING';
              const isAccepted = order.status === 'ACCEPTED';
              const isPreparing = order.status === 'PREPARING';
              const isReady = order.status === 'READY';
              const isServed = order.status === 'SERVED';
              const isUpdating = actionLoadingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border flex flex-col transition-all duration-200 overflow-hidden shadow-xl ${
                    isPending
                      ? 'bg-amber-950/20 border-amber-500/60 ring-2 ring-amber-500/20'
                      : isAccepted || isPreparing
                      ? 'bg-slate-900/90 border-blue-500/40'
                      : isReady
                      ? 'bg-purple-950/20 border-purple-500/50'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-4 border-b flex items-start justify-between ${
                    isPending
                      ? 'bg-amber-950/40 border-amber-500/30'
                      : isAccepted || isPreparing
                      ? 'bg-blue-950/40 border-blue-500/30'
                      : isReady
                      ? 'bg-purple-950/40 border-purple-500/30'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white tracking-tight">
                          TABLE {order.tableNumber}
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-bold">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{getTimeElapsed(order.createdAt)}</span>
                        {order.customerName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 font-semibold">{order.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                      isPending
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : isAccepted
                        ? 'bg-blue-600 text-white'
                        : isPreparing
                        ? 'bg-orange-600 text-white'
                        : isReady
                        ? 'bg-purple-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Special Notes */}
                  {order.notes && (
                    <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong className="font-bold">Kitchen Note:</strong> {order.notes}
                      </div>
                    </div>
                  )}

                  {/* Order Items List */}
                  <div className="p-4 flex-1 space-y-2.5">
                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Ordered Dishes ({order.orderItems.reduce((acc, i) => acc + i.quantity, 0)} items)
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="py-2 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700">
                              {item.quantity}×
                            </span>
                            <DietaryIndicator isVeg={item.isVeg} size="sm" />
                            <span className="font-semibold text-slate-100">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Lifecycle Bar */}
                  <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60">
                    <OrderStatusPath currentStatus={order.status} compact />
                  </div>

                  {/* Kitchen Action Footer (ONLY allows actions up to SERVED) */}
                  <div className="p-3.5 bg-slate-900 border-t border-slate-800">
                    {isPending && (
                      <button
                        onClick={() => handleKitchenStatusUpdate(order.id, 'ACCEPTED')}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ACCEPT ORDER & APPROVE</span>
                          </>
                        )}
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleKitchenStatusUpdate(order.id, 'PREPARING')}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Flame className="w-4 h-4" />
                            <span>START COOKING</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleKitchenStatusUpdate(order.id, 'READY')}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 bg-purple-500 hover:bg-purple-400 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UtensilsCrossed className="w-4 h-4" />
                            <span>MARK READY AT PASS</span>
                          </>
                        )}
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleKitchenStatusUpdate(order.id, 'SERVED')}
                        disabled={isUpdating}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4" />
                            <span>DELIVER TO TABLE (SERVED)</span>
                          </>
                        )}
                      </button>
                    )}

                    {isServed && (
                      <div className="w-full py-2.5 px-3 bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Delivered to Table ✓ (Kitchen Complete)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
