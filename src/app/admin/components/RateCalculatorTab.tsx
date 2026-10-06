"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { marginAt, priceToSet } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* Owner-side rate calculator.

   Deliberately independent of the approval form: every charge here is an
   input rather than a fixed rate, because GST, delivery and gateway costs
   differ per product. Two directions:

     set   - how much do I charge so that every cost is covered and we still
             keep the margin I asked for? Zero margin is break-even.
     check - I already have a price; what does it leave BatraVerse?

   The split itself lives in lib/pricing.ts next to the seller estimate so
   both read the same rules about inclusive GST and percentage-of-total
   gateway fees. */

type Mode = "set" | "check";

const DEFAULTS = {
  main: "250",
  gst: "18",
  delivery: "49",
  gateway: "2",
  cod: "35",
  margin: "0",
  customer: "600",
  useCod: false,
};

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const rupee = (n: number) => `₹${inr.format(n)}`;
const pct = (n: number) => `${pctFmt.format(n)}%`;
const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const inputCls =
  "w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-dark-600 mt-1">{hint}</p>}
    </div>
  );
}

function Row({ label, note, value, strong }: { label: string; note?: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={strong ? "text-dark-200 font-medium" : "text-dark-400"}>
        {label}
        {note && <span className="block text-[10px] text-dark-600 font-normal">{note}</span>}
      </span>
      <span className={cn("whitespace-nowrap", strong ? "text-gold-400 font-semibold" : "text-white font-medium")}>
        {value >= 0 ? "" : "−"}
        {rupee(Math.abs(value))}
      </span>
    </div>
  );
}

export default function RateCalculatorTab() {
  const [mode, setMode] = useState<Mode>("set");
  const [f, setF] = useState(DEFAULTS);

  const set = (patch: Partial<typeof DEFAULTS>) => setF((prev) => ({ ...prev, ...patch }));

  const charges = useMemo(
    () => ({
      sellerPrice: num(f.main),
      gstRate: num(f.gst) / 100,
      delivery: num(f.delivery),
      gatewayRate: num(f.gateway) / 100,
      cod: f.useCod ? num(f.cod) : 0,
    }),
    [f]
  );

  const result = useMemo(
    () => (mode === "set" ? priceToSet(charges, num(f.margin)) : marginAt(num(f.customer), charges)),
    [mode, charges, f.margin, f.customer]
  );

  const hasInput = num(f.main) > 0;
  const inLoss = hasInput && result.margin <= 0;
  const marginShare = result.customerPrice > 0 ? (result.margin / result.customerPrice) * 100 : 0;
  const headline = mode === "set" ? result.customerPrice : result.margin;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold-light">
          <Calculator size={18} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Rate Calculator</h2>
          <p className="text-xs text-dark-400">
            Price a product against its own charges and see what BatraVerse keeps.
          </p>
        </div>
        <button
          onClick={() => setF(DEFAULTS)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dark-700 bg-dark-800/60 text-[11px] text-dark-300 hover:text-white hover:border-gold-500/40 transition-all uppercase tracking-wider font-semibold"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4 sm:p-5 space-y-4">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold">What do you have?</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "set", label: "A cost", sub: "Find the price to set" },
                { key: "check", label: "A price", sub: "Find our margin" },
              ] as const).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-all",
                    mode === m.key
                      ? "bg-gold/10 border-gold/40 text-gold-light"
                      : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200"
                  )}
                >
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="block text-[10px] opacity-70">{m.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4 sm:p-5 space-y-4">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Product & charges</label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Main price — what you pay the seller (₹)" hint="Per unit, before any charges">
                <input type="number" min={0} step="0.01" value={f.main} onChange={(e) => set({ main: e.target.value })} className={inputCls} placeholder="250" />
              </Field>

              <Field label="GST (%)" hint="Read out of the price, never added on top">
                <input type="number" min={0} max={100} step="0.01" value={f.gst} onChange={(e) => set({ gst: e.target.value })} className={inputCls} placeholder="18" />
              </Field>

              <Field label="Delivery charge (₹)" hint="What the customer pays for shipping">
                <input type="number" min={0} step="0.01" value={f.delivery} onChange={(e) => set({ delivery: e.target.value })} className={inputCls} placeholder="49" />
              </Field>

              <Field label="Razorpay / gateway fee (%)" hint="Of the customer-paid total">
                <input type="number" min={0} max={100} step="0.01" value={f.gateway} onChange={(e) => set({ gateway: e.target.value })} className={inputCls} placeholder="2" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Field label="COD collection fee (₹)">
                <input type="number" min={0} step="0.01" value={f.cod} onChange={(e) => set({ cod: e.target.value })} disabled={!f.useCod} className={cn(inputCls, "disabled:opacity-40 disabled:cursor-not-allowed")} placeholder="35" />
              </Field>
              <div>
                <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1.5">Order type</label>
                <button
                  type="button"
                  onClick={() => set({ useCod: !f.useCod })}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    f.useCod ? "bg-amber-500/10 border-amber-500/40 text-amber-300" : "bg-dark-800/60 border-dark-700/50 text-dark-300 hover:text-white"
                  )}
                >
                  {f.useCod ? "Cash on delivery" : "Prepaid"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4 sm:p-5 space-y-4">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold">
              {mode === "set" ? "Target" : "Price you are considering"}
            </label>
            {mode === "set" ? (
              <Field label="BatraVerse margin to keep (₹)" hint="0 = break-even. Anything below that price is a loss.">
                <input type="number" min={0} step="0.01" value={f.margin} onChange={(e) => set({ margin: e.target.value })} className={inputCls} placeholder="0" />
              </Field>
            ) : (
              <Field label="Customer price (₹)" hint="What the buyer is charged for the item">
                <input type="number" min={0} step="0.01" value={f.customer} onChange={(e) => set({ customer: e.target.value })} className={inputCls} placeholder="600" />
              </Field>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-dark-900 border border-dark-700 shadow-lg shadow-black/30 p-4 sm:p-5 space-y-4">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold">
              {mode === "set" ? "Price you should set" : "BatraVerse margin"}
            </label>

            <div className="flex items-end gap-3">
              <span className={cn("text-3xl font-semibold leading-none", inLoss ? "text-red-400" : mode === "set" ? "text-gold-400" : "text-emerald-400")}>
                {rupee(headline)}
              </span>
              {mode === "check" && (
                <span className={cn("flex items-center gap-1 pb-1 text-[11px] font-medium", result.margin >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {result.margin >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {pct(marginShare)} of price
                </span>
              )}
            </div>

            <p className="text-xs text-dark-500">
              {mode === "set"
                ? `Customer pays ${rupee(result.customerPrice)}, of which ${rupee(result.margin)} is kept by BatraVerse.`
                : `At ${rupee(result.customerPrice)} the platform keeps ${rupee(result.margin)} after every charge.`}
            </p>

            {inLoss && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/15 border border-red-500/40 px-3 py-2.5 text-[11px] text-red-200">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <span>
                  {mode === "set"
                    ? "The charges below exceed what was allowed. Raise the price or lower a charge — this configuration loses money."
                    : "This price does not cover its own charges. BatraVerse would take the loss."}
                </span>
              </div>
            )}

            <div className="border-t border-dark-700 pt-4 space-y-2.5">
              <Row label="Seller payout" note="Main price you entered" value={result.sellerPrice} />
              <Row label="Delivery charge" note={num(f.delivery) > 0 ? "Charged to the customer" : "No delivery charged"} value={result.delivery} />
              <Row label="Razorpay / gateway" note={`${pct(num(f.gateway))} of the customer price`} value={-result.gateway} />
              {f.useCod && <Row label="COD collection" note="Only on cash-on-delivery orders" value={-result.cod} />}
              <Row
                label="GST"
                note={`${pct(num(f.gst))} · sits inside the price · before GST ${rupee(result.netBeforeGst)}`}
                value={-result.gst}
              />
              <Row
                label="BatraVerse margin"
                note={mode === "set" ? "What is left after every charge" : "The remainder on this price"}
                value={result.margin}
                strong
              />
            </div>

            <div className="border-t border-dark-600 pt-4 flex items-end justify-between gap-3">
              <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Customer pays</span>
              <span className="text-2xl font-semibold text-white leading-none">{rupee(result.customerPrice)}</span>
            </div>

            <p className="text-[10px] text-dark-600 leading-relaxed">
              Estimate only. GST is read out of the customer price rather than added to it, and the gateway
              fee is taken on the customer-paid total — the same base the live dashboard uses. Delivery is a
              flat per-order figure here, so free-delivery orders above the checkout thresholds will keep more
              than shown.
            </p>
          </div>

          {!hasInput && (
            <p className="text-sm text-dark-500 italic">Enter the main price to see a breakdown.</p>
          )}
        </div>
      </div>
    </div>
  );
}
