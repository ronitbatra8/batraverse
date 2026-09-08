"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  Loader2,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  CreditCard,
  Wallet,
  UserRound,
  ListOrdered,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Kind = "topup" | "manual_credit" | "manual_debit" | "upgrade";

interface HistoryEntry {
  id: string;
  kind: Kind;
  amount: number;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  note: string | null;
  createdAt: string;
  userId: string;
  user: { id: string; name: string; email: string } | null;
  levelFrom?: string;
  levelTo?: string;
}

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

const KIND_META: Record<Kind, { label: string; icon: typeof Wallet; badge: string; chip: string }> = {
  topup: {
    label: "Wallet Top-Up",
    icon: Wallet,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    chip: "text-emerald-400",
  },
  manual_credit: {
    label: "Manual Credit",
    icon: UserRound,
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    chip: "text-sky-400",
  },
  manual_debit: {
    label: "Manual Debit",
    icon: UserRound,
    badge: "border-red-500/30 bg-red-500/10 text-red-300",
    chip: "text-red-400",
  },
  upgrade: {
    label: "Card Upgrade",
    icon: CreditCard,
    badge: "border-gold-500/30 bg-gold-500/10 text-gold-300",
    chip: "text-gold-400",
  },
};

export default function WalletHistory() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/wallet/admin/history");
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to load history", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  const isCredit = (e: HistoryEntry) => e.kind !== "manual_debit";

  const filtered = entries.filter((e) => {
    if (filter === "credit" && !isCredit(e)) return false;
    if (filter === "debit" && isCredit(e)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.user?.name || "").toLowerCase().includes(q) ||
      (e.user?.email || "").toLowerCase().includes(q) ||
      (e.transactionId || "").toLowerCase().includes(q)
    );
  });

  const totalCredit = entries.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);
  const totalDebit = entries.reduce((s, e) => s + (e.amount < 0 ? -e.amount : 0), 0);

  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: entries.length },
    { key: "credit", label: "Credits", count: entries.filter((e) => e.amount > 0).length },
    { key: "debit", label: "Debits", count: entries.filter((e) => e.amount < 0).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-gold-400" /> Wallet History
          </p>
          <p className="text-xs text-dark-400 mt-0.5">Every credit &amp; debit — top-ups, manual adjustments, upgrades</p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-dark-500 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Total Credited
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1">{formatPrice(totalCredit)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-red-300/80 font-semibold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Total Debited
          </p>
          <p className="text-lg font-bold text-red-400 mt-1">{formatPrice(totalDebit)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter === f.key
                ? f.key === "credit"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : f.key === "debit"
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
          <span className="text-sm text-dark-400">Loading history...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ListOrdered className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">{entries.length === 0 ? "No wallet activity yet" : "No matching activity"}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            const positive = e.amount >= 0;
            return (
              <div
                key={`${e.kind}-${e.id}`}
                className={`bg-gradient-to-r rounded-2xl border overflow-hidden transition-all ${
                  positive
                    ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-400"
                    : "from-red-500/10 to-red-500/5 border-red-500/20 border-l-4 border-l-red-400"
                }`}
              >
                <div className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-dark-800/60 border border-dark-700/50">
                      <Icon className={`w-4 h-4 ${meta.chip}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{e.user?.name || "Deleted user"}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 truncate">{e.user?.email || e.userId}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                    <span className={`text-sm font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                      {positive ? "+" : "−"}
                      {formatPrice(Math.abs(e.amount))}
                    </span>
                    {e.kind === "upgrade" && e.levelFrom && e.levelTo && (
                      <>
                        <span className="flex items-center gap-1 font-semibold shrink-0">
                          <span className="px-1.5 py-0.5 rounded border border-dark-600 text-dark-300">
                            {LEVEL_NAME[e.levelFrom] || e.levelFrom.toUpperCase()}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-gold-400" />
                          <span className="px-1.5 py-0.5 rounded border border-gold-500/40 text-gold-300">
                            {LEVEL_NAME[e.levelTo] || e.levelTo.toUpperCase()}
                          </span>
                        </span>
                        <span className="text-dark-500">·</span>
                      </>
                    )}
                    {e.paymentMethod && (
                      <>
                        <span className="text-dark-400">{e.paymentMethod}</span>
                        <span className="text-dark-500">·</span>
                      </>
                    )}
                    {e.transactionId && (
                      <span className="text-dark-500 font-mono truncate max-w-[9rem]">Txn: {e.transactionId}</span>
                    )}
                  </div>
                </div>
                <div className="px-4 sm:px-6 pb-3 -mt-1">
                  <p className="text-[10px] text-dark-500">
                    {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {e.note && ` · ${e.note}`}
                    {!positive && " · Deducted from wallet balance"}
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