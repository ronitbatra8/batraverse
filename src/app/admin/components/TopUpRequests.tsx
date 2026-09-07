"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, apiUrl } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { CheckCircle, XCircle, Clock, Loader2, Search, RefreshCw, ArrowUpRight, CreditCard, Wallet, Banknote } from "lucide-react";
import { adminHeaders } from "./types";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "Cash on Delivery",
  UPI_DELIVERY: "UPI at Delivery",
  UPI: "Online UPI",
};

const LEVEL_NAME: Record<string, string> = {
  none: "NONE",
  bronze: "BRONZE",
  silver: "SILVER",
  gold: "GOLD",
  platinum: "PLATINUM",
  diamond: "DIAMOND",
  black: "BLACK",
  owner: "OWNER",
};

interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface TopUpRecord {
  id: string;
  amount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  upiId: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
  user: BaseUser;
}

interface UpgradeRecord {
  id: string;
  fromLevel: string;
  toLevel: string;
  price: number;
  paymentMethod: string;
  transactionId: string | null;
  upiId: string | null;
  status: string;
  paymentStatus: string;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  user: BaseUser & { cardLevel: string | null };
}

interface MergedRow {
  kind: "topup" | "upgrade";
  id: string;
  amount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  status: string;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  user: BaseUser;
  toLevel?: string;
  fromLevel?: string;
}

export default function TopUpRequests({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topUpsData, upgradesData] = await Promise.all([
        apiFetch("/wallet/admin/all?limit=50"),
        fetch(`${apiUrl("/admin/card-upgrades")}`, { headers: adminHeaders(adminKey) }).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d?.error || "Failed to load upgrades");
          return d;
        }),
      ]);
      const topUps: TopUpRecord[] = Array.isArray(topUpsData?.topUps) ? topUpsData.topUps : [];
      const upgrades: UpgradeRecord[] = Array.isArray(upgradesData) ? upgradesData : [];
      const merged: MergedRow[] = [
        ...topUps.map((t) => ({
          kind: "topup" as const,
          id: t.id,
          amount: t.amount,
          paymentMethod: t.paymentMethod,
          transactionId: t.transactionId,
          status: t.status,
          note: t.adminNote,
          createdAt: t.createdAt,
          processedAt: t.processedAt,
          user: t.user,
        })),
        ...upgrades.map((u) => ({
          kind: "upgrade" as const,
          id: u.id,
          amount: u.price,
          paymentMethod: u.paymentMethod || null,
          transactionId: u.transactionId,
          status: u.status,
          note: u.note,
          createdAt: u.createdAt,
          processedAt: u.processedAt,
          user: u.user,
          toLevel: u.toLevel,
          fromLevel: u.fromLevel,
        })),
      ];
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRows(merged);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load requests", "error");
    }
    setLoading(false);
  }, [adminKey, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  const process = async (row: MergedRow, action: "approve" | "reject") => {
    setProcessingId(row.id);
    try {
      if (row.kind === "topup") {
        await apiFetch(`/wallet/admin/${action}/${row.id}`, { method: "POST" });
        toast(action === "approve" ? "Top-up approved and wallet credited!" : "Top-up rejected", "success");
      } else {
        const res = await fetch(`${apiUrl("/admin/card-upgrades")}/${row.id}/process`, {
          method: "POST",
          headers: adminHeaders(adminKey),
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to process request");
        toast(action === "approve" ? "Approved! Amount credited to user's wallet. Card level updates automatically with balance." : "Request rejected", "success");
      }
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to process request", "error");
    }
    setProcessingId(null);
  };

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      (r.transactionId || "").toLowerCase().includes(q)
    );
  });

  const pending = rows.filter((r) => r.status === "PENDING").length;
  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "PENDING", label: "Pending", count: pending },
    { key: "APPROVED", label: "Approved", count: rows.filter((r) => r.status === "APPROVED").length },
    { key: "REJECTED", label: "Rejected", count: rows.filter((r) => r.status === "REJECTED").length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Top-Up Requests</p>
          <p className="text-xs text-dark-400 mt-0.5">Wallet top-ups and card upgrade payments</p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-dark-500 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter === f.key
                ? f.key === "PENDING"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : f.key === "APPROVED"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : f.key === "REJECTED"
                  ? "bg-red-500/15 border-red-500/40 text-red-300"
                  : "bg-white/10 border-white/25 text-white"
                : "border-dark-800/60 bg-dark-900/40 text-dark-400 hover:text-white"
            }`}
          >
            {f.label}
            <span className="ml-2 text-[10px] opacity-60">{f.count}</span>
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, txn..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-dark-700 bg-dark-800 text-white text-xs w-48 focus:outline-none focus:border-gold-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
          <span className="text-sm text-dark-400">Loading requests...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <Banknote className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">{rows.length === 0 ? "No top-up requests yet" : "No matching requests"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isPending = r.status === "PENDING";
            const pcMethod = r.paymentMethod
              ? PAYMENT_METHOD_LABEL[r.paymentMethod] || r.paymentMethod
              : "Online UPI";
            return (
              <div
                key={`${r.kind}-${r.id}`}
                className={`bg-gradient-to-r rounded-2xl border overflow-hidden transition-all ${
                  isPending
                    ? "from-amber-500/10 to-amber-500/5 border-amber-500/30 border-l-4 border-l-amber-400"
                    : r.status === "APPROVED"
                    ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 border-l-4 border-l-emerald-400"
                    : "from-red-500/10 to-red-500/5 border-red-500/30 border-l-4 border-l-red-400"
                }`}
              >
                <div className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-dark-800/60 border border-dark-700/50">
                      {r.kind === "topup" ? (
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-gold-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{r.user.name}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                          r.kind === "topup"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-gold-500/30 bg-gold-500/10 text-gold-300"
                        }`}>
                          {r.kind === "topup" ? "Wallet Top-Up" : "Card Upgrade"}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 truncate">{r.user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                    <span className="text-sm font-bold text-gold-400">{formatPrice(r.amount)}</span>
                    {r.kind === "upgrade" && (
                      <>
                        <span className="flex items-center gap-1 font-semibold shrink-0">
                          <span className="px-1.5 py-0.5 rounded border border-dark-600 text-dark-300">
                            {LEVEL_NAME[r.fromLevel || ""] || (r.fromLevel || "NONE").toUpperCase()}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-gold-400" />
                          <span className="px-1.5 py-0.5 rounded border border-gold-500/40 text-gold-300">
                            {LEVEL_NAME[r.toLevel || ""] || (r.toLevel || "").toUpperCase()}
                          </span>
                        </span>
                        <span className="text-dark-500">·</span>
                      </>
                    )}
                    <span className="text-dark-400">{pcMethod}</span>
                    {r.transactionId && (
                      <>
                        <span className="text-dark-500">·</span>
                        <span className="text-dark-500 font-mono truncate max-w-[9rem]">Txn: {r.transactionId}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border shrink-0 ${
                        r.status === "PENDING"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : r.status === "APPROVED"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
                    >
                      {r.status === "PENDING" ? (
                        <Clock className="w-3 h-3" />
                      ) : r.status === "APPROVED" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {r.status}
                    </span>

                    {isPending && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => process(r, "approve")}
                          disabled={processingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white transition-all disabled:opacity-50"
                        >
                          {processingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpRight className="w-3 h-3" />}
                          {processingId === r.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => process(r, "reject")}
                          disabled={processingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 sm:px-6 pb-3 -mt-1">
                  <p className="text-[10px] text-dark-500">
                    {new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {r.processedAt && ` · Processed ${new Date(r.processedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                    {r.note && ` · Note: ${r.note}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}