'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Utensils,
  X,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? Dishes in this category may be affected.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Category "${name}" deleted`);
        loadCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const payload = {
        ...(editingCategory ? { id: editingCategory.id } : {}),
        ...formData,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingCategory ? 'Category updated' : 'Category created');
        setModalOpen(false);
        loadCategories();
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
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
              Menu Categories
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Organize your restaurant menu into clear sections for guests.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="py-2.5 px-4 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#78716C]">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-[#EAEAE5] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAFAF8] flex items-center justify-center text-xl">
              📂
            </div>
            <h3 className="text-sm font-bold text-[#1C1917]">No Categories Yet</h3>
            <p className="text-xs text-[#78716C]">
              Create sections like Starters, Main Course, Breads, and Desserts.
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 py-2 px-4 rounded-xl bg-[#E86326] text-white text-xs font-semibold"
            >
              Add First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-5 border border-[#EAEAE5] shadow-subtle flex flex-col justify-between space-y-4 hover:border-[#FED7AA] transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-xl bg-[#FFF7ED] text-[#E86326] font-extrabold text-xs flex items-center justify-center border border-[#FED7AA]">
                      #{cat.displayOrder}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#57534E] bg-[#FAFAF8] px-2 py-0.5 rounded-md border border-[#E5E5DE]">
                      <Utensils className="w-3 h-3 text-[#E86326]" />
                      <span>{cat._count?.menuItems ?? 0} dishes</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#1C1917]">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-[#78716C] mt-1 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F0EA] flex items-center justify-between">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      cat.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#E86326] hover:bg-[#FFF7ED] transition"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Category Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-md p-6 space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEFEA]">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917]">
                    {editingCategory ? 'Edit Category' : 'New Menu Category'}
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Categories group your dishes on the customer menu
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Starters, Tandoor Specials"
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description shown to guests..."
                    className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#E86326]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Display Order (Position)
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

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-[#1C1917] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-[#E86326] focus:ring-[#E86326]"
                    />
                    <span className="font-semibold">Visible on public customer menu</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
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
                    {editingCategory ? 'Update Category' : 'Save Category'}
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
