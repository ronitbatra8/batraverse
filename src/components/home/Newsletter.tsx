"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail, Clock } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(
  "/api",
  ""
);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const animItem = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: EASE },
  },
};

const labelCls = (light: boolean) =>
  cn(
    "text-[10px] font-medium uppercase tracking-[0.4em]",
    light ? "text-sapphire" : "text-gold/90"
  );

const headingCls = (light: boolean) =>
  cn(
    "mt-3 font-display text-2xl tracking-wide",
    light ? "font-bold text-onyx" : "font-medium text-cream"
  );

const bodyCls = (light: boolean) =>
  cn(
    "mt-3 text-sm font-light leading-relaxed tracking-wide",
    light ? "text-onyx/70" : "text-cream-dim"
  );

const inputCls = (light: boolean) =>
  cn(
    "mt-2 w-full border-b bg-transparent pb-3 text-sm tracking-wide outline-none transition-colors duration-300",
    light
      ? "border-onyx/25 text-onyx placeholder:text-onyx/35 focus:border-sapphire"
      : "border-gold/25 text-cream placeholder:text-cream-dim/35 focus:border-gold"
  );

const fieldLabelCls = (light: boolean) =>
  cn(
    "text-[9px] uppercase tracking-[0.3em]",
    light ? "text-onyx/50" : "text-cream-dim/60"
  );

const noteCls = (light: boolean) =>
  cn("text-[10px] tracking-[0.2em]", light ? "text-onyx/45" : "text-cream-dim/45");

const successCls = (light: boolean) =>
  cn(
    "mt-8 flex items-center gap-3 border py-4 pl-4 pr-6",
    light ? "border-sapphire/25 bg-sapphire/5" : "border-gold/25 bg-gold/5"
  );

const checkCls = (light: boolean) =>
  cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
    light ? "bg-sapphire text-white" : "bg-gold text-abyss"
  );

export default function Newsletter() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { user } = useAuth();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subError, setSubError] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [hasPendingView, setHasPendingView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewPhone, setViewPhone] = useState("");
  const [viewNote, setViewNote] = useState("");
  const [viewErr, setViewErr] = useState("");
  const [viewSubmitting, setViewSubmitting] = useState(false);
  const [viewChecking, setViewChecking] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!user?.email) { setCheckingStatus(false); return; }
    fetch(`${API}/api/newsletter/status?email=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((d) => setIsSubscribed(d.subscribed))
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [user?.email]);

  useEffect(() => {
    if (!user?.phone) { setViewChecking(false); return; }
    fetch(`${API}/api/private-viewing/status?phone=${encodeURIComponent(user.phone)}`)
      .then((r) => r.json())
      .then((d) => setHasPendingView(d.hasPendingRequest))
      .catch(() => {})
      .finally(() => setViewChecking(false));
  }, [user?.phone]);

  useEffect(() => {
    if (user) {
      setViewName(user.name || "");
      setViewPhone(user.phone || "");
    }
  }, [user]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) { setSubError("Please sign in to subscribe."); return; }
    setSubError("");
    setSubscribing(true);
    try {
      const res = await fetch(`${API}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      const data = await res.json();
      if (!res.ok) { setSubError(data.error || "Something went wrong."); return; }
      setSubMessage(data.message || "Subscribed successfully!");
      setIsSubscribed(true);
    } catch {
      setSubError("The maison is unreachable — please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user?.email) return;
    setSubscribing(true);
    try {
      const res = await fetch(`${API}/api/newsletter/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      setSubMessage("");
      setIsSubscribed(false);
      setSubMessage(data.message || "");
    } catch {
      setSubError("Failed to unsubscribe — please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleViewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim() || !viewPhone.trim()) {
      setViewErr("A name and a number, please.");
      return;
    }
    setViewErr("");
    setViewSubmitting(true);
    try {
      const res = await fetch(`${API}/api/private-viewing/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName.trim(),
          phone: viewPhone.trim(),
          note: viewNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setViewErr(data.error || "Something went wrong."); return; }
      setHasPendingView(true);
    } catch {
      setViewErr("The maison is unreachable — please try again.");
    } finally {
      setViewSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!viewName.trim() || !viewPhone.trim()) return;
    setResending(true);
    try {
      const res = await fetch(`${API}/api/private-viewing/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName.trim(),
          phone: viewPhone.trim(),
          note: viewNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setHasPendingView(true);
    } catch {}
    setResending(false);
  };

  return (
    <section
      id="newsletter"
      className={cn(
        "relative overflow-hidden",
        light ? "bg-white" : "bg-abyss"
      )}
    >
      <div className="grid lg:grid-cols-2">
        {/* Left panel — image */}
        <div className="relative min-h-[440px] overflow-hidden sm:min-h-[540px]">
          <img
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&h=1200&fit=crop"
            alt="The atelier at dusk"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/45 to-abyss/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 20% 100%, rgba(212,175,55,0.12), transparent)",
            }}
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative z-10 flex h-full min-h-[440px] flex-col justify-end p-8 sm:min-h-[540px] sm:p-12"
          >
            <motion.p
              variants={animItem}
              className="text-[10px] font-medium uppercase tracking-[0.5em] text-gold/90"
            >
              The Correspondence
            </motion.p>
            <motion.h2
              variants={animItem}
              className="mt-4 max-w-md whitespace-nowrap font-display text-4xl tracking-wide text-cream sm:text-5xl"
            >
              One Letter{" "}
              <span className="text-gold-gradient">Each Season</span>
            </motion.h2>
            <motion.p
              variants={animItem}
              className="mt-5 max-w-sm text-sm font-light leading-relaxed tracking-wide text-cream-dim"
            >
              Rare pieces, private previews, and first refusal. Nothing else —
              and never more than once a season.
            </motion.p>
          </motion.div>
        </div>

        {/* Right panel — forms */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col justify-center gap-6 p-8 sm:p-12 lg:p-16"
        >
          {/* Subscribe card */}
          <motion.div
            variants={animItem}
            className={cn(
              "rounded-2xl border p-7 backdrop-blur-xl sm:p-8",
              light ? "border-onyx/10 bg-white/70" : "border-gold/10 bg-onyx/60"
            )}
          >
            <p className={labelCls(light)}>Subscribe</p>
            <p className={headingCls(light)}>The Seasonal Edit</p>
            <p className={bodyCls(light)}>
              Receive the edit before it is published — quiet, and only once a
              season.
            </p>

            {!user ? (
              <div className={cn("mt-8 flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-onyx/15 bg-onyx/[0.03]" : "border-white/10 bg-white/[0.02]")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", light ? "bg-onyx/10 text-onyx/50" : "bg-white/10 text-cream-dim/50")}>
                  <Mail size={14} strokeWidth={1.5} />
                </span>
                <p className={cn("text-[11px] font-medium uppercase tracking-[0.2em]", light ? "text-onyx/50" : "text-cream-dim/50")}>
                  Sign in to subscribe
                </p>
              </div>
            ) : checkingStatus ? (
              <div className={cn("mt-8 flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-onyx/15 bg-onyx/[0.03]" : "border-white/10 bg-white/[0.02]")}>
                <div className={cn("h-4 w-4 animate-spin rounded-full border-2", light ? "border-sapphire border-t-transparent" : "border-gold border-t-transparent")} />
                <p className={cn("text-[10px] uppercase tracking-[0.2em]", light ? "text-onyx/40" : "text-cream-dim/40")}>Checking status…</p>
              </div>
            ) : isSubscribed ? (
              <div className={cn("mt-8 flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-emerald-500/25 bg-emerald-500/5" : "border-emerald-400/25 bg-emerald-400/5")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", light ? "bg-emerald-500 text-white" : "bg-emerald-400 text-abyss")}>
                  <Check size={14} strokeWidth={2} />
                </span>
                <div className="flex-1">
                  <p className={cn("text-[11px] font-medium uppercase tracking-[0.25em]", light ? "text-emerald-600" : "text-emerald-400")}>
                    {subMessage || "You are subscribed"}
                  </p>
                  <p className={cn("mt-1 text-[9px] uppercase tracking-[0.2em]", light ? "text-onyx/40" : "text-cream-dim/40")}>
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleUnsubscribe}
                  disabled={subscribing}
                  className={cn("text-[9px] font-semibold uppercase tracking-[0.2em] transition-colors disabled:opacity-50", light ? "text-onyx/40 hover:text-red-500" : "text-cream-dim/40 hover:text-red-400")}
                >
                  {subscribing ? "…" : "Unsubscribe"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <label className="flex-1">
                    <span className={fieldLabelCls(light)}>Your email address</span>
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      className={cn(inputCls(light), "cursor-not-allowed opacity-60")}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-rose-500 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-abyss shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_-10px_rgba(244,63,94,0.6)] transition-all duration-500 hover:bg-rose-400 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_16px_44px_-10px_rgba(244,63,94,0.8)] disabled:cursor-wait disabled:opacity-60"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    {subscribing ? "Signing up" : "Subscribe"}
                    <ArrowRight
                      size={13}
                      strokeWidth={2}
                      className="transition-transform duration-500 group-hover:translate-x-1"
                    />
                  </button>
                </div>
                <p className={cn("mt-3", noteCls(light))}>
                  {subError || "Unsubscribe anytime. Your address is never shared."}
                </p>
              </form>
            )}
          </motion.div>

          {/* Private viewing card */}
          <motion.div
            variants={animItem}
            className={cn(
              "rounded-2xl border p-7 backdrop-blur-xl sm:p-8",
              light ? "border-onyx/10 bg-white/70" : "border-gold/10 bg-onyx/60"
            )}
          >
            <p className={labelCls(light)}>Private Viewing</p>
            <p className={headingCls(light)}>By Appointment</p>
            <p className={bodyCls(light)}>
              See the pieces alone — at the atelier, or brought to your home.
            </p>

            {!user ? (
              <div className={cn("mt-8 flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-onyx/15 bg-onyx/[0.03]" : "border-white/10 bg-white/[0.02]")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", light ? "bg-onyx/10 text-onyx/50" : "bg-white/10 text-cream-dim/50")}>
                  <Clock size={14} strokeWidth={1.5} />
                </span>
                <p className={cn("text-[11px] font-medium uppercase tracking-[0.2em]", light ? "text-onyx/50" : "text-cream-dim/50")}>
                  Sign in to request a viewing
                </p>
              </div>
            ) : viewChecking ? (
              <div className={cn("mt-8 flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-onyx/15 bg-onyx/[0.03]" : "border-white/10 bg-white/[0.02]")}>
                <div className={cn("h-4 w-4 animate-spin rounded-full border-2", light ? "border-sapphire border-t-transparent" : "border-gold border-t-transparent")} />
                <p className={cn("text-[10px] uppercase tracking-[0.2em]", light ? "text-onyx/40" : "text-cream-dim/40")}>Checking status…</p>
              </div>
            ) : hasPendingView ? (
              <div className={cn("mt-8 flex flex-col gap-3", light ? "" : "")}>
                <div className={cn("flex items-center gap-3 border py-4 pl-4 pr-6", light ? "border-amber-500/25 bg-amber-500/5" : "border-amber-400/25 bg-amber-400/5")}>
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", light ? "bg-amber-500 text-white" : "bg-amber-400 text-abyss")}>
                    <Clock size={14} strokeWidth={2} />
                  </span>
                  <div>
                    <p className={cn("text-[11px] font-medium uppercase tracking-[0.25em]", light ? "text-amber-600" : "text-amber-400")}>
                      Request Pending
                    </p>
                    <p className={cn("mt-1 text-[9px] uppercase tracking-[0.2em]", light ? "text-onyx/40" : "text-cream-dim/40")}>
                      A member of the maison will contact you shortly
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                <Link
                  href="/private-viewing"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] transition-all duration-500",
                    light
                      ? "border-onyx/20 text-onyx/70 hover:border-sapphire hover:text-sapphire"
                      : "border-gold/20 text-gold/70 hover:border-gold hover:text-gold-light"
                  )}
                >
                  View My Requests
                  <ArrowRight size={13} strokeWidth={2} className="transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] transition-all duration-500 disabled:opacity-50",
                    light
                      ? "border-amber-500/25 text-amber-600 hover:border-amber-500 hover:bg-amber-500/5"
                      : "border-amber-400/25 text-amber-400 hover:border-amber-400 hover:bg-amber-400/5"
                  )}
                >
                  {resending ? "Sending…" : "Resend Request"}
                </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleViewRequest} className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className={fieldLabelCls(light)}>Your name</span>
                    <input
                      type="text"
                      value={viewName}
                      readOnly
                      className={cn(inputCls(light), "cursor-not-allowed opacity-60")}
                    />
                  </label>
                  <label className="block">
                    <span className={fieldLabelCls(light)}>Mobile number</span>
                    <input
                      type="tel"
                      value={viewPhone}
                      readOnly
                      className={cn(inputCls(light), "cursor-not-allowed opacity-60")}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={fieldLabelCls(light)}>Piece or date</span>
                  <input
                    type="text"
                    value={viewNote}
                    onChange={(e) => setViewNote(e.target.value)}
                    placeholder="Something in mind — optional"
                    className={inputCls(light)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={viewSubmitting}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-rose-400/60 bg-transparent px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-400 transition-all duration-500 hover:border-rose-300 hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {viewSubmitting ? "Sending" : "Request Viewing"}
                  <ArrowRight
                    size={13}
                    strokeWidth={2}
                    className="transition-transform duration-500 group-hover:translate-x-1"
                  />
                </button>
                <p className={noteCls(light)}>
                  {viewErr ||
                    "No obligation — a member of the maison will confirm."}
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
