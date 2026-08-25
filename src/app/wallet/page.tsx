"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { apiFetch } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import { getLevelFromBalance, getBalanceForNextLevel, LEVELS, type LevelKey } from "@/lib/levels";
import SiteLayout from "@/components/layout/SiteLayout";
import { useToast } from "@/components/Toast";
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, Loader2, QrCode, Copy, Smartphone } from "lucide-react";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

interface TopUpRequest {
  id: string;
  amount: number;
  transactionId: string;
  upiId: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
}

function WalletContent() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [txnId, setTxnId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<TopUpRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const amt = searchParams.get("amount");
    if (amt) setAmount(amt);
  }, [searchParams]);

  const balance = user?.walletBalance ?? 0;
  const peakBalance = user?.peakWalletBalance ?? balance;
  const level: LevelKey = user?.cardLevel === "owner" ? "owner" : getLevelFromBalance(peakBalance);
  const meta = LEVELS[level];
  const nextThreshold = getBalanceForNextLevel(level);
  const remaining = nextThreshold !== null ? Math.max(0, nextThreshold - peakBalance) : 0;

  const fetchHistory = async () => {
    try {
      const data = await apiFetch("/wallet/my-topups");
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 50) {
      toast("Minimum top-up is ₹50", "error");
      return;
    }
    if (!txnId.trim() || txnId.trim().length < 6) {
      toast("Enter a valid UPI transaction ID", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: numAmount, transactionId: txnId.trim(), upiId: upiId.trim() || undefined }),
      });
      toast("Top-up request submitted! Admin will verify and credit your wallet.", "success");
      setAmount("");
      setTxnId("");
      setUpiId("");
      fetchHistory();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to submit top-up", "error");
    }
    setSubmitting(false);
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText("ronit.batra@ptyes");
    toast("UPI ID copied!", "success");
  };

  return (
    <SiteLayout>
      <div className={cn("min-h-screen pt-24 pb-16 px-4", light ? "bg-ivory" : "bg-abyss")}>
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Balance card */}
          <div className={cn("rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className={light ? "text-sapphire" : "text-gold"} />
              <h1 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Wallet Balance</h1>
            </div>

            <div className="flex items-end gap-3 mb-4">
              <p className={cn("text-4xl font-bold", light ? "text-dark-900" : "text-cream")}>{formatPrice(balance)}</p>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-1", meta.chip)}>{meta.name}</span>
            </div>

            {nextThreshold !== null && level !== "black" && level !== "owner" && (
              <div className={cn("rounded-xl p-3 mt-2", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={cn("font-medium", light ? "text-dark-500" : "text-cream-dim/60")}>Next level: {LEVELS[nextThreshold === 100 ? "bronze" : nextThreshold === 500 ? "silver" : nextThreshold === 1500 ? "gold" : nextThreshold === 5000 ? "platinum" : nextThreshold === 15000 ? "diamond" : "black"]?.name}</span>
                  <span className={cn("font-semibold", light ? "text-dark-700" : "text-cream-dim")}>{formatPrice(remaining)} more</span>
                </div>
                <div className={cn("h-1.5 rounded-full overflow-hidden", light ? "bg-dark-200" : "bg-white/10")}>
                  <div className={cn("h-full rounded-full transition-all duration-500", light ? "bg-sapphire" : "bg-gold")}
                    style={{ width: `${Math.min(100, (balance / nextThreshold) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Recharge form */}
          <div className={cn("rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
            <div className="flex items-center gap-2 mb-6">
              <ArrowUpRight size={16} className={light ? "text-sapphire" : "text-gold"} />
              <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Recharge Wallet</h2>
            </div>

            {/* Step 1: UPI */}
            <div className={cn("rounded-xl border p-4 mb-5", light ? "border-dark-200 bg-dark-50/50" : "border-white/5 bg-onyx/50")}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-3", light ? "text-dark-500" : "text-cream-dim/60")}>Step 1: Pay via UPI</p>
              <div className="flex items-center gap-3">
                <div className={cn("flex-1 rounded-lg border px-3 py-2 font-mono text-sm", light ? "border-dark-200 bg-white text-dark-900" : "border-white/10 bg-onyx text-cream")}>
                  ronit.batra@ptyes
                </div>
                <button type="button" onClick={copyUpiId}
                  className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                    light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold hover:text-gold")}>
                  <Copy size={12} /> Copy
                </button>
              </div>
              <p className={cn("text-[10px] mt-2", light ? "text-dark-400" : "text-cream-dim/40")}>
                Open any UPI app and send the recharge amount to the above UPI ID. Note the transaction ID.
              </p>
            </div>

            {/* Step 2: Enter details */}
            <div className="space-y-4">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-dark-500" : "text-cream-dim/60")}>Step 2: Enter payment details</p>

              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", light ? "text-dark-400" : "text-cream-dim/50")}>Amount</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <button key={a} type="button" onClick={() => setAmount(String(a))}
                      className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                        amount === String(a)
                          ? (light ? "border-sapphire bg-sapphire/10 text-sapphire" : "border-gold bg-gold/10 text-gold")
                          : (light ? "border-dark-200 text-dark-500 hover:border-dark-300" : "border-white/10 text-cream-dim/50 hover:border-white/20")
                      )}>₹{a}</button>
                  ))}
                </div>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Or enter custom amount (min ₹50)"
                  className={cn("w-full rounded-xl border px-4 py-3 text-sm focus:outline-none",
                    light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx text-cream placeholder:text-cream-dim/30 focus:border-gold"
                  )} />
              </div>

              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", light ? "text-dark-400" : "text-cream-dim/50")}>UPI Transaction ID *</p>
                <input type="text" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 123456789012"
                  className={cn("w-full rounded-xl border px-4 py-3 text-sm focus:outline-none",
                    light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx text-cream placeholder:text-cream-dim/30 focus:border-gold"
                  )} />
              </div>

              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", light ? "text-dark-400" : "text-cream-dim/50")}>Your UPI ID (optional)</p>
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi"
                  className={cn("w-full rounded-xl border px-4 py-3 text-sm focus:outline-none",
                    light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx text-cream placeholder:text-cream-dim/30 focus:border-gold"
                  )} />
              </div>

              <button type="button" onClick={handleSubmit} disabled={submitting || !amount || !txnId.trim()}
                className={cn("w-full rounded-xl px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all",
                  submitting || !amount || !txnId.trim() ? "opacity-40 cursor-not-allowed" : "",
                  light ? "bg-sapphire text-white hover:bg-sapphire-light" : "bg-gold text-abyss hover:bg-gold-light"
                )}>
                {submitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Submit Top-Up Request"}
              </button>
            </div>
          </div>

          {/* History */}
          <div className={cn("rounded-2xl border overflow-hidden", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
            <button type="button" onClick={() => setShowHistory(!showHistory)}
              className={cn("w-full flex items-center justify-between p-6 text-left transition-colors", light ? "hover:bg-dark-50/50" : "hover:bg-white/5")}>
              <div className="flex items-center gap-2">
                <Clock size={16} className={light ? "text-dark-400" : "text-cream-dim/50"} />
                <span className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Top-Up History</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full", light ? "bg-dark-100 text-dark-500" : "bg-white/10 text-cream-dim/60")}>{history.length}</span>
              </div>
              <span className={cn("text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>{showHistory ? "Hide" : "Show"}</span>
            </button>

            {showHistory && (
              <div className={cn("border-t px-6 pb-6", light ? "border-dark-200/60" : "border-white/5")}>
                {history.length === 0 ? (
                  <p className={cn("text-xs py-4 text-center", light ? "text-dark-400" : "text-cream-dim/40")}>No top-up history yet.</p>
                ) : (
                  <div className="space-y-2 pt-4">
                    {history.map((t) => (
                      <div key={t.id} className={cn("flex items-center justify-between rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                        <div>
                          <p className={cn("text-sm font-semibold", light ? "text-dark-900" : "text-cream")}>{formatPrice(t.amount)}</p>
                          <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/40")}>
                            Txn: {t.transactionId} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                          t.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          t.status === "REJECTED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {t.status === "APPROVED" ? <CheckCircle size={10} /> : t.status === "REJECTED" ? <XCircle size={10} /> : <Clock size={10} />}
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </SiteLayout>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={null}>
      <WalletContent />
    </Suspense>
  );
}
