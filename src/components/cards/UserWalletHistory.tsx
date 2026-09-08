"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLight } from "@/components/auth/auth-ui";
import {
  Loader2,
  Wallet,
  CreditCard,
  UserRound,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  History,
  RefreshCw,
} from "lucide-react";

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
  levelFrom?: string;
  levelTo?: string;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Wallet; badge: string; chip: string }> = {
  topup: {
    label: "Wallet Top-Up",
    icon: Wallet,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    chip: "text-emerald-400",
  },
  manual_credit: {
    label: "Owner Credit",
    icon: UserRound,
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-600",
    chip: "text-sky-400",
  },
  manual_debit: {
    label: "Owner Debit",
    icon: UserRound,
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
    chip: "text-red-400",
  },
  upgrade: {
    label: "Card Upgrade",
    icon: CreditCard,
    badge: "border-gold/30 bg-gold/10 text-gold",
    chip: "text-gold",
  },
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

export default function UserWalletHistory() {
  const light = useLight();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/wallet/my-history");
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  const filtered = entries.filter((e) => {
    if (filter === "credit" && e.kind === "manual_debit") return false;
    if (filter === "debit" && e.kind !== "manual_debit") return false;
    return true;
  });

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "credit", label: "Credits" },
    { key: "debit", label: "Debits" },
  ];

  const statusPill = (s: string) => {
    if (s === "PENDING")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/30">
          <Clock className="w-3 h-3" /> PENDING
        </span>
      );
    if (s === "APPROVED")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> APPROVED
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-red-500/10 text-red-500 border border-red-500/30">
        <XCircle className="w-3 h-3" /> REJECTED
      </span>
    );
  };

  return (
    <div className={cn("rounded-2xl border p-4 sm:p-6 space-y-4", light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50")}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold/80")}>
            Transactions
          </p>
          <p className={cn("mt-1 text-[11px]", light ? "text-onyx/40" : "text-dark-500")}>
            Top-ups, upgrades &amp; owner adjustments on your wallet
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50",
            light ? "border-sapphire/20 text-sapphire hover:bg-sapphire/5" : "border-dark-700/50 text-dark-400 hover:text-white"
          )}
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b overflow-x-auto" style={{ borderColor: light ? "rgba(30,58,138,0.15)" : "rgba(255,255,255,0.08)" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0",
              filter === f.key
                ? light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold"
                : light ? "text-onyx/40 hover:text-onyx" : "text-dark-500 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
          <span className={cn("text-xs", light ? "text-onyx/40" : "text-dark-500")}>Loading history...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <History className={cn("w-10 h-10 mx-auto mb-3", light ? "text-onyx/20" : "text-dark-600")} />
          <p className={cn("text-xs", light ? "text-onyx/40" : "text-dark-500")}>
            {entries.length === 0 ? "No activity yet" : "No matching transactions"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            const rejected = e.status === "REJECTED";
            const isCredit = e.amount >= 0;
            const isRed = rejected || e.amount < 0;
            return (
              <div
                key={`${e.kind}-${e.id}`}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  isRed ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", light ? "bg-white border-sapphire/10" : "bg-dark-800/60 border-dark-700/50")}>
                      <Icon className={cn("w-4 h-4", meta.chip)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-sm font-semibold", light ? "text-onyx" : "text-white")}>{meta.label}</p>
                        {e.kind === "manual_credit" || e.kind === "manual_debit" ? (
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border", meta.badge)}>by Owner</span>
                        ) : (
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border", meta.badge)}>{meta.label}</span>
                        )}
                      </div>
                      <p className={cn("mt-0.5 text-[11px]", light ? "text-onyx/40" : "text-dark-500")}>
                        {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-base font-bold tabular-nums", isRed ? "text-red-500" : "text-emerald-500")}>
                      {isCredit ? "+" : "−"}₹{Math.abs(e.amount).toLocaleString("en-IN")}
                    </p>
                    <div className="mt-1">{statusPill(e.status)}</div>
                  </div>
                </div>

                {(e.kind === "upgrade" && e.levelFrom && e.levelTo) || e.paymentMethod || e.transactionId ? (
                  <div className={cn("mt-3 pt-3 flex flex-wrap items-center gap-2 text-[11px]", light ? "border-t border-sapphire/10" : "border-t border-dark-800/50")}>
                    {e.kind === "upgrade" && e.levelFrom && e.levelTo && (
                      <>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className={cn("px-1.5 py-0.5 rounded border", light ? "border-onyx/20 text-onyx/60" : "border-dark-600 text-dark-300")}>
                            {LEVEL_NAME[e.levelFrom] || e.levelFrom.toUpperCase()}
                          </span>
                          <ArrowUpRight className={cn("w-3 h-3", light ? "text-sapphire" : "text-gold")} />
                          <span className={cn("px-1.5 py-0.5 rounded border", light ? "border-sapphire/30 text-sapphire" : "border-gold/40 text-gold")}>
                            {LEVEL_NAME[e.levelTo] || e.levelTo.toUpperCase()}
                          </span>
                        </span>
                        <span className={light ? "text-onyx/25" : "text-dark-600"}>·</span>
                      </>
                    )}
                    {e.paymentMethod && (
                      <>
                        <span className={light ? "text-onyx/50" : "text-dark-400"}>{e.paymentMethod}</span>
                        <span className={light ? "text-onyx/25" : "text-dark-600"}>·</span>
                      </>
                    )}
                    {e.transactionId && (
                      <span className={cn("font-mono truncate max-w-[10rem]", light ? "text-onyx/40" : "text-dark-500")}>{e.transactionId}</span>
                    )}
                  </div>
                ) : null}

                {e.note && (
                  <p className={cn("mt-2 text-[11px]", light ? "text-onyx/40" : "text-dark-500")}>Note: {e.note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}