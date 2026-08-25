"use client";

import { LEVELS, getLevelFromBalance, LEVEL_ORDER, getBalanceForNextLevel, type LevelKey } from "@/lib/levels";
import { cn } from "@/lib/utils";

export default function MemberCard({
  walletBalance,
  peakWalletBalance,
  name,
  cardNumber,
  cardLevel,
  cardExpiry,
  className = "",
}: {
  walletBalance: number;
  peakWalletBalance?: number;
  name: string;
  cardNumber?: string | null;
  cardLevel?: string | null;
  cardExpiry?: string | null;
  className?: string;
}) {
  const effectiveLevel: LevelKey =
    cardLevel && cardLevel in LEVELS ? (cardLevel as LevelKey) : getLevelFromBalance(peakWalletBalance ?? walletBalance);
  const meta = LEVELS[effectiveLevel];
  const LevelIcon = meta.icon;
  const idx = LEVEL_ORDER.indexOf(effectiveLevel as (typeof LEVEL_ORDER)[number]);
  const nextLevel = idx >= 0 && idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
  const nextThreshold = nextLevel ? getBalanceForNextLevel(effectiveLevel) : null;
  const remaining = nextThreshold ? Math.max(0, nextThreshold - (peakWalletBalance ?? walletBalance)) : 0;

  const isExpiring = cardExpiry && new Date(cardExpiry) > new Date();
  const expiryDate = cardExpiry ? new Date(cardExpiry) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6",
        className
      )}
      style={{ backgroundColor: "#050506" }}
    >
      {/* Gradient overlay */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", meta.grad)}
      />
      <div className="relative">
        {/* card chip */}
        <div
          aria-hidden
          className="absolute right-6 top-5 h-8 w-11 rounded-md bg-gradient-to-br from-gold-light/80 to-gold/70"
          style={{ boxShadow: "0 4px 14px rgba(212,175,55,0.35)" }}
        />
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/50">
          Batra Verse · Members
        </p>

        <p className="mt-6 font-mono text-lg font-semibold tracking-widest text-white sm:text-xl">
          {name || "—"}
        </p>

        <div className="mt-3 flex items-center gap-2">
          {meta.name && LevelIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.16em]",
                meta.chip
              )}
            >
              <LevelIcon size={11} />
              {meta.name}
            </span>
          )}
          {effectiveLevel === "none" && (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.16em] text-white/70">
              MEMBER
            </span>
          )}
          {meta.discount > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              {meta.discount}% OFF
            </span>
          )}
          {meta.freeDeliveries > 0 && (
            <span className="inline-flex items-center rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[9px] font-bold text-sky-300">
              {meta.freeDeliveries} Free Delivery/mo
            </span>
          )}
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/50">
              Card Number
            </p>
            <p className="font-mono text-lg font-bold tracking-[0.15em] text-white sm:text-xl">
              {cardNumber || "—"}
            </p>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-white/60">
            {nextLevel && remaining > 0 && (
              <>
                ₹{remaining.toLocaleString("en-IN")} more
                <br />
                to {LEVELS[nextLevel].name}
              </>
            )}
            {effectiveLevel === "black" && (
              <>
                Highest
                <br />
                status
              </>
            )}
            {isExpiring && expiryDate && (
              <p className="mt-1 text-amber-300/70">
                Expires {expiryDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
