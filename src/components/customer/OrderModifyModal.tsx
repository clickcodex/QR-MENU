'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  Plus,
  Minus,
  Search,
  PlusCircle,
  ShoppingBag,
} from 'lucide-react';
import { DietaryIndicator } from './DietaryIndicator';

interface OrderModifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  currencySymbol?: string;
  remainingSeconds: number;
  isModifiable: boolean;
  controllerToken: string;
  categories?: any[];
  onOrderUpdated?: (updatedOrder: any) => void;
  onItemRemoved?: (updatedOrder: any) => void;
}

export function OrderModifyModal({
  isOpen,
  onClose,
  order,
  currencySymbol = '₹',
  remainingSeconds,
  isModifiable,
  controllerToken,
  categories = [],
  onOrderUpdated,
  onItemRemoved,
}: OrderModifyModalProps) {
  const isOrderAccepted = Boolean(order?.status && order.status !== 'PENDING');
  const canRemove = !isOrderAccepted && isModifiable && remainingSeconds > 0;

  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  // Automatically switch tab when modal opens or acceptance state changes
  useEffect(() => {
    if (isOpen) {
      if (isOrderAccepted) {
        setActiveTab('add');
      } else {
        setActiveTab('current');
      }
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, isOrderAccepted]);
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state for adding new items
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [foodType, setFoodType] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Flatten all menu items from categories
  const allMenuItems = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return [];
    const list: any[] = [];
    for (const cat of categories) {
      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          list.push({
            ...item,
            categoryId: cat.id,
            categoryName: cat.name,
          });
        }
      }
    }
    return list;
  }, [categories]);

  // Filter menu items for Add Dishes view
  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (foodType === 'veg' && !item.isVeg) return false;
      if (foodType === 'non-veg' && item.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [allMenuItems, selectedCategory, foodType, searchQuery]);

  // Map of existing item quantities in this order
  const existingOrderItemsMap = useMemo(() => {
    const map = new Map<string, { id: string; quantity: number }>();
    if (order?.orderItems && Array.isArray(order.orderItems)) {
      for (const oi of order.orderItems) {
        if (oi.menuItemId) {
          map.set(oi.menuItemId, { id: oi.id, quantity: oi.quantity });
        } else if (oi.name) {
          map.set(oi.name.toLowerCase(), { id: oi.id, quantity: oi.quantity });
        }
      }
    }
    return map;
  }, [order?.orderItems]);

  if (!isOpen || !order) return null;

  const notifyOrderUpdate = (updatedOrder: any) => {
    if (onOrderUpdated) {
      onOrderUpdated(updatedOrder);
    }
    if (onItemRemoved) {
      onItemRemoved(updatedOrder);
    }
  };

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handler: Update quantity (+1 or -1) of an existing item in the order
  const handleUpdateQuantity = async (orderItemId: string, delta: number, currentQty: number) => {
    if (!isModifiable || remainingSeconds <= 0) {
      setErrorMessage('Modification window has expired. Dishes cannot be modified.');
      return;
    }

    if (delta < 0 && isOrderAccepted) {
      setErrorMessage('Dishes cannot be removed or reduced after the order is accepted by the restaurant.');
      return;
    }

    if (delta < 0 && currentQty <= 1) {
      if (!window.confirm('Remove this dish from your order?')) {
        return;
      }
    }

    setLoadingItemId(orderItemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-controller-token': controllerToken,
        },
        body: JSON.stringify({
          orderId: order.id,
          orderItemId,
          action: 'UPDATE_QUANTITY',
          quantityDelta: delta,
          controllerToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update item quantity');
      }

      if (data.orderCancelled || !data.order || !data.order.orderItems || data.order.orderItems.length === 0) {
        setSuccessMessage('All dishes removed. Order cancelled successfully.');
        notifyOrderUpdate(null);
        setTimeout(() => onClose(), 600);
      } else {
        setSuccessMessage(data.message || 'Order item updated successfully.');
        notifyOrderUpdate(data.order);
      }
    } catch (err: any) {
      console.error('Update item quantity error:', err);
      setErrorMessage(err.message || 'Could not update item. Window may have expired.');
    } finally {
      setLoadingItemId(null);
    }
  };

  // Handler: Directly remove an item
  const handleRemoveItem = async (orderItemId: string) => {
    if (isOrderAccepted) {
      setErrorMessage('Dishes can only be removed before the order is accepted by the restaurant.');
      return;
    }

    if (!isModifiable || remainingSeconds <= 0) {
      setErrorMessage('Modification window has expired. Items cannot be removed.');
      return;
    }

    setLoadingItemId(orderItemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-controller-token': controllerToken,
        },
        body: JSON.stringify({
          orderId: order.id,
          orderItemId,
          action: 'REMOVE_ITEM',
          controllerToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove order item');
      }

      if (data.orderCancelled || !data.order || !data.order.orderItems || data.order.orderItems.length === 0) {
        setSuccessMessage('All dishes removed. Order cleared successfully.');
        notifyOrderUpdate(null);
        setTimeout(() => onClose(), 600);
      } else {
        setSuccessMessage('Dish removed from order successfully.');
        notifyOrderUpdate(data.order);
      }
    } catch (err: any) {
      console.error('Remove item error:', err);
      setErrorMessage(err.message || 'Could not remove item. Window may have expired.');
    } finally {
      setLoadingItemId(null);
    }
  };

  // Handler: Add a new dish (or add more of a dish) to the same order
  const handleAddDishToOrder = async (menuItemId: string, dishName: string) => {
    if (!isModifiable || remainingSeconds <= 0) {
      setErrorMessage('5-minute modification window has expired. Dishes cannot be added to this order.');
      return;
    }

    setLoadingItemId(menuItemId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-controller-token': controllerToken,
        },
        body: JSON.stringify({
          orderId: order.id,
          menuItemId,
          action: 'ADD_ITEM',
          quantity: 1,
          controllerToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add dish to order');
      }

      setSuccessMessage(`✓ Added ${dishName} to Order #${order.orderNumber}!`);
      notifyOrderUpdate(data.order);
    } catch (err: any) {
      console.error('Add dish error:', err);
      setErrorMessage(err.message || 'Could not add dish. Window may have expired.');
    } finally {
      setLoadingItemId(null);
    }
  };

  // Handler: Cancel entire order
  const handleRemoveAllDishes = async () => {
    if (isOrderAccepted) {
      setErrorMessage('Order cannot be cancelled because it has already been accepted by the restaurant.');
      return;
    }

    if (!window.confirm('Are you sure you want to remove all dishes and cancel this order?')) {
      return;
    }
    setIsCancellingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-controller-token': controllerToken,
        },
        body: JSON.stringify({
          orderId: order.id,
          action: 'CANCEL_ORDER',
          controllerToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setSuccessMessage('All dishes removed! You can now select new dishes.');
      notifyOrderUpdate(null);
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      console.error('Remove all dishes error:', err);
      setErrorMessage(err.message || 'Could not remove all dishes.');
    } finally {
      setIsCancellingAll(false);
    }
  };

  const totalOrderedItemsCount =
    order.orderItems?.reduce((sum: number, oi: any) => sum + oi.quantity, 0) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-modal overflow-hidden animate-scale-in flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#EAEAE5] flex items-center justify-between bg-[#FFFDF8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#E86326] flex items-center justify-center shadow-2xs">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1917] leading-tight">
                {isOrderAccepted
                  ? `Add Dishes to Order #${order.orderNumber}`
                  : `Modify Order #${order.orderNumber}`}
              </h3>
              <p className="text-[11px] text-[#78716C]">
                {isOrderAccepted
                  ? `Table ${order.tableNumber} • Order Accepted by Kitchen`
                  : `Table ${order.tableNumber} • 5-Minute Window`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C] transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Countdown Timer Alert Bar */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold ${
            isModifiable && remainingSeconds > 0
              ? isOrderAccepted
                ? 'bg-orange-50 border-b border-orange-200 text-orange-950'
                : 'bg-amber-50 border-b border-amber-200 text-amber-900'
              : 'bg-stone-100 border-b border-stone-200 text-stone-600'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className={`w-4 h-4 flex-shrink-0 animate-spin ${isOrderAccepted ? 'text-[#E86326]' : 'text-amber-600'}`} />
            <span className="truncate">
              {isModifiable && remainingSeconds > 0
                ? isOrderAccepted
                  ? 'Order Accepted: Dishes cannot be removed, but you can add more dishes'
                  : '5-Min Edit Window: Add or adjust dishes in your order freely'
                : '5-minute modification window has closed:'}
            </span>
          </div>
          <span
            className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-md flex-shrink-0 ${
              isModifiable && remainingSeconds > 0
                ? isOrderAccepted
                  ? 'bg-orange-200/90 text-orange-950 animate-pulse'
                  : 'bg-amber-200/90 text-amber-950 animate-pulse'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {formatCountdown(remainingSeconds)}
          </span>
        </div>

        {/* Mode Tabs: Add More Dishes vs Current Dishes */}
        <div className="flex border-b border-[#EAEAE5] bg-[#FAFAF8] px-3 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            disabled={!isModifiable || remainingSeconds <= 0}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 border-t border-x ${
              activeTab === 'add'
                ? 'bg-white text-[#E86326] border-[#EAEAE5] shadow-2xs -mb-[1px]'
                : 'border-transparent text-[#78716C] hover:text-[#E86326] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Dishes to Order</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 border-t border-x ${
              activeTab === 'current'
                ? 'bg-white text-[#1C1917] border-[#EAEAE5] shadow-2xs -mb-[1px]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#E86326]" />
            <span>{isOrderAccepted ? 'Ordered Dishes' : 'Current Dishes'} ({order.orderItems?.length || 0})</span>
          </button>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'current' ? (
            /* TAB 1: CURRENT ORDERED ITEMS */
            <div className="space-y-3">
              {/* Notice when order is accepted */}
              {isOrderAccepted && (
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-2.5 text-xs text-orange-950 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-orange-950">Order Accepted by Restaurant Staff</p>
                    <p className="text-[11px] text-orange-900 mt-0.5">
                      The kitchen is actively preparing your dishes. Dishes can no longer be removed, but you can add more dishes to this order!
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                <span>
                  {isOrderAccepted
                    ? 'Dishes in preparation (cannot be removed):'
                    : 'Adjust quantity or remove dishes mistakenly added:'}
                </span>
                <span className="font-bold text-[#1C1917]">
                  {totalOrderedItemsCount} total items
                </span>
              </div>

              <div className="space-y-2 divide-y divide-[#F5EAD4]/50">
                {order.orderItems?.map((oi: any) => {
                  const isLoading = loadingItemId === oi.id;
                  return (
                    <div
                      key={oi.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 bg-white p-2 rounded-xl hover:bg-[#FFFDF8] transition border border-[#F5EAD4]/40"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <DietaryIndicator isVeg={oi.isVeg} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1C1917] truncate">{oi.name}</p>
                          <p className="text-[11px] font-semibold text-[#78716C]">
                            {oi.price ? `${currencySymbol}${oi.price} each` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controller & Delete */}
                      {canRemove ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Minus / Plus Stepper */}
                          <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(oi.id, -1, oi.quantity)}
                              disabled={!isModifiable || remainingSeconds <= 0 || isLoading || isCancellingAll}
                              className="w-6 h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-200 transition disabled:opacity-40"
                              title={oi.quantity > 1 ? 'Reduce quantity' : 'Remove dish'}
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="w-7 text-center font-black text-xs text-[#1C1917]">
                              {isLoading ? (
                                <div className="w-3 h-3 mx-auto border-2 border-[#E86326] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                oi.quantity
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(oi.id, 1, oi.quantity)}
                              disabled={!isModifiable || remainingSeconds <= 0 || isLoading || isCancellingAll}
                              className="w-6 h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-200 transition disabled:opacity-40"
                              title="Increase quantity (+1)"
                            >
                              <Plus className="w-3 h-3 text-[#E86326]" />
                            </button>
                          </div>

                          {/* Direct Delete Trash Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(oi.id)}
                            disabled={!isModifiable || remainingSeconds <= 0 || isLoading || isCancellingAll}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs transition disabled:opacity-40"
                            title="Remove this dish completely"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* When order is accepted by admin: DO NOT SHOW REMOVE BUTTON */
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-black text-xs text-[#1C1917] bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg">
                            Qty: {oi.quantity}
                          </span>
                          {/* Allow adding more (+1) if window is active */}
                          {isModifiable && remainingSeconds > 0 && (
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(oi.id, 1, oi.quantity)}
                              disabled={isLoading}
                              className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#E86326] text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              title="Add +1 more of this dish"
                            >
                              {isLoading ? (
                                <div className="w-3 h-3 border-2 border-[#E86326] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>+1</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {(!order.orderItems || order.orderItems.length === 0) && (
                  <div className="p-8 text-center text-xs text-stone-500">
                    No dishes remaining in this order.
                  </div>
                )}
              </div>

              {/* Want to add dishes helper card */}
              {isModifiable && remainingSeconds > 0 && (
                <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between gap-2 mt-2">
                  <div className="text-xs text-[#1C1917] min-w-0">
                    <p className="font-bold text-[#E86326]">Want to add more dishes to this order?</p>
                    <p className="text-[11px] text-[#78716C]">
                      Browse the menu and add items directly to your active order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition shadow-2xs"
                  >
                    + Add Dishes
                  </button>
                </div>
              )}

              {/* Remove All Dishes Action Button: Only shown before order is accepted by admin */}
              {canRemove && order.orderItems && order.orderItems.length > 0 && (
                <div className="pt-2 border-t border-[#F5EAD4]">
                  <button
                    type="button"
                    onClick={handleRemoveAllDishes}
                    disabled={isCancellingAll || loadingItemId !== null}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isCancellingAll ? (
                      <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Remove All Dishes (Cancel Order)</span>
                  </button>
                </div>
              )}

              {/* When order is accepted: Show + Add Dishes Action Button */}
              {isOrderAccepted && isModifiable && remainingSeconds > 0 && (
                <div className="pt-2 border-t border-[#F5EAD4]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add More Dishes to Order</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: + ADD DISHES TO ORDER */
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes to add..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FAFAF8] border border-[#E5DFB0] rounded-xl text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E] hover:text-[#1C1917]"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category & Veg/Non-Veg Quick Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                {/* Veg / Non-Veg toggles */}
                <button
                  type="button"
                  onClick={() => setFoodType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    foodType === 'all'
                      ? 'bg-[#1C1917] text-white'
                      : 'bg-[#F5F5F0] text-[#78716C] hover:bg-[#EAEAE5]'
                  }`}
                >
                  All Food
                </button>
                <button
                  type="button"
                  onClick={() => setFoodType('veg')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    foodType === 'veg'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#F5F5F0] text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Veg
                </button>
                <button
                  type="button"
                  onClick={() => setFoodType('non-veg')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    foodType === 'non-veg'
                      ? 'bg-rose-700 text-white'
                      : 'bg-[#F5F5F0] text-rose-800 hover:bg-rose-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Non-Veg
                </button>

                {/* Category Pills */}
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)
                    }
                    className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-[#E86326] text-white'
                        : 'bg-[#F5F5F0] text-[#78716C] hover:bg-[#EAEAE5]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu Items List */}
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {filteredMenuItems.map((item: any) => {
                  const existingInfo =
                    existingOrderItemsMap.get(item.id) ||
                    existingOrderItemsMap.get(item.name?.toLowerCase());
                  const inOrderQty = existingInfo ? existingInfo.quantity : 0;
                  const isItemLoading = loadingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-2xl bg-white border border-[#EAEAE5] hover:border-[#E86326]/50 transition flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="mt-0.5">
                          <DietaryIndicator isVeg={item.isVeg} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-[#1C1917] truncate">
                              {item.name}
                            </h4>
                            {inOrderQty > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                                In Order: ×{inOrderQty}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs font-black text-[#E86326] mt-0.5">
                            {currencySymbol}
                            {item.price}
                          </p>
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => handleAddDishToOrder(item.id, item.name)}
                        disabled={
                          !isModifiable ||
                          remainingSeconds <= 0 ||
                          isItemLoading ||
                          item.isAvailable === false
                        }
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                          inOrderQty > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-[#E86326] hover:bg-[#D34F15] text-white'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isItemLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{inOrderQty > 0 ? '+1 More' : '+ Add to Order'}</span>
                      </button>
                    </div>
                  );
                })}

                {filteredMenuItems.length === 0 && (
                  <div className="p-8 text-center text-xs text-stone-500">
                    No dishes found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Dishes count and summary */}
        <div className="p-3.5 border-t border-[#EAEAE5] bg-[#FAFAF8] flex items-center justify-between">
          <div className="text-xs leading-tight">
            <span className="text-[#78716C]">Order Total: </span>
            <span className="font-extrabold text-[#1C1917] text-sm">
              {totalOrderedItemsCount} {totalOrderedItemsCount === 1 ? 'dish' : 'dishes'}
            </span>
            {order.total !== undefined && order.total > 0 && (
              <span className="text-[#78716C] text-[11px] ml-1.5">
                ({currencySymbol}{order.total})
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-[#2C2825] transition shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
