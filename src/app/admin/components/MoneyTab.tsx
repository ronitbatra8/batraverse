/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, Percent, Truck, Zap, Layers, BadgeCheck, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { API, adminHeaders } from "./types";

const METHOD_LABELS: Record<string, string> = {
  CARD: "Card",
  UPI: "UPI",
  COD: "Cash on Delivery",
  NETBANKING: "Net Banking",
  WALLET: "Wallet",
  UNKNOWN: "Other",
};

export default function MoneyTab({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/admin/finance`, { headers: adminHeaders(adminKey) });
        const json = await res.json();
        if (!res.ok || json?.error) { setError(json?.error || "Failed to load finance data"); return; }
        if (!cancelled) setData(json);
      } catch { if (!cancelled) setError("Cannot connect to server"); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [adminKey]);

  if (loading) {
    return <div className="py-24 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-gold-500/40 border-t-gold-400 animate-spin" /></div>;
  }
  if (error) {
    return <div className="py-24 text-center"><p className="text-red-400 text-sm">{error}</p></div>;
  }
  if (!data) return null;

  const payouts = data.payouts || { paid: { amount: 0, count: 0 }, pending: { amount: 0, count: 0 } };
  const wallet = data.wallet || { approvedInflow: 0, refundsIssued: 0, outstandingBalance: 0 };

  const maxDay = Math.max(1, ...data.revenueByDay.map((d: any) => d.amount));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Gross Revenue", value: formatPrice(data.grossRevenue), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30", sub: "Delivered & paid" },
          { label: "Net Earnings", value: formatPrice(data.netEarnings), icon: BadgeCheck, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30", sub: "After seller payouts" },
          { label: "GST Collected", value: formatPrice(data.gstCollected), icon: Percent, color: "text-sky-400", bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30", sub: "On delivered orders" },
          { label: "Delivery + Express", value: formatPrice((data.deliveryFees || 0) + (data.expressFees || 0)), icon: Truck, color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30", sub: `${formatPrice(data.deliveryFees || 0)} + ${formatPrice(data.expressFees || 0)}` },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className={s.color} />
            </div>
            <p className="text-2xl font-display font-bold text-white">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs text-dark-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Last 14 Days Revenue</h3>
            <span className="text-xs text-dark-500">Delivered orders</span>
          </div>
          <div className="p-6 space-y-2">
            {data.revenueByDay.map((d: any) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-dark-400">{d.label}</span>
                <div className="flex-1 h-4 rounded bg-dark-800/60 overflow-hidden">
                  <div
                    className="h-full rounded bg-gradient-to-r from-gold-500/40 to-gold-400"
                    style={{ width: `${Math.max(2, Math.round((d.amount / maxDay) * 100))}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium text-white">{formatPrice(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-sky-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50">
            <h3 className="text-sm font-display font-bold text-white">Payment Split</h3>
          </div>
          <div className="divide-y divide-dark-800/30">
            {data.paymentMethods.map((p: any) => (
              <div key={p.method} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Layers size={14} className="text-sky-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{METHOD_LABELS[p.method] || p.method}</p>
                    <p className="text-xs text-dark-500">{p.count} delivered</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">{formatPrice(p.amount)}</p>
              </div>
            ))}
            {data.paymentMethods.length === 0 && (
              <div className="py-12 text-center"><p className="text-dark-500 text-sm">No delivered orders yet</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-emerald-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Wallet</h3>
            <Wallet size={16} className="text-emerald-400" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-dark-800/30">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center text-emerald-400 mb-1"><ArrowDownLeft size={14} /></div>
              <p className="text-sm font-display font-bold text-white">{formatPrice(wallet.approvedInflow)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Credited to buyers</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center text-amber-400 mb-1"><ArrowUpRight size={14} /></div>
              <p className="text-sm font-display font-bold text-white">{formatPrice(wallet.refundsIssued)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Refunds issued</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center text-sky-400 mb-1"><Wallet size={14} /></div>
              <p className="text-sm font-display font-bold text-white">{formatPrice(wallet.outstandingBalance)}</p>
              <p className="text-xs text-dark-500 mt-0.5">In buyer wallets</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Card Upgrades</h3>
            <BadgeCheck size={16} className="text-gold-400" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-dark-800/30">
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-white">{formatPrice(data.upgrades?.total || 0)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Upgrade income</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-white">{data.upgrades?.count || 0}</p>
              <p className="text-xs text-dark-500 mt-0.5">Approved upgrades</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-violet-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Seller Payouts</h3>
            <Store size={16} className="text-violet-400" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-dark-800/30">
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-emerald-400">{formatPrice(payouts.paid.amount)}</p>
              <p className="text-xs text-dark-500 mt-0.5">{payouts.paid.count} paid</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-amber-400">{formatPrice(payouts.pending.amount)}</p>
              <p className="text-xs text-dark-500 mt-0.5">{payouts.pending.count} pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}