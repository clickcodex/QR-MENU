'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';

export interface OrderReceiptData {
  orderNumber: number;
  tableNumber: string;
  tableName?: string | null;
  customerName?: string | null;
  notes?: string | null;
  createdAt: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currencySymbol?: string;
  orderItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    isVeg?: boolean;
    total: number;
  }>;
}

interface PrintableReceiptProps {
  order: OrderReceiptData;
  restaurantName: string;
  restaurantAddress?: string | null;
  restaurantPhone?: string | null;
  onClose: () => void;
}

export function PrintableReceipt({
  order,
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  onClose,
}: PrintableReceiptProps) {
  const currencySymbol = order.currencySymbol || '₹';

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-modal overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-[#FAFAF8] border-b border-[#EAEAE5] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#E86326]" />
            <span className="text-xs font-bold text-[#1C1917]">Print KOT / Bill Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#F2F2ED] text-[#78716C]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto no-scrollbar print:p-0 print:m-0" id="receipt-print-area">
          <div className="w-full max-w-[320px] mx-auto bg-white text-black font-mono text-xs space-y-3 p-4 border border-dashed border-[#D2D2C8] rounded-xl print:border-none print:p-0">
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-black/30 border-dashed">
              <h2 className="text-base font-black tracking-wider uppercase">{restaurantName}</h2>
              {restaurantAddress && (
                <p className="text-[11px] text-[#444] leading-tight">{restaurantAddress}</p>
              )}
              {restaurantPhone && (
                <p className="text-[11px] text-[#444]">Tel: {restaurantPhone}</p>
              )}
              <div className="pt-1 text-[10px] tracking-widest uppercase font-bold text-[#666]">
                *** RESTAURANT ORDER TICKET & BILL ***
              </div>
            </div>

            {/* Order & Table Meta */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-black/30 border-dashed">
              <div className="flex justify-between font-bold">
                <span>ORDER: #{order.orderNumber}</span>
                <span className="bg-black text-white px-1.5 py-0.5 rounded text-[10px]">
                  TABLE {order.tableNumber}
                </span>
              </div>
              <div className="flex justify-between text-[#555]">
                <span>Date: {formattedDate}</span>
                <span>{order.status}</span>
              </div>
              {order.customerName && (
                <div className="text-[#555]">Guest: {order.customerName}</div>
              )}
              {order.notes && (
                <div className="bg-[#FFFDF0] p-1 rounded border border-[#E5DFB0] text-[#713F12] text-[10px]">
                  <strong>NOTE:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 pb-3 border-b border-black/30 border-dashed">
              <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black/20">
                <span className="w-8">QTY</span>
                <span className="flex-1 text-left">ITEM</span>
                <span className="w-14 text-right">TOTAL</span>
              </div>

              {order.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[11px]">
                  <span className="w-8 font-bold">{item.quantity}x</span>
                  <span className="flex-1 text-left pr-2">{item.name}</span>
                  <span className="w-14 text-right font-semibold">
                    {currencySymbol}{item.total.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-black/30 border-dashed">
              <div className="flex justify-between text-[#555]">
                <span>Subtotal</span>
                <span>{currencySymbol}{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#555]">
                <span>GST (5%)</span>
                <span>{currencySymbol}{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-black/30 border-dashed">
                <span>GRAND TOTAL</span>
                <span>{currencySymbol}{order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 space-y-1 text-[10px] text-[#666]">
              <p>Thank you for dining with us!</p>
              <p>MOMO MENU System</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Print Button */}
        <div className="p-4 bg-[#FAFAF8] border-t border-[#EAEAE5] flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E5DE] text-xs font-semibold text-[#57534E] hover:bg-[#F2F2ED]"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-[#E86326] text-white text-xs font-bold hover:bg-[#D34F15] flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
