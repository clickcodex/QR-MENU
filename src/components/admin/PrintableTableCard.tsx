'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Printer, Download, X, QrCode as QrIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { generateQRCodeDataURL, generateQRCodeSVG } from '@/lib/qr';

interface PrintableTableCardProps {
  restaurant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
  };
  table: {
    tableNumber: string;
    name?: string | null;
    qrUrl: string;
  };
  onClose: () => void;
}

export function PrintableTableCard({
  restaurant,
  table,
  onClose,
}: PrintableTableCardProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function gen() {
      try {
        setLoading(true);
        const [png, svg] = await Promise.all([
          generateQRCodeDataURL(table.qrUrl, 800),
          generateQRCodeSVG(table.qrUrl),
        ]);
        setDataUrl(png);
        setSvgString(svg);
      } catch (err) {
        console.error('Failed to generate QR:', err);
      } finally {
        setLoading(false);
      }
    }
    gen();
  }, [table.qrUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(table.qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${restaurant.slug}-table-${table.tableNumber}-qr.png`;
    a.click();
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${restaurant.slug}-table-${table.tableNumber}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-modal overflow-hidden p-6 sm:p-8 space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h3 className="text-base font-bold text-[#1C1917]">
              Table Stand Card — Table {table.tableNumber}
            </h3>
            <p className="text-xs text-[#78716C]">
              Print-ready tabletop display for dining tables
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Encoded URL status bar (excluded from print) */}
        <div className="p-3 bg-[#FFFDF8] rounded-xl border border-[#F5EAD4] flex items-center justify-between text-xs no-print">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] uppercase font-bold text-[#78716C] block">Encoded QR Target URL:</span>
            <span className="font-mono text-[#1C1917] truncate block text-[11px] font-semibold">{table.qrUrl}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCopyUrl}
              className="p-1.5 rounded-lg bg-white border border-[#E5E5DE] text-[#57534E] hover:text-[#1C1917] transition text-xs flex items-center gap-1"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={table.qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white border border-[#E5E5DE] text-[#57534E] hover:text-[#1C1917] transition"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#E86326]" />
            </a>
          </div>
        </div>

        {/* PHYSICAL TABLE STAND CARD PREVIEW (This prints on window.print()) */}
        <div
          id="printable-table-card"
          className="print-card-container mx-auto w-full max-w-sm bg-white border-2 border-[#1C1917] rounded-3xl p-6 sm:p-7 text-center shadow-md space-y-4"
        >
          {/* Restaurant Header */}
          <div className="flex flex-col items-center gap-2">
            {restaurant.logoUrl ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#E5E5DE] relative bg-white p-1">
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  fill
                  className="object-cover rounded-xl"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#E86326] flex items-center justify-center text-xl font-black border border-[#FED7AA]">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#1C1917] uppercase">
                {restaurant.name}
              </h2>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAFAF8] border border-[#E5E5DE] text-[10px] font-bold text-[#57534E] tracking-wider uppercase">
                <span>DINE-IN DIGITAL EXPERIENCE</span>
              </div>
            </div>
          </div>

          {/* Action Callout */}
          <div className="py-1">
            <p className="text-xs font-black tracking-widest text-[#E86326] uppercase">
              SCAN TO VIEW MENU
            </p>
            <p className="text-[11px] text-[#78716C]">
              Point your smartphone camera to explore dishes & prices
            </p>
          </div>

          {/* High-Contrast QR Code */}
          <div className="relative mx-auto w-48 h-48 bg-white p-3 rounded-2xl border-2 border-[#1C1917] shadow-sm flex items-center justify-center">
            {loading ? (
              <div className="animate-spin w-8 h-8 border-2 border-[#E86326] border-t-transparent rounded-full" />
            ) : dataUrl ? (
              <Image
                src={dataUrl}
                alt={`Table ${table.tableNumber} QR Code`}
                width={180}
                height={180}
                className="w-full h-full object-contain"
                priority
              />
            ) : (
              <QrIcon className="w-16 h-16 text-[#A8A29E]" />
            )}
          </div>

          {/* Bold Table Indicator */}
          <div className="space-y-1">
            <div className="inline-block px-4 py-1.5 rounded-xl bg-[#1C1917] text-white font-extrabold text-sm tracking-wider uppercase">
              TABLE {table.tableNumber}
            </div>
            <p className="text-[10px] text-[#78716C]">
              No app download • No registration required
            </p>
          </div>

          {/* MOMO MENU Footer Branding */}
          <div className="pt-3 border-t border-[#EAEAE5] space-y-0.5">
            <div className="text-[10px] font-bold tracking-tight text-[#1C1917]">
              Powered by MOMO MENU
            </div>
            <div className="text-[9px] font-bold tracking-widest text-[#E86326] uppercase">
              SMART DIGITAL HOSPITALITY
            </div>
            <div className="text-[8px] text-[#A8A29E] tracking-widest uppercase">
              SCAN • ORDER • ENJOY
            </div>
          </div>
        </div>

        {/* Action Buttons (Excluded from print) */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Stand Card</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={!dataUrl}
            className="py-2.5 px-4 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-[#1C1917] text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleDownloadSVG}
            disabled={!svgString}
            className="py-2.5 px-4 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-[#1C1917] text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
