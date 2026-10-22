'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Receipt,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Check,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { MenuItemData } from './FoodCard';
import { DietaryIndicator } from './DietaryIndicator';
import { OrderStatusPath } from '../common/OrderStatusPath';

export interface CartItem {
  item: MenuItemData;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  restaurantSlug: string;
  tableNumber?: string;
  tableName?: string | null;
  currencySymbol?: string;
  controllerToken?: string;
  isController?: boolean;
  onOrderPlaced?: (order: any) => void;
  activeOrder?: any | null;
  onOpenActiveOrder?: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  restaurantSlug,
  tableNumber,
  tableName,
  currencySymbol = '₹',
  controllerToken,
  isController = true,
  onOrderPlaced,
  activeOrder,
  onOpenActiveOrder,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [cookingNotes, setCookingNotes] = useState('');
  const [customTable, setCustomTable] = useState(tableNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);
  const [showEditItems, setShowEditItems] = useState(false);

  useEffect(() => {
    if (tableNumber) {
      setCustomTable(tableNumber);
    }
  }, [tableNumber]);

  // Poll placed order status in real-time if drawer is tracking an order
  useEffect(() => {
    if (!placedOrder?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/orders?orderId=${placedOrder.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.order && data.order.status !== placedOrder.status) {
          setPlacedOrder(data.order);
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [placedOrder?.id, placedOrder?.status]);

  if (!isOpen) return null;

  // Calculate bill amounts
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = Math.round((subtotal + gst) * 100) / 100;
  const totalCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const resolvedTable = (tableNumber || customTable || 'Takeaway').trim();

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    if (!isController) {
      setErrorMessage(
        'Only the primary table controller can confirm orders. You are currently viewing in guest mode.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = controllerToken || (typeof window !== 'undefined' ? localStorage.getItem(`momo_ct_${restaurantSlug}_${resolvedTable}`) : '');

      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-controller-token': token } : {}),
        },
        body: JSON.stringify({
          restaurantSlug,
          tableNumber: resolvedTable,
          customerName: customerName.trim() || undefined,
          notes: cookingNotes.trim() || undefined,
          controllerToken: token || undefined,
          items: cart.map((c) => ({
            menuItemId: c.item.id,
            quantity: c.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Persist in localStorage for diner recovery
      try {
        const storageKey = `momo_active_order_${restaurantSlug}_${resolvedTable}`;
        localStorage.setItem(storageKey, JSON.stringify(data.order));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }

      setPlacedOrder(data.order);
      onClearCart();

      if (onOrderPlaced) {
        onOrderPlaced(data.order);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setErrorMessage(
        err.message || 'Could not place order. Please try again or notify restaurant staff.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddToExistingOrder = Boolean(
    activeOrder?.id &&
      activeOrder.isModifiable &&
      (activeOrder.remainingModSeconds || 0) > 0
  );

  const handleAddToExistingOrder = async () => {
    if (cart.length === 0 || isSubmitting || !activeOrder?.id) return;

    if (!isController) {
      setErrorMessage(
        'Only the primary table controller can modify orders. You are currently viewing in guest mode.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token =
        controllerToken ||
        (typeof window !== 'undefined'
          ? localStorage.getItem(`momo_ct_${restaurantSlug}_${resolvedTable}`)
          : '');

      const res = await fetch('/api/public/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-controller-token': token } : {}),
        },
        body: JSON.stringify({
          orderId: activeOrder.id,
          action: 'ADD_BATCH_ITEMS',
          controllerToken: token || undefined,
          items: cart.map((c) => ({
            menuItemId: c.item.id,
            quantity: c.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add items to existing order');
      }

      // Persist in localStorage for diner recovery
      try {
        const storageKey = `momo_active_order_${restaurantSlug}_${resolvedTable}`;
        localStorage.setItem(storageKey, JSON.stringify(data.order));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }

      setPlacedOrder(data.order);
      onClearCart();

      if (onOrderPlaced) {
        onOrderPlaced(data.order);
      }
    } catch (err: any) {
      console.error('Add to existing order error:', err);
      setErrorMessage(
        err.message || 'Could not add items to order. 5-minute window may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlacedOrder(null);
    setErrorMessage(null);
    setShowEditItems(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-modal overflow-hidden animate-slide-up sm:animate-scale-in max-h-[92vh] sm:max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[#D2D2C8] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EAEAE5] flex items-center justify-between bg-[#FFFDF8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#E86326] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917] leading-tight">
                {placedOrder
                  ? 'Live Order Tracking'
                  : 'Order Confirmation'}
              </h2>
              <p className="text-xs text-[#78716C]">
                {tableNumber
                  ? tableName || `Table ${tableNumber}`
                  : resolvedTable !== 'Takeaway'
                  ? `Table ${resolvedTable}`
                  : 'Dine-in Order'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C] transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ORDER SUCCESS & LIVE STATUS TRACKER */}
        {placedOrder ? (
          <div className="p-6 sm:p-7 overflow-y-auto no-scrollbar space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-subtle">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                Order #{placedOrder.orderNumber} Confirmed
              </span>
              <h3 className="text-xl font-black text-[#1C1917]">
                Order Sent to Kitchen!
              </h3>
              <p className="text-xs text-[#57534E] max-w-sm mx-auto leading-relaxed">
                Your order for <strong>Table {placedOrder.tableNumber}</strong> has been received by the kitchen.
              </p>
            </div>

            {/* 5-minute modification window notice */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">5-Minute Order Modification Window Active</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  You can remove any mistakenly ordered items within the next 5 minutes directly from the order tracking section.
                </p>
              </div>
            </div>

            {/* Official Order Status Path Stepper */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left">
              <OrderStatusPath currentStatus={placedOrder.status} size="sm" />
            </div>

            {/* Confirmed Dishes Summary */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#F5EAD4] pb-2 text-[#78716C]">
                <span className="font-bold text-[#1C1917] uppercase tracking-wider text-[11px]">
                  Confirmed Dishes
                </span>
                <span className="font-semibold text-[11px]">Quantity</span>
              </div>

              <div className="space-y-2 text-xs">
                {placedOrder.orderItems?.map((oi: any, idx: number) => (
                  <div key={oi.id || idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 font-medium text-[#1C1917] min-w-0">
                      <span className="w-4 h-4 rounded-full bg-stone-100 text-[10px] font-bold text-stone-600 flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <DietaryIndicator isVeg={oi.isVeg} size="sm" />
                      <span className="truncate font-semibold">{oi.name}</span>
                    </div>
                    <div className="font-bold text-[#1C1917] bg-white border border-[#E5DFB0] px-2.5 py-0.5 rounded-lg text-xs flex-shrink-0 shadow-2xs">
                      Qty: {oi.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#F5EAD4] flex justify-between items-center text-xs font-bold text-[#1C1917]">
                <span>Total Ordered Items</span>
                <span className="text-[#E86326] text-sm font-black">
                  {placedOrder.orderItems?.reduce((a: number, b: any) => a + b.quantity, 0) || 0} Dishes
                </span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[#E86326] text-white text-xs font-bold shadow-sm hover:bg-[#D34F15] transition"
            >
              Back to Menu
            </button>
          </div>
        ) : cart.length === 0 ? (
          /* 2. EMPTY CART VIEW */
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-2xl">
              🛒
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">Your Cart is Empty</h3>
            <p className="text-xs text-[#78716C] max-w-xs mx-auto">
              Please browse the menu and tap &quot;+ Add&quot; on any dish you wish to order.
            </p>
            <button
              onClick={handleClose}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#E86326] text-white text-xs font-semibold hover:bg-[#D34F15] transition"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          /* 3. ORDER CONFIRMATION DIALOG (Clear summary, distinct Confirm and Go Back, no aggressive styling) */
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
            {/* Controller Permission Warning if user is guest */}
            {!isController && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-start gap-2 shadow-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Guest View Mode:</strong> You are viewing Table {resolvedTable}. Only the primary customer who first scanned the table QR can submit or modify orders.
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-2xl text-red-700 text-xs flex items-start gap-2 shadow-sm animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Order Error:</strong> {errorMessage}
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-500 font-bold ml-1 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            )}

            {/* Confirmation Banner */}
            <div className="p-4 bg-[#FFF7ED] rounded-2xl border border-[#FED7AA] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E86326]" />
                <h3 className="text-sm font-black text-[#1C1917]">
                  Please Confirm Your Order
                </h3>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Review your items for <strong>{tableNumber ? tableName || `Table ${tableNumber}` : `Table ${resolvedTable}`}</strong> before submitting to the kitchen.
              </p>
            </div>

            {/* Order Items Summary */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#F5EAD4] pb-2 text-[#78716C]">
                <span className="font-bold text-[#1C1917] uppercase tracking-wider text-[11px]">
                  Ordered Dishes ({totalCount} items)
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditItems(!showEditItems)}
                  className="text-[11px] font-bold text-[#E86326] hover:underline"
                >
                  {showEditItems ? 'Done Editing' : 'Edit Items'}
                </button>
              </div>

              {/* Numbered Item List with Quantities (No Individual Prices) */}
              <div className="space-y-2.5 text-xs">
                {cart.map(({ item, quantity }, idx) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-4 h-4 rounded-full bg-[#E86326]/10 text-[#E86326] font-black text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <DietaryIndicator isVeg={item.isVeg} size="sm" />
                      <span className="font-bold text-[#1C1917] truncate">{item.name}</span>
                    </div>

                    {showEditItems ? (
                      <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-[#E5E5DE]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="w-5 h-5 rounded bg-[#FAFAF8] text-[#1C1917] flex items-center justify-center hover:bg-[#F2F2ED]"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-4 text-center font-bold text-xs">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="w-5 h-5 rounded bg-[#FAFAF8] text-[#1C1917] flex items-center justify-center hover:bg-[#F2F2ED]"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-[#1C1917] bg-white border border-[#E5DFB0] px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
                        Qty: {quantity}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              <div className="pt-2 border-t border-[#F5EAD4]">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#57534E] mb-1">
                  <MessageSquare className="w-3 h-3 text-[#E86326]" />
                  <span>Cooking Requests / Dietary Notes:</span>
                </div>
                <input
                  type="text"
                  value={cookingNotes}
                  onChange={(e) => setCookingNotes(e.target.value)}
                  placeholder="e.g. Less spicy, no coriander, extra napkins..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E5DFB0] rounded-xl text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326]"
                />
              </div>

              {/* Order Count Summary (No Prices, No Grand Total Money) */}
              <div className="pt-2 border-t border-[#F5EAD4] space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-sm font-black text-[#1C1917] pt-1">
                  <span>Total Order Count</span>
                  <span className="text-[#E86326] text-base font-black">
                    {totalCount} {totalCount === 1 ? 'Dish' : 'Dishes'}
                  </span>
                </div>
                <div className="flex justify-between text-[#78716C] text-[11px]">
                  <span>Total Unique Items</span>
                  <span className="font-bold text-[#1C1917]">{cart.length}</span>
                </div>
              </div>
            </div>

            {/* 5-Minute Window Active Callout if user already has an active order */}
            {canAddToExistingOrder && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <strong className="font-bold text-amber-950">
                      5-Min Modification Window Active!
                    </strong>
                    <span className="font-mono font-bold bg-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">
                      Order #{activeOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    You can add these {totalCount} {totalCount === 1 ? 'dish' : 'dishes'} directly to your active order without placing a separate order.
                  </p>
                </div>
              </div>
            )}

            {/* Distinct Action Buttons: Confirm / Add to Order and Go Back */}
            <div className="pt-2 space-y-2">
              {canAddToExistingOrder ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddToExistingOrder}
                    disabled={isSubmitting || !isController}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Adding Items to Order #{activeOrder.orderNumber}...</span>
                      </div>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>
                          Add to Current Order #{activeOrder.orderNumber} ({totalCount}{' '}
                          {totalCount === 1 ? 'Item' : 'Items'})
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || !isController}
                    className="w-full py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold transition"
                  >
                    Place as Separate New Order instead
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting || !isController}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Order to Kitchen...</span>
                    </div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Order ({totalCount} {totalCount === 1 ? 'Item' : 'Items'})</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#FAFAF8] border border-[#E5E5DE] text-xs font-bold text-[#57534E] transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back to Menu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
