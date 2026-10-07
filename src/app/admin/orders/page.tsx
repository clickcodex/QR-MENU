'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Receipt,
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  CheckCircle2,
  Printer,
  ChevronRight,
  Flame,
  ChefHat,
  ShoppingBag,
  CircleDollarSign,
  Check,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';
import { PrintableReceipt, OrderReceiptData } from '@/components/admin/PrintableReceipt';
import { OrderStatusPath, OrderStatus, ORDER_STATUS_STEPS } from '@/components/common/OrderStatusPath';
import { playKitchenChime } from '@/lib/audio';

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
  table?: {
    id: string;
    tableNumber: string;
    name: string | null;
    capacity: number;
  } | null;
}

interface Metrics {
  totalOrders: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  servedCount: number;
  totalRevenue: number;
  currencySymbol: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0,
    pendingCount: 0,
    preparingCount: 0,
    readyCount: 0,
    servedCount: 0,
    totalRevenue: 0,
    currencySymbol: '₹',
  });
  const [restaurant, setRestaurant] = useState<{
    name: string;
    slug: string;
    address?: string | null;
    phone?: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(false); // Chime notification rings in Kitchen Section only
  const [newOrderAlert, setNewOrderAlert] = useState<OrderData | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OrderData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Store known order IDs to detect new orders during polling
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // Fetch orders from API
  const fetchOrders = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const url = `/api/orders?status=${statusFilter}${
        selectedTable !== 'ALL' ? `&table=${encodeURIComponent(selectedTable)}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();

      const incomingOrders: OrderData[] = data.orders || [];
      setMetrics(data.metrics);
      if (data.restaurant) setRestaurant(data.restaurant);

      // Check for brand new orders that were not seen before
      if (initialLoadDoneRef.current) {
        const brandNew = incomingOrders.find(
          (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'PENDING'
        );
        if (brandNew) {
          if (soundEnabled) {
            playKitchenChime();
          }
          setNewOrderAlert(brandNew);
        }
      }

      // Update known order IDs
      const newSet = new Set<string>();
      incomingOrders.forEach((o) => newSet.add(o.id));
      knownOrderIdsRef.current = newSet;
      initialLoadDoneRef.current = true;

      setOrders(incomingOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [statusFilter, selectedTable, soundEnabled]);

  // Initial fetch and auto-refresh polling interval every 4 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Update order status handler (strictly following the forward lifecycle)
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      setActionLoadingId(orderId);
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      // Re-fetch to sync metrics
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error updating order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Get distinct tables from orders
  const uniqueTables = Array.from(new Set(orders.map((o) => o.tableNumber))).sort();

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            1. PENDING (Action Needed)
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            2. ACCEPTED (Confirmed)
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300">
            <Flame className="w-3 h-3 text-[#E86326] animate-bounce" />
            3. PREPARING (In Kitchen)
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Bell className="w-3 h-3 text-purple-700 animate-bounce" />
            4. READY (Food Ready)
          </span>
        );
      case 'SERVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            5. SERVED (On Table)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Check className="w-3 h-3 text-emerald-600" />
            6. COMPLETED (Billed)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Floating Top Incoming Order Alert Banner (Confirm to place in workflow) */}
        {newOrderAlert && (
          <div className="bg-[#FFF7ED] border-2 border-[#E86326] rounded-2xl p-4 shadow-float animate-bounce-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E86326] text-white flex items-center justify-center font-bold flex-shrink-0">
                <Bell className="w-5 h-5 animate-wiggle" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1C1917]">
                  🔔 New Order Received: Table {newOrderAlert.tableNumber} (Order #{newOrderAlert.orderNumber})
                </h4>
                <p className="text-xs text-[#57534E]">
                  This is the order: {newOrderAlert.orderItems.map((i) => `${i.name} (${i.quantity}x)`).join(', ')} • Total Bill: {metrics.currencySymbol}
                  {newOrderAlert.total.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  handleUpdateStatus(newOrderAlert.id, 'ACCEPTED');
                  setNewOrderAlert(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Accept Order</span>
              </button>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="px-3 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>ORDER STATUS PATH LIFECYCLE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
              Table Orders & Kitchen Billing
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Order status path: <strong>PENDING → ACCEPTED → PREPARING → READY → SERVED → COMPLETED</strong>. Statuses never skip or go backwards.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#E86326]'
                  : 'bg-[#FAFAF8] border-[#E5E5DE] text-[#78716C]'
              }`}
              title="Toggle kitchen chime notification"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Chime On' : 'Chime Off'}</span>
            </button>

            {/* Test Sound */}
            <button
              onClick={() => playKitchenChime()}
              className="px-3 py-2 rounded-xl border border-[#E5E5DE] bg-white text-xs font-medium text-[#57534E] hover:bg-[#FAFAF8] transition"
              title="Test the chime volume"
            >
              Test Chime
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-bold text-[#1C1917] transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Order Status Path Reference Banner (matching reference diagram) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle space-y-2">
          <OrderStatusPath currentStatus="PENDING" size="md" />
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pending Orders */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                1. Pending Approval
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.pendingCount}
              </span>
              {metrics.pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                  Click to Confirm
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Awaiting order confirmation</p>
          </div>

          {/* 2. In Kitchen */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                2 & 3. In Kitchen
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#E86326] flex items-center justify-center font-bold">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.preparingCount}
              </span>
              <span className="text-xs text-[#78716C]">cooking</span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Confirmed & being prepared</p>
          </div>

          {/* 3. Ready to Serve */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                4. Ready to Serve
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.readyCount || 0}
              </span>
              <span className="text-xs text-[#78716C]">plates hot</span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Cooked, ready for table</p>
          </div>

          {/* 4. Active Billing Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Active Billed Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.currencySymbol}{metrics.totalRevenue.toFixed(0)}
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Includes 5% restaurant GST</p>
          </div>
        </div>

        {/* Filters and Search Bar (strictly no cancellation tab) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAEAE5]">
          {/* Status Tabs following the path */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].map(
              (st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? 'bg-[#E86326] text-white shadow-sm'
                        : 'text-[#57534E] hover:bg-[#FAFAF8] hover:text-[#1C1917]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All Orders'
                      : st === 'PENDING'
                      ? `Pending (${metrics.pendingCount})`
                      : st === 'READY'
                      ? `Ready (${metrics.readyCount || 0})`
                      : st}
                  </button>
                );
              }
            )}
          </div>

          {/* Filter by Table */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-[#78716C]">Table:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="px-3 py-1.5 bg-[#FAFAF8] border border-[#E5E5DE] rounded-xl text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#E86326]"
            >
              <option value="ALL">All Tables</option>
              {uniqueTables.map((t) => (
                <option key={t} value={t}>
                  Table {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Listing Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#E86326] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#78716C]">Loading live orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#EAEAE5] p-8 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-3xl">
              🍽️
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">No Orders in This View</h3>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto">
              {statusFilter !== 'ALL'
                ? `There are currently no orders with status "${statusFilter}".`
                : 'No table orders placed yet. Customers can scan the table QR code to start ordering.'}
            </p>
            {restaurant && (
              <div className="pt-2">
                <a
                  href={`/r/${restaurant.slug}/t/7`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition shadow-sm"
                >
                  <span>Open Table 7 Menu & Place Test Order</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {orders.map((order) => {
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isLoading = actionLoadingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-subtle flex flex-col justify-between ${
                    order.status === 'PENDING'
                      ? 'border-[#FED7AA] ring-2 ring-[#FED7AA]/50'
                      : 'border-[#EAEAE5]'
                  }`}
                >
                  {/* Card Top: Order and Table Badges */}
                  <div className="p-5 border-b border-[#EAEAE5] bg-[#FFFDF8]/50 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-[#1C1917] text-white text-xs font-black tracking-wide shadow-sm">
                          TABLE {order.tableNumber}
                        </span>
                        <span className="text-xs font-bold text-[#78716C]">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[#78716C]">
                        <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <span>Placed at {formattedTime}</span>
                        {order.customerName && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-[#1C1917]">
                              Guest: {order.customerName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Order Status Path Bar on each card */}
                  <div className="px-5 pt-3 pb-1">
                    <OrderStatusPath currentStatus={order.status} size="sm" />
                  </div>

                  {/* Kitchen Section Live Progress Note */}
                  <div className="mx-5 my-2">
                    {order.status === 'PENDING' && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                        <span>🔔 Notification sent to <strong>Kitchen Station</strong>. Waiting for kitchen staff approval.</span>
                      </div>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>👨‍🍳 <strong>Kitchen Accepted Order</strong>. Kitchen staff is prepping the station.</span>
                      </div>
                    )}
                    {order.status === 'PREPARING' && (
                      <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-600 flex-shrink-0 animate-pulse" />
                        <span>🍳 <strong>Kitchen is Cooking</strong>. Dishes are being prepared on the stoves/tandoor.</span>
                      </div>
                    )}
                    {order.status === 'READY' && (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                        <Bell className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>🛎️ <strong>Ready on Kitchen Pass</strong>. Food is plated and waiting for runner.</span>
                      </div>
                    )}
                    {order.status === 'SERVED' && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>🚀 <strong>Delivered to Table by Kitchen!</strong> Customer is dining. Ready for bill completion.</span>
                      </div>
                    )}
                    {order.status === 'COMPLETED' && (
                      <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-stone-500 flex-shrink-0" />
                        <span>✓ <strong>Bill Settled & Complete</strong>. Transaction closed.</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Cooking Instructions */}
                  {order.notes && (
                    <div className="mx-5 mt-2 p-3 rounded-xl bg-[#FFFDF0] border border-[#F5EAD4] text-xs text-[#78350F] flex items-start gap-2">
                      <span className="font-black">Special Note:</span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {/* Ordered Items Table */}
                  <div className="p-5 flex-1 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider block">
                      Ordered Dishes ({order.orderItems.reduce((acc, i) => acc + i.quantity, 0)})
                    </span>

                    <div className="space-y-1.5">
                      {order.orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-[#F5F5F0] last:border-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <DietaryIndicator isVeg={item.isVeg} size="sm" />
                            <span className="font-bold text-[#1C1917] truncate">
                              {item.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#E5E5DE] text-[11px] font-bold text-[#E86326]">
                              ×{item.quantity}
                            </span>
                          </div>

                          <div className="text-right flex-shrink-0 font-semibold text-[#1C1917]">
                            {metrics.currencySymbol}
                            {item.total.toFixed(0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bill Breakdown & Actions Footer */}
                  <div className="p-5 bg-[#FAFAF8] border-t border-[#EAEAE5] space-y-4">
                    {/* Bill summary breakdown */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-[#78716C]">
                        <span>Subtotal</span>
                        <span>{metrics.currencySymbol}{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#78716C]">
                        <span>GST (5%)</span>
                        <span>{metrics.currencySymbol}{order.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1.5 border-t border-[#EAEAE5] text-sm font-black text-[#1C1917]">
                        <span>Total Bill</span>
                        <span className="text-base text-[#E86326]">
                          {metrics.currencySymbol}{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Workflow (Following exact status path, no cancellation) */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      {/* Print Receipt Button */}
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-semibold text-[#57534E] flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#E86326]" />
                        <span>KOT / Bill</span>
                      </button>

                      {/* Forward Progression Actions: PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED */}
                      <div className="flex items-center gap-2">
                        {order.status === 'PENDING' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                            className="px-4 py-2.5 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm & Accept Order</span>
                          </button>
                        )}

                        {order.status === 'ACCEPTED' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                            className="px-4 py-2.5 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Start Preparing in Kitchen</span>
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'READY')}
                            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Mark Food Ready</span>
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Serve Dishes to Table</span>
                          </button>
                        )}

                        {order.status === 'SERVED' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                            className="px-4 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Complete & Settle Bill</span>
                          </button>
                        )}

                        {order.status === 'COMPLETED' && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Order Completed & Billed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Printable Receipt Modal */}
        {receiptOrder && restaurant && (
          <PrintableReceipt
            order={{
              orderNumber: receiptOrder.orderNumber,
              tableNumber: receiptOrder.tableNumber,
              tableName: receiptOrder.table?.name,
              customerName: receiptOrder.customerName,
              notes: receiptOrder.notes,
              createdAt: receiptOrder.createdAt,
              status: receiptOrder.status,
              subtotal: receiptOrder.subtotal,
              tax: receiptOrder.tax,
              total: receiptOrder.total,
              currencySymbol: metrics.currencySymbol,
              orderItems: receiptOrder.orderItems,
            }}
            restaurantName={restaurant.name}
            restaurantAddress={restaurant.address}
            restaurantPhone={restaurant.phone}
            onClose={() => setReceiptOrder(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
