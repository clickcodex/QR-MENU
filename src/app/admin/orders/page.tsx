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
  Check,
  CircleDollarSign,
  AlertCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';
import { PrintableReceipt } from '@/components/admin/PrintableReceipt';
import { OrderStatusPath, OrderStatus } from '@/components/common/OrderStatusPath';
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
  acceptedCount: number;
  deliveredCount: number;
  totalRevenue: number;
  currencySymbol: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0,
    pendingCount: 0,
    acceptedCount: 0,
    deliveredCount: 0,
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
  const [soundEnabled, setSoundEnabled] = useState(true);
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
      if (data.metrics) setMetrics(data.metrics);
      if (data.restaurant) setRestaurant(data.restaurant);

      // Check for brand new pending orders that were not seen before
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

  // Update order status handler (Pending -> Accepted -> Delivered)
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

  // Normalize order status to 3 simplified stages
  const getNormalizedStatus = (status: OrderStatus) => {
    if (status === 'PENDING') return 'PENDING';
    if (status === 'ACCEPTED' || status === 'PREPARING' || status === 'READY') return 'ACCEPTED';
    return 'DELIVERED';
  };

  const getStatusBadge = (status: OrderStatus) => {
    const norm = getNormalizedStatus(status);
    switch (norm) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending (New Order)
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Accepted (Preparing)
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Delivered ✓
          </span>
        );
      default:
        return null;
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return order.status === 'PENDING';
    if (statusFilter === 'ACCEPTED') {
      return order.status === 'ACCEPTED' || order.status === 'PREPARING' || order.status === 'READY';
    }
    if (statusFilter === 'DELIVERED') {
      return order.status === 'DELIVERED' || order.status === 'SERVED' || order.status === 'COMPLETED';
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* New Order Alert Banner */}
        {newOrderAlert && (
          <div className="bg-[#FFF7ED] border-2 border-[#E86326] rounded-2xl p-4 shadow-float animate-bounce-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E86326] text-white flex items-center justify-center font-bold flex-shrink-0">
                <Bell className="w-5 h-5 animate-wiggle" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1C1917]">
                  🔔 New Order — Table {newOrderAlert.tableNumber} (Order #{newOrderAlert.orderNumber})
                </h4>
                <p className="text-xs text-[#57534E]">
                  Dishes: {newOrderAlert.orderItems.map((i) => `${i.name} (${i.quantity}×)`).join(', ')} • Total: {metrics.currencySymbol}
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
                <span>Accept Order</span>
              </button>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="px-3 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>RESTAURANT ORDER MANAGEMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
              Table Orders & History
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Core ordering flow: <strong>Customer Scans QR → Reviews & Confirms → Admin Accepts → Marked Delivered</strong>
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#E86326]'
                  : 'bg-[#FAFAF8] border-[#E5E5DE] text-[#78716C]'
              }`}
              title="Toggle order chime notification"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Chime On' : 'Chime Off'}</span>
            </button>

            {/* Test Sound */}
            <button
              onClick={() => playKitchenChime()}
              className="px-3 py-2 rounded-xl border border-[#E5E5DE] bg-white text-xs font-medium text-[#57534E] hover:bg-[#FAFAF8] transition"
              title="Test chime sound"
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

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Today's Total Orders */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Total Orders Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-stone-100 text-[#1C1917] flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.totalOrders}
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">All table orders received</p>
          </div>

          {/* 2. New / Pending Orders */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                New / Pending
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
                  Action Needed
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Awaiting admin acceptance</p>
          </div>

          {/* 3. Accepted Orders */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Accepted Orders
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.acceptedCount}
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">In preparation / being served</p>
          </div>

          {/* 4. Delivered Orders */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Delivered Orders
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.deliveredCount}
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Successfully fulfilled</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAEAE5]">
          {/* Simple Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { key: 'ALL', label: `All Orders (${metrics.totalOrders})` },
              { key: 'PENDING', label: `New / Pending (${metrics.pendingCount})` },
              { key: 'ACCEPTED', label: `Accepted (${metrics.acceptedCount})` },
              { key: 'DELIVERED', label: `Delivered (${metrics.deliveredCount})` },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#E86326] text-white shadow-sm'
                      : 'text-[#57534E] hover:bg-[#FAFAF8] hover:text-[#1C1917]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Table Filter */}
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
            <p className="text-xs font-semibold text-[#78716C]">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#EAEAE5] p-8 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-3xl">
              🍽️
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">No Orders Found</h3>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto">
              {statusFilter !== 'ALL'
                ? `No orders currently match the filter "${statusFilter}".`
                : 'No table orders placed yet. Customers can scan their table QR code to start ordering.'}
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
            {filteredOrders.map((order) => {
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isLoading = actionLoadingId === order.id;
              const normStatus = getNormalizedStatus(order.status);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-subtle flex flex-col justify-between ${
                    normStatus === 'PENDING'
                      ? 'border-[#FED7AA] ring-2 ring-[#FED7AA]/50'
                      : 'border-[#EAEAE5]'
                  }`}
                >
                  {/* Card Header: Table Badge, Order #, Time & Status */}
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

                  {/* Order Status Stepper Bar */}
                  <div className="px-5 pt-3 pb-1">
                    <OrderStatusPath currentStatus={order.status} size="sm" />
                  </div>

                  {/* Customer Special Note */}
                  {order.notes && (
                    <div className="mx-5 mt-2 p-3 rounded-xl bg-[#FFFDF0] border border-[#F5EAD4] text-xs text-[#78350F] flex items-start gap-2">
                      <span className="font-black">Special Note:</span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {/* Ordered Items List */}
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
                    {/* Bill Summary */}
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

                    {/* Action Buttons: Accept Order -> Mark Delivered */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      {/* Print Receipt Button */}
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-semibold text-[#57534E] flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#E86326]" />
                        <span>Print Bill</span>
                      </button>

                      {/* Primary Order Action */}
                      <div className="flex items-center gap-2">
                        {normStatus === 'PENDING' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                            className="px-4 py-2.5 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                          </button>
                        )}

                        {normStatus === 'ACCEPTED' && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Delivered</span>
                          </button>
                        )}

                        {normStatus === 'DELIVERED' && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Delivered ✓</span>
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
