'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Store, Save, ExternalLink, Check } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    cuisine: '',
    description: '',
    phone: '',
    address: '',
    openingHours: '',
    logoUrl: '',
    coverUrl: '',
    currencySymbol: '₹',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetch('/api/restaurant/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.restaurant) {
          const r = data.restaurant;
          setFormData({
            name: r.name || '',
            slug: r.slug || '',
            cuisine: r.cuisine || '',
            description: r.description || '',
            phone: r.phone || '',
            address: r.address || '',
            openingHours: r.openingHours || '',
            logoUrl: r.logoUrl || '',
            coverUrl: r.coverUrl || '',
            currencySymbol: r.currencySymbol || '₹',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/restaurant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Restaurant profile updated successfully!');
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1C1917] tracking-tight">
              Restaurant Profile
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Customize brand details, photos, and contact information visible to customers.
            </p>
          </div>

          {formData.slug && (
            <a
              href={`/r/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-bold text-[#1C1917] transition inline-flex items-center gap-2"
            >
              <span>View Public Menu</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#E86326]" />
            </a>
          )}
        </div>

        {/* Live Preview Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAEAE5] shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Live Customer Header Preview
            </span>
            <span className="text-[11px] text-[#A8A29E]">Updates in real-time</span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-[#E5E5DE] bg-[#FAFAF8]">
            <div className="relative w-full h-28 bg-[#F4F4F0]">
              {formData.coverUrl ? (
                <Image
                  src={formData.coverUrl}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-amber-100 to-orange-100" />
              )}
            </div>
            <div className="p-4 flex items-end gap-3 -mt-8 relative z-10">
              <div className="relative w-16 h-16 rounded-xl bg-white p-1 shadow-md border border-[#E5E5DE] flex-shrink-0 overflow-hidden">
                {formData.logoUrl ? (
                  <Image
                    src={formData.logoUrl}
                    alt="Logo"
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-[#FFF7ED] text-[#E86326] flex items-center justify-center font-bold text-lg">
                    {formData.name.charAt(0) || 'R'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#1C1917] truncate">
                  {formData.name || 'Restaurant Name'}
                </h3>
                <p className="text-xs text-[#78716C] truncate">
                  {formData.cuisine || 'Cuisine description'} • {formData.openingHours || 'Hours'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAEAE5] shadow-subtle space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Restaurant Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                URL Identifier (Slug) *
              </label>
              <div className="flex items-center">
                <span className="text-xs text-[#78716C] bg-[#FAFAF8] px-2.5 py-2 border border-r-0 border-[#E5E5DE] rounded-l-xl">
                  /r/
                </span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-r-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Cuisine / Specialty
              </label>
              <input
                type="text"
                value={formData.cuisine}
                onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                placeholder="e.g. Modern Indian & Tandoor Craft"
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Opening Hours
              </label>
              <input
                type="text"
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                placeholder="12:00 PM – 11:30 PM (Daily)"
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Plot 42, Galleria Boulevard, Sector 29, Gurugram"
              className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell guests about your dining story, signature ingredients, and heritage..."
              className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Logo Image URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Cover Photo URL
              </label>
              <input
                type="url"
                value={formData.coverUrl}
                onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#EFEFEA] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
