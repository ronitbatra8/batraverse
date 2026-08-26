"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import MemberCard from "@/components/auth/MemberCard";
import { Spinner, useLight } from "@/components/auth/auth-ui";
import { apiFetch } from "@/lib/api";
import { cn, errMessage, formatPrice } from "@/lib/utils";
import { getLevelFromBalance, LEVELS, type LevelKey } from "@/lib/levels";
import {
  CreditCard,
  Loader2,
  Save,
  Lock,
  Shield,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

function getNamePrefix(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return "BV";
}

function CardsContent() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const light = useLight();

  const effectiveLevel: LevelKey = (() => {
    if (user?.cardLevel && user.cardLevel in LEVELS) return user.cardLevel as LevelKey;
    return getLevelFromBalance(user?.peakWalletBalance ?? user?.walletBalance ?? 0);
  })();

  const [customCardText, setCustomCardText] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [cardMode, setCardMode] = useState<"half" | "full">("half");
  const [cardNumberSaving, setCardNumberSaving] = useState(false);
  const [cardNumberMsg, setCardNumberMsg] = useState("");
  const [cardNumberErr, setCardNumberErr] = useState("");

  const [cardPin, setCardPin] = useState("");
  const [cardPinConfirm, setCardPinConfirm] = useState("");
  const [cardPinPassword, setCardPinPassword] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
  }, [loading, user, router]);

  const handleSaveCardNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardNumberMsg("");
    setCardNumberErr("");
    if (cardMode === "full") {
      if (!customPrefix.trim()) { setCardNumberErr("Enter a prefix (1-6 letters)"); return; }
      if (!customCardText.trim()) { setCardNumberErr("Enter text (1-10 letters)"); return; }
    } else {
      if (!customCardText.trim()) { setCardNumberErr("Enter text (1-10 letters)"); return; }
    }
    setCardNumberSaving(true);
    try {
      const body: Record<string, string> = { mode: cardMode, customText: customCardText.trim() };
      if (cardMode === "full") {
        body.customPrefix = customPrefix.trim();
        body.customNumber = customNumber.trim();
      }
      const data = await apiFetch("/auth/me/card-number", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (data?.cardNumber) {
        await refreshUser();
        setCardNumberMsg("Card number updated!");
        setCustomCardText("");
        setCustomPrefix("");
        setCustomNumber("");
        setTimeout(() => setCardNumberMsg(""), 2500);
      }
    } catch (err) {
      setCardNumberErr(errMessage(err));
    } finally {
      setCardNumberSaving(false);
    }
  };

  const handleSetCardPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg("");
    setPinErr("");
    if (cardPin.length < 4) { setPinErr("PIN must be at least 4 characters"); return; }
    if (cardPin !== cardPinConfirm) { setPinErr("PINs do not match"); return; }
    if (!cardPinPassword) { setPinErr("Enter your current password"); return; }
    setPinSaving(true);
    try {
      await apiFetch("/auth/me/card-pin", {
        method: "PUT",
        body: JSON.stringify({ pin: cardPin, currentPassword: cardPinPassword }),
      });
      setPinMsg("Card PIN set successfully!");
      setCardPin("");
      setCardPinConfirm("");
      setCardPinPassword("");
      setTimeout(() => setPinMsg(""), 2500);
    } catch (err) {
      setPinErr(errMessage(err));
    } finally {
      setPinSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!user) return null;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-6 pb-16 pt-24 sm:px-10 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{
          background: light
            ? "radial-gradient(closest-side, rgba(30,58,138,0.06), transparent)"
            : "radial-gradient(closest-side, rgba(212,175,55,0.08), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
          <div className="space-y-6">
          <div className="mx-auto max-w-sm">
            <div className="-mx-6 px-[3px] sm:mx-0 sm:px-0">
                <MemberCard
              walletBalance={user.walletBalance ?? 0}
              peakWalletBalance={user.peakWalletBalance ?? 0}
              name={user.name}
              cardNumber={user.cardNumber}
              cardLevel={user.cardLevel}
              cardExpiry={user.cardExpiry}
            />
            </div>
          </div>

          <div className="space-y-6">
            {/* Card Benefits Display */}
            <div className={cn(
              "rounded-2xl border p-4",
              light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50"
            )}>
              <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
                Your Benefits
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={cn("rounded-xl border p-3 text-center", light ? "border-sapphire/10 bg-sapphire/5" : "border-gold/10 bg-gold/5")}>
                  <p className={cn("text-lg font-bold", light ? "text-sapphire" : "text-gold")}>
                    {LEVELS[effectiveLevel]?.discount || 0}%
                  </p>
                  <p className={cn("text-[9px] uppercase tracking-wider", light ? "text-onyx/50" : "text-dark-500")}>Discount</p>
                </div>
                <div className={cn("rounded-xl border p-3 text-center", light ? "border-sky-500/10 bg-sky-500/5" : "border-sky-400/10 bg-sky-400/5")}>
                  <p className={cn("text-lg font-bold", light ? "text-sky-600" : "text-sky-300")}>
                    {LEVELS[effectiveLevel]?.freeDeliveries || 0}
                  </p>
                  <p className={cn("text-[9px] uppercase tracking-wider", light ? "text-onyx/50" : "text-dark-500")}>Free Delivery/mo</p>
                </div>
              </div>
            </div>

            {/* Customize Card Number */}
            <div className={cn(
              "rounded-2xl border p-4 space-y-3",
              light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50"
            )}>
              <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
                Customize Card Number
              </label>

              {(user.cardLevel === "black" || user.cardLevel === "owner") && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setCardMode("half"); setCustomPrefix(""); setCustomNumber(""); }}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                      cardMode === "half"
                        ? light ? "bg-sapphire/15 border-sapphire/30 text-sapphire" : "bg-gold/15 border-gold/30 text-gold"
                        : light ? "border-onyx/10 text-onyx/30" : "border-dark-700/50 text-dark-500"
                    )}
                  >
                    Half Custom (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardMode("full")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                      cardMode === "full"
                        ? light ? "bg-sapphire/15 border-sapphire/30 text-sapphire" : "bg-gold/15 border-gold/30 text-gold"
                        : light ? "border-onyx/10 text-onyx/30" : "border-dark-700/50 text-dark-500"
                    )}
                  >
                    Full Custom (Paid)
                  </button>
                </div>
              )}

              {cardMode === "full" && (user.cardLevel === "black" || user.cardLevel === "owner") ? (
                <form onSubmit={handleSaveCardNumber} className="space-y-3">
                  <div className={cn("flex items-center rounded-xl border text-sm font-mono overflow-hidden",
                    light ? "bg-white border-sapphire/20" : "bg-dark-800/60 border-dark-700/50"
                  )}>
                    <input
                      type="text"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 6))}
                      placeholder="PRE"
                      maxLength={6}
                      className={cn("w-20 px-3 py-2 text-sm font-mono font-bold focus:outline-none bg-transparent text-center",
                        light ? "text-sapphire placeholder:text-sapphire/30" : "text-gold placeholder:text-gold/30"
                      )}
                    />
                    <span className={cn("px-1 border-l text-xs",
                      light ? "border-sapphire/20 text-onyx/30" : "border-dark-700/50 text-dark-500"
                    )}>-</span>
                    <input
                      type="text"
                      value={customCardText}
                      onChange={(e) => setCustomCardText(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 10))}
                      placeholder="TEXT"
                      maxLength={10}
                      className={cn("flex-1 px-3 py-2 text-sm font-mono focus:outline-none bg-transparent",
                        light ? "text-onyx placeholder:text-onyx/30" : "text-white placeholder:text-dark-500"
                      )}
                    />
                    <span className={cn("px-1 border-l text-xs",
                      light ? "border-sapphire/20 text-onyx/30" : "border-dark-700/50 text-dark-500"
                    )}>-</span>
                    <input
                      type="text"
                      value={customNumber}
                      onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className={cn("w-20 px-3 py-2 text-sm font-mono focus:outline-none bg-transparent text-center",
                        light ? "text-onyx placeholder:text-onyx/30" : "text-white placeholder:text-dark-500"
                      )}
                    />
                  </div>
                  <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                    Preview: {customPrefix || "PRE"}-{customCardText || "TEXT"}-{customNumber || "000000"}
                  </p>
                  <button type="submit" disabled={cardNumberSaving || !customPrefix.trim() || !customCardText.trim()}
                    className={cn("w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50",
                      light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                    )}>
                    {cardNumberSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {cardNumberSaving ? "Saving..." : "Generate"}
                  </button>
                </form>
              ) : user.cardLevel === "black" || user.cardLevel === "owner" ? (
                <form onSubmit={handleSaveCardNumber} className="space-y-3">
                  <div className={cn("flex items-center rounded-xl border text-sm font-mono overflow-hidden",
                    light ? "bg-white border-sapphire/20" : "bg-dark-800/60 border-dark-700/50"
                  )}>
                    <span className={cn("px-3 py-2 border-r text-xs font-bold shrink-0",
                      light ? "bg-gold/10 border-sapphire/20 text-gold" : "bg-gold/10 border-gold/20 text-gold"
                    )}>{getNamePrefix(user.name || "")}-</span>
                    <input
                      type="text"
                      value={customCardText}
                      onChange={(e) => setCustomCardText(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 10))}
                      placeholder="TEXT"
                      maxLength={10}
                      className={cn("flex-1 px-3 py-2 text-sm font-mono focus:outline-none bg-transparent",
                        light ? "text-onyx placeholder:text-onyx/30" : "text-white placeholder:text-dark-500"
                      )}
                    />
                    <span className={cn("px-3 py-2 border-l text-xs font-bold shrink-0",
                      light ? "bg-sapphire/5 border-sapphire/20 text-sapphire/40" : "bg-dark-900/50 border-dark-700/50 text-dark-500"
                    )}>-XXXX</span>
                  </div>
                  <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                    Preview: {getNamePrefix(user.name || "")}-{customCardText || "TEXT"}-XXXX
                  </p>
                  <button type="submit" disabled={cardNumberSaving || !customCardText.trim()}
                    className={cn("w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50",
                      light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                    )}>
                    {cardNumberSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {cardNumberSaving ? "Saving..." : "Generate"}
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className={cn("flex items-center rounded-xl border text-sm font-mono overflow-hidden opacity-70",
                    light ? "bg-white border-sapphire/20" : "bg-dark-800/60 border-dark-700/50"
                  )}>
                    <span className={cn("px-3 py-2 border-r text-xs font-bold shrink-0",
                      light ? "bg-sapphire/10 border-sapphire/20 text-sapphire" : "bg-gold/10 border-gold/20 text-gold"
                    )}>{getNamePrefix(user.name || "")}-XXXX-XXXX</span>
                  </div>
                  <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                    Upgrade to Black tier for custom card number
                  </p>
                </div>
              )}

              {cardNumberMsg && <p className="text-emerald-400 text-xs">{cardNumberMsg}</p>}
              {cardNumberErr && <p className="text-red-400 text-xs">{cardNumberErr}</p>}
            </div>

            {/* Card PIN */}
            <div className={cn(
              "rounded-2xl border p-4 space-y-3",
              light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50"
            )}>
              <div className="flex items-center gap-2">
                <Shield size={14} className={light ? "text-sapphire" : "text-gold"} />
                <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
                  Card Login PIN {user.hasCardPin ? "(Set)" : "(Not set)"}
                </label>
              </div>
              <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                Set a separate PIN to log in with your card number. You can also use your account password.
              </p>
              <form onSubmit={handleSetCardPin} className="space-y-2">
                <input
                  type="password"
                  value={cardPin}
                  onChange={(e) => setCardPin(e.target.value)}
                  placeholder="New PIN (4+ characters)"
                  className={cn("w-full rounded-xl border px-3 py-2 text-xs focus:outline-none",
                    light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                  )}
                />
                <input
                  type="password"
                  value={cardPinConfirm}
                  onChange={(e) => setCardPinConfirm(e.target.value)}
                  placeholder="Confirm PIN"
                  className={cn("w-full rounded-xl border px-3 py-2 text-xs focus:outline-none",
                    light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                  )}
                />
                <input
                  type="password"
                  value={cardPinPassword}
                  onChange={(e) => setCardPinPassword(e.target.value)}
                  placeholder="Current account password"
                  className={cn("w-full rounded-xl border px-3 py-2 text-xs focus:outline-none",
                    light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                  )}
                />
                <button type="submit" disabled={pinSaving}
                  className={cn("w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50",
                    light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                  )}>
                  {pinSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  {pinSaving ? "Setting..." : "Set Card PIN"}
                </button>
              </form>
              {pinMsg && <p className="text-emerald-400 text-xs">{pinMsg}</p>}
              {pinErr && <p className="text-red-400 text-xs">{pinErr}</p>}
            </div>

            {/* Wallet */}
            <div className="space-y-4">
              <h3 className={cn("text-xs font-semibold uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold/80")}>
                Wallet
              </h3>
              <div className={cn("rounded-2xl border p-5 flex items-center justify-between", light ? "border-black/10 bg-white" : "border-white/10 bg-white/[0.03]")}>
                <div>
                  <p className={cn("text-2xl font-bold", light ? "text-dark-900" : "text-white")}>₹{(user?.walletBalance ?? 0).toFixed(0)}</p>
                  <p className={cn("text-[10px] mt-0.5", light ? "text-onyx/40" : "text-dark-600")}>Current balance</p>
                </div>
                <Link href="/wallet" className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gold text-abyss hover:bg-gold/90")}>
                  <Wallet size={14} /> Recharge
                </Link>
              </div>
            </div>

            {/* Tier Benefits */}
            <div className="space-y-4">
              <h3 className={cn("text-xs font-semibold uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold/80")}>
                Recharge & Level Up
              </h3>
              <p className={cn("text-[10px] leading-relaxed", light ? "text-onyx/50" : "text-dark-500")}>
                Recharge your wallet to unlock higher tiers. More balance = better perks.
              </p>
              <div className="space-y-2">
                {([
                  { level: "bronze", min: 100, discount: 0, freeDel: 1 },
                  { level: "silver", min: 500, discount: 0, freeDel: 2 },
                  { level: "gold", min: 1500, discount: 0, freeDel: 5 },
                  { level: "platinum", min: 5000, discount: 5, freeDel: 7 },
                  { level: "diamond", min: 15000, discount: 10, freeDel: 10 },
                  { level: "black", min: 30000, discount: 15, freeDel: 15 },
                  ] as const).map((tier) => {
                  const meta = LEVELS[tier.level];
                  const isCurrentOrAbove = effectiveLevel === "owner" || (user?.walletBalance ?? 0) >= tier.min;
                  const LevelIcon = meta.icon;
                  return (
                    <Link key={tier.level} href={`/wallet?amount=${tier.min}`}
                      className={cn("rounded-xl border p-4 flex items-center gap-4 transition-all cursor-pointer",
                        isCurrentOrAbove
                          ? (light ? "border-sapphire/30 bg-sapphire/5 hover:border-sapphire/50" : "border-gold/30 bg-gold/5 hover:border-gold/50")
                          : (light ? "border-black/10 bg-white hover:border-sapphire/30" : "border-white/10 bg-white/[0.03] hover:border-gold/30")
                      )}>
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isCurrentOrAbove ? meta.chip : (light ? "bg-dark-100" : "bg-white/5"))}>
                        {LevelIcon ? <LevelIcon size={16} className={isCurrentOrAbove ? "" : (light ? "text-dark-400" : "text-dark-500")} /> : <span className={cn("text-xs font-bold", isCurrentOrAbove ? meta.text : (light ? "text-dark-400" : "text-dark-500"))}>•</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", isCurrentOrAbove ? (light ? "text-sapphire" : "text-gold-light") : (light ? "text-dark-500" : "text-dark-500"))}>
                            {meta.name || "Member"}
                          </span>
                          <span className={cn("text-[9px]", light ? "text-onyx/40" : "text-dark-600")}>₹{tier.min.toLocaleString("en-IN")}+</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {tier.discount > 0 && (
                            <span className={cn("text-[9px]", isCurrentOrAbove ? (light ? "text-emerald-600" : "text-emerald-400") : (light ? "text-onyx/40" : "text-dark-600"))}>
                              {tier.discount}% off all orders
                            </span>
                          )}
                          <span className={cn("text-[9px]", isCurrentOrAbove ? (light ? "text-sky-600" : "text-sky-400") : (light ? "text-onyx/40" : "text-dark-600"))}>
                            {tier.freeDel} free {tier.freeDel === 1 ? "delivery" : "deliveries"}/mo
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrentOrAbove && (
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", meta.chip)}>Active</span>
                        )}
                        <ArrowUpRight size={14} className={light ? "text-onyx/30" : "text-dark-600"} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CardsContent />
    </Suspense>
  );
}
