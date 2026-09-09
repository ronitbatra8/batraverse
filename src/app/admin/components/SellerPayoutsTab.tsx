"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Loader2, RefreshCw, Search, Wallet, Undo2, CheckCircle2, CalendarDays, HandCoins, ChevronDown, ChevronUp, User, Package, Mail } from "lucide-react";
import { API, adminHeaders } from "./types";

interface Payout {
  id: string;
  orderId: string;
  orderRef: string | null;
  itemIdx: number;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  chargedPrice: number | null;
  status: "pending" | "paid" | "voided";
  createdAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  seller: { id: string; name: string; email: string; shopName: string | null };
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  voided: "bg-white/5 text-dark-500",
};

const PAYOUT_GRADIENTS: Record<string, string> = {
  pending: "from-amber-500/15 to-amber-500/5",
  paid: "from-emerald-500/15 to-emerald-500/5",
  voided: "from-dark-900/40 to-dark-900/20",
};

const PAYOUT_BORDERS: Record<string, string> = {
  pending: "border-amber-500/25",
  paid: "border-emerald-500/25",
  voided: "border-dark-700/50",
};

const PAYOUT_ICON_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  paid: "text-emerald-400",
  voided: "text-dark-500",
};

export default function SellerPayoutsTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [paidTotal, setPaidTotal] = useState(0);
  const [voidedTotal, setVoidedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [search, setSearch] = useState("");
  const [proceeding, setProceeding] = useState<string | null>(null);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/payouts?limit=100`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payouts");
      setPayouts(data?.payouts || []);
      setPendingTotal(data?.pendingTotal || 0);
      setPaidTotal(data?.paidTotal || 0);
      setVoidedTotal(data?.voidedTotal || 0);
    } catch {
      setPayouts([]);
    }
    setLoading(false);
  }, [adminKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleMarkPaid = async (id: string) => {
    setProceeding(id);
    try {
      const res = await fetch(`${API}/api/admin/payouts/${id}/paid`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark paid");
      toast("Payout marked as paid", "success");
      fetchPayouts();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to mark paid", "error");
    }
    setProceeding(null);
  };

  const filtered = payouts.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.seller.name || "").toLowerCase().includes(q) ||
      (p.seller.email || "").toLowerCase().includes(q) ||
      (p.seller.shopName || "").toLowerCase().includes(q) ||
      (p.orderRef || "").toLowerCase().includes(q) ||
      (p.productName || "").toLowerCase().includes(q)
    );
  });

  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const paidCount = payouts.filter((p) => p.status === "paid").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-gold-400" />
          <h2 className="text-white text-lg font-semibold">Seller Payouts</h2>
        </div>
        <button onClick={fetchPayouts} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-dark-500 hover:text-white hover:border-white/20 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      <p className="text-xs text-dark-500">Settlements are paid by bank/UPI outside the app. Mark a payout paid once you have transferred the money to the seller.</p>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <Wallet className="w-5 h-5 text-amber-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(pendingTotal)}</p>
          <p className="text-xs text-dark-400 mt-1">{pendingCount} payout(s) owed to sellers</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(paidTotal)}</p>
          <p className="text-xs text-dark-400 mt-1">{paidCount} payout(s) paid out</p>
        </div>
        <div className="bg-gradient-to-br from-white/10 border border-dark-700 rounded-2xl p-5">
          <Undo2 className="w-5 h-5 text-dark-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(voidedTotal)}</p>
          <p className="text-xs text-dark-400 mt-1">Voided (returns/cancellations)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "paid"] as const).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setVisibleCount(50); setExpandedPayout(null); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              filter === f ? "bg-gold-500/20 text-gold-400 border-gold-500/30" : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
            }`}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search seller, order, product..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-dark-700 bg-dark-800 text-white text-xs w-52 focus:outline-none focus:border-gold-500/50" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-12">No payouts found. A payout is created automatically when an order item is marked delivered.</p>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((p) => {
            const isExpanded = expandedPayout === p.id;
            const diff = p.chargedPrice != null ? p.chargedPrice - p.unitPrice : 0;
            return (
              <div key={p.id} className={`bg-gradient-to-r ${PAYOUT_GRADIENTS[p.status] || "from-dark-900/40 to-dark-900/20"} border ${PAYOUT_BORDERS[p.status] || "border-dark-800/40"} rounded-xl overflow-hidden transition-colors`}>
                {/* Collapsed row */}
                <button
                  onClick={() => setExpandedPayout(isExpanded ? null : p.id)}
                  className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${PAYOUT_GRADIENTS[p.status] || ""}`}>
                    <Wallet size={16} className={PAYOUT_ICON_COLORS[p.status] || "text-dark-600"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", STATUS_STYLE[p.status])}>
                        {p.status}
                      </span>
                      <span className="text-white font-semibold text-sm">{formatPrice(p.amount)}</span>
                      {p.seller.shopName && <span className="text-[10px] text-dark-500 hidden sm:inline">· {p.seller.shopName}</span>}
                    </div>
                    <p className="text-dark-400 text-xs mt-1 truncate">
                      {p.seller.name || "Unknown"}
                      <span className="text-dark-600 mx-1.5">&middot;</span>
                      {p.productName || "Product"}
                      <span className="text-dark-600 mx-1.5">&middot;</span>
                      {p.orderRef || "#" + p.orderId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-dark-500 text-[10px]">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  {p.status === "pending" ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkPaid(p.id); }}
                      disabled={proceeding === p.id}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {proceeding === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Paid
                    </button>
                  ) : p.status === "paid" ? (
                    <span className="text-emerald-400/80 text-[10px] flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                  ) : null}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-dark-800/50 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Seller Info */}
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Seller Info
                        </h4>
                        <div className="space-y-2">
                          <p className="text-white text-sm font-medium">{p.seller.name || "Unknown"}</p>
                          <div className="flex items-center gap-2 text-dark-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            {p.seller.email || "—"}
                          </div>
                          {p.seller.shopName && (
                            <div className="flex items-center gap-2 text-dark-300 text-xs">
                              <Package className="w-3.5 h-3.5 text-gold-400" />
                              {p.seller.shopName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payout Details */}
                      <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" /> Payout Details
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-white text-sm font-medium truncate">{p.productName || "—"}</p>
                            <p className="text-dark-500 text-xs mt-0.5">Order {p.orderRef || "#" + p.orderId.slice(0, 8)}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-dark-500">Qty</span>
                              <span className="text-white ml-1.5 font-medium">{p.quantity}</span>
                            </div>
                            <div className="border-l border-dark-700 h-3" />
                            <div>
                              <span className="text-dark-500">Unit price</span>
                              <span className="text-white ml-1.5 font-medium">{formatPrice(p.unitPrice)}</span>
                            </div>
                            <div className="border-l border-dark-700 h-3" />
                            <div>
                              <span className="text-dark-500">Total</span>
                              <span className="text-gold-400 ml-1.5 font-semibold">{formatPrice(p.amount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Money Split */}
                    {p.chargedPrice != null && p.chargedPrice >= 0 && (
                      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Wallet className="w-3.5 h-3.5" /> Money Split
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm px-3 py-2 rounded-lg bg-dark-900/30">
                          <span className="text-dark-400">Customer paid <span className="text-white font-semibold">{formatPrice(p.chargedPrice * p.quantity)}</span></span>
                          <span className="text-emerald-400/90">Seller gets <span className="text-emerald-300 font-semibold">{formatPrice(p.amount)}</span></span>
                          <span className={`${diff >= 0 ? "text-amber-400/80" : "text-red-400/90"}`}>
                            Difference <span className={`font-semibold ${diff >= 0 ? "text-amber-300" : "text-red-300"}`}>{diff >= 0 ? "+" : "-"}{formatPrice(Math.abs(diff * p.quantity))}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-dark-500">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Created {new Date(p.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      {p.paidAt && <span className="flex items-center gap-1 text-emerald-400/80"><CheckCircle2 className="w-3 h-3" /> Paid {new Date(p.paidAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                      {p.voidedAt && <span className="flex items-center gap-1"><Undo2 className="w-3 h-3" /> Voided {new Date(p.voidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((v) => v + 50)}
              className="w-full py-3 rounded-xl border border-dark-700/50 bg-dark-900/40 text-sm text-dark-300 hover:text-white hover:border-gold-500/30 transition-all"
            >
              Show more ({filtered.length - visibleCount} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}