'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Sparkles,
  Flame,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DietaryIndicator } from '@/components/customer/DietaryIndicator';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isSpicy: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  displayOrder: number;
  categoryId: string;
  category?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    categoryId: '',
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    isAvailable: true,
    displayOrder: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemRes, catRes] = await Promise.all([
        fetch('/api/menu-items'),
        fetch('/api/categories'),
      ]);
      const itemData = await itemRes.json();
      const catData = await catRes.json();
      setItems(itemData.items || []);
      setCategories(catData.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      categoryId: categories[0]?.id || '',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: items.length + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      imageUrl: item.imageUrl || '',
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      isBestseller: item.isBestseller,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
    });
    setModalOpen(true);
  };

  const handleDuplicate = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${item.name} (Copy)`,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          categoryId: item.categoryId,
          isVeg: item.isVeg,
          isSpicy: item.isSpicy,
          isBestseller: item.isBestseller,
          isAvailable: item.isAvailable,
          displayOrder: item.displayOrder + 1,
        }),
      });
      if (res.ok) {
        showToast(`Duplicated "${item.name}"`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/menu-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isAvailable: !item.isAvailable,
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
        );
        showToast(
          `${item.name} marked as ${!item.isAvailable ? 'Available' : 'Sold Out'}`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/menu-items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted "${name}"`);
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/menu-items';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        ...formData,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingItem ? 'Dish updated successfully' : 'Dish added successfully');
        setModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategoryFilter !== 'all' && item.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Toast Notification */}
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
              Menu Items
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Manage dishes, prices, descriptions, and real-time 86/sold-out availability.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="py-2.5 px-4 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAEAE5] shadow-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish name or ingredient..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAFAF8] border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326]"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-[#1C1917] text-white'
                  : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
              }`}
            >
              All Categories ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 ${
                  selectedCategoryFilter === c.id
                    ? 'bg-[#E86326] text-white'
                    : 'bg-[#FAFAF8] text-[#57534E] hover:bg-[#F2F2ED] border border-[#E5E5DE]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#78716C]">Loading menu dishes...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-[#EAEAE5] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAFAF8] flex items-center justify-center text-xl">
              🍲
            </div>
            <h3 className="text-sm font-bold text-[#1C1917]">No Dishes Found</h3>
            <p className="text-xs text-[#78716C]">
              {searchQuery ? 'No dishes match your search query.' : 'Add your first menu dish to get started.'}
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 py-2 px-4 rounded-xl bg-[#E86326] text-white text-xs font-semibold"
            >
              Add Dish Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  item.isAvailable
                    ? 'border-[#EAEAE5] shadow-subtle'
                    : 'border-stone-200 bg-[#FAFAF8] opacity-80'
                }`}
              >
                <div className="flex gap-3.5">
                  {/* Food Thumbnail */}
                  <div className="relative w-24 h-24 rounded-xl bg-[#F4F4F0] overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className={`object-cover ${!item.isAvailable ? 'grayscale' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <DietaryIndicator isVeg={item.isVeg} size="sm" />
                      <span className="text-[10px] font-semibold text-[#78716C] bg-[#F4F4F0] px-2 py-0.5 rounded">
                        {item.category?.name || 'Uncategorized'}
                      </span>
                      {item.isBestseller && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Bestseller
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          <Flame className="w-2.5 h-2.5 text-rose-600" /> Spicy
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#1C1917] truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <div className="text-sm font-black text-[#E86326] pt-0.5">
                      ₹{item.price}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Availability switch & Actions */}
                <div className="mt-3 pt-3 border-t border-[#F0F0EA] flex items-center justify-between">
                  {/* Availability toggle */}
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                      item.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {item.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Available</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-stone-600" />
                        <span>Sold Out</span>
                      </>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(item)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4F4F0] transition"
                      title="Duplicate dish"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#E86326] hover:bg-[#FFF7ED] transition"
                      title="Edit dish"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Dish Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEA]">
                <div>
                  <h2 className="text-lg font-bold text-[#1C1917]">
                    {editingItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Enter details for this item in your live digital menu
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1">
                      Dish Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Paneer Butter Masala"
                      className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price & Display Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g. 280"
                      className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description, flavors, or cooking style..."
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                {/* Image URL & Preview */}
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                  {formData.imageUrl && (
                    <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-[#E5E5DE]">
                      <Image
                        src={formData.imageUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        onError={() => {}}
                      />
                    </div>
                  )}
                </div>

                {/* Dietary & Badges */}
                <div className="p-3 bg-[#FAFAF8] border border-[#EAEAE5] rounded-2xl space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="text-xs font-bold text-[#1C1917]">Dietary Type:</label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#1C1917] cursor-pointer">
                      <input
                        type="radio"
                        name="dietary"
                        checked={formData.isVeg}
                        onChange={() => setFormData({ ...formData, isVeg: true })}
                        className="text-[#16A34A] focus:ring-[#16A34A]"
                      />
                      <DietaryIndicator isVeg={true} size="sm" showLabel />
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-[#1C1917] cursor-pointer">
                      <input
                        type="radio"
                        name="dietary"
                        checked={!formData.isVeg}
                        onChange={() => setFormData({ ...formData, isVeg: false })}
                        className="text-[#DC2626] focus:ring-[#DC2626]"
                      />
                      <DietaryIndicator isVeg={false} size="sm" showLabel />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#57534E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isBestseller}
                        onChange={(e) =>
                          setFormData({ ...formData, isBestseller: e.target.checked })
                        }
                        className="rounded text-[#E86326] focus:ring-[#E86326]"
                      />
                      <span>Chef&apos;s Bestseller</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-[#57534E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSpicy}
                        onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                        className="rounded text-[#E86326] focus:ring-[#E86326]"
                      />
                      <span>Spicy Dish</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-[#57534E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) =>
                          setFormData({ ...formData, isAvailable: e.target.checked })
                        }
                        className="rounded text-[#E86326] focus:ring-[#E86326]"
                      />
                      <span>Available for order</span>
                    </label>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm"
                  >
                    {editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
