"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useBootPhase } from "@/components/boot/BootContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import TrustMarquee from "@/components/TrustMarquee";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Full-bleed hero backdrop — one neon sale-sign image for both modes; the night
   overlays deepen it in dark mode, day keeps it original. */
const HERO_IMG = "https://img.magnific.com/free-photo/black-friday-sales-sign-neon-light_23-2151833073.jpg?semt=ais_hybrid&w=740&q=80";
const HERO_IMG_MOBILE = "https://img.magnific.com/free-photo/black-friday-sales-sign-neon-light_23-2151833073.jpg?semt=ais_hybrid&w=740&q=80";

export default function Hero() {
  const phase = useBootPhase();
  const started = phase !== "boot";
  const { theme } = useTheme();
  const light = theme === "light";

  const line = (delay: number) => ({
    initial: { opacity: 0, y: 40, filter: "blur(8px)" },
    animate: started ? { opacity: 1, y: 0, filter: "blur(0px)" } : {},
    transition: { duration: 0.9, delay, ease: EASE },
  });

  return (
    <section className="relative -mt-16 flex min-h-[96vh] sm:min-h-screen flex-1 items-center overflow-hidden">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.05 }}
        animate={started ? { scale: 1 } : {}}
        transition={{ duration: 2.2, ease: EASE }}
      >
        <Image
          src={HERO_IMG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover hidden sm:block"
        />
        <Image
          src={HERO_IMG_MOBILE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover block sm:hidden"
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

      {/* Copy block — always left-aligned */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-24 sm:px-8 sm:pb-32 sm:pt-40">
        <div className="relative w-fit">
          <div className="relative">
            {/* Eyebrow */}
            <motion.div {...line(0.1)} className="flex items-center gap-3">
              <motion.span
                className={cn(
                  "h-px w-10 origin-left",
                  light ? "bg-sapphire" : "bg-gold"
                )}
                initial={{ scaleX: 0 }}
                animate={started ? { scaleX: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              />
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.4em]",
                  light ? "text-sapphire" : "text-gold"
                )}
              >
                A Marketplace for Everything
              </p>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...line(0.35)}
              className="mt-5 font-display text-4xl font-semibold leading-[1.05] text-white sm:mt-6 sm:text-7xl"
            >
              Everything You Need,
              <br />
              <span
                className={cn(
                  light ? "text-sapphire-light" : "text-gold-gradient"
                )}
              >
                In One Place.
              </span>
            </motion.h1>

            {/* Subcopy */}
            <motion.p
              {...line(0.6)}
              className={cn(
                "mt-5 max-w-xl text-sm font-light leading-relaxed sm:mt-7 sm:text-lg",
                light ? "text-white/80" : "text-white/70"
              )}
            >
              <span className="sm:hidden">
                Electronics, fashion, home &amp; more — shop it all from trusted sellers.
              </span>
              <span className="hidden sm:inline">
                From everyday essentials to that perfect find, BATRAVERSE brings you
                thousands of products across every category from trusted sellers —
                all in one marketplace, all in one place.
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div {...line(0.85)} className="mt-7 flex flex-wrap items-center gap-4 sm:mt-10">
              <Link
                href="/products"
                className={cn(
                  "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl border px-6 py-3 sm:px-9 sm:py-4 text-[11px] font-semibold uppercase tracking-[0.28em] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  light
                    ? "border-sapphire-light/40 bg-gradient-to-b from-sapphire-light via-sapphire to-sapphire-deep text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_30px_-10px_rgba(30,58,138,0.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_44px_-10px_rgba(30,58,138,0.7)]"
                    : "border-gold-light/40 bg-gradient-to-b from-gold-light via-gold to-gold-deep text-abyss shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_-10px_rgba(212,175,55,0.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_16px_44px_-10px_rgba(212,175,55,0.7)]"
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
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
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 1.2, ease: EASE }}
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

      {/* Floating lamp — hovers over the empty wall, casting a warm gold light */}
      <Lamp active={started} />
    </section>
  );
}

/* A pendant lamp that is not there at all on entry — it lowers from the
   ceiling on its cable, bounces twice, then the warm light glows up. */
function Lamp({ active }: { active: boolean }) {
  const [mount, setMount] = useState(false);
  const [pulled, setPulled] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setMount(true), 500);
    return () => clearTimeout(t);
  }, [active]);

  /* The light stays off until the lamp has landed and settled */
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!mount) return;
    const t = setTimeout(() => setLit(true), 1450);
    return () => clearTimeout(t);
  }, [mount]);

  if (!mount) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden md:block">
      <div className="absolute left-[25%] top-0 flex w-80 -translate-x-1/2 flex-col items-center">
        {/* Ceiling canopy */}
        <motion.div
          className="h-3 w-14 rounded-b-md border border-white/10 bg-gradient-to-b from-smoke via-graphite to-onyx shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
        />

        {/* Cord — unrolls downward from the canopy */}
        <motion.div
          className="w-[2px] bg-gradient-to-b from-cream-dim/50 to-cream-dim/75"
          initial={{ height: 0 }}
          animate={{ height: "2rem" }}
          transition={{ duration: 0.45, ease: EASE }}
        />

        {/* Conical lamp — the whole lamp is the light switch: click it (or the
            pull cord) to toggle the site between dark and light mode */}
        <motion.div
          className="relative cursor-pointer"
          initial={{ y: -200 }}
          animate={{ y: [0, -20, 0, -5, 0] }}
          transition={{
            duration: 1.3,
            times: [0, 0.48, 0.72, 0.88, 1],
            ease: ["easeIn", "easeOut", "easeIn", "easeOut"],
          }}
          onHoverStart={() => setPulled(true)}
          onHoverEnd={() => setPulled(false)}
          onClick={toggle}
          style={{ pointerEvents: "auto" }}
        >
          {/* Warm halo — dual layers crossfade */}
          <div className="absolute -inset-8 rounded-full" style={{ transition: "opacity 2s ease-in-out", opacity: !lit ? 0 : 1 }}>
            <div
              className="absolute inset-0 rounded-full transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 0 : 1,
                background: "radial-gradient(circle, rgba(212,175,55,0.32), rgba(212,175,55,0.1) 55%, transparent 75%)",
              }}
            />
            <div
              className="absolute inset-0 rounded-full transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 1 : 0,
                background: "radial-gradient(circle, rgba(58,123,213,0.32), rgba(58,123,213,0.1) 55%, transparent 75%)",
              }}
            />
          </div>

          {/* Cone — dual layers crossfade */}
          <div className="relative h-20 w-28 shadow-[0_18px_40px_rgba(0,0,0,0.55)]" style={{ clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }}>
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 0 : 1,
                background: "linear-gradient(to bottom, #2b2b32 0%, #4a3a1d 40%, #b5893a 75%, #f0d98c 100%)",
              }}
            />
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 1 : 0,
                background: "linear-gradient(to bottom, #2b2b32 0%, #1e2a4a 40%, #3a5a8c 75%, #8cb5e0 100%)",
              }}
            />
          </div>

          {/* Rim — dual layers crossfade */}
          <div className="absolute left-1/2 top-full -mt-[3px] h-1.5 w-[7.5rem] -translate-x-1/2 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 0 : 1,
                background: "linear-gradient(to right, #1a1208, #b5893a, #1a1208)",
                boxShadow: "0 0 20px rgba(212,175,55,0.6)",
              }}
            />
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: theme === "light" ? 1 : 0,
                background: "linear-gradient(to right, #1e3a5f, #3a7bd5, #1e3a5f)",
                boxShadow: "0 0 20px rgba(58,123,213,0.5)",
              }}
            />
          </div>

          {/* On/off pull cord */}
          <motion.div
            className={cn(
              "absolute left-[72%] top-[96%] flex origin-top cursor-pointer flex-col items-center",
              !pulled && "anim-swing"
            )}
            role="switch"
            aria-label="Toggle light mode"
            aria-checked={theme === "light"}
            animate={pulled ? { rotate: 0 } : undefined}
            transition={
              pulled
                ? { duration: 0.3 }
                : undefined
            }
          >
            <motion.div
              className="relative w-[2px] overflow-hidden"
              animate={{ height: pulled ? "3.6rem" : "2.75rem" }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: theme === "light" ? 0 : 1,
                  background: "repeating-linear-gradient(90deg, #6b5316 0 1px, #9a7b1e 1px 2px)",
                }}
              />
              <div
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: theme === "light" ? 1 : 0,
                  background: "repeating-linear-gradient(90deg, #1e3a5f 0 1px, #3a5a8c 1px 2px)",
                }}
              />
            </motion.div>
            <div className="relative h-3.5 w-2.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.5)] overflow-hidden">
              <div
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: theme === "light" ? 0 : 1,
                  background: "linear-gradient(to bottom, #f0d98c, #b5893a, #6b4e16)",
                }}
              />
              <div
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: theme === "light" ? 1 : 0,
                  background: "linear-gradient(to bottom, #5a9bd5, #3a7bd5, #1e3a5f)",
                }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Light beam — dual layers crossfade */}
        <div
          className="h-[500px] w-[420px] relative"
          style={{
            clipPath: "polygon(42% 0, 58% 0, 110% 100%, -10% 100%)",
            transition: "opacity 0.7s ease",
            opacity: lit ? 1 : 0,
          }}
        >
          <div
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: theme === "light" ? 0 : 1,
              background: "linear-gradient(to bottom, rgba(212,175,55,0.3), rgba(212,175,55,0.08) 60%, transparent)",
            }}
          />
          <div
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: theme === "light" ? 1 : 0,
              background: "linear-gradient(to bottom, rgba(58,123,213,0.3), rgba(58,123,213,0.08) 60%, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
