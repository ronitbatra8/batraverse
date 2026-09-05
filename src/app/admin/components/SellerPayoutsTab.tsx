"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { Coins, Loader2, RefreshCw, Search, Wallet, Undo2, CalendarDays } from "lucide-react";
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
  status: "paid" | "reversed";
  createdAt: string;
  reversedAt: string | null;
  seller: { id: string; name: string; email: string; shopName: string | null };
}

export default function SellerPayoutsTab({ adminKey }: { adminKey: string }) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "reversed">("all");
  const [search, setSearch] = useState("");

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/payouts?limit=100`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payouts");
      setPayouts(data?.payouts || []);
      setPaidTotal(data?.paidTotal || 0);
    } catch {
      setPayouts([]);
    }
    setLoading(false);
  }, [adminKey]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

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

  const reversedTotal = payouts.filter((p) => p.status === "reversed").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          <h2 className="text-white text-lg font-semibold">Seller Payouts</h2>
        </div>
        <button onClick={fetchPayouts} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-dark-500 hover:text-white hover:border-white/20 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(paidTotal)}</p>
          <p className="text-xs text-dark-400 mt-1">Total paid out to sellers (net of reversals)</p>
        </div>
        <div className="bg-gradient-to-br from-sky-500/20 to-sky-500/10 border border-sky-500/30 rounded-2xl p-5">
          <Coins className="w-5 h-5 text-sky-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{payouts.filter((p) => p.status === "paid").length}</p>
          <p className="text-xs text-dark-400 mt-1">Paid payouts</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-500/10 border border-rose-500/30 rounded-2xl p-5">
          <Undo2 className="w-5 h-5 text-rose-400" />
          <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(reversedTotal)}</p>
          <p className="text-xs text-dark-400 mt-1">Reversed (returns/cancellations)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "paid", "reversed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
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
        <p className="text-center text-dark-500 text-sm py-12">No payouts found. Payouts are created automatically when an item is marked delivered.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:border-dark-600/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{formatPrice(p.amount)}</span>
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      p.status === "paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30")}>
                      {p.status}
                    </span>
                    {p.seller.shopName && <span className="text-[10px] text-dark-500">· {p.seller.shopName}</span>}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-dark-500">Seller: </span><span className="text-white">{p.seller.name}</span></div>
                    <div><span className="text-dark-500">Email: </span><span className="text-white">{p.seller.email}</span></div>
                    <div><span className="text-dark-500">Order: </span><span className="text-gold-400">{p.orderRef || "#" + p.orderId.slice(0, 8)}</span></div>
                    <div><span className="text-dark-500">Qty: </span><span className="text-white">{p.quantity} × {formatPrice(p.unitPrice)}</span></div>
                  </div>
                  <div className="mt-1.5 text-[11px]">
                    <span className="text-dark-500">Product: </span><span className="text-white">{p.productName || "—"}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-dark-500">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(p.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {p.reversedAt && (
                      <span className="flex items-center gap-1 text-rose-400/80"><Undo2 className="w-3 h-3" /> Reversed {new Date(p.reversedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}