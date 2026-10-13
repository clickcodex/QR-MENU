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
  Sparkles,
  Check,
  UtensilsCrossed,
  AlertCircle,
  Clock,
  Flame,
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
  onOrderPlaced,
  activeOrder,
  onOpenActiveOrder,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [cookingNotes, setCookingNotes] = useState('');
  const [customTable, setCustomTable] = useState(tableNumber || '');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

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

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          tableNumber: resolvedTable,
          customerName: customerName.trim() || undefined,
          notes: cookingNotes.trim() || undefined,
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
      setIsConfirming(false);
      onClearCart();

      if (onOrderPlaced) {
        onOrderPlaced(data.order);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setErrorMessage(err.message || 'Could not place order. Please try again or notify staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewOrder = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
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
        <div className="px-5 py-4 border-b border-[#EAEAE5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#E86326] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917] leading-tight">
                {placedOrder
                  ? 'Live Order Tracking'
                  : isConfirming
                  ? 'Review Order'
                  : 'Table Order & Bill'}
              </h2>
              <p className="text-xs text-[#78716C]">
                {tableNumber ? tableName || `Table ${tableNumber}` : resolvedTable !== 'Takeaway' ? `Table ${resolvedTable}` : 'Dine-in Order'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C] transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ORDER SUCCESS & LIVE STATUS TRACKER (Inside Drawer) */}
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
                Order Placed Successfully!
              </h3>
              <p className="text-xs text-[#57534E] max-w-sm mx-auto leading-relaxed">
                Your order for <strong>Table {placedOrder.tableNumber}</strong> has been received by the restaurant.
              </p>
            </div>

            {/* Official Order Status Path Breadcrumb Stepper */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left">
              <OrderStatusPath currentStatus={placedOrder.status} size="sm" />
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#F5EAD4] pb-2 text-[#78716C]">
                <span>Confirmed Dishes</span>
                <span>Qty x Price</span>
              </div>

              <div className="space-y-2 text-xs">
                {placedOrder.orderItems?.map((oi: any) => (
                  <div key={oi.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-[#1C1917]">
                      <DietaryIndicator isVeg={oi.isVeg} size="sm" />
                      <span>{oi.name}</span>
                    </div>
                    <div className="font-semibold text-[#57534E]">
                      {oi.quantity} × {currencySymbol}{oi.price} = {currencySymbol}{oi.total}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#F5EAD4] space-y-1 text-xs">
                <div className="flex justify-between text-[#78716C]">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{placedOrder.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>GST (5%)</span>
                  <span>{currencySymbol}{placedOrder.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#1C1917] pt-1 border-t border-[#F5EAD4]">
                  <span>Grand Total Bill</span>
                  <span className="text-[#E86326]">
                    {currencySymbol}{placedOrder.total?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleResetForNewOrder}
                className="w-full py-3.5 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition shadow-hover"
              >
                Browse Menu & Add More Dishes
              </button>
            </div>
          </div>
        ) : cart.length === 0 ? (
          /* 2. EMPTY CART SCREEN (Shows Active Order if one exists!) */
          <div className="p-8 text-center space-y-4">
            {activeOrder && activeOrder.status !== 'COMPLETED' ? (
              <div className="space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#E86326] flex items-center justify-center shadow-subtle">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF7ED] border border-[#FED7AA] text-[#E86326]">
                    Active Table {activeOrder.tableNumber} • Order #{activeOrder.orderNumber}
                  </span>
                  <h3 className="text-base font-black text-[#1C1917] mt-2">
                    Live Order in Progress ({activeOrder.status})
                  </h3>
                  <p className="text-xs text-[#78716C] mt-1 max-w-xs mx-auto">
                    Your order is currently being prepared. Tap below to track real-time status.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenActiveOrder) onOpenActiveOrder();
                    }}
                    className="w-full py-3 rounded-xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Track Live Order #{activeOrder.orderNumber}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF8] transition"
                  >
                    Add More Dishes to Cart
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FAFAF8] border border-[#E5E5DE] flex items-center justify-center text-2xl">
                  🛒
                </div>
                <h3 className="text-base font-bold text-[#1C1917]">Your Cart is Empty</h3>
                <p className="text-xs text-[#78716C] max-w-xs mx-auto">
                  Explore the menu and tap &quot;+ Add&quot; on any dish you wish to order.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#E86326] text-white text-xs font-semibold hover:bg-[#D34F15] transition"
                >
                  Browse Menu
                </button>
              </div>
            )}
          </div>
        ) : isConfirming ? (
          /* 3. ORDER CONFIRMATION SCREEN ("This is your order and click on confirm to place order") */
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
            {/* Error Message if API fails */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-2xl text-red-700 text-xs flex items-start gap-2 shadow-sm animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Order Error:</strong> {errorMessage}
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-1">
                  ×
                </button>
              </div>
            )}

            {/* Confirmation Banner */}
            <div className="p-4 bg-[#FFF7ED] rounded-2xl border-2 border-[#E86326] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E86326] animate-ping" />
                <h3 className="text-sm font-black text-[#1C1917]">
                  Review & Confirm Your Order
                </h3>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                This is your order for <strong>{tableNumber ? tableName || `Table ${tableNumber}` : resolvedTable !== 'Takeaway' ? `Table ${resolvedTable}` : 'Dine-in'}</strong>. Please review all dishes and bill below, and <strong>click on confirm to place order</strong>.
              </p>
            </div>

            {/* "This is your order" Details Container */}
            <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#F5EAD4] pb-2 text-[#78716C]">
                <span className="font-bold text-[#1C1917] uppercase tracking-wider text-[11px]">
                  This is your order ({totalCount} items)
                </span>
                <span>Qty × Price</span>
              </div>

              <div className="space-y-2 text-xs">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
                      <DietaryIndicator isVeg={item.isVeg} size="sm" />
                      <span>{item.name}</span>
                    </div>
                    <div className="font-semibold text-[#57534E]">
                      {quantity} × {currencySymbol}{item.price} = {currencySymbol}
                      {(item.price * quantity).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>

              {cookingNotes && (
                <div className="p-2.5 rounded-xl bg-[#FFFDF0] border border-[#E5DFB0] text-xs text-[#713F12]">
                  <strong>Special Instructions:</strong> {cookingNotes}
                </div>
              )}

              {/* Bill Breakdown */}
              <div className="pt-2 border-t border-[#F5EAD4] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#78716C]">
                  <span>Item Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Restaurant GST (5%)</span>
                  <span>{currencySymbol}{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#1C1917] pt-2 border-t border-[#F5EAD4]">
                  <span>Grand Total Bill</span>
                  <span className="text-[#E86326]">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Status Path Preview */}
            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#EAEAE5]">
              <OrderStatusPath currentStatus="PENDING" size="sm" />
            </div>

            {/* Action Buttons: Edit or Confirm to Place Order */}
            <div className="pt-2 space-y-2.5">
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full py-4 px-4 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-hover disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Confirm Order ({currencySymbol}{grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2ED] border border-[#E5E5DE] text-xs font-bold text-[#57534E] transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Dishes & Quantities</span>
              </button>
            </div>
          </div>
        ) : (
          /* 4. ACTIVE CART EDITING SCREEN */
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
            {/* Table Identification or Selector */}
            <div className="p-3 bg-[#FFFDF8] rounded-xl border border-[#FED7AA] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-[#1C1917]">
                  {tableNumber
                    ? tableName || `Table ${tableNumber}`
                    : resolvedTable !== 'Takeaway'
                    ? `Table ${resolvedTable}`
                    : 'Dine-in Order'}
                </span>
              </div>

              {!tableNumber && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#78716C] text-[11px] font-medium">Table #:</span>
                  <input
                    type="text"
                    value={customTable}
                    onChange={(e) => setCustomTable(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-16 px-2 py-1 border border-[#FED7AA] rounded-lg text-xs font-bold text-center bg-white focus:outline-none focus:border-[#E86326]"
                  />
                </div>
              )}
            </div>

            {/* If there is already an active order for this table, show reminder banner */}
            {activeOrder && activeOrder.status !== 'COMPLETED' && (
              <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E86326] animate-ping" />
                  <span className="text-[#9A3412] font-semibold">
                    Order #{activeOrder.orderNumber} is currently {activeOrder.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenActiveOrder) onOpenActiveOrder();
                  }}
                  className="text-[#E86326] font-bold underline text-[11px]"
                >
                  Track Live
                </button>
              </div>
            )}

            {/* List of Ordered Dishes */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                Selected Dishes ({totalCount})
              </span>

              {cart.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-2xl border border-[#EAEAE5] flex items-center justify-between gap-3 shadow-subtle"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <DietaryIndicator isVeg={item.isVeg} size="sm" />
                      <span className="font-bold text-xs text-[#1C1917] truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#78716C] mt-0.5">
                      {currencySymbol}{item.price} each
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-[#FAFAF8] p-1 rounded-xl border border-[#E5E5DE]">
                    <button
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#E5E5DE] text-[#1C1917] flex items-center justify-center hover:bg-[#F2F2ED]"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-[#1C1917]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#E5E5DE] text-[#1C1917] flex items-center justify-center hover:bg-[#F2F2ED]"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[50px]">
                    <div className="text-xs font-black text-[#1C1917]">
                      {currencySymbol}{(item.price * quantity).toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Special Requests */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#57534E] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#E86326]" />
                <span>Special Instructions (Optional)</span>
              </label>
              <input
                type="text"
                value={cookingNotes}
                onChange={(e) => setCookingNotes(e.target.value)}
                placeholder="e.g. Less spicy, extra onions, bring drinks first..."
                className="w-full px-3 py-2 bg-white border border-[#E5E5DE] rounded-xl text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#E86326]"
              />
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-4 bg-[#FAFAF8] rounded-2xl border border-[#EAEAE5] space-y-2">
              <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider block">
                Bill Summary
              </span>
              <div className="flex justify-between text-xs text-[#57534E]">
                <span>Item Subtotal ({totalCount} items)</span>
                <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#57534E]">
                <span>Restaurant GST (5%)</span>
                <span className="font-medium">{currencySymbol}{gst.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#EAEAE5] flex justify-between items-baseline text-sm font-black text-[#1C1917]">
                <span>Total Bill Amount</span>
                <span className="text-base text-[#E86326]">
                  {currencySymbol}{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Proceed to Confirmation Button */}
            <div className="pt-2">
              <button
                onClick={() => setIsConfirming(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-hover"
              >
                <span>Review Order ({currencySymbol}{grandTotal.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-center text-[#78716C] mt-2">
                Review your dishes before confirming your order.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
