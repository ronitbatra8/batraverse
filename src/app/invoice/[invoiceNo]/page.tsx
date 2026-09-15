"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { API, adminHeaders } from "@/app/admin/components/types";
import { getAuth } from "@/lib/authStorage";
import { formatPrice } from "@/lib/utils";

type BillData = {
  invoiceNo: string;
  storeName: string;
  order: {
    orderId: string;
    orderDate: string;
    source: string;
    status: string;
    totalAmount: number;
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
  };
  items: {
    idx: number;
    name: string;
    sku: string;
    qty: number;
    color: string | null;
    size: string | null;
    unitPrice: number;
    discount: number;
    amount: number;
  }[];
  summary: {
    itemsTotal: number;
    discountAmount: number;
    shippingAmount: number;
    grandTotal: number;
    qtyCount: number;
    itemCount: number;
  };
  payment: { method: string; status: string; amountPaid: number };
};

const label = "text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function InvoicePage() {
  const params = useParams<{ invoiceNo: string }>();
  const [bill, setBill] = useState<BillData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const adminKey = getAuth("bt-admin-key") || "";
        const res = await fetch(`${API}/api/admin/bills/${params.invoiceNo}`, { headers: adminHeaders(adminKey) });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data?.error || "Invoice not found");
        if (alive) setBill(data);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load invoice");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.invoiceNo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <p className="text-sm">Loading invoice…</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-600">
        <p className="text-base font-semibold">{error || "Invoice not found"}</p>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  const o = bill.order;

  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-neutral-300 print:hidden">
        <div className="max-w-[820px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-sm font-semibold text-neutral-800">{bill.invoiceNo}</div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-neutral-800"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Bill sheet */}
      <div className="max-w-[820px] mx-auto my-6 print:my-0 px-4 print:px-0">
        <div
          className="bg-white text-neutral-900 shadow-lg print:shadow-none"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
          {/* Header band */}
          <div className="bg-neutral-900 text-white px-10 py-8 flex items-end justify-between">
            <div>
              <div className="text-3xl font-extrabold tracking-widest">BATRAVERSE</div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-400 mt-1">{bill.storeName}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">INVOICE</div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Product Purchase</div>
            </div>
          </div>

          {/* Meta box */}
          <div className="grid grid-cols-3 gap-6 px-10 py-6 border-b border-neutral-200 bg-neutral-50">
            <div>
              <div className={label}>Invoice No.</div>
              <div className="text-sm font-bold tracking-wide">{bill.invoiceNo}</div>
            </div>
            <div>
              <div className={label}>Order ID</div>
              <div className="text-sm font-semibold">#{o.orderId}</div>
            </div>
            <div>
              <div className={label}>Order Date</div>
              <div className="text-sm font-semibold">{fmtDate(o.orderDate)}</div>
            </div>
          </div>

          {/* Sold by / Bill to */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-10 py-6">
            <div>
              <div className={label}>Sold By</div>
              <div className="text-base font-bold">{bill.storeName}</div>
            </div>
            <div>
              <div className={label}>Bill To</div>
              <div className="text-sm font-semibold">{o.shippingName}</div>
              <div className="text-sm text-neutral-600 mt-1 leading-relaxed">
                {o.shippingAddress}
                <br />
                {[o.shippingCity, o.shippingState].filter(Boolean).join(", ")} - {o.shippingPincode}
                <br />
                Phone: {o.shippingPhone}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="px-10">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white text-left">
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold w-8">#</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Product</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">SKU</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-right">Qty</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-right">Unit Price</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-right">Discount</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((it) => (
                  <tr key={it.idx} className="border-b border-neutral-200">
                    <td className="px-3 py-2.5 text-neutral-500">{it.idx}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {it.name}
                      {it.color && <span className="text-neutral-500 text-xs"> · {it.color}</span>}
                      {it.size && <span className="text-neutral-500 text-xs"> · Size {it.size}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-600 text-xs">{it.sku}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{it.qty}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(it.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(it.discount)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatPrice(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + payments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-10 py-8">
            <div className="space-y-4">
              <div className="border border-neutral-300 rounded-lg">
                <div className="px-4 py-2 bg-neutral-100 text-[11px] font-bold uppercase tracking-widest text-neutral-600 border-b border-neutral-300">
                  Payment
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Method</span>
                    <span className="font-semibold text-right">{bill.payment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <span className={`font-semibold ${bill.payment.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                      {bill.payment.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Amount Paid</span>
                    <span className="font-semibold tabular-nums">{formatPrice(bill.payment.amountPaid)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-neutral-300 rounded-lg">
                <div className="px-4 py-2 bg-neutral-100 text-[11px] font-bold uppercase tracking-widest text-neutral-600 border-b border-neutral-300">
                  Order Details
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Items</span>
                    <span className="font-semibold">{bill.summary.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Quantity</span>
                    <span className="font-semibold">{bill.summary.qtyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Amount Due</span>
                    <span className="font-semibold tabular-nums">{formatPrice(Math.max(0, bill.order.totalAmount - bill.payment.amountPaid))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-neutral-300 rounded-lg self-start w-full">
              <div className="px-4 py-2 bg-neutral-100 text-[11px] font-bold uppercase tracking-widest text-neutral-600 border-b border-neutral-300">
                Bill Summary
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Items Total</span>
                  <span className="font-medium tabular-nums">{formatPrice(bill.summary.itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Discount</span>
                  <span className="font-medium tabular-nums">- {formatPrice(bill.summary.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Shipping</span>
                  <span className="font-medium tabular-nums">{formatPrice(bill.summary.shippingAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-300 pt-2.5 mt-2.5">
                  <span className="text-base font-bold">Total Amount</span>
                  <span className="text-lg font-extrabold tabular-nums">{formatPrice(bill.summary.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-neutral-900 text-white px-10 py-6 flex items-center justify-between">
            <div className="text-lg font-extrabold tracking-widest">BATRAVERSE</div>
            <div className="text-[12px] uppercase tracking-[0.3em] text-neutral-300">Thank you for your order.</div>
          </div>
        </div>
      </div>
    </div>
  );
}