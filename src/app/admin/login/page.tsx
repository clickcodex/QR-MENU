'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push(data.redirectTo || '/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillOwner = () => {
    setEmail('owner@urbanspice.in');
    setPassword('owner123');
    setError(null);
  };

  const handleFillSuperAdmin = () => {
    setEmail('superadmin@momomenu.in');
    setPassword('superadmin123');
    setError(null);
  };

  const handleFillKitchen = () => {
    setEmail('kitchen@urbanspice.in');
    setPassword('kitchen123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E86326] to-[#D34F15] text-white shadow-hover">
            <ChefHat className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#1C1917] tracking-tight">
            MOMO MENU
          </h1>
          <p className="text-xs text-[#78716C]">
            Restaurant Management Portal • <span className="font-semibold text-[#E86326]">SMART DIGITAL HOSPITALITY</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl border border-[#EAEAE5] shadow-card p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#1C1917]">Welcome Back</h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Sign in with your Owner, Kitchen, or Super Admin credentials.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-fade-in flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                Email / Login ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@urbanspice.in"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E5E5DE] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326] focus:ring-2 focus:ring-[#E86326]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E5E5DE] rounded-xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326] focus:ring-2 focus:ring-[#E86326]/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#FED7AA] space-y-2.5">
            <span className="text-[11px] font-bold text-[#9A3412] inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E86326]" /> Quick Role Demo Accounts
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handleFillOwner}
                className="py-1.5 px-2 bg-white hover:bg-[#FFF7ED] border border-[#FED7AA] text-[10px] font-bold text-[#9A3412] rounded-lg transition"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={handleFillKitchen}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-300 rounded-lg transition"
              >
                Kitchen
              </button>
              <button
                type="button"
                onClick={handleFillSuperAdmin}
                className="py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-[10px] font-black text-slate-950 rounded-lg transition"
              >
                👑 Super Admin
              </button>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-[#78716C] flex items-center justify-center gap-4">
            <a href="/kitchen/login" className="hover:text-[#E86326] underline font-semibold transition">
              Kitchen Display Login
            </a>
            <span>•</span>
            <a href="/" className="hover:text-[#1C1917] transition">
              Back to Home
            </a>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#78716C]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted Session • Multi-tenant Data Isolation</span>
        </div>
      </div>
    </div>
  );
}
