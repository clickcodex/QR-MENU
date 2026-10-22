'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  QrCode,
  Plus,
  Printer,
  Download,
  Trash2,
  ExternalLink,
  Users,
  X,
  Check,
  CheckCircle2,
  Smartphone,
  Globe,
  Monitor,
  Copy,
  Info,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Utensils,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PrintableTableCard } from '@/components/admin/PrintableTableCard';
import { generateQRCodeDataURL } from '@/lib/qr';

interface TableItem {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  isActive: boolean;
  networkUrl: string;
  localUrl: string;
  prodUrl: string;
  qrUrl: string;
  computedStatus?: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'AWAITING_CHECKOUT';
  controllerName?: string | null;
  currentControllerToken?: string | null;
  activeReservation?: {
    id: string;
    customerName: string | null;
    status: string;
    expiresAt: string;
    remainingSeconds: number;
    createdAt: string;
    reservationType: string;
  } | null;
  activeOrder?: {
    id: string;
    orderNumber: number;
    status: string;
    customerName: string | null;
    total: number;
    itemsCount: number;
    confirmedAt: string;
    modificationDeadline: string;
    remainingModSeconds: number;
    isModifiable: boolean;
  } | null;
}

interface NetworkInfo {
  lanIp: string;
  port: string;
  lanBaseUrl: string;
  localBaseUrl: string;
  prodBaseUrl: string;
}

type QRMode = 'lan' | 'local' | 'prod' | 'custom';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [restaurant, setRestaurant] = useState<{ name: string; slug: string; logoUrl?: string } | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrThumbs, setQrThumbs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // QR Target Mode: default to 'lan' so real smartphones can scan it immediately
  const [qrMode, setQrMode] = useState<QRMode>('lan');
  const [customBaseUrl, setCustomBaseUrl] = useState('');

  // Modals & Staff Action Dialogs
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activePrintTable, setActivePrintTable] = useState<TableItem | null>(null);
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [tableNameInput, setTableNameInput] = useState('');
  const [capacityInput, setCapacityInput] = useState('4');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Staff Table Action Dialog State
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    action: 'cancel-reservation' | 'release-table' | 'reassign-controller';
    table: TableItem;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Customer left without ordering');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute active target URL for any table
  const computeTableUrl = useCallback(
    (table: TableItem, mode: QRMode, customBase: string) => {
      const slug = restaurant?.slug || 'the-momos-wala';
      if (mode === 'lan' && networkInfo?.lanBaseUrl) {
        return `${networkInfo.lanBaseUrl}/r/${slug}/t/${table.tableNumber}`;
      }
      if (mode === 'local' && networkInfo?.localBaseUrl) {
        return `${networkInfo.localBaseUrl}/r/${slug}/t/${table.tableNumber}`;
      }
      if (mode === 'prod') {
        const prod = networkInfo?.prodBaseUrl || 'https://menu.clickcodex.in';
        return `${prod.replace(/\/$/, '')}/r/${slug}/t/${table.tableNumber}`;
      }
      if (mode === 'custom' && customBase.trim()) {
        const clean = customBase.trim().replace(/\/$/, '');
        return `${clean}/r/${slug}/t/${table.tableNumber}`;
      }
      return table.networkUrl || table.localUrl;
    },
    [restaurant, networkInfo]
  );

  // Generate QR thumbnails
  const regenerateThumbs = useCallback(
    async (items: TableItem[], mode: QRMode, customBase: string) => {
      const thumbs: Record<string, string> = {};
      for (const t of items) {
        const targetUrl = computeTableUrl(t, mode, customBase);
        try {
          thumbs[t.id] = await generateQRCodeDataURL(targetUrl, 260);
        } catch (err) {
          console.error(err);
        }
      }
      setQrThumbs(thumbs);
    },
    [computeTableUrl]
  );

  const loadTables = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch('/api/tables');
      const data = await res.json();
      const loadedTables: TableItem[] = data.tables || [];
      setTables(loadedTables);
      setRestaurant(data.restaurant);
      setNetworkInfo(data.networkInfo);

      // Only regenerate thumbs on first load or table count change
      if (!isBackground || Object.keys(qrThumbs).length === 0) {
        regenerateThumbs(loadedTables, qrMode, customBaseUrl);
      }
    } catch (err) {
      console.error('Error loading tables:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  // Background polling to sync table status, reservations, and orders in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      loadTables(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [qrMode, customBaseUrl]);

  // Local 1s countdown tick for smooth UI countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTables((prev) =>
        prev.map((t) => {
          let updatedReservation = t.activeReservation;
          let updatedOrder = t.activeOrder;

          if (updatedReservation && updatedReservation.remainingSeconds > 0) {
            updatedReservation = {
              ...updatedReservation,
              remainingSeconds: Math.max(0, updatedReservation.remainingSeconds - 1),
            };
          }

          if (updatedOrder && updatedOrder.remainingModSeconds > 0) {
            const nextSec = Math.max(0, updatedOrder.remainingModSeconds - 1);
            updatedOrder = {
              ...updatedOrder,
              remainingModSeconds: nextSec,
              isModifiable: nextSec > 0 && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(updatedOrder.status),
            };
          }

          return {
            ...t,
            activeReservation: updatedReservation,
            activeOrder: updatedOrder,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // When qrMode or customBaseUrl changes, re-render QR thumbs
  const handleModeChange = (newMode: QRMode) => {
    setQrMode(newMode);
    regenerateThumbs(tables, newMode, customBaseUrl);
  };

  const handleCustomUrlChange = (val: string) => {
    setCustomBaseUrl(val);
    regenerateThumbs(tables, 'custom', val);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumberInput.trim()) return;

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableNumberInput.trim(),
          name: tableNameInput.trim() || undefined,
          capacity: parseInt(capacityInput) || 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add table');
        return;
      }

      setTableNumberInput('');
      setTableNameInput('');
      setCapacityInput('4');
      setAddModalOpen(false);
      showToast(`Table ${data.table.tableNumber} added successfully.`);
      loadTables();
    } catch (err) {
      console.error(err);
      alert('Could not create table');
    }
  };

  const handleDelete = async (tableId: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to delete Table ${tableNumber}?`)) return;

    try {
      const res = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Table ${tableNumber} deleted.`);
        loadTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete table');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting table');
    }
  };

  const handleExecuteTableAction = async () => {
    if (!actionConfirmModal) return;
    const { action, table } = actionConfirmModal;
    setActionSubmitting(true);

    try {
      const res = await fetch('/api/tables/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          tableId: table.id,
          reservationId: table.activeReservation?.id,
          reason: cancellationReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      showToast(data.message || 'Table status updated successfully');
      setActionConfirmModal(null);
      loadTables();
    } catch (err: any) {
      alert(err.message || 'Failed to perform table action');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCopy = (table: TableItem) => {
    const url = computeTableUrl(table, qrMode, customBaseUrl);
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    showToast(`Copied QR URL for Table ${table.tableNumber}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPNG = (table: TableItem) => {
    const thumb = qrThumbs[table.id];
    if (!thumb) return;
    const link = document.createElement('a');
    link.href = thumb;
    link.download = `table-${table.tableNumber}-qr.png`;
    link.click();
    showToast(`Downloaded PNG for Table ${table.tableNumber}`);
  };

  const openPrintModal = (table: TableItem) => {
    setActivePrintTable(table);
  };

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#1C1917] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-float flex items-center gap-2 animate-slide-up border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header Title & Add Table Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
              Table & QR Code Management
            </h1>
            <p className="text-xs text-[#78716C] mt-1">
              Monitor live table statuses, 30-min reservations, 5-min order modification windows, and print physical QR stand cards.
            </p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Table</span>
          </button>
        </div>

        {/* QR Code Network Target Selection Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAEAE5] shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C] block">
                QR Code Destination
              </span>
              <p className="text-xs text-[#1C1917] font-semibold mt-0.5">
                Choose the network target URL embedded into the QR codes:
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleModeChange('lan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrMode === 'lan'
                    ? 'bg-[#E86326] text-white shadow-sm'
                    : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Wi-Fi (Scan from Phone)</span>
              </button>

              <button
                onClick={() => handleModeChange('local')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrMode === 'local'
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Localhost (This PC)</span>
              </button>

              <button
                onClick={() => handleModeChange('prod')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrMode === 'prod'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Domain (menu.clickcodex.in)</span>
              </button>
            </div>
          </div>

          {/* Mode Guidance Explanations */}
          {qrMode === 'lan' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start sm:items-center gap-3 text-xs text-emerald-900 animate-fade-in">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold">
                  Active Mode: Mobile Phone Wi-Fi Scan (Target:{' '}
                  <span className="font-mono">{networkInfo?.lanBaseUrl || 'http://localhost:3000'}</span>)
                </p>
                <p className="text-emerald-800 text-[11px]">
                  Point your smartphone camera at the QR code on your computer screen. Ensure your phone is connected to the same Wi-Fi network. The live menu will open instantly on your phone!
                </p>
              </div>
            </div>
          )}

          {qrMode === 'local' && (
            <div className="p-3 bg-[#FAFAF8] border border-[#E5E5DE] rounded-2xl flex items-center gap-3 text-xs text-[#57534E] animate-fade-in">
              <Info className="w-4 h-4 text-[#78716C] flex-shrink-0" />
              <p>
                Active Mode: Localhost (<span className="font-mono text-[#1C1917]">{networkInfo?.localBaseUrl || 'http://localhost:3000'}</span>). Ideal for testing in the browser on this computer.
              </p>
            </div>
          )}

          {qrMode === 'prod' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 animate-fade-in">
              <Globe className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <p>
                Active Mode: Production Domain (<span className="font-mono text-amber-950">{networkInfo?.prodBaseUrl || 'https://menu.clickcodex.in'}</span>). Used when deploying to your public domain.
              </p>
            </div>
          )}
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#78716C]">
            <div className="w-8 h-8 border-2 border-[#E86326] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading tables and synchronizing live reservations...</span>
          </div>
        ) : tables.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-[#EAEAE5] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAFAF8] flex items-center justify-center text-xl">
              🪑
            </div>
            <h3 className="text-sm font-bold text-[#1C1917]">No Tables Configured</h3>
            <p className="text-xs text-[#78716C]">
              Add tables to generate QR codes for your restaurant.
            </p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-2 py-2 px-4 rounded-xl bg-[#E86326] text-white text-xs font-semibold"
            >
              Add First Table
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => {
              const qrThumb = qrThumbs[table.id];
              const activeUrl = computeTableUrl(table, qrMode, customBaseUrl);
              const isCopied = copiedId === table.id;
              const status = table.computedStatus || 'AVAILABLE';

              return (
                <div
                  key={table.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between space-y-3.5 hover:border-[#FED7AA] transition"
                >
                  <div className="space-y-3">
                    {/* Top Row: Table number, capacity, and live status badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1C1917] text-white text-xs font-black tracking-wider uppercase">
                        TABLE {table.tableNumber}
                      </div>

                      {/* Status Badges */}
                      {status === 'OCCUPIED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                          <Utensils className="w-3 h-3 text-blue-600" />
                          <span>Occupied</span>
                        </span>
                      ) : status === 'AWAITING_CHECKOUT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                          <Receipt className="w-3 h-3 text-purple-600" />
                          <span>Checkout</span>
                        </span>
                      ) : status === 'RESERVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                          <span>Temp Reserved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Available</span>
                        </span>
                      )}
                    </div>

                    {/* Table Name and Seats */}
                    <div className="flex items-center justify-between text-xs text-[#57534E]">
                      <span className="font-bold truncate">{table.name || `Table ${table.tableNumber}`}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#78716C] flex-shrink-0">
                        <Users className="w-3 h-3" />
                        <span>{table.capacity} Seats</span>
                      </span>
                    </div>

                    {/* LIVE STATUS DETAILS BOX */}
                    <div className="p-2.5 rounded-xl bg-[#FAFAF8] border border-[#EAEAE5] space-y-1.5 text-xs">
                      {table.activeOrder ? (
                        <div>
                          <div className="flex items-center justify-between font-bold text-[#1C1917]">
                            <span>Order #{table.activeOrder.orderNumber}</span>
                            <span className="text-[#E86326]">
                              ₹{table.activeOrder.total} ({table.activeOrder.itemsCount} dishes)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#78716C] mt-0.5">
                            <span>Status: {table.activeOrder.status}</span>
                            {table.activeOrder.isModifiable && table.activeOrder.remainingModSeconds > 0 ? (
                              <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-100/80 px-1.5 py-0.2 rounded">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>5m Edit: {formatCountdown(table.activeOrder.remainingModSeconds)}</span>
                              </span>
                            ) : (
                              <span className="text-stone-500 font-medium">Edit window closed</span>
                            )}
                          </div>
                        </div>
                      ) : table.activeReservation ? (
                        <div>
                          <div className="flex items-center justify-between font-bold text-amber-900">
                            <span>QR Session Active</span>
                            <span className="font-mono bg-amber-200/80 px-1.5 py-0.2 rounded text-[11px]">
                              {formatCountdown(table.activeReservation.remainingSeconds)} left
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 mt-0.5 truncate">
                            Controller: {table.controllerName || table.activeReservation.customerName || 'Primary Diner'}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-800 flex items-center justify-between">
                          <span>Ready for customers to scan</span>
                          <span className="font-semibold">30m limit on scan</span>
                        </div>
                      )}
                    </div>

                    {/* QR Code Preview Box */}
                    <div
                      onClick={() => openPrintModal(table)}
                      className="group/qr cursor-pointer relative mx-auto w-36 h-36 bg-white p-2 rounded-2xl border-2 border-[#1C1917] flex items-center justify-center shadow-sm hover:scale-102 transition-transform"
                      title="Click to view printable stand card"
                    >
                      {qrThumb ? (
                        <img
                          src={qrThumb}
                          alt={`QR for Table ${table.tableNumber}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-6 h-6 border-2 border-[#E86326] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Target URL Preview & Copy Button */}
                    <div className="flex items-center justify-between text-[10px] text-[#78716C] bg-[#FAFAF8] p-2 rounded-xl border border-[#EFEFEA]">
                      <span className="font-mono truncate max-w-[170px]" title={activeUrl}>
                        {activeUrl}
                      </span>
                      <button
                        onClick={() => handleCopy(table)}
                        className="p-1 rounded-md hover:bg-[#EAEAE5] text-[#57534E] flex items-center gap-1"
                        title="Copy QR URL"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions & Staff Overrides */}
                  <div className="pt-2 border-t border-[#F0F0EA] space-y-2">
                    {/* Contextual Action Buttons for Staff */}
                    {table.activeReservation && !table.activeOrder && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionConfirmModal({ action: 'cancel-reservation', table })
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Ban className="w-3 h-3 text-amber-700" />
                        <span>Cancel Inactive Reservation</span>
                      </button>
                    )}

                    {(table.activeOrder || status === 'AWAITING_CHECKOUT' || status === 'OCCUPIED') && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionConfirmModal({ action: 'release-table', table })
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-blue-700" />
                        <span>Release Table & Mark Available</span>
                      </button>
                    )}

                    {table.currentControllerToken && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionConfirmModal({ action: 'reassign-controller', table })
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold transition flex items-center justify-center gap-1"
                        title="Reassign or reset controller session if customer lost their phone"
                      >
                        <RotateCcw className="w-3 h-3 text-stone-500" />
                        <span>Reset Order Controller</span>
                      </button>
                    )}

                    <button
                      onClick={() => openPrintModal(table)}
                      className="w-full py-2 px-3 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-[#E86326] text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Stand Card</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPNG(table)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-[11px] font-semibold text-[#1C1917] transition flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3 text-[#78716C]" />
                        <span>PNG</span>
                      </button>

                      <a
                        href={activeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF8] border border-[#E5E5DE] transition"
                        title="Open menu link in browser"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDelete(table.id, table.tableNumber)}
                        className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 border border-[#E5E5DE] transition"
                        title="Delete table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Staff Action Confirmation Modal */}
        {actionConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-sm p-6 space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEFEA]">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917]">
                    {actionConfirmModal.action === 'cancel-reservation'
                      ? `Cancel Table ${actionConfirmModal.table.tableNumber} Reservation`
                      : actionConfirmModal.action === 'release-table'
                      ? `Release Table ${actionConfirmModal.table.tableNumber}`
                      : `Reset Controller for Table ${actionConfirmModal.table.tableNumber}`}
                  </h2>
                  <p className="text-xs text-[#78716C]">Authorized staff action</p>
                </div>
                <button
                  onClick={() => setActionConfirmModal(null)}
                  className="p-1 rounded-full hover:bg-[#FAFAF8] text-[#78716C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#57534E]">
                {actionConfirmModal.action === 'cancel-reservation' && (
                  <>
                    <p>
                      This will cancel the active temporary reservation for Table{' '}
                      <strong>{actionConfirmModal.table.tableNumber}</strong> and release it immediately as Available for other customers.
                    </p>
                    <div className="space-y-1">
                      <label className="font-bold text-[#1C1917]">Cancellation Reason:</label>
                      <input
                        type="text"
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                        placeholder="e.g. Customer left, table reassigned"
                      />
                    </div>
                  </>
                )}

                {actionConfirmModal.action === 'release-table' && (
                  <p>
                    This will release Table <strong>{actionConfirmModal.table.tableNumber}</strong>, clearing active occupancy and controller locks, marking the table <strong>Available</strong> for new diners.
                  </p>
                )}

                {actionConfirmModal.action === 'reassign-controller' && (
                  <p>
                    This will revoke the current controller token for Table{' '}
                    <strong>{actionConfirmModal.table.tableNumber}</strong>. The next customer or staff member who scans the QR code can claim controller permissions.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionConfirmModal(null)}
                  disabled={actionSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTableAction}
                  disabled={actionSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition disabled:opacity-50"
                >
                  {actionSubmitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Table Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-sm p-6 space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEFEA]">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917]">Add New Table</h2>
                  <p className="text-xs text-[#78716C]">Generates an instant unique QR code</p>
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="p-1 rounded-full hover:bg-[#FAFAF8] text-[#78716C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">
                    Table Number <span className="text-[#E86326]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tableNumberInput}
                    onChange={(e) => setTableNumberInput(e.target.value)}
                    placeholder="e.g. 5, 12, VIP-1"
                    className="w-full px-3.5 py-2.5 border border-[#E5E5DE] rounded-xl text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Table Label / Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={tableNameInput}
                    onChange={(e) => setTableNameInput(e.target.value)}
                    placeholder="e.g. Window Corner, Terrace Booth"
                    className="w-full px-3.5 py-2.5 border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E5E5DE] rounded-xl text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition"
                  >
                    Create Table
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Printable Stand Card Modal */}
        {activePrintTable && restaurant && (
          <PrintableTableCard
            restaurant={{
              name: restaurant.name,
              logoUrl: restaurant.logoUrl,
              slug: restaurant.slug,
            }}
            table={{
              tableNumber: activePrintTable.tableNumber,
              name: activePrintTable.name,
              qrUrl: computeTableUrl(activePrintTable, qrMode, customBaseUrl),
            }}
            onClose={() => setActivePrintTable(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
