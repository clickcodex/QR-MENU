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

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activePrintTable, setActivePrintTable] = useState<TableItem | null>(null);
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [tableNameInput, setTableNameInput] = useState('');
  const [capacityInput, setCapacityInput] = useState('4');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute active target URL for any table
  const computeTableUrl = useCallback(
    (table: TableItem, mode: QRMode, customBase: string) => {
      const slug = restaurant?.slug || 'urban-spice';
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

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tables');
      const data = await res.json();
      const loadedTables: TableItem[] = data.tables || [];
      setTables(loadedTables);
      setRestaurant(data.restaurant);
      setNetworkInfo(data.networkInfo);

      await regenerateThumbs(loadedTables, qrMode, customBaseUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  // When QR mode changes, regenerate all QR thumbnails immediately
  useEffect(() => {
    if (tables.length > 0) {
      regenerateThumbs(tables, qrMode, customBaseUrl);
    }
  }, [qrMode, customBaseUrl, tables, regenerateThumbs]);

  const handleCopy = (table: TableItem) => {
    const url = computeTableUrl(table, qrMode, customBaseUrl);
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Copied Table ${table.tableNumber} URL to clipboard`);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res.ok) {
        showToast(`Table ${data.table.tableNumber} created successfully!`);
        setAddModalOpen(false);
        setTableNumberInput('');
        setTableNameInput('');
        loadTables();
      } else {
        alert(data.error || 'Failed to create table');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to remove Table ${tableNumber}?`)) return;
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Table ${tableNumber} removed`);
        loadTables();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPNG = (table: TableItem) => {
    const thumb = qrThumbs[table.id];
    if (!thumb) return;
    const a = document.createElement('a');
    a.href = thumb;
    a.download = `table-${table.tableNumber}-qr.png`;
    a.click();
  };

  const openPrintModal = (table: TableItem) => {
    const targetUrl = computeTableUrl(table, qrMode, customBaseUrl);
    setActivePrintTable({
      ...table,
      qrUrl: targetUrl,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#1C1917] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-modal flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1C1917] tracking-tight">
              Tables & QR Codes
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Each dining table possesses a unique permanent QR code linking directly to its digital menu.
            </p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Table</span>
          </button>
        </div>

        {/* QR CODE TARGET DESTINATION SELECTOR */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAEAE5] shadow-subtle space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFEFEA] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#E86326]" />
                <span>QR Code Target Destination</span>
              </h2>
              <p className="text-xs text-[#78716C]">
                Choose which URL is encoded into the QR codes right now:
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setQrMode('lan')}
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
                onClick={() => setQrMode('local')}
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
                onClick={() => setQrMode('prod')}
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
                  Active Mode: Mobile Phone Wi-Fi Scan (Target: <span className="font-mono">{networkInfo?.lanBaseUrl || 'http://192.168.29.212:3001'}</span>)
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
                Active Mode: Localhost (<span className="font-mono text-[#1C1917]">{networkInfo?.localBaseUrl || 'http://localhost:3001'}</span>). Ideal for testing in the browser on this computer.
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
          <div className="py-16 text-center text-xs text-[#78716C]">Loading tables and generating QR previews...</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables.map((table) => {
              const qrThumb = qrThumbs[table.id];
              const activeUrl = computeTableUrl(table, qrMode, customBaseUrl);
              const isCopied = copiedId === table.id;

              return (
                <div
                  key={table.id}
                  className="bg-white rounded-2xl p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between space-y-4 hover:border-[#FED7AA] transition"
                >
                  <div className="space-y-3">
                    {/* Top Row: Table number and capacity */}
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1C1917] text-white text-xs font-black tracking-wider uppercase">
                        TABLE {table.tableNumber}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#78716C]">
                        <Users className="w-3.5 h-3.5" />
                        <span>{table.capacity} Seats</span>
                      </span>
                    </div>

                    {/* Table Name */}
                    {table.name && (
                      <p className="text-xs font-bold text-[#57534E] truncate">{table.name}</p>
                    )}

                    {/* QR Code Preview Box (Clicking triggers print modal) */}
                    <div
                      onClick={() => openPrintModal(table)}
                      className="group/qr cursor-pointer relative mx-auto w-40 h-40 bg-white p-2.5 rounded-2xl border-2 border-[#1C1917] flex items-center justify-center shadow-sm hover:scale-102 transition-transform"
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

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#F0F0EA] space-y-2">
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
                  className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Table Number / ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={tableNumberInput}
                    onChange={(e) => setTableNumberInput(e.target.value)}
                    placeholder="e.g. 9 or VIP-2"
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={tableNameInput}
                    onChange={(e) => setTableNameInput(e.target.value)}
                    placeholder="e.g. Balcony Table 9"
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm"
                  >
                    Generate Table QR
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Printable Table Card Modal */}
        {activePrintTable && restaurant && (
          <PrintableTableCard
            restaurant={restaurant}
            table={activePrintTable}
            onClose={() => setActivePrintTable(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
