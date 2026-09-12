"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import MemberCard from "@/components/auth/MemberCard";
import CardUpgradeCheckout from "@/components/cards/CardUpgradeCheckout";
import { Spinner, useLight } from "@/components/auth/auth-ui";
import UserWalletHistory from "@/components/cards/UserWalletHistory";
import { apiFetch } from "@/lib/api";
import { cn, errMessage } from "@/lib/utils";
import { getEffectiveLevel, LEVELS, type LevelKey } from "@/lib/levels";
import {
  Loader2,
  Save,
  Lock,
  Shield,
  Wallet,
  History,
  CreditCard,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react";

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

  const effectiveLevel: LevelKey = getEffectiveLevel({
    cardLevel: user?.cardLevel,
    peakWalletBalance: user?.peakWalletBalance,
    walletBalance: user?.walletBalance,
  });

  const [customCardText, setCustomCardText] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [cardMode, setCardMode] = useState<"half" | "full">("half");
  const [cardNumberSaving, setCardNumberSaving] = useState(false);
  const [cardNumberMsg, setCardNumberMsg] = useState("");
  const [cardNumberErr, setCardNumberErr] = useState("");

  const [cardPin, setCardPin] = useState("");
  const [cardPinConfirm, setCardPinConfirm] = useState("");
  const [cardPinCurrent, setCardPinCurrent] = useState("");
  const [cardPinPassword, setCardPinPassword] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");

  const [pinForgot, setPinForgot] = useState(false);
  const [pinOtp, setPinOtp] = useState("");
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinResetToken, setPinResetToken] = useState("");
  const [pinOtpMsg, setPinOtpMsg] = useState("");
  const [pinOtpErr, setPinOtpErr] = useState("");
  const [pinOtpLoading, setPinOtpLoading] = useState(false);

  const [balanceRevealed, setBalanceRevealed] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [cardSubView, setCardSubView] = useState<"overview" | "history">("overview");
  const [balancePinOpen, setBalancePinOpen] = useState(false);
  const [balancePin, setBalancePin] = useState("");
  const [balancePinErr, setBalancePinErr] = useState("");
  const [balancePinLoading, setBalancePinLoading] = useState(false);

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

  const hasPin = !!user?.hasCardPin;

  const handleRevealBalance = () => {
    if (balanceRevealed) return;
    if (!hasPin) return revealBalance();
    setBalancePinErr("");
    setBalancePin("");
    setBalancePinOpen(true);
  };

  const revealBalance = () => {
    setBalanceRevealed(true);
    setBalancePinOpen(false);
    const target = user?.walletBalance ?? 0;
    const duration = 1200;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplayBalance(Math.round(target * easeOutCubic(t)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const handleBalancePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBalancePinErr("");
    if (!/^\d{6}$/.test(balancePin)) { setBalancePinErr("Enter your 6-digit card PIN"); return; }
    setBalancePinLoading(true);
    try {
      await apiFetch("/auth/me/card-pin/verify", {
        method: "POST",
        body: JSON.stringify({ pin: balancePin }),
      });
      setBalancePin("");
      revealBalance();
    } catch (err) {
      setBalancePinErr(errMessage(err));
    } finally {
      setBalancePinLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg("");
    setPinErr("");
    if (!/^\d{6}$/.test(cardPin)) { setPinErr("Card PIN must be exactly 6 digits"); return; }
    if (cardPin !== cardPinConfirm) { setPinErr("PINs do not match"); return; }
    if (!cardPinPassword) { setPinErr("Enter your current account password"); return; }
    if (hasPin && !/^\d{6}$/.test(cardPinCurrent)) { setPinErr("Enter your current card PIN (6 digits)"); return; }
    setPinSaving(true);
    try {
      const body = { pin: cardPin, currentPassword: cardPinPassword, currentPin: hasPin ? cardPinCurrent : undefined };
      await apiFetch("/auth/me/card-pin", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setPinMsg(hasPin ? "Card PIN changed successfully!" : "Card PIN set successfully!");
      setCardPin("");
      setCardPinConfirm("");
      setCardPinCurrent("");
      setCardPinPassword("");
      await refreshUser();
      setTimeout(() => setPinMsg(""), 3500);
    } catch (err) {
      setPinErr(errMessage(err));
    } finally {
      setPinSaving(false);
    }
  };

  const handleSendPinOtp = async () => {
    setPinOtpLoading(true);
    setPinOtpMsg("");
    setPinOtpErr("");
    try {
      const data = await apiFetch("/auth/me/card-pin/send-otp", { method: "POST" });
      setPinOtpSent(true);
      setPinOtpMsg(data.message || "OTP sent to your registered email");
    } catch (err) {
      setPinOtpErr(errMessage(err));
    } finally {
      setPinOtpLoading(false);
    }
  };

  const handleVerifyPinOtp = async () => {
    setPinOtpMsg("");
    setPinOtpErr("");
    if (!/^\d{6}$/.test(pinOtp)) { setPinOtpErr("Enter the 6-digit OTP"); return; }
    setPinOtpLoading(true);
    try {
      const data = await apiFetch("/auth/me/card-pin/verify-otp", {
        method: "POST",
        body: JSON.stringify({ code: pinOtp }),
      });
      setPinResetToken(data.resetToken);
      setPinOtpMsg("OTP verified. Set your new 6-digit card PIN below.");
    } catch (err) {
      setPinOtpErr(errMessage(err));
    } finally {
      setPinOtpLoading(false);
    }
  };

  const handlePinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg("");
    setPinErr("");
    setPinOtpMsg("");
    setPinOtpErr("");
    if (!/^\d{6}$/.test(cardPin)) { setPinErr("Card PIN must be exactly 6 digits"); return; }
    if (cardPin !== cardPinConfirm) { setPinErr("PINs do not match"); return; }
    setPinSaving(true);
    try {
      await apiFetch("/auth/me/card-pin/reset", {
        method: "POST",
        body: JSON.stringify({ resetToken: pinResetToken, pin: cardPin }),
      });
      setPinMsg("Card PIN reset successfully!");
      setCardPin("");
      setCardPinConfirm("");
      setCardPinCurrent("");
      setCardPinPassword("");
      setPinOtp("");
      setPinOtpSent(false);
      setPinResetToken("");
      setPinForgot(false);
      await refreshUser();
      setTimeout(() => setPinMsg(""), 3500);
    } catch (err) {
      setPinErr(errMessage(err));
    } finally {
      setPinSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!user) return null;

  const peak = user.peakWalletBalance ?? 0;
  const canHalfCustom = effectiveLevel === "black" || effectiveLevel === "owner";
  const canFullCustom = peak >= 50000 || effectiveLevel === "owner";

  return (
    <div className={cn("relative min-h-[calc(100vh-4rem)] overflow-hidden pb-16 pt-12 sm:pt-16", cardSubView === "history" ? "px-0 sm:px-10" : "px-6 sm:px-10")}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{
          background: light
            ? "radial-gradient(closest-side, rgba(30,58,138,0.06), transparent)"
            : "radial-gradient(closest-side, rgba(212,175,55,0.08), transparent)",
        }}
      />

      <div className={cn("relative z-10 mx-auto w-full", cardSubView === "history" ? "max-w-full sm:max-w-5xl" : "max-w-5xl")}>
        <div className="mb-6 flex items-center gap-2 border-b pb-3" style={{ borderColor: light ? "rgba(30,58,138,0.15)" : "rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            onClick={() => setCardSubView("overview")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              cardSubView === "overview"
                ? light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold"
                : light ? "text-onyx/40 hover:text-onyx" : "text-dark-400 hover:text-white"
            )}
          >
            <CreditCard className="w-4 h-4" /> Overview
          </button>
          <button
            type="button"
            onClick={() => setCardSubView("history")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              cardSubView === "history"
                ? light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold"
                : light ? "text-onyx/40 hover:text-onyx" : "text-dark-400 hover:text-white"
            )}
          >
            <History className="w-4 h-4" /> History
          </button>
        </div>

        {cardSubView === "history" ? (
          <UserWalletHistory />
        ) : (
          <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:h-full lg:col-span-5">
              <div className="-mx-6 px-[3px] sm:mx-0 sm:px-0 lg:h-full">
                <MemberCard
                  className="h-full w-full"
                  walletBalance={user.walletBalance ?? 0}
                  peakWalletBalance={user.peakWalletBalance ?? 0}
                  name={user.name}
                  cardNumber={user.cardNumber}
                  cardLevel={user.cardLevel}
                  cardExpiry={user.cardExpiry}
                />
              </div>
            </div>

            {/* Wallet Balance */}
            <div className={cn(
              "rounded-2xl border p-4 lg:p-6 space-y-4 flex flex-col lg:col-span-7",
              light ? "bg-white border-sapphire/20" : "bg-dark-900/60 border-dark-800/50"
            )}>
              <div className="flex items-center justify-between">
                <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
                  Wallet Balance
                </label>
                <span className={cn("flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", LEVELS[effectiveLevel]?.chip)}>
                  <Wallet size={10} /> {LEVELS[effectiveLevel]?.name || effectiveLevel.toUpperCase()}
                </span>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {balanceRevealed ? (
                    <p className={cn("text-2xl font-bold tabular-nums", light ? "text-onyx" : "text-cream")}>
                      ₹{displayBalance.toLocaleString("en-IN")}
                    </p>
                  ) : balancePinOpen ? (
                    <form onSubmit={handleBalancePinSubmit} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          value={balancePin}
                          onChange={(e) => setBalancePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Card PIN"
                          className={cn("w-32 rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                            light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                          )}
                        />
                        <button type="submit" disabled={balancePinLoading || balancePin.length !== 6}
                          className={cn("flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50",
                            light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                          )}
                        >
                          {balancePinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                          {balancePinLoading ? "Checking..." : "Confirm"}
                        </button>
                      </div>
                      {balancePinErr && <p className="text-red-400 text-[10px]">{balancePinErr}</p>}
                      <p className={cn("text-[10px] flex items-center gap-1.5", light ? "text-onyx/40" : "text-dark-500")}>
                        <Lock size={10} className="shrink-0" />
                        Enter your 6-digit card PIN to check balance.
                        <button type="button" onClick={() => setBalancePinOpen(false)} className={cn("underline", light ? "text-sapphire" : "text-gold")}>Cancel</button>
                      </p>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRevealBalance}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                        light
                          ? "bg-sapphire/10 text-sapphire hover:bg-sapphire/20 border border-sapphire/20"
                          : "bg-gold/10 text-gold hover:bg-gold/20 border border-gold/25"
                      )}
                    >
                      <Wallet size={14} /> Check Balance
                    </button>
                  )}
                  <p className={cn("mt-1.5 text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                    Peak balance ₹{peak.toLocaleString("en-IN")} lifetime
                  </p>
                </div>
              </div>
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
                    {LEVELS[effectiveLevel]?.discountFlat ? `₹${LEVELS[effectiveLevel]?.discountFlat}` : "0"}
                  </p>
                  <p className={cn("text-[9px] uppercase tracking-wider", light ? "text-onyx/50" : "text-dark-500")}>
                    {LEVELS[effectiveLevel]?.discountFlat ? `Off ${LEVELS[effectiveLevel]?.discountFlatMin}+` : "Discount"}
                  </p>
                </div>
                <div className={cn("rounded-xl border p-3 text-center", light ? "border-sky-500/10 bg-sky-500/5" : "border-sky-400/10 bg-sky-400/5")}>
                  <p className={cn("text-lg font-bold", light ? "text-sky-600" : "text-sky-300")}>
                    {LEVELS[effectiveLevel]?.freeDeliveries || 0}
                  </p>
                  <p className={cn("text-[9px] uppercase tracking-wider", light ? "text-onyx/50" : "text-dark-500")}>Free Delivery/mo</p>
                  {LEVELS[effectiveLevel]?.freeDeliveries > 0 && (
                    <p className={cn("text-[8px] font-semibold", light ? "text-sky-600" : "text-sky-300")}>
                      Above ₹{LEVELS[effectiveLevel]?.freeDeliveryMin || 150}
                    </p>
                  )}
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

              {(canHalfCustom || canFullCustom) && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setCardMode("half"); setCustomPrefix(""); setCustomNumber(""); }}
                      disabled={!canHalfCustom}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        cardMode === "half"
                          ? light ? "bg-sapphire/15 border-sapphire/30 text-sapphire" : "bg-gold/15 border-gold/30 text-gold"
                          : light ? "border-onyx/10 text-onyx/30" : "border-dark-700/50 text-dark-500"
                      )}
                    >
                      Half Custom (Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCardMode("full"); setCustomPrefix(""); setCustomNumber(""); }}
                      disabled={!canFullCustom}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        cardMode === "full"
                          ? light ? "bg-sapphire/15 border-sapphire/30 text-sapphire" : "bg-gold/15 border-gold/30 text-gold"
                          : light ? "border-onyx/10 text-onyx/30" : "border-dark-700/50 text-dark-500"
                      )}
                    >
                      Full Custom (Paid)
                    </button>
                  </div>
                  {canHalfCustom && !canFullCustom && (
                    <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                      Full Custom unlocks at ₹50,000 lifetime balance (you stay Black)
                    </p>
                  )}
                </div>
              )}

              {canFullCustom && cardMode === "full" ? (
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
                      className={cn("w-20 px-3 h-10 text-sm font-mono font-bold focus:outline-none bg-transparent text-center",
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
                      className={cn("flex-1 px-3 h-10 text-sm font-mono focus:outline-none bg-transparent",
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
                      className={cn("w-20 px-3 h-10 text-sm font-mono focus:outline-none bg-transparent text-center",
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
              ) : canHalfCustom ? (
                <form onSubmit={handleSaveCardNumber} className="space-y-3">
                  <div className={cn("flex items-center rounded-xl border text-sm font-mono overflow-hidden",
                    light ? "bg-white border-sapphire/20" : "bg-dark-800/60 border-dark-700/50"
                  )}>
                    <span className={cn("px-3 h-10 flex items-center border-r text-xs font-bold shrink-0",
                      light ? "bg-gold/10 border-sapphire/20 text-gold" : "bg-gold/10 border-gold/20 text-gold"
                    )}>{getNamePrefix(user.name || "")}-</span>
                    <input
                      type="text"
                      value={customCardText}
                      onChange={(e) => setCustomCardText(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 10))}
                      placeholder="TEXT"
                      maxLength={10}
                      className={cn("flex-1 px-3 h-10 text-sm font-mono focus:outline-none bg-transparent",
                        light ? "text-onyx placeholder:text-onyx/30" : "text-white placeholder:text-dark-500"
                      )}
                    />
                    <span className={cn("px-3 h-10 flex items-center border-l text-xs font-bold shrink-0",
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
                    <span className={cn("px-3 h-10 flex items-center border-r text-xs font-bold shrink-0",
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Shield size={14} className={light ? "text-sapphire" : "text-gold"} />
                  <label className={cn("text-[10px] uppercase tracking-[0.3em] font-semibold", light ? "text-sapphire/60" : "text-white/50")}>
                    {hasPin ? "Change Card PIN" : "Set Card PIN"}
                  </label>
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border",
                    hasPin
                      ? light ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : light ? "border-amber-500/30 bg-amber-500/10 text-amber-600" : "border-amber-400/40 bg-amber-500/10 text-amber-400"
                  )}>
                    {hasPin ? "PIN set" : "Set required"}
                  </span>
                </div>
                {hasPin && !pinForgot && (
                  <button type="button" onClick={() => { setPinForgot(true); setPinOtpSent(false); setPinOtp(""); setPinResetToken(""); setPinOtpMsg(""); setPinOtpErr(""); }}
                    className={cn("text-[10px] font-semibold underline underline-offset-2", light ? "text-sapphire hover:text-sapphire/70" : "text-gold hover:text-gold/70")}
                  >
                    Forgot PIN?
                  </button>
                )}
              </div>
              <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                  {hasPin
                    ? "Your 6-digit PIN is used to log in with your card number and to verify wallet payments. Enter your current PIN to change it, or use Forgot PIN? below."
                    : "Your 6-digit PIN is used to log in with your card number and to verify wallet payments. You can also use your account password."}
                </p>

              {pinMsg && (
                <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs", light ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400")}>
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>{pinMsg}</span>
                </div>
              )}
              {pinErr && <p className="text-red-400 text-xs">{pinErr}</p>}

              {pinForgot && (
                <div className={cn("rounded-xl border p-3 space-y-2", light ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-500/5 border-amber-500/20")}>
                  <div className="flex items-center gap-2">
                    <KeyRound size={13} className={light ? "text-sapphire" : "text-gold"} />
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", light ? "text-onyx/50" : "text-white/50")}>Forgot card PIN</p>
                  </div>
                  <p className={cn("text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
                    An OTP will be sent to your registered email to verify your identity — same as the forgot password process.
                  </p>

                  {pinOtpMsg && <p className="text-emerald-400 text-xs">{pinOtpMsg}</p>}
                  {pinOtpErr && <p className="text-red-400 text-xs">{pinOtpErr}</p>}

                  {!pinResetToken ? (
                    <>
                      {pinOtpSent && (
                        <div className="space-y-2">
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={pinOtp}
                            onChange={(e) => setPinOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                              light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                            )}
                          />
                          <button type="button" onClick={handleVerifyPinOtp} disabled={pinOtpLoading || pinOtp.length !== 6}
                            className={cn("w-full flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50",
                              light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                            )}
                          >
                            {pinOtpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                            {pinOtpLoading ? "Verifying..." : "Verify OTP"}
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={handleSendPinOtp} disabled={pinOtpLoading}
                        className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold", light ? "text-sapphire hover:text-sapphire/70" : "text-gold hover:text-gold/70", pinOtpLoading && "opacity-50")}
                      >
                        {pinOtpLoading && !pinOtpSent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail size={12} />}
                        {pinOtpSent ? "Resend OTP" : "Send OTP to my email"}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handlePinReset} className="space-y-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={cardPin}
                        onChange={(e) => setCardPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="New PIN (6 digits)"
                        className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                          light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                        )}
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={cardPinConfirm}
                        onChange={(e) => setCardPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Confirm PIN (6 digits)"
                        className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                          light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                        )}
                      />
                      <button type="submit" disabled={pinSaving}
                        className={cn("w-full flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50",
                          light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                        )}
                      >
                        {pinSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                        {pinSaving ? "Resetting..." : "Reset Card PIN"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!pinForgot && (
                <form onSubmit={handlePinSubmit} className="space-y-2">
                  {hasPin && (
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={cardPinCurrent}
                      onChange={(e) => setCardPinCurrent(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Current PIN (6 digits)"
                      className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                        light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                      )}
                    />
                  )}
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={cardPin}
                    onChange={(e) => setCardPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="New PIN (6 digits)"
                    className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                      light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                    )}
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={cardPinConfirm}
                    onChange={(e) => setCardPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Confirm PIN (6 digits)"
                    className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none text-center tracking-[0.4em]",
                      light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                    )}
                  />
                  <input
                    type="password"
                    value={cardPinPassword}
                    onChange={(e) => setCardPinPassword(e.target.value)}
                    placeholder="Current account password"
                    className={cn("w-full rounded-xl border px-3 h-10 text-[11px] focus:outline-none",
                      light ? "bg-white border-sapphire/20 text-onyx" : "bg-dark-800/60 border-dark-700/50 text-white"
                    )}
                  />
                  <button type="submit" disabled={pinSaving}
                    className={cn("w-full flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50",
                      light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950"
                    )}
                  >
                    {pinSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    {pinSaving ? (hasPin ? "Changing..." : "Setting...") : hasPin ? "Change Card PIN" : "Set Card PIN"}
                  </button>
                </form>
              )}
            </div>

            {/* Card Upgrades & Top-Up */}
            <div className="space-y-4 mt-2">
              <h3 className={cn("text-xs font-semibold uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold/80")}>
                Upgrade & Top-Up
              </h3>
              <CardUpgradeCheckout currentLevel={effectiveLevel} walletBalance={user.walletBalance ?? 0} />
            </div>

          </div>
          </div>
          )}
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
