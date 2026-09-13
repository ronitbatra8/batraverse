/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, Percent, Truck, Zap, Layers, BadgeCheck, Store, RefreshCw, CreditCard, Undo2 } from "lucide-react";
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

const WALLET_METHOD_LABELS: Record<string, string> = {
  UPI_DELIVERY: "UPI (Delivery)",
  UPI: "UPI",
  COD: "COD",
  RAZORPAY: "Razorpay",
  REFUND: "Refund",
  ORDER: "Order spend",
  MANUAL: "Manual credit",
  MANUAL_DEBIT: "Manual debit",
};

function walletMethodLbl(m: string | null): string {
  if (!m) return "Legacy UPI";
  return WALLET_METHOD_LABELS[m] || m;
}

function levelLbl(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function upgradeStatusClass(s: string): string {
  if (s === "APPROVED") return "text-emerald-400 border-emerald-500/30";
  if (s === "REJECTED") return "text-red-400 border-red-500/30";
  return "text-amber-400 border-amber-500/30";
}

function payoutStatusClass(s: string): string {
  if (s === "paid") return "text-emerald-400 border-emerald-500/30";
  if (s === "voided") return "text-dark-400 border-dark-600/40";
  return "text-amber-400 border-amber-500/30";
}

function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function RevenueChart({ days }: { days: { date: string; amount: number; label: string }[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 720;
  const H = 280;
  const PL = 56;
  const PR = 14;
  const PT = 18;
  const PB = 30;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const n = days.length;
  const rawMax = Math.max(1, ...days.map((d) => d.amount));
  const niceMax = rawMax * 1.12;
  const x = (i: number) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PT + (1 - v / niceMax) * plotH;

  if (n === 0) {
    return <div className="py-10 text-center text-sm text-dark-500">No revenue data yet</div>;
  }

  const linePath = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.amount)}`).join(" ");
  const areaPath = `${linePath} L${x(n - 1)},${PT + plotH} L${x(0)},${PT + plotH} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const handleMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHovering(true);
    setIdx(Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1)))));
  };

  const active = idx != null ? days[idx] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMove}
        onMouseLeave={() => { setHovering(false); setIdx(null); }}
      >
        <defs>
          <linearGradient id="moneyAreaGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6cc5e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e6cc5e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((f) => {
          const gy = PT + (1 - f) * plotH;
          return (
            <g key={f}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={PL - 8} y={gy + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">
                ₹{fmtMoney(niceMax * f)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#moneyAreaGold)" />
        <path d={linePath} fill="none" stroke="#e6cc5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {days.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={y(d.amount)} r={idx === i && hovering ? 4 : 2.5} fill={idx === i && hovering ? "#e6cc5e" : "rgba(230,204,94,0.6)"} />
        ))}

        {days.filter((_, i) => i % 2 === 0).map((d, k) => (
          <text key={d.date} x={x(k * 2)} y={H - PB + 18} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">
            {d.label}
          </text>
        ))}

        {active && hovering && (
          <g>
            <line x1={x(idx!)} y1={PT} x2={x(idx!)} y2={PT + plotH} stroke="rgba(230,204,94,0.35)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(idx!)} cy={y(active.amount)} r={5} fill="#0a0a0f" stroke="#e6cc5e" strokeWidth="2" />
          </g>
        )}
      </svg>

      {active && hovering && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[110%] bg-dark-950/95 border border-gold-500/30 rounded-xl px-3 py-2 shadow-xl"
          style={{ left: `${(x(idx!) / W) * 100}%`, top: `${(y(active.amount) / H) * 100}%` }}
        >
          <p className="text-[10px] text-dark-400">{active.label}</p>
          <p className="text-xs font-bold text-gold-400">{formatPrice(active.amount)}</p>
        </div>
      )}
    </div>
  );
}

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
  const wallet = data.wallet || { approvedInflow: 0, topupCount: 0, refundsIssued: 0, refundCount: 0, outstandingBalance: 0 };

  const maxDay = Math.max(1, ...data.revenueByDay.map((d: any) => d.amount));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: "Gross Revenue", value: formatPrice(data.grossRevenue), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30", sub: "Delivered sales" },
          { label: "Net Earnings", value: formatPrice(data.netEarnings), icon: BadgeCheck, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30", sub: "Minus GST, shipping, RZ fees, delivery & payouts" },
          { label: "GST Collected", value: formatPrice(data.gstCollected), icon: Percent, color: "text-sky-400", bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30", sub: "On delivered orders" },
          { label: "Shipping", value: formatPrice(data.shippingFees || 0), icon: Truck, color: "text-teal-400", bg: "from-teal-500/20 to-teal-500/10", border: "border-teal-500/30", sub: `${data.shippingCount || 0} shipped × ₹60` },
          { label: "Delivery + Express", value: formatPrice((data.deliveryFees || 0) + (data.expressFees || 0)), icon: Zap, color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30", sub: `${formatPrice(data.deliveryFees || 0)} + ${formatPrice(data.expressFees || 0)}` },
          { label: "Returns", value: formatPrice(data.returnsTotal || 0), icon: RefreshCw, color: "text-rose-400", bg: "from-rose-500/20 to-rose-500/10", border: "border-rose-500/30", sub: `${data.returnedItemCount || 0} items returned` },
          { label: "Razorpay Fees", value: formatPrice(data.razorpayFees || 0), icon: CreditCard, color: "text-blue-400", bg: "from-blue-500/20 to-blue-500/10", border: "border-blue-500/30", sub: `2% +18% GST on ${formatPrice(data.razorpayPaid || 0)}` },
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

      {/* Full-width revenue chart between the top cards and the detail panels */}
      <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl">
        <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-white">Revenue Trend</h3>
          <span className="text-xs text-dark-500">Last 14 days · delivered orders</span>
        </div>
        <div className="p-4 sm:p-5">
          <RevenueChart days={data.revenueByDay} />
        </div>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-emerald-400/50 border-dark-800/50 rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Wallet</h3>
            <span className="text-xs text-dark-500">Everything in and out of buyer wallets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 divide-dark-800/30 sm:divide-x">
            <div className="p-5 text-center">
              <div className="flex items-center justify-center text-emerald-400 mb-1.5"><ArrowDownLeft size={16} /></div>
              <p className="text-lg font-display font-bold text-white">{formatPrice(wallet.creditsTotal)}</p>
              <p className="text-xs text-dark-400 mt-0.5">All credits in</p>
              <p className="text-[10px] text-dark-600 mt-0.5">topups · manual· refunds · upgrades</p>
            </div>
            <div className="p-5 text-center">
              <div className="flex items-center justify-center text-rose-400 mb-1.5"><ArrowUpRight size={16} /></div>
              <p className="text-lg font-display font-bold text-white">{formatPrice(wallet.debitTotal)}</p>
              <p className="text-xs text-dark-400 mt-0.5">All debits out</p>
              <p className="text-[10px] text-dark-600 mt-0.5">order spends · manual debits</p>
            </div>
            <div className="p-5 text-center">
              <div className="flex items-center justify-center text-amber-400 mb-1.5"><Undo2 size={16} /></div>
              <p className="text-lg font-display font-bold text-white">{formatPrice(wallet.refundsIssued)}</p>
              <p className="text-xs text-dark-400 mt-0.5">Refunds issued</p>
              <p className="text-[10px] text-dark-600 mt-0.5">{wallet.refundCount} refunds</p>
            </div>
            <div className="p-5 text-center">
              <div className="flex items-center justify-center text-sky-400 mb-1.5"><Wallet size={16} /></div>
              <p className="text-lg font-display font-bold text-white">{formatPrice(wallet.outstandingBalance)}</p>
              <p className="text-xs text-dark-400 mt-0.5">Currently in buyer wallets</p>
              <p className="text-[10px] text-dark-600 mt-0.5">Net flow: {formatPrice(wallet.creditsTotal - wallet.debitTotal)}</p>
            </div>
          </div>

          <div className="border-t border-dark-800/30 grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dark-800/30">
            <div className="p-5">
              <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-3">Credits in by method</p>
              {(wallet.credits || []).length > 0 ? (
                <div className="divide-y divide-dark-800/30">
                  {(wallet.credits as any[]).map((m) => (
                    <div key={m.method} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{walletMethodLbl(m.method)}</p>
                        <p className="text-[10px] text-dark-600">{m.count} entries</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-400 shrink-0">{formatPrice(m.amount)}</p>
                    </div>
                  ))}
                  <div className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white">Card Upgrades</p>
                      <p className="text-[10px] text-dark-600">{wallet.cardUpgradeCount} upgrades</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 shrink-0">{formatPrice(wallet.cardUpgradeTotal)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-dark-600">No credits yet</p>
              )}
            </div>

            <div className="p-5">
              <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-3">Debits out by method</p>
              {(wallet.debits || []).length > 0 ? (
                <div className="divide-y divide-dark-800/30">
                  {(wallet.debits as any[]).map((m) => (
                    <div key={m.method} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{walletMethodLbl(m.method)}</p>
                        <p className="text-[10px] text-dark-600">{m.count} entries</p>
                      </div>
                      <p className="text-sm font-semibold text-rose-400 shrink-0">−{formatPrice(m.amount)}</p>
                    </div>
                  ))}
                  <div className="py-2 flex items-center justify-between gap-3 border-t border-dark-800/30">
                    <div className="min-w-0">
                      <p className="text-sm text-dark-400">Total debits</p>
                    </div>
                    <p className="text-sm font-semibold text-rose-400 shrink-0">−{formatPrice(wallet.debitTotal)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-dark-600">No debits yet</p>
              )}
            </div>

            <div className="p-5">
              <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-3">Recent wallet activity</p>
              {(wallet.recent || []).length > 0 ? (
                <div className="space-y-2.5">
                  {(wallet.recent as any[]).map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {t.user?.name || "User"}
                          {t.adminNote ? <span className="text-dark-500"> · {t.adminNote}</span> : null}
                        </p>
                        <p className="text-[10px] text-dark-600">{t.paymentMethod ? walletMethodLbl(t.paymentMethod) : t.amount >= 0 ? "Owner credit" : "Owner debit"} · {shortDate(t.createdAt)}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.amount >= 0 ? "+" : ""}{formatPrice(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-dark-600">No wallet activity yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Card Upgrades</h3>
            <BadgeCheck size={16} className="text-gold-400" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-dark-800/30">
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-emerald-400">{formatPrice(data.upgrades?.total || 0)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Approved income</p>
              <p className="text-[10px] text-dark-600 mt-0.5">{data.upgrades?.count || 0} upgrades</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-amber-400">{formatPrice(data.upgrades?.pending || 0)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Pending requests</p>
              <p className="text-[10px] text-dark-600 mt-0.5">{data.upgrades?.pendingCount || 0} awaiting decision</p>
            </div>
          </div>
          <div className="border-t border-dark-800/30 p-5">
            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-3">Recent requests</p>
            {(data.upgrades?.recent || []).length > 0 ? (
              <div className="space-y-2.5">
                {(data.upgrades.recent as any[]).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {levelLbl(u.fromLevel)} → {levelLbl(u.toLevel)}
                        <span className="text-dark-500"> · {u.user?.name || "User"}</span>
                      </p>
                      <p className="text-[10px] text-dark-600">{shortDate(u.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${upgradeStatusClass(u.status)}`}>{u.status}</span>
                      <p className="text-sm font-semibold text-white">{formatPrice(u.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-600">No upgrade requests yet</p>
            )}
          </div>
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-violet-400/50 border-dark-800/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Seller Payouts</h3>
            <Store size={16} className="text-violet-400" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-dark-800/30">
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-emerald-400">{formatPrice(payouts.paid.amount)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Paid out</p>
              <p className="text-[10px] text-dark-600 mt-0.5">{payouts.paid.count} payouts</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-display font-bold text-amber-400">{formatPrice(payouts.pending.amount)}</p>
              <p className="text-xs text-dark-500 mt-0.5">Pending</p>
              <p className="text-[10px] text-dark-600 mt-0.5">{payouts.pending.count} payouts</p>
            </div>
          </div>
          <div className="border-t border-dark-800/30 p-5">
            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-3">Recent payouts</p>
            {(payouts.recent || []).length > 0 ? (
              <div className="space-y-2.5">
                {(payouts.recent as any[]).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{p.productName || `Order ${p.orderRef || ""}`}</p>
                      <p className="text-[10px] text-dark-600">
                        {p.seller?.name || "Seller"} · {p.quantity} units · {shortDate(p.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${payoutStatusClass(p.status)}`}>{p.status}</span>
                      <p className="text-sm font-semibold text-white">{formatPrice(p.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-600">No payouts yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}