"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useBootDone } from "@/components/boot/BootProvider";
import TrustMarquee from "@/components/TrustMarquee";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const { theme } = useTheme();
  const light = theme === "light";

  /* Sync hero intro with the boot splash: on the first visit (boot plays) the
     hero lines wait until the splash finishes, then animate in; on return visits
     (boot skipped) they play almost immediately. */
  const booted = useRef<boolean>(
    typeof window === "undefined" ? true : !!sessionStorage.getItem("btv-loaded")
  ).current;
  const base = booted ? 0.05 : 3;

  /* Keep the hero video paused while the boot splash covers the page, then
     start it the moment the boot finishes. */
  const bootDone = useBootDone();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (bootDone) {
      const p = v.play();
      if (p) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [bootDone]);

  const line = (delay: number) => ({
    initial: { opacity: 0, y: 40, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.9, delay: base + delay, ease: EASE },
  });

  return (
    <section className="relative -mt-16 flex min-h-[96vh] sm:min-h-screen flex-1 items-center overflow-hidden">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease: EASE }}
      >
        {/* Looping video backdrop — used at every size, from mobile to desktop */}
        <video
          ref={videoRef}
          src="/batraverse-hero.mp4"
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </motion.div>

      {/* Light mode overlay — subtle darken for text readability */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-700 ease-in-out",
          light ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
      </div>

      {/* Dark mode overlay — slight darken */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-700 ease-in-out",
          light ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" />
      </div>

      {/* Copy block — centered */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-24 text-center sm:px-8 sm:pb-32 sm:pt-40">
        <div className="relative w-fit">
          <div className="relative">
            {/* Eyebrow */}
            <motion.div {...line(0.1)} className="flex items-center justify-center gap-3">
              <motion.span
                className={cn(
                  "h-px w-10 origin-left",
                  light ? "bg-sapphire" : "bg-gold"
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: base + 0.1, ease: EASE }}
              />
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.4em]",
                  light ? "text-sapphire" : "text-gold"
                )}
              >
                The Curated Marketplace
              </p>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...line(0.35)}
              className="mt-5 font-display text-4xl font-semibold leading-[1.05] text-white sm:mt-6 sm:text-7xl"
            >
              Everything Extraordinary,
              <br />
              <span
                className={cn(
                  light ? "text-sapphire-light" : "text-gold-gradient"
                )}
              >
                In One Verse.
              </span>
            </motion.h1>

            {/* Subcopy */}
            <motion.p
              {...line(0.6)}
              className={cn(
                "mt-5 max-w-xl text-sm font-light leading-relaxed sm:mt-7 sm:text-lg mx-auto",
                light ? "text-white/80" : "text-white/70"
              )}
            >
              <span className="sm:hidden">
                Electronics, fashion &amp; home — every piece handpicked by us.
              </span>
              <span className="hidden sm:inline">
                From fashion to electronics to home essentials — each piece is
                uniquely sourced, vetted by us, and gathered into a single
                marketplace built around you.
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div {...line(0.85)} className="mt-7 flex flex-wrap items-center justify-center gap-4 sm:mt-10">
              <Link
                href="/store"
                className={cn(
                  "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl border px-6 py-3 sm:px-9 sm:py-4 text-[11px] font-semibold uppercase tracking-[0.28em] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  light
                    ? "border-sapphire-light/60 text-sapphire-light hover:text-white hover:shadow-[0_0_30px_-8px_rgba(96,165,250,0.6)]"
                    : "border-gold/50 text-gold-light hover:text-abyss hover:shadow-[0_0_30px_-8px_rgba(212,175,55,0.6)]"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-b transition-transform duration-500 ease-out group-hover:translate-y-0",
                    light
                      ? "from-sapphire-light via-sapphire to-sapphire-deep"
                      : "from-gold-light via-gold to-gold-deep"
                  )}
                />
                <span className="relative">Explore Store</span>
                <ArrowRight
                  size={15}
                  strokeWidth={2.25}
                  className="relative transition-transform duration-300 group-hover:translate-x-1.5"
                />
              </Link>
              <Link
                href="/about"
                className={cn(
                  "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl border px-6 py-3 sm:px-9 sm:py-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  light
                    ? "border-white/30 bg-white/[0.08] hover:border-white/50 hover:bg-white/[0.15] hover:shadow-[0_0_30px_-8px_rgba(255,255,255,0.4)]"
                    : "border-white/30 bg-white/[0.06] hover:border-gold/50 hover:bg-gold/10 hover:text-gold-light hover:shadow-[0_0_30px_-8px_rgba(212,175,55,0.5)]"
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
                <span className="relative">Our Story</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trust strip — pinned to the hero bottom, all four in one line */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: base + 0.9, ease: EASE }}
      >
        {/* Hairline */}
        <div className="relative mx-auto h-px w-full max-w-7xl px-6 sm:px-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent blur-[1px]" />
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent anim-sweep"
            />
          </div>
        </div>

        {/* Marquee */}
        <TrustMarquee />
      </motion.div>
    </section>
  );
}
