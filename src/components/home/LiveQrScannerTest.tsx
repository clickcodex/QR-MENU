'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, ExternalLink, QrCode as QrIcon, Wifi } from 'lucide-react';
import { generateQRCodeDataURL } from '@/lib/qr';

export function LiveQrScannerTest() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [lanIp, setLanIp] = useState<string>('192.168.29.212');
  const [port, setPort] = useState<string>('3000');
  const [mode, setMode] = useState<'wifi' | 'local'>('wifi');

  useEffect(() => {
    // 1. Resolve port dynamically from window location if running in browser
    let currentPort = '3000';
    if (typeof window !== 'undefined' && window.location.port) {
      currentPort = window.location.port;
      setPort(currentPort);
    }

    // 2. Fetch public network info
    fetch('/api/public/network')
      .then((res) => res.json())
      .then((data) => {
        const ip = data.lanIp || '192.168.29.212';
        const p = data.port || currentPort;
        setLanIp(ip);
        setPort(p);

        const targetUrl = `http://${ip}:${p}/r/the-momos-wala/t/7`;
        setActiveUrl(targetUrl);
        generateQRCodeDataURL(targetUrl, 360).then(setQrDataUrl);
      })
      .catch(() => {
        const fallback = `http://192.168.29.212:${currentPort}/r/the-momos-wala/t/7`;
        setActiveUrl(fallback);
        generateQRCodeDataURL(fallback, 360).then(setQrDataUrl);
      });
  }, []);

  const switchMode = (newMode: 'wifi' | 'local') => {
    setMode(newMode);
    const target =
      newMode === 'wifi'
        ? `http://${lanIp}:${port}/r/the-momos-wala/t/7`
        : `http://localhost:${port}/r/the-momos-wala/t/7`;
    setActiveUrl(target);
    generateQRCodeDataURL(target, 360).then(setQrDataUrl);
  };

  return (
    <div className="max-w-2xl mx-auto my-6 p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#FED7AA] shadow-hover text-left space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFEFEA] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE SCAN TEST — TABLE 7</span>
          </div>
          <h2 className="text-lg font-black text-[#1C1917]">
            Scan With Your Mobile Phone Camera
          </h2>
          <p className="text-xs text-[#78716C]">
            Point your smartphone camera at this QR code right now to test on your phone.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-xl border border-[#E5E5DE]">
          <button
            onClick={() => switchMode('wifi')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              mode === 'wifi'
                ? 'bg-[#E86326] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Wifi className="w-3 h-3" />
            <span>Wi-Fi Phone</span>
          </button>
          <button
            onClick={() => switchMode('local')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              mode === 'local'
                ? 'bg-[#1C1917] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span>Localhost</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR Code Container */}
        <div className="relative w-44 h-44 rounded-2xl bg-white p-3 border-2 border-[#1C1917] shadow-sm flex items-center justify-center flex-shrink-0">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Live Table 7 QR"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-8 h-8 border-2 border-[#E86326] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-3 flex-1 text-xs text-[#57534E]">
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFF7ED] text-[#E86326] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              <span>Ensure your phone is connected to the same Wi-Fi network.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFF7ED] text-[#E86326] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              <span>Open your normal smartphone camera app and hold it to the code.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFF7ED] text-[#E86326] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </span>
              <span>Tap the link that appears: <strong>The Momo&apos;s Wala Table 7 opens instantly!</strong></span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#EFEFEA] flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-[#78716C] truncate max-w-[200px]" title={activeUrl}>
              {activeUrl}
            </span>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FFF7ED] text-[#E86326] hover:bg-[#FFEDD5] text-[11px] font-bold transition flex-shrink-0"
            >
              <span>Open in browser</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
