"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Coins, Loader2, RefreshCw, Search, Wallet, Undo2, CheckCircle2, CalendarDays, HandCoins } from "lucide-react";
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
  status: "pending" | "paid" | "voided";
  createdAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  seller: { id: string; name: string; email: string; shopName: string | null };
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  voided: "bg-white/5 text-dark-500 border-dark-700",
};

export default function SellerPayoutsTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [paidTotal, setPaidTotal] = useState(0);
  const [voidedTotal, setVoidedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "voided">("pending");
  const [search, setSearch] = useState("");
  const [proceeding, setProceeding] = useState<string | null>(null);

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
        <div className="bg-gradient-to-br from-teal-500/20 to-teal-500/10 border border-teal-500/30 rounded-2xl p-5">
          <Wallet className="w-5 h-5 text-teal-400" />
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
        {(["all", "pending", "paid", "voided"] as const).map((f) => (
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
        <p className="text-center text-dark-500 text-sm py-12">No payouts found. A payout is created automatically when an order item is marked delivered.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:border-dark-600/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{formatPrice(p.amount)}</span>
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", STATUS_STYLE[p.status])}>
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
                    {p.paidAt && <span className="flex items-center gap-1 text-emerald-400/80"><CheckCircle2 className="w-3 h-3" /> Paid {new Date(p.paidAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                    {p.voidedAt && <span className="flex items-center gap-1"><Undo2 className="w-3 h-3" /> Voided {new Date(p.voidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </div>
                </div>
                {p.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleMarkPaid(p.id)} disabled={proceeding === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                      {proceeding === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark Paid
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}