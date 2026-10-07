'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Lock, Mail, ArrowRight, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';

export default function KitchenLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Check role
      if (data.user?.role !== 'KITCHEN' && data.user?.role !== 'ADMIN' && data.user?.role !== 'SUPERADMIN') {
        throw new Error('This account does not have Kitchen Station access');
      }

      router.push(data.redirectTo || '/kitchen/orders');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('kitchen@urbanspice.in');
    setPassword('kitchen123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ChefHat className="w-9 h-9 text-amber-400" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Kitchen Display System
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          MOMO MENU Order Approval & Fulfillment Station
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-700/60 text-red-300 text-sm flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kitchen Staff ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kitchen@urbanspice.in"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-500/20 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-400 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Kitchen Station</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Demo Kitchen Account:</span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-amber-400 hover:text-amber-300 font-bold underline transition"
              >
                Auto-fill credentials
              </button>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 text-xs text-slate-400 space-y-1 font-mono">
              <div>Email: <span className="text-amber-300">kitchen@urbanspice.in</span></div>
              <div>Password: <span className="text-amber-300">kitchen123</span></div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
            <Link href="/admin/login" className="hover:text-slate-300 underline transition">
              Restaurant Owner Login
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-300 underline transition">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
