'use client';

import React from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  Clock,
  Flame,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { OrderStatusPath, OrderStatus } from '../common/OrderStatusPath';
import { DietaryIndicator } from './DietaryIndicator';

export interface ActiveOrderData {
  id: string;
  orderNumber: number;
  tableNumber: string;
  customerName?: string | null;
  notes?: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  currencySymbol?: string;
  orderItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    isVeg: boolean;
    total: number;
  }>;
  createdAt: string;
}

interface LiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ActiveOrderData | null;
  currencySymbol?: string;
  onOrderMoreDishes?: () => void;
  onClearOrder?: () => void;
}

export function LiveOrderModal({
  isOpen,
  onClose,
  order,
  currencySymbol = '₹',
  onOrderMoreDishes,
  onClearOrder,
}: LiveOrderModalProps) {
  if (!isOpen || !order) return null;

  const isPending = order.status === 'PENDING';
  const isAccepted = order.status === 'ACCEPTED';
  const isPreparing = order.status === 'PREPARING';
  const isReady = order.status === 'READY';
  const isServed = order.status === 'SERVED';
  const isCompleted = order.status === 'COMPLETED';

  // Status banner copy
  const getStatusDetails = () => {
    switch (order.status) {
      case 'PENDING':
        return {
          title: 'Order Placed Successfully',
          badgeText: 'Awaiting Acceptance',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          desc: 'Your order was received by the restaurant. Staff is reviewing it now.',
          icon: Clock,
          iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
        };
      case 'ACCEPTED':
        return {
          title: 'Order Accepted',
          badgeText: 'Accepted & Preparing',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
          desc: 'The restaurant accepted your order. Your dishes are being prepared.',
          icon: CheckCircle2,
          iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
        };
      case 'PREPARING':
        return {
          title: 'Preparing Your Food',
          badgeText: 'Dishes Cooking',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
          desc: 'Your dishes are being prepared right now.',
          icon: Flame,
          iconColor: 'text-orange-600 bg-orange-50 border-orange-200',
        };
      case 'READY':
        return {
          title: 'Food Plated & Ready',
          badgeText: 'Ready to Serve',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
          desc: 'Your dishes are freshly prepared and being served to your table now.',
          icon: UtensilsCrossed,
          iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
        };
      case 'DELIVERED':
      case 'SERVED':
        return {
          title: 'Delivered to Your Table',
          badgeText: 'Delivered ✓ Enjoy Your Meal',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          desc: 'All dishes have been delivered to Table ' + order.tableNumber + '. Enjoy your meal!',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        };
      case 'COMPLETED':
        return {
          title: 'Order Completed',
          badgeText: 'Completed ✓',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
          desc: 'This table order has been completed. Thank you for dining with us!',
          icon: ShieldCheck,
          iconColor: 'text-slate-600 bg-slate-50 border-slate-200',
        };
      default:
        return {
          title: 'Active Order',
          badgeText: order.status,
          badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
          desc: 'Tracking your table order status in real time.',
          icon: Clock,
          iconColor: 'text-stone-600 bg-stone-50 border-stone-200',
        };
    }
  };

  const details = getStatusDetails();
  const StatusIcon = details.icon;

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

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#EAEAE5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#E86326] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1C1917] leading-tight">
                  Live Order Tracker
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FAFAF8] border border-[#E5E5DE] text-[#78716C]">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-[#78716C]">
                Table {order.tableNumber} • Real-time order updates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F4F4F0] text-[#78716C] transition"
            aria-label="Close tracking"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-5 text-center">
          {/* Main Status Hero */}
          <div className="space-y-3">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center shadow-subtle ${details.iconColor}`}
            >
              <StatusIcon className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${details.badgeClass}`}
              >
                {details.badgeText}
              </span>
              <h3 className="text-xl font-black text-[#1C1917] tracking-tight">
                {details.title}
              </h3>
              <p className="text-xs text-[#57534E] max-w-sm mx-auto leading-relaxed">
                {details.desc}
              </p>
            </div>
          </div>

          {/* Official Order Status Path Breadcrumb Stepper */}
          <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left">
            <OrderStatusPath currentStatus={order.status} size="sm" />
          </div>

          {/* Itemized Receipt Breakdown */}
          <div className="bg-[#FFFDF8] rounded-2xl p-4 border border-[#F5EAD4] text-left space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#F5EAD4] pb-2 text-[#78716C]">
              <span className="font-bold text-[#1C1917] uppercase tracking-wider text-[11px]">
                Ordered Dishes ({order.orderItems?.reduce((a, b) => a + b.quantity, 0) || 0})
              </span>
              <span>Qty × Price</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#F5EAD4]/50">
              {order.orderItems?.map((oi) => (
                <div key={oi.id} className="pt-2 first:pt-0 flex items-center justify-between">
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

            {order.notes && (
              <div className="p-2.5 rounded-xl bg-[#FFFDF0] border border-[#E5DFB0] text-xs text-[#713F12]">
                <strong>Special Note:</strong> {order.notes}
              </div>
            )}

            {/* Bill Summary */}
            <div className="pt-2 border-t border-[#F5EAD4] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#78716C]">
                <span>Item Subtotal</span>
                <span>{currencySymbol}{order.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#78716C]">
                <span>Restaurant GST (5%)</span>
                <span>{currencySymbol}{order.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#1C1917] pt-2 border-t border-[#F5EAD4]">
                <span>Total Bill</span>
                <span className="text-[#E86326]">
                  {currencySymbol}{order.total?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onClose();
                if (onOrderMoreDishes) onOrderMoreDishes();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E86326] hover:bg-[#D34F15] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-hover"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Menu & Add More Dishes</span>
            </button>

            {(isServed || isCompleted) && onClearOrder && (
              <button
                onClick={onClearOrder}
                className="w-full py-2.5 text-xs text-[#78716C] hover:text-[#1C1917] font-semibold transition"
              >
                Clear Completed Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
