"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Banknote, Smartphone, CircleDollarSign, Check, ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { cn, errMessage, formatPrice } from "@/lib/utils";
import { useLight } from "@/components/auth/auth-ui";
import { apiFetch } from "@/lib/api";
import { LEVELS, LEVEL_ORDER } from "@/lib/levels";
import CardUpgradeUpiModal from "@/components/cards/CardUpgradeUpiModal";

interface UpgradePrice {
  id: string;
  fromLevel: string;
  toLevel: string;
  price: number;
  active: boolean;
}

type PayMethod = "cod" | "upi_delivery" | "upi";

const PAYMENT_METHODS: Array<{ key: PayMethod; label: string; desc: string; icon: ReactNode }> = [
  { key: "cod", label: "Cash on Delivery", desc: "Pay when you receive", icon: <Banknote size={20} /> },
  { key: "upi_delivery", label: "UPI on Delivery", desc: "Scan & pay at owner/delivery", icon: <Smartphone size={20} /> },
  { key: "upi", label: "Online UPI", desc: "QR / Transaction ID", icon: <CircleDollarSign size={20} /> },
];

const TOP_UP_PRESETS = [100, 200, 500, 1000, 2000, 5000];

function gapFor(price: number, balance: number): number {
  return Math.max(price - balance, 0);
}

interface PendingCheckout {
  mode: "upgrade" | "topup";
  target: string;
  amount: number;
  method: PayMethod;
}

function methodLabel(m: string): string {
  return m === "cod" ? "COD" : m === "upi_delivery" ? "UPI on Delivery" : "Online UPI";
}

export default function CardUpgradeCheckout({ currentLevel, walletBalance = 0 }: { currentLevel: string; walletBalance?: number }) {
  const light = useLight();

  const [pricing, setPricing] = useState<UpgradePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingErr, setPricingErr] = useState("");

  const [mode, setMode] = useState<"upgrade" | "topup">("upgrade");
  const [selected, setSelected] = useState<UpgradePrice | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod | "">("");

  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [upiModal, setUpiModal] = useState(false);
  const [upiModalKey, setUpiModalKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ kind: "upgrade"; toLevel: string; amount: number; methodLabel: string } | { kind: "topup"; amount: number; methodLabel: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/card-upgrades/pricing?fromLevel=${encodeURIComponent(currentLevel)}`);
        if (cancelled) return;
        const rows: UpgradePrice[] = Array.isArray(data)
          ? data.filter((p: UpgradePrice) => p.active)
          : [];
        setPricing(rows.sort((a, b) => LEVEL_ORDER.indexOf(a.toLevel as never) - LEVEL_ORDER.indexOf(b.toLevel as never)));
      } catch (err) {
        if (!cancelled) setPricingErr(errMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentLevel]);

  const checkout: PendingCheckout | null = (() => {
    if (mode === "upgrade") {
      if (!selected) return null;
      return { mode: "upgrade", target: selected.toLevel, amount: gapFor(selected.price, walletBalance), method: payMethod as PayMethod };
    }
    const num = parseFloat(topUpAmount);
    if (!Number.isFinite(num) || num < 50) return null;
    return { mode: "topup", target: "", amount: num, method: payMethod as PayMethod };
  })();

  const submit = useCallback(async (c: PendingCheckout) => {
    setSubmitting(true);
    setError("");
    try {
      if (c.mode === "upgrade") {
        const method = c.method === "cod" ? "COD" : "UPI_DELIVERY";
        await apiFetch("/card-upgrades/request", {
          method: "POST",
          body: JSON.stringify({ toLevel: c.target, paymentMethod: method }),
        });
        setDone({ kind: "upgrade", toLevel: c.target, amount: c.amount, methodLabel: methodLabel(c.method) });
      } else {
        const method = c.method === "cod" ? "COD" : c.method === "upi_delivery" ? "UPI_DELIVERY" : "UPI";
        await apiFetch("/wallet/topup", {
          method: "POST",
          body: JSON.stringify({ amount: c.amount, paymentMethod: method }),
        });
        setDone({ kind: "topup", amount: c.amount, methodLabel: methodLabel(c.method) });
      }
      setPending(null);
      setSelected(null);
      setPayMethod("");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submitUpi = useCallback(async (txnId: string) => {
    if (!pending) return;
    if (pending.mode === "upgrade") {
      await apiFetch("/card-upgrades/request", {
        method: "POST",
        body: JSON.stringify({ toLevel: pending.target, paymentMethod: "UPI", transactionId: txnId }),
      });
      setDone({ kind: "upgrade", toLevel: pending.target, amount: pending.amount, methodLabel: "Online UPI" });
    } else {
      await apiFetch("/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: pending.amount, paymentMethod: "UPI", transactionId: txnId }),
      });
      setDone({ kind: "topup", amount: pending.amount, methodLabel: "Online UPI" });
    }
    setPending(null);
    setSelected(null);
    setPayMethod("");
  }, [pending]);

  const handleSubmit = useCallback(() => {
    if (!checkout) return;
    if (checkout.method === "upi") {
      setPending({ ...checkout });
      setUpiModalKey((k) => k + 1);
      setUpiModal(true);
      return;
    }
    submit(checkout);
  }, [checkout, submit]);

  const handleUpiSuccess = useCallback(() => {
    setUpiModal(false);
  }, []);

  const switchMode = (m: "upgrade" | "topup") => {
    setMode(m);
    setError("");
    setDone(null);
    setPending(null);
    setSelected(null);
    setPayMethod("");
    if (m === "topup") setTopUpAmount("");
  };

  return (
    <div className={cn(
      "rounded-2xl border p-4 space-y-4",
      light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50"
    )}>
      <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
        Wallet Top-Up & Upgrades
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchMode("upgrade")}
          className={cn(
            "rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
            mode === "upgrade"
              ? (light ? "border-sapphire bg-sapphire/10 text-sapphire" : "border-gold bg-gold/10 text-gold")
              : (light ? "border-black/10 text-onyx/40 hover:border-sapphire/30" : "border-white/10 text-dark-500 hover:border-gold/30")
          )}
        >
          Upgrade Tier
        </button>
        <button
          type="button"
          onClick={() => switchMode("topup")}
          className={cn(
            "rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
            mode === "topup"
              ? (light ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-emerald-400 bg-emerald-400/10 text-emerald-300")
              : (light ? "border-black/10 text-onyx/40 hover:border-emerald-500/30" : "border-white/10 text-dark-500 hover:border-emerald-400/30")
          )}
        >
          <span className="inline-flex items-center gap-1.5"><Wallet size={12} className="mx-auto" /> Custom Top-Up</span>
        </button>
      </div>

      {done ? (
        <div className={cn("rounded-xl border p-5 text-center space-y-2", light ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-400/20 bg-emerald-400/5")}>
          <Check size={24} className={cn("mx-auto", light ? "text-emerald-600" : "text-emerald-400")} />
          <p className={cn("text-xs font-bold", light ? "text-dark-900" : "text-cream")}>
            {done.kind === "upgrade" ? "Upgrade request submitted!" : "Top-up request submitted!"}
          </p>
          <p className={cn("text-[10px] leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
            {done.kind === "upgrade" ? (
              <>{LEVELS[done.toLevel]?.name || done.toLevel.toUpperCase()} upgrade for {formatPrice(done.amount).replace(/\.00$/, "")} via {done.methodLabel}. Once confirmed, the amount will be credited to your wallet and your card upgraded.</>
            ) : (
              <>{formatPrice(done.amount).replace(/\.00$/, "")} top-up via {done.methodLabel}. Amount will be credited to your wallet after the owner confirms your payment.</>
            )}
          </p>
          <button
            type="button"
            onClick={() => { setDone(null); }}
            className={cn("mt-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
              light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gold text-abyss hover:bg-gold/90"
            )}
          >
            {done.kind === "upgrade" ? "Request Another Upgrade" : "Make Another Request"}
          </button>
        </div>
      ) : (
        <>
          {mode === "upgrade" ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className={cn("w-4 h-4 animate-spin", light ? "text-sapphire" : "text-gold")} />
                  <span className={cn("text-[10px] uppercase tracking-wider", light ? "text-onyx/40" : "text-dark-500")}>Loading upgrades...</span>
                </div>
              ) : pricingErr ? (
                <p className="text-xs text-red-500">{pricingErr}</p>
              ) : pricing.length === 0 ? (
                <p className={cn("text-xs leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
                  No upgrades available from your current tier. Reach out to the owner for a custom upgrade.
                </p>
              ) : (
                <>
                  <p className={cn("text-[10px] leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
                    Pay only the amount needed to reach each tier.
                    {walletBalance > 0 && <> Your wallet balance of <span className="font-bold">{formatPrice(walletBalance)}</span> is already counted — just add the difference.</>}
                  </p>
                  <div className="grid gap-2">
                    {pricing.map((p) => {
                      const meta = LEVELS[p.toLevel];
                      const isSel = selected?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelected(p); setError(""); }}
                          className={cn(
                            "rounded-xl border p-3 flex items-center gap-3 transition-all text-left",
                            isSel
                              ? (light ? "border-sapphire/50 bg-sapphire/5" : "border-gold/50 bg-gold/5")
                              : (light ? "border-black/10 bg-white hover:border-sapphire/30" : "border-white/10 bg-white/[0.03] hover:border-gold/30")
                          )}
                        >
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", meta?.chip)}>
                            {meta?.icon ? (
                              <meta.icon size={15} className="mx-auto" />
                            ) : (
                              <span className={cn("text-[10px] font-bold", meta?.text)}>{p.toLevel.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", isSel ? (light ? "text-sapphire" : "text-gold-light") : (light ? "text-dark-900" : "text-cream"))}>
                              {meta?.name || p.toLevel}
                            </p>
                            <p className={cn("text-[9px]", light ? "text-onyx/40" : "text-dark-500")}>
                              {meta?.discount ? `${meta.discount}% off · ` : ""}{meta?.freeDeliveries ? `${meta.freeDeliveries} free deliveries/mo` : "standard benefits"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={cn("text-sm font-bold", light ? "text-sapphire" : "text-gold")}>{formatPrice(gapFor(p.price, walletBalance))}</p>
                            {walletBalance > 0 && p.price > walletBalance && (
                              <p className={cn("text-[9px]", light ? "text-onyx/40" : "text-dark-500")}>of {formatPrice(p.price)}</p>
                            )}
                            {isSel && <span className={cn("text-[9px] font-bold uppercase tracking-wider", light ? "text-sapphire" : "text-gold")}>Selected</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className={cn("text-[10px] leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
                Add money to your wallet with any amount. Your level updates automatically as the balance grows.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TOP_UP_PRESETS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setTopUpAmount(String(a))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                      topUpAmount === String(a)
                        ? light ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                        : light ? "border-black/10 text-onyx/40 hover:border-emerald-500/30" : "border-white/10 text-cream-dim/50 hover:border-white/20"
                    )}
                  >
                    ₹{a}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Or enter custom amount (min ₹50)"
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none",
                  light ? "border-sapphire/20 bg-white text-onyx placeholder:text-onyx/30 focus:border-sapphire" : "border-white/10 bg-onyx text-cream placeholder:text-cream-dim/30 focus:border-gold"
                )}
              />
            </div>
          )}

          {checkout && (
            <div className={cn("pt-1 border-t", light ? "border-black/5" : "border-white/5")}>
              <p className={cn("text-[10px] uppercase tracking-[0.2em] font-semibold mb-2", light ? "text-sapphire/60" : "text-white/50")}>
                Select Payment Method
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => { setPayMethod(m.key); setError(""); }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-300 text-left",
                      payMethod === m.key
                        ? (light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5")
                        : (light ? "border-black/10 bg-white hover:border-sapphire/30" : "border-white/10 bg-white/[0.03] hover:border-gold/30")
                    )}
                  >
                    <span className={cn("transition-colors duration-300", payMethod === m.key ? (light ? "text-sapphire" : "text-gold") : (light ? "text-onyx/40" : "text-dark-500"))}>{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[10px] font-bold", payMethod === m.key ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-600" : "text-cream-dim/80"))}>{m.label}</p>
                      <p className={cn("text-[9px] mt-0.5 leading-snug", light ? "text-onyx/40" : "text-dark-500")}>{m.desc}</p>
                    </div>
                    {payMethod === m.key && (
                      <span className={cn("absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full", light ? "bg-sapphire text-white" : "bg-gold text-abyss")}>
                        <Check size={9} />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {payMethod === "upi" && (
                <div className={cn("mt-3 rounded-xl border p-3", light ? "border-black/10 bg-dark-50/40" : "border-white/10 bg-graphite")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={12} className={light ? "text-sapphire" : "text-gold"} />
                    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/60")}>Pay via UPI</p>
                  </div>
                  <p className={cn("text-[10px] leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
                    After requesting, a QR code will appear to complete payment of <span className="font-bold">{formatPrice(checkout.amount)}</span>. Enter the transaction ID after payment.
                  </p>
                </div>
              )}

              {payMethod === "cod" && (
                <div className={cn("mt-3 rounded-xl border p-3 text-[10px] leading-relaxed", light ? "border-black/10 bg-dark-50/40 text-onyx/50" : "border-white/10 bg-graphite text-dark-500")}>
                  Pay with cash when your upgrade is delivered. Please keep exact change ready.
                </div>
              )}

              {payMethod === "upi_delivery" && (
                <div className={cn("mt-3 rounded-xl border p-3 text-[10px] leading-relaxed", light ? "border-black/10 bg-dark-50/40 text-onyx/50" : "border-white/10 bg-graphite text-dark-500")}>
                  The owner or delivery partner will share a UPI QR code when upgrading your card. Scan and pay to complete your upgrade.
                </div>
              )}

              {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!payMethod || submitting}
                className={cn(
                  "mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                  light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                )}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                {submitting ? "Submitting..." : checkout.mode === "upgrade"
                  ? `Upgrade to ${LEVELS[checkout.target]?.name || checkout.target} — ${formatPrice(checkout.amount)}`
                  : `Submit Top-Up of ${formatPrice(checkout.amount)}`}
              </button>
            </div>
          )}
        </>
      )}

      <CardUpgradeUpiModal
        key={upiModalKey}
        open={upiModal}
        onClose={() => setUpiModal(false)}
        amount={pending?.amount ?? 0}
        note={pending?.mode === "topup" ? "BatraVerse Wallet Top-Up" : "BatraVerse Card Upgrade"}
        onSubmit={submitUpi}
        onSuccess={handleUpiSuccess}
      />
    </div>
  );
}