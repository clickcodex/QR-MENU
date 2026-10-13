'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Globe, Check, Smartphone, Monitor, Info } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminSettingsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [qrBaseUrl, setQrBaseUrl] = useState('http://192.168.29.212:3000');
  const [networkInfo, setNetworkInfo] = useState<{
    lanIp: string;
    port: string;
    lanBaseUrl: string;
    localBaseUrl: string;
    prodBaseUrl: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetch('/api/tables')
      .then((res) => res.json())
      .then((data) => {
        if (data.networkInfo) {
          setNetworkInfo(data.networkInfo);
          setQrBaseUrl(data.networkInfo.lanBaseUrl);
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveQRSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Base domain updated for generated QR codes');
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

        <div>
          <h1 className="text-2xl font-black text-[#1C1917] tracking-tight">
            Platform Settings
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5">
            Configure live domain routing, QR generation behavior, and security parameters.
          </p>
        </div>

        {/* QR Base URL Configuration */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFF7ED] text-[#E86326]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">QR Code Domain Routing</h2>
              <p className="text-xs text-[#78716C]">
                Configure the destination URL that smartphone cameras open when scanning your table QR codes.
              </p>
            </div>
          </div>

          {/* Quick preset selector buttons */}
          {networkInfo && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQrBaseUrl(networkInfo.lanBaseUrl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrBaseUrl === networkInfo.lanBaseUrl
                    ? 'bg-[#E86326] text-white'
                    : 'bg-[#FAFAF8] text-[#57534E] border border-[#E5E5DE]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Wi-Fi Mobile ({networkInfo.lanIp}:{networkInfo.port})</span>
              </button>

              <button
                type="button"
                onClick={() => setQrBaseUrl(networkInfo.localBaseUrl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrBaseUrl === networkInfo.localBaseUrl
                    ? 'bg-[#1C1917] text-white'
                    : 'bg-[#FAFAF8] text-[#57534E] border border-[#E5E5DE]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Localhost ({networkInfo.localBaseUrl})</span>
              </button>

              <button
                type="button"
                onClick={() => setQrBaseUrl('https://menu.clickcodex.in')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  qrBaseUrl === 'https://menu.clickcodex.in'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#FAFAF8] text-[#57534E] border border-[#E5E5DE]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Production (menu.clickcodex.in)</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSaveQRSettings} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Target Base URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={qrBaseUrl}
                  onChange={(e) => setQrBaseUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold rounded-xl transition"
                >
                  Save URL
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#78716C]">
              When scanning from a smartphone on the same Wi-Fi, use your local Wi-Fi IP (<code className="bg-[#F4F4F0] px-1.5 py-0.5 rounded text-[#1C1917]">{networkInfo?.lanBaseUrl || 'http://192.168.29.212:3001'}</code>).
            </p>
          </form>
        </div>

        {/* Monthly SaaS Subscription Status */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1C1917]">MOMO MENU Monthly Subscription</h2>
                <p className="text-xs text-[#78716C]">
                  Your restaurant SaaS license tier and recurring renewal details.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              ACTIVE LICENSE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 bg-[#FAFAF8] rounded-2xl border border-[#EFEFEA]">
              <span className="text-[#78716C] block text-[11px]">Current Plan</span>
              <strong className="text-sm text-[#1C1917]">Pro Monthly Plan</strong>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-2xl border border-[#EFEFEA]">
              <span className="text-[#78716C] block text-[11px]">Monthly SaaS Fee</span>
              <strong className="text-sm text-emerald-600">₹999 / month</strong>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-2xl border border-[#EFEFEA]">
              <span className="text-[#78716C] block text-[11px]">Next Renewal</span>
              <strong className="text-sm text-[#1C1917]">In 30 Days</strong>
            </div>
          </div>
          <p className="text-[11px] text-[#78716C]">
            Managed via MOMO MENU Super Admin platform. To upgrade or modify billing, contact platform support.
          </p>
        </div>

        {/* Multi-Tenant Security & Isolation Info */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">Multi-Tenant Architecture Status</h2>
              <p className="text-xs text-[#78716C]">
                Strict restaurant data isolation and encrypted session tokens.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-[#FAFAF8] rounded-2xl border border-[#EFEFEA] space-y-1">
              <span className="font-bold text-[#1C1917]">Data Isolation</span>
              <p className="text-[#78716C]">All categories, dishes, and tables query filtered strictly by restaurant ID.</p>
            </div>
            <div className="p-3 bg-[#FAFAF8] rounded-2xl border border-[#EFEFEA] space-y-1">
              <span className="font-bold text-[#1C1917]">Contactless Scanning</span>
              <p className="text-[#78716C]">Zero user friction: customers never need to sign up, enter phone number, or download app.</p>
            </div>
          </div>
        </div>

        {/* Brand Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAEAE5] shadow-subtle space-y-2">
          <h2 className="text-sm font-bold text-[#1C1917]">MOMO MENU Brand Standards</h2>
          <div className="text-xs text-[#57534E] space-y-1">
            <p><span className="font-semibold text-[#1C1917]">Brand:</span> MOMO MENU</p>
            <p><span className="font-semibold text-[#1C1917]">Tagline:</span> SMART DIGITAL HOSPITALITY</p>
            <p><span className="font-semibold text-[#1C1917]">Pillars:</span> SCAN | ORDER | ENJOY</p>
            <p><span className="font-semibold text-[#1C1917]">Design Principle:</span> Bright, clean, luxury hospitality UI. Absolutely no dark mode.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
