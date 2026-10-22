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
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';
import { PrintableReceipt } from '@/components/admin/PrintableReceipt';
import { OrderStatusPath, OrderStatus } from '@/components/common/OrderStatusPath';
import { playKitchenChime } from '@/lib/audio';
import { parseOrderNotes } from '@/lib/orderNotes';

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
  confirmedAt?: string | null;
  modificationDeadline?: string | null;
  remainingModSeconds?: number;
  isModifiable?: boolean;
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
  cancelledCount?: number;
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
    cancelledCount: 0,
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
  const [autoDeleteDays, setAutoDeleteDays] = useState<string>('off');
  const [isPurging, setIsPurging] = useState(false);

  // Initialize autoDeleteDays from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr_auto_delete_days');
      if (saved && ['7', '15', '30', 'off'].includes(saved)) {
        setAutoDeleteDays(saved);
      }
    } catch (e) {}
  }, []);

  // Store known order IDs to detect new orders during polling
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // Fetch orders from API
  const fetchOrders = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const autoDelParam = autoDeleteDays !== 'off' ? `&autoDeleteDays=${autoDeleteDays}` : '';
      const url = `/api/orders?status=${statusFilter}${
        selectedTable !== 'ALL' ? `&table=${encodeURIComponent(selectedTable)}` : ''
      }${autoDelParam}`;
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
  }, [statusFilter, selectedTable, soundEnabled, autoDeleteDays]);

  // Initial fetch and auto-refresh polling interval every 4 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // High-resolution 1s tick for 5-minute modification window countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.remainingModSeconds && o.remainingModSeconds > 0) {
            const nextSec = o.remainingModSeconds - 1;
            return {
              ...o,
              remainingModSeconds: nextSec,
              isModifiable: nextSec > 0 && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.status),
            };
          }
          return o;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  // Change auto-delete retention timer
  const handleAutoDeleteChange = async (val: string) => {
    setAutoDeleteDays(val);
    try {
      localStorage.setItem('qr_auto_delete_days', val);
    } catch (e) {}

    if (val !== 'off') {
      try {
        setIsPurging(true);
        const res = await fetch(`/api/orders?autoDeleteDays=${val}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.deletedCount && data.deletedCount > 0) {
          alert(`Auto-delete active: Cleaned ${data.deletedCount} delivered/cancelled order(s) older than ${val} days.`);
        }
        fetchOrders(true);
      } catch (err) {
        console.error('Error during auto-delete execution:', err);
      } finally {
        setIsPurging(false);
      }
    }
  };

  // Manual purge trigger for delivered orders older than chosen days
  const handleManualPurge = async () => {
    if (autoDeleteDays === 'off') return;
    if (!window.confirm(`Are you sure you want to delete all delivered/cancelled orders older than ${autoDeleteDays} days? This cannot be undone.`)) {
      return;
    }
    try {
      setIsPurging(true);
      const res = await fetch(`/api/orders?autoDeleteDays=${autoDeleteDays}`, { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'Cleanup complete.');
      fetchOrders(true);
    } catch (err: any) {
      alert(err.message || 'Error purging orders');
    } finally {
      setIsPurging(false);
    }
  };

  // Delete a single delivered / cancelled order permanently
  const handleDeleteOrder = async (orderId: string, orderNumber: number, tableNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Order #${orderNumber} (Table ${tableNumber})? This will permanently remove it from history.`)) {
      return;
    }
    try {
      setActionLoadingId(orderId);
      const res = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');

      // Optimistically update
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error deleting order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Get distinct tables from orders
  const uniqueTables = Array.from(new Set(orders.map((o) => o.tableNumber))).sort();

  // Normalize order status to 4 simplified stages (Pending, Accepted, Delivered, Cancelled)
  const getNormalizedStatus = (status: OrderStatus) => {
    if (status === 'CANCELLED') return 'CANCELLED';
    if (status === 'PENDING') return 'PENDING';
    if (status === 'ACCEPTED' || status === 'PREPARING' || status === 'READY') return 'ACCEPTED';
    return 'DELIVERED';
  };

  const getStatusBadge = (status: OrderStatus) => {
    const norm = getNormalizedStatus(status);
    switch (norm) {
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Fully Cancelled
          </span>
        );
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
    if (statusFilter === 'CANCELLED') {
      return order.status === 'CANCELLED';
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Today's Total Orders */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Total Orders
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
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle relative overflow-hidden">
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
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
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
            <p className="text-[11px] text-[#A8A29E] mt-1">In preparation / cooking</p>
          </div>

          {/* 4. Delivered Orders */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
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

          {/* 5. Cancelled Orders */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAEAE5] shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                Cancelled
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1C1917]">
                {metrics.cancelledCount || 0}
              </span>
              {(metrics.cancelledCount || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  Removed
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">Dishes removed by diners</p>
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
              { key: 'CANCELLED', label: `Cancelled (${metrics.cancelledCount || 0})` },
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

          {/* Right Action Filters: Table Filter + Auto-Delete Delivered Timer */}
          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
            {/* Table Filter */}
            <div className="flex items-center gap-1.5">
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

            {/* Auto-Delete Delivered Orders Filter Selector */}
            <div className="flex items-center gap-1.5 bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1.5 rounded-xl text-xs shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-[#E86326]" />
              <span className="font-bold text-[#E86326] hidden md:inline">Auto-Delete Delivered:</span>
              <span className="font-bold text-[#E86326] md:hidden">Auto-Del:</span>
              <select
                value={autoDeleteDays}
                onChange={(e) => handleAutoDeleteChange(e.target.value)}
                className="bg-transparent font-extrabold text-[#9A3412] focus:outline-none cursor-pointer pr-1"
                title="Automatically delete older delivered orders"
              >
                <option value="off">Off (Keep All)</option>
                <option value="7">Older than 7 Days</option>
                <option value="15">Older than 15 Days</option>
                <option value="30">Older than 30 Days</option>
              </select>

              {autoDeleteDays !== 'off' && (
                <button
                  onClick={handleManualPurge}
                  disabled={isPurging}
                  className="ml-1 px-2 py-0.5 rounded-lg bg-[#E86326] text-white font-bold text-[10px] hover:bg-[#D34F15] transition flex items-center gap-1 disabled:opacity-50 shadow-2xs"
                  title={`Purge delivered orders older than ${autoDeleteDays} days now`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isPurging ? 'Purging...' : 'Purge'}</span>
                </button>
              )}
            </div>
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
              const parsedNotes = parseOrderNotes(order.notes, order.status);
              const isCancelled = normStatus === 'CANCELLED' || parsedNotes.isFullyCancelled;
              const activeDishesCount = order.orderItems.reduce((acc, i) => acc + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-subtle flex flex-col justify-between ${
                    isCancelled
                      ? 'border-rose-300 ring-1 ring-rose-200/60 bg-gradient-to-b from-rose-50/20 to-white'
                      : normStatus === 'PENDING'
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

                  {/* 1. SCENARIO A: Order Fully Cancelled Banner */}
                  {isCancelled && (
                    <div className="mx-5 mt-3 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black flex-shrink-0 mt-0.5 shadow-sm text-sm">
                          ✕
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-rose-950">
                              The order was fully canceled
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-800 uppercase tracking-wide">
                              All Dishes Removed
                            </span>
                          </div>
                          <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                            {parsedNotes.cancelledMessage || 'Customer removed all dishes from this order.'}
                          </p>
                          {(parsedNotes.cancelledDishes || order.orderItems.length > 0) && (
                            <div className="mt-2.5 text-xs text-rose-900 bg-white/90 p-2.5 rounded-xl border border-rose-200/90 shadow-2xs">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-rose-600 block mb-0.5">
                                Cancelled Dishes:
                              </span>
                              <span className="font-semibold line-through text-stone-700">
                                {parsedNotes.cancelledDishes || order.orderItems.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. SCENARIO B: Dish(es) Removed / Order Modified Banner */}
                  {!isCancelled && parsedNotes.isOrderUpdated && (
                    <div className="mx-5 mt-3 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black flex-shrink-0 mt-0.5 shadow-sm text-sm">
                          ⚠️
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-black text-xs sm:text-sm text-amber-950">
                              Order Updated: Dish(es) Modified by Diner
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                              Updated
                            </span>
                          </div>
                          {parsedNotes.addedDishes && parsedNotes.addedDishes.length > 0 && (
                            <div className="text-xs text-emerald-800 mt-1 flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-stone-600">Added Dish(es): </span>
                              <span className="font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded">
                                + {parsedNotes.addedDishes.join(', ')}
                              </span>
                            </div>
                          )}
                          {parsedNotes.removedDishes.length > 0 && (
                            <div className="text-xs text-rose-700 mt-1">
                              <span className="font-bold text-stone-600">Removed Dish(es): </span>
                              <span className="font-semibold line-through">
                                {parsedNotes.removedDishes.join(', ')}
                              </span>
                            </div>
                          )}
                          <div className="mt-2 p-2.5 rounded-xl bg-white border border-amber-200/90 text-xs shadow-2xs">
                            <span className="font-bold text-emerald-800 text-[11px] block mb-0.5">
                              ✓ Updated Current Dishes Name:
                            </span>
                            <span className="font-black text-[#1C1917] text-xs sm:text-sm">
                              {order.orderItems.map((i) => `${i.name} (×${i.quantity})`).join(', ') || parsedNotes.updatedDishes}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5-Minute Customer Order Modification Active Countdown */}
                  {!isCancelled && order.isModifiable && order.remainingModSeconds && order.remainingModSeconds > 0 && (
                    <div className="mx-5 mt-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>Diner 5-Min Edit Window Active</span>
                      </span>
                      <span className="font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">
                        {Math.floor(order.remainingModSeconds / 60)}m {order.remainingModSeconds % 60}s left
                      </span>
                    </div>
                  )}

                  {/* Customer Special Note */}
                  {parsedNotes.customerSpecialNote && (
                    <div className="mx-5 mt-2 p-3 rounded-xl bg-[#FFFDF0] border border-[#F5EAD4] text-xs text-[#78350F] flex items-start gap-2">
                      <span className="font-black">Special Note:</span>
                      <span>{parsedNotes.customerSpecialNote}</span>
                    </div>
                  )}

                  {/* Ordered Items List */}
                  <div className="p-5 flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider block">
                        {parsedNotes.isOrderUpdated ? 'Updated Dishes Name' : isCancelled ? 'Dishes in Order' : 'Ordered Dishes'} ({activeDishesCount})
                      </span>
                      {parsedNotes.isOrderUpdated && !isCancelled && (
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Updated Order
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          Order Fully Canceled
                        </span>
                      )}
                    </div>

                    {order.orderItems.length === 0 ? (
                      <div className="py-6 px-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-center space-y-1">
                        <p className="text-xs font-bold text-stone-600">No active dishes in this order</p>
                        <p className="text-[11px] text-stone-400">The order was fully canceled and all dishes were removed</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {order.orderItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between text-xs py-1.5 border-b border-[#F5F5F0] last:border-none ${
                              isCancelled ? 'opacity-60 line-through' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DietaryIndicator isVeg={item.isVeg} size="sm" />
                              <span className="font-bold text-[#1C1917] truncate">
                                {item.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-[#E5E5DE] text-[11px] font-bold text-[#E86326]">
                                ×{item.quantity}
                              </span>
                              {parsedNotes.isOrderUpdated && !isCancelled && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                  Active Dish
                                </span>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0 font-semibold text-[#1C1917]">
                              {metrics.currencySymbol}
                              {item.total.toFixed(0)}
                            </div>
                          </div>
                        ))}

                        {/* If dishes were removed, show them with clear strikethrough & Removed badge */}
                        {parsedNotes.removedDishes.length > 0 && !isCancelled && (
                          <div className="pt-2 border-t border-dashed border-stone-200 space-y-1">
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                              Removed by Customer:
                            </span>
                            {parsedNotes.removedDishes.map((dish, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-rose-50/70 border border-rose-200/60 text-rose-700"
                              >
                                <span className="line-through font-medium">❌ {dish}</span>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                                  Removed
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                        <span className={`text-base font-black ${isCancelled ? 'text-stone-400 line-through' : 'text-[#E86326]'}`}>
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

                      {/* Primary Order Action & Delete Control */}
                      <div className="flex items-center gap-2">
                        {isCancelled ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Order Fully Cancelled</span>
                            </span>
                            <button
                              disabled={isLoading}
                              onClick={() => handleDeleteOrder(order.id, order.orderNumber, order.tableNumber)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                              title="Delete this cancelled order"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : (
                          <>
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Delivered ✓</span>
                                </span>
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleDeleteOrder(order.id, order.orderNumber, order.tableNumber)}
                                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-[#E5E5DE] hover:border-rose-300 text-xs font-semibold text-[#57534E] hover:text-rose-700 flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                                  title="Delete this delivered order"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </>
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
