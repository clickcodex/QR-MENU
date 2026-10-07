'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  AlertTriangle,
  RefreshCw,
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { RestaurantHeader, RestaurantData, TableData } from './RestaurantHeader';
import { CategoryBar, CategoryData } from './CategoryBar';
import { SearchBar, DietaryFilter } from './SearchBar';
import { FoodCard, MenuItemData } from './FoodCard';
import { ItemDetailModal } from './ItemDetailModal';
import { CustomerFooter } from './CustomerFooter';
import { MenuSkeleton } from './MenuSkeleton';
import { FloatingCartBar } from './FloatingCartBar';
import { CartDrawer, CartItem } from './CartDrawer';
import { LiveOrderModal, ActiveOrderData } from './LiveOrderModal';

interface CustomerMenuViewProps {
  slug: string;
  tableNumber?: string;
}

export function CustomerMenuView({ slug, tableNumber }: CustomerMenuViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Order state & live modal
  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DietaryFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Selected item for modal
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);

  // Cart Handlers
  const handleAddToCart = (item: MenuItemData) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Cart totals
  const totalCartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0), [cart]);
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) {
      map[c.item.id] = c.quantity;
    }
    return map;
  }, [cart]);

  // Fetch Menu
  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/public/menu?slug=${encodeURIComponent(slug)}${
        tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load restaurant menu');
      }

      setRestaurant(data.restaurant);
      setTable(data.table);
      setCategories(data.categories || []);
      setTotalItems(data.totalItems || 0);
    } catch (err: any) {
      console.error('Menu load error:', err);
      setError(err.message || 'Unable to connect to the restaurant menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [slug, tableNumber]);

  // Active Order Persistence & Recovery on Mount
  useEffect(() => {
    if (!slug) return;
    const effectiveTable = tableNumber || (table ? table.tableNumber : '');
    const storageKey = `momo_active_order_${slug}_${effectiveTable || 'default'}`;

    // 1. Try local storage cache first
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed.status !== 'COMPLETED') {
          setActiveOrder(parsed);
        }
      }
    } catch (e) {
      // ignore storage error
    }

    // 2. Fetch active order for this table from server
    if (effectiveTable) {
      fetch(`/api/public/orders?slug=${encodeURIComponent(slug)}&table=${encodeURIComponent(effectiveTable)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.order && data.order.status !== 'COMPLETED') {
            setActiveOrder(data.order);
            try {
              localStorage.setItem(storageKey, JSON.stringify(data.order));
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
  }, [slug, tableNumber, table]);

  // Polling active order for real-time status updates every 3 seconds
  useEffect(() => {
    if (!activeOrder?.id || activeOrder.status === 'COMPLETED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/orders?orderId=${activeOrder.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.order) {
          if (data.order.status !== activeOrder.status) {
            setActiveOrder(data.order);
            const effectiveTable = tableNumber || (table ? table.tableNumber : '');
            const storageKey = `momo_active_order_${slug}_${effectiveTable || 'default'}`;
            try {
              localStorage.setItem(storageKey, JSON.stringify(data.order));
            } catch (e) {}
          }
        }
      } catch (e) {
        // ignore polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder?.id, activeOrder?.status, slug, tableNumber, table]);

  // Filtered categories and items
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        // If a specific category is chosen and it's not 'all', filter out other categories
        if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) {
          return null;
        }

        const matchedItems = cat.items.filter((item: MenuItemData) => {
          // Dietary filter
          if (activeFilter === 'veg' && !item.isVeg) return false;
          if (activeFilter === 'non-veg' && item.isVeg) return false;
          if (activeFilter === 'bestseller' && !item.isBestseller) return false;

          // Search query filter
          if (query) {
            const nameMatch = item.name.toLowerCase().includes(query);
            const descMatch = item.description?.toLowerCase().includes(query);
            if (!nameMatch && !descMatch) return false;
          }

          return true;
        });

        return {
          ...cat,
          items: matchedItems,
        };
      })
      .filter(Boolean) as CategoryData[];
  }, [categories, selectedCategoryId, activeFilter, searchQuery]);

  // Loading skeleton state
  if (loading) {
    return <MenuSkeleton />;
  }

  // Error state
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#EAEAE5] shadow-subtle text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-[#E86326] flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[#1C1917]">
            Unable to Load Menu
          </h1>
          <p className="text-xs text-[#57534E] leading-relaxed">
            {error || 'This menu is currently unavailable. Please ask a member of our staff for assistance.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={loadMenu}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#E86326] text-white text-xs font-semibold hover:bg-[#D34F15] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <a
              href="/"
              className="py-2.5 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8] transition"
            >
              Back to Home
            </a>
          </div>
          <p className="text-[10px] text-[#A8A29E] pt-2">
            Powered by MOMO MENU
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* 1. Restaurant Header */}
      <RestaurantHeader restaurant={restaurant} table={table} />

      {/* 2. Active Live Order Sticky Banner (Never disappears when kitchen is preparing dishes) */}
      {activeOrder && activeOrder.status !== 'COMPLETED' && (
        <div className="bg-[#FFF7ED] border-b border-[#FED7AA] px-4 py-2.5 shadow-2xs sticky top-0 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div
              onClick={() => setIsTrackingModalOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-[#E86326] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#1C1917]">
                    Table {activeOrder.tableNumber} • Order #{activeOrder.orderNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E86326] text-white animate-pulse">
                    {activeOrder.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C] truncate mt-0.5">
                  {activeOrder.status === 'PENDING'
                    ? 'Order sent to kitchen • Awaiting approval'
                    : activeOrder.status === 'ACCEPTED'
                    ? 'Approved by kitchen • Food prep starting'
                    : activeOrder.status === 'PREPARING'
                    ? 'Chefs are cooking your dishes right now'
                    : activeOrder.status === 'READY'
                    ? 'Plated and ready! Serving to table'
                    : 'Served to table ✓ Enjoy your meal!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTrackingModalOpen(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-bold text-[#E86326] shadow-2xs hover:bg-[#FFFDF8] transition"
            >
              <span>Track Live</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Sticky Category Bar */}
      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        totalItems={totalItems}
        onSelectCategory={(id) => setSelectedCategoryId(id)}
      />

      {/* 4. Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 pb-12 space-y-6">
        {/* Search & Dietary Filters */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Invalid Table Notice (if table parameter was passed but not found in DB) */}
        {table && table.isValid === false && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Table &quot;{tableNumber}&quot; not found in restaurant records.
              </p>
              <p className="text-amber-700 mt-0.5">
                You can still browse the full menu and your server can assign your table bill.
              </p>
            </div>
          </div>
        )}

        {/* Menu Items Section */}
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-xl">
              🔍
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">
              No dishes match your filter
            </h3>
            <p className="text-xs text-[#78716C]">
              Try clearing your search query or switching dietary options.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setSelectedCategoryId('all');
                }}
                className="px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E5E5DE] text-xs font-semibold text-[#1C1917] hover:bg-[#F2F2ED] transition"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => {
              if (category.items.length === 0) return null;

              return (
                <section
                  key={category.id}
                  id={`cat-${category.id}`}
                  className="space-y-3 scroll-mt-24"
                >
                  {/* Category Header */}
                  <div className="flex items-baseline justify-between border-b border-[#EAEAE5] pb-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917] tracking-tight">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="text-xs text-[#78716C] mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#A8A29E]">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Food Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {category.items.map((item: MenuItemData) => (
                      <FoodCard
                        key={item.id}
                        item={item}
                        currencySymbol={restaurant.currencySymbol}
                        cartQty={cartQtyMap[item.id] || 0}
                        onSelect={(it) => setSelectedItem(it)}
                        onAddToCart={handleAddToCart}
                        onUpdateCartQty={handleUpdateQty}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar
        totalCount={totalCartCount}
        subtotal={cartSubtotal}
        currencySymbol={restaurant.currencySymbol}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart & Billing Drawer / Checkout Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        restaurantSlug={slug}
        tableNumber={tableNumber || (table ? table.tableNumber : undefined)}
        tableName={table ? table.name || `Table ${table.tableNumber}` : undefined}
        currencySymbol={restaurant.currencySymbol}
        onOrderPlaced={(order) => {
          setActiveOrder(order);
          setIsCartOpen(false);
          setIsTrackingModalOpen(true);
        }}
        activeOrder={activeOrder}
        onOpenActiveOrder={() => {
          setIsCartOpen(false);
          setIsTrackingModalOpen(true);
        }}
      />

      {/* Live Order Tracker Modal */}
      <LiveOrderModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={activeOrder}
        currencySymbol={restaurant.currencySymbol}
        onOrderMoreDishes={() => setIsTrackingModalOpen(false)}
        onClearOrder={() => {
          setActiveOrder(null);
          setIsTrackingModalOpen(false);
          if (typeof window !== 'undefined') {
            const effectiveTable = tableNumber || (table ? table.tableNumber : '');
            localStorage.removeItem(`momo_active_order_${slug}_${effectiveTable || 'default'}`);
          }
        }}
      />

      {/* Item Detail Modal / Bottom Sheet */}
      <ItemDetailModal
        item={selectedItem}
        currencySymbol={restaurant.currencySymbol}
        tableName={table ? table.name || `Table ${table.tableNumber}` : null}
        cartQty={selectedItem ? cartQtyMap[selectedItem.id] || 0 : 0}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
        onUpdateCartQty={handleUpdateQty}
      />

      {/* Footer */}
      <CustomerFooter />
    </div>
  );
}
