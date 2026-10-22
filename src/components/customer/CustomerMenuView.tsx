'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UtensilsCrossed,
  AlertTriangle,
  RefreshCw,
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle2,
  Flame,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { RestaurantHeader, RestaurantData, TableData } from './RestaurantHeader';
import { TableReservationBar } from './TableReservationBar';
import { OrderTrackingSection } from './OrderTrackingSection';
import { SearchBar } from './SearchBar';
import { CategoryBar, CategoryData, FoodTypeFilter } from './CategoryBar';
import { FoodCard, MenuItemData } from './FoodCard';
import { ItemDetailModal } from './ItemDetailModal';
import { CustomerFooter } from './CustomerFooter';
import { MenuSkeleton } from './MenuSkeleton';
import { FloatingCartBar } from './FloatingCartBar';
import { CartDrawer, CartItem } from './CartDrawer';
import { OrderModifyModal } from './OrderModifyModal';
import { LiveOrderModal, ActiveOrderData } from './LiveOrderModal';
import type { PublicMenuPayload } from '@/lib/menu';
import type { ControllerSessionResult } from '@/lib/reservation';

interface CustomerMenuViewProps {
  slug: string;
  tableNumber?: string;
  initialData?: PublicMenuPayload;
}

export function CustomerMenuView({ slug, tableNumber, initialData }: CustomerMenuViewProps) {
  const [loading, setLoading] = useState(!initialData?.restaurant);
  const [error, setError] = useState<string | null>(initialData?.error || null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(initialData?.restaurant || null);
  const [table, setTable] = useState<TableData | null>(initialData?.table || null);
  const [categories, setCategories] = useState<CategoryData[]>(initialData?.categories || []);
  const [totalItems, setTotalItems] = useState(initialData?.totalItems || 0);

  // Table Controller & Reservation Session
  const [isController, setIsController] = useState(true);
  const [controllerToken, setControllerToken] = useState<string>('');
  const [tableSession, setTableSession] = useState<ControllerSessionResult | null>(null);
  const [guestNotice, setGuestNotice] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Order state & live modal
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [foodType, setFoodType] = useState<FoodTypeFilter>('all');

  // Selected item for modal
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);

  const effectiveTableNumber = tableNumber || (table ? table.tableNumber : '');

  // Cart Handlers
  const handleAddToCart = useCallback(
    (item: MenuItemData) => {
      if (!isController) {
        alert('Only the primary table controller can add items to the order.');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((c) => c.item.id === item.id);
        if (existing) {
          return prev.map((c) =>
            c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          );
        }
        return [...prev, { item, quantity: 1 }];
      });
    },
    [isController]
  );

  const handleUpdateQty = useCallback(
    (itemId: string, delta: number) => {
      if (!isController) return;
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
    },
    [isController]
  );

  const handleRemoveItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleSelectItem = useCallback((it: MenuItemData) => {
    setSelectedItem(it);
  }, []);

  // Cart totals
  const totalCartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) {
      map[c.item.id] = c.quantity;
    }
    return map;
  }, [cart]);

  // 1. Fetch Menu (if initialData not provided)
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
    if (initialData?.restaurant) return;
    loadMenu();
  }, [slug, tableNumber]);

  // 2. Resolve Table Controller Session
  const resolveSession = useCallback(async () => {
    if (!slug || !effectiveTableNumber) return;

    const tokenStorageKey = `momo_ct_${slug}_${effectiveTableNumber}`;
    let cachedToken = '';
    try {
      cachedToken = localStorage.getItem(tokenStorageKey) || '';
    } catch (e) {}

    try {
      const res = await fetch(
        `/api/public/session?slug=${encodeURIComponent(slug)}&table=${encodeURIComponent(
          effectiveTableNumber
        )}`,
        {
          headers: cachedToken ? { 'x-controller-token': cachedToken } : {},
        }
      );

      if (!res.ok) return;
      const data: ControllerSessionResult = await res.json();

      setIsController(data.isController);
      setTableSession(data);

      if (data.controllerToken) {
        setControllerToken(data.controllerToken);
        try {
          localStorage.setItem(tokenStorageKey, data.controllerToken);
        } catch (e) {}
      }

      if (data.guestMessage) {
        setGuestNotice(data.guestMessage);
      } else {
        setGuestNotice(null);
      }

      const sessionOrderedKey = `momo_has_ordered_${slug}_${effectiveTableNumber || 'default'}`;
      const userOrderedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionOrderedKey) === 'true';

      // If server returned active order for this table, ONLY sync it if THIS user actually placed an order in this browser session
      if (
        userOrderedInSession &&
        data.activeOrder &&
        data.activeOrder.status !== 'COMPLETED' &&
        data.activeOrder.status !== 'CANCELLED'
      ) {
        setActiveOrder((prev: any) => {
          // If we had full order items previously, preserve them while updating statuses
          if (prev?.id === data.activeOrder?.id && prev.orderItems && prev.orderItems.length > 0) {
            return { ...prev, ...data.activeOrder, orderItems: prev.orderItems };
          }
          return data.activeOrder;
        });
        setHasOrdered(true);
      } else {
        // No active order, order cancelled, or user hasn't ordered in this session -> clean slate
        setActiveOrder(null);
        setHasOrdered(false);
        if (!userOrderedInSession) {
          try {
            const effTable = effectiveTableNumber || 'default';
            localStorage.removeItem(`momo_active_order_${slug}_${effTable}`);
            sessionStorage.removeItem(`momo_has_ordered_${slug}_${effTable}`);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Session resolution error:', e);
    }
  }, [slug, effectiveTableNumber]);

  useEffect(() => {
    resolveSession();
  }, [resolveSession]);

  // 3. Active Order Recovery & Polling (Track if ordered in this session)
  useEffect(() => {
    if (!slug || !effectiveTableNumber) return;
    const sessionOrderedKey = `momo_has_ordered_${slug}_${effectiveTableNumber || 'default'}`;
    const storageKey = `momo_active_order_${slug}_${effectiveTableNumber || 'default'}`;

    // A customer opening a table QR should NEVER see an active order banner unless THEY ordered in this session!
    const userOrderedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionOrderedKey) === 'true';

    if (!userOrderedInSession) {
      setHasOrdered(false);
      setActiveOrder(null);
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(sessionOrderedKey);
      } catch (e) {}
      return;
    }

    // Try local storage cache for user who placed an order in this session
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed?.id &&
          parsed.status !== 'COMPLETED' &&
          parsed.status !== 'CANCELLED' &&
          parsed.orderItems &&
          parsed.orderItems.length > 0
        ) {
          setActiveOrder(parsed);
          setHasOrdered(true);
        } else {
          localStorage.removeItem(storageKey);
          sessionStorage.removeItem(sessionOrderedKey);
          setActiveOrder(null);
          setHasOrdered(false);
        }
      }
    } catch (e) {}

    // Fetch active order details with full items from server for the ordering customer
    fetch(
      `/api/public/orders?slug=${encodeURIComponent(slug)}&table=${encodeURIComponent(
        effectiveTableNumber
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data.order &&
          data.order.status !== 'COMPLETED' &&
          data.order.status !== 'CANCELLED' &&
          data.order.orderItems &&
          data.order.orderItems.length > 0
        ) {
          setActiveOrder(data.order);
          setHasOrdered(true);
          try {
            localStorage.setItem(storageKey, JSON.stringify(data.order));
          } catch (e) {}
        } else {
          setActiveOrder(null);
          setHasOrdered(false);
          try {
            localStorage.removeItem(storageKey);
            sessionStorage.removeItem(sessionOrderedKey);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [slug, effectiveTableNumber]);

  // 4. Background Polling (Every 4s) to keep reservation, order status, and controller synced
  useEffect(() => {
    if (!slug || !effectiveTableNumber) return;

    const interval = setInterval(() => {
      resolveSession();

      const sessionOrderedKey = `momo_has_ordered_${slug}_${effectiveTableNumber || 'default'}`;
      const userOrderedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionOrderedKey) === 'true';

      if (userOrderedInSession && activeOrder?.id && activeOrder.status !== 'COMPLETED' && activeOrder.status !== 'CANCELLED') {
        fetch(`/api/public/orders?orderId=${activeOrder.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (
              data?.order &&
              data.order.status !== 'COMPLETED' &&
              data.order.status !== 'CANCELLED' &&
              data.order.orderItems &&
              data.order.orderItems.length > 0
            ) {
              setActiveOrder(data.order);
              const storageKey = `momo_active_order_${slug}_${effectiveTableNumber || 'default'}`;
              try {
                localStorage.setItem(storageKey, JSON.stringify(data.order));
              } catch (e) {}
            } else {
              setActiveOrder(null);
              setHasOrdered(false);
              const effTable = effectiveTableNumber || 'default';
              try {
                localStorage.removeItem(`momo_active_order_${slug}_${effTable}`);
                sessionStorage.removeItem(`momo_has_ordered_${slug}_${effTable}`);
              } catch (e) {}
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [slug, effectiveTableNumber, activeOrder?.id, activeOrder?.status, resolveSession]);

  // 5. High-resolution Local Countdown Tick (Every 1s) for reservation and 5-min modification
  useEffect(() => {
    const timer = setInterval(() => {
      // Decrement reservation seconds if temporary
      setTableSession((prev) => {
        if (!prev?.reservation || prev.reservation.remainingSeconds <= 0) return prev;
        return {
          ...prev,
          reservation: {
            ...prev.reservation,
            remainingSeconds: Math.max(0, prev.reservation.remainingSeconds - 1),
          },
        };
      });

      // Decrement modification window seconds
      setActiveOrder((prev: any) => {
        if (!prev) return prev;
        const currentSec = prev.remainingModSeconds || 0;
        if (currentSec <= 0) return prev;
        const nextSec = currentSec - 1;
        const isModifiable = nextSec > 0 && prev.status !== 'SERVED' && prev.status !== 'COMPLETED' && prev.status !== 'CANCELLED';
        const isAccepted = prev.status !== 'PENDING';
        return {
          ...prev,
          remainingModSeconds: Math.max(0, nextSec),
          isModifiable,
          isAccepted,
          canRemoveDishes: !isAccepted && isModifiable,
          canAddDishes: isModifiable,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 6. Filtered Menu Items (Category, Search, and Dish Type: Veg / Non-Veg / All)
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        // Step 1: Category filter
        if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) {
          return null;
        }

        // Step 2: Search & Food Type filtering
        let matchedItems = cat.items.filter((item: MenuItemData) => {
          // Food type filter (All / Veg / Non-Veg)
          if (foodType === 'veg' && !item.isVeg) return false;
          if (foodType === 'non-veg' && item.isVeg) return false;

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
  }, [categories, selectedCategoryId, foodType, searchQuery]);

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
          <h1 className="text-xl font-bold text-[#1C1917]">Unable to Load Menu</h1>
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
          <p className="text-[10px] text-[#A8A29E] pt-2">Powered by MOMO MENU</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* 1. Restaurant Header with larger logo, branding and table information */}
      <RestaurantHeader restaurant={restaurant} table={table} />

      {/* Guest Notice Banner if multiple customers scan same table */}
      {!isController && guestNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{guestNotice}</span>
          </div>
        </div>
      )}

      {/* 3. Order-Tracking Section (Only visible on main menu after customer has placed an order) */}
      {hasOrdered &&
        activeOrder &&
        activeOrder.status !== 'CANCELLED' &&
        activeOrder.status !== 'COMPLETED' &&
        activeOrder.orderItems &&
        activeOrder.orderItems.length > 0 && (
          <OrderTrackingSection
            order={activeOrder}
            currencySymbol={restaurant.currencySymbol}
            isController={isController}
            remainingModSeconds={activeOrder?.remainingModSeconds || 0}
            isModifiable={activeOrder?.isModifiable || false}
            onOpenTracking={() => setIsTrackingModalOpen(true)}
            onOpenModify={() => setIsModifyModalOpen(true)}
          />
        )}

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-2.5 sm:px-6 pt-2 sm:pt-2.5 pb-20 space-y-2 sm:space-y-2.5">
        {/* 4. Search Bar */}
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* 5. Food Category Navigation with Filter button in first place */}
        <CategoryBar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          totalItems={totalItems}
          onSelectCategory={(id) => setSelectedCategoryId(id)}
          foodType={foodType}
          onFoodTypeChange={setFoodType}
        />

        {/* Invalid Table Notice */}
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

        {/* 7. Menu Items Grid */}
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-xl">
              🔍
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">No dishes match your filter</h3>
            <p className="text-xs text-[#78716C]">
              Try clearing your search query or switching dietary options.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFoodType('all');
                  setSelectedCategoryId('all');
                }}
                className="px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E5E5DE] text-xs font-semibold text-[#1C1917] hover:bg-[#F2F2ED] transition"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6 pt-0.5">
            {filteredCategories.map((category, catIndex) => {
              if (category.items.length === 0) return null;

              return (
                <section key={category.id} id={`cat-${category.id}`} className="space-y-3 scroll-mt-24">
                  {/* Category Header */}
                  <div className="flex items-baseline justify-between border-b border-[#EAEAE5] pb-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917] tracking-tight">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="text-xs text-[#78716C] mt-0.5">{category.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#A8A29E]">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Food Cards Grid (2 side-by-side dishes on mobile & desktop) */}
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3.5">
                    {category.items.map((item: MenuItemData, idx: number) => (
                      <FoodCard
                        key={item.id}
                        item={item}
                        currencySymbol={restaurant.currencySymbol}
                        cartQty={cartQtyMap[item.id] || 0}
                        priority={catIndex === 0 && idx < 4}
                        isController={isController}
                        onSelect={handleSelectItem}
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

      {/* Bottom Floating Order Summary: Item quantity and numbered list preview, NO total price */}
      <FloatingCartBar
        totalCount={totalCartCount}
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        isController={isController}
      />

      {/* Order Confirmation Popup / Drawer */}
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
        controllerToken={controllerToken}
        isController={isController}
        onOrderPlaced={(order) => {
          setActiveOrder(order);
          setHasOrdered(true);
          try {
            sessionStorage.setItem(
              `momo_has_ordered_${slug}_${effectiveTableNumber || 'default'}`,
              'true'
            );
          } catch (e) {}
          setIsCartOpen(false);
          setIsTrackingModalOpen(true);
          resolveSession();
        }}
        activeOrder={activeOrder}
        onOpenActiveOrder={() => {
          setIsCartOpen(false);
          setIsTrackingModalOpen(true);
        }}
      />

      {/* 5-Minute Order Modification Modal */}
      <OrderModifyModal
        isOpen={isModifyModalOpen}
        onClose={() => setIsModifyModalOpen(false)}
        order={activeOrder}
        currencySymbol={restaurant.currencySymbol}
        remainingSeconds={activeOrder?.remainingModSeconds || 0}
        isModifiable={activeOrder?.isModifiable || false}
        controllerToken={controllerToken}
        categories={categories}
        onOrderUpdated={(updated) => {
          const effTable = effectiveTableNumber || (table ? table.tableNumber : 'default');
          if (
            !updated ||
            updated.status === 'CANCELLED' ||
            !updated.orderItems ||
            updated.orderItems.length === 0
          ) {
            setActiveOrder(null);
            setHasOrdered(false);
            setIsModifyModalOpen(false);
            try {
              localStorage.removeItem(`momo_active_order_${slug}_${effTable}`);
              sessionStorage.removeItem(`momo_has_ordered_${slug}_${effTable}`);
            } catch (e) {}
          } else {
            setActiveOrder(updated);
            try {
              localStorage.setItem(`momo_active_order_${slug}_${effTable}`, JSON.stringify(updated));
            } catch (e) {}
          }
          resolveSession();
        }}
      />

      {/* Live Order Tracker Modal */}
      <LiveOrderModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={activeOrder}
        currencySymbol={restaurant.currencySymbol}
        onOrderMoreDishes={() => setIsTrackingModalOpen(false)}
        onOpenModify={() => setIsModifyModalOpen(true)}
        isModifiable={activeOrder?.isModifiable || false}
        remainingModSeconds={activeOrder?.remainingModSeconds || 0}
        onClearOrder={() => {
          setActiveOrder(null);
          setHasOrdered(false);
          setIsTrackingModalOpen(false);
          const effectiveTable = tableNumber || (table ? table.tableNumber : 'default');
          try {
            localStorage.removeItem(`momo_active_order_${slug}_${effectiveTable}`);
            sessionStorage.removeItem(`momo_has_ordered_${slug}_${effectiveTable}`);
          } catch (e) {}
          resolveSession();
        }}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        currencySymbol={restaurant.currencySymbol}
        tableName={table ? table.name || `Table ${table.tableNumber}` : null}
        cartQty={selectedItem ? cartQtyMap[selectedItem.id] || 0 : 0}
        isController={isController}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
        onUpdateCartQty={handleUpdateQty}
      />

      {/* Footer */}
      <CustomerFooter />
    </div>
  );
}
