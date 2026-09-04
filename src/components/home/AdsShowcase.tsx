"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { API_URL } from "@/lib/api";

const EASE = [0.16, 1, 0.3, 1] as const;
const DEFAULT_DURATION = 7;

interface Billboard {
  img: string;
  tagline: string;
  line: string;
  href: string;
  duration: number;
}

export default function AdsShowcase({ page = "home", hideHeader = false }: { page?: string; hideHeader?: boolean }) {
  const { theme } = useTheme();
  const light = theme === "light";

  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const speedRef = useRef(1);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    fetch(`${API_URL}/spotlight-ads?page=${page}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBillboards(
            data.map((ad: { img: string; tagline: string; line: string; href: string; duration: number }) => ({
              img: ad.img,
              tagline: ad.tagline,
              line: ad.line,
              href: ad.href || "/store",
              duration: ad.duration || DEFAULT_DURATION,
            }))
          );
        }
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => {
    speedRef.current = hovered ? 0.5 : 1;
  }, [hovered]);

  useEffect(() => {
    if (billboards.length === 0) return;
    const base = (billboards[index]?.duration || DEFAULT_DURATION) * 1000;
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();
    speedRef.current = hovered ? 0.5 : 1;
    let raf: number;

    const tick = () => {
      const now = performance.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      elapsedRef.current += dt * speedRef.current;
      const p = Math.min(1, elapsedRef.current / base);
      setProgress(p);
      if (elapsedRef.current >= base) {
        setIndex((i) => (i + 1) % billboards.length);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [billboards.length, index]);

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + billboards.length) % billboards.length);

  const current = billboards[index];
  if (!current) return null;

  return (
    <section className={cn("relative overflow-hidden", hideHeader ? "py-4 pb-10" : "pt-12 pb-6 sm:py-16")}>
      {/* Desktop: padded container with heading */}
      <div className="hidden sm:block mx-auto w-full max-w-7xl px-6 sm:px-8">
        {!hideHeader && (
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: EASE }}
                className="flex items-center gap-3"
              >
                <span
                  className={cn(
                    "h-px w-10",
                    light ? "bg-sapphire" : "bg-gold"
                  )}
                />
                <p
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.4em]",
                    light ? "text-sapphire" : "text-gold"
                  )}
                >
                  Featured Campaigns
                </p>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
                className={cn(
                  "mt-5 font-display text-2xl leading-[1.1] sm:text-3xl sm:whitespace-nowrap md:text-4xl",
                  light ? "font-bold text-onyx" : "font-semibold text-cream"
                )}
              >
                <span
                  className={cn(
                    light ? "text-sapphire-gradient" : "text-gold-gradient"
                  )}
                >
                  The Brand Spotlight
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                className={cn(
                  "mt-4 max-w-xl text-sm leading-relaxed transition-colors duration-500",
                  light ? "font-medium text-onyx/85" : "text-cream-dim"
                )}
              >
                Featured houses take the floor — one luminous campaign at a time,
                curated for the Batra Verse collector.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <button
                aria-label="Previous campaign"
                onClick={() => go(-1)}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full border transition-all duration-300 active:scale-95",
                  light
                    ? "border-onyx/20 text-onyx hover:border-sapphire hover:text-sapphire"
                    : "border-white/15 text-cream-dim hover:border-gold hover:text-gold-light"
                )}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                aria-label="Next campaign"
                onClick={() => go(1)}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full border transition-all duration-300 active:scale-95",
                  light
                    ? "border-onyx/20 text-onyx hover:border-sapphire hover:text-sapphire"
                    : "border-white/15 text-cream-dim hover:border-gold hover:text-gold-light"
                )}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </motion.div>
          </div>
        )}

        {/* Desktop billboard */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, delay: 0.15, ease: EASE }}
          className={cn("relative overflow-hidden", !hideHeader && "mt-12")}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative aspect-[21/9] w-full overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: (billboards[index]?.duration || DEFAULT_DURATION), ease: "linear" }}
                >
                  <img
                    src={resolveImageUrl(current.img)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-r from-abyss/85 via-abyss/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-transparent to-abyss/30" />

            <div className="absolute inset-x-0 top-0 h-px bg-white/10">
                <div
                  className={cn(
                    "h-full origin-left",
                    light ? "bg-sapphire" : "bg-gold"
                  )}
                  style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            <div className="absolute left-6 top-6 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center border border-white/25 bg-abyss/50 text-[9px] font-medium tracking-[0.2em] text-cream backdrop-blur-sm">
                AD
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={index}
                  className="flex flex-col items-start text-left"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
                >
                  <h3 className="font-display text-3xl font-semibold text-cream sm:text-4xl">
                    {current.tagline}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-dim">
                    {current.line}
                  </p>
                  <Link
                    href={current.href}
                    className="group mt-8 inline-flex items-center gap-2.5 self-center rounded-full border border-gold-light/40 bg-gold/15 px-9 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-gold-light shadow-[0_0_24px_rgba(212,175,55,0.25)] transition-all duration-300 hover:bg-gold hover:text-onyx hover:shadow-[0_0_36px_rgba(212,175,55,0.5)]"
                  >
                    View Campaign
                    <ArrowRight
                      size={18}
                      strokeWidth={2}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-0 right-0 hidden items-end gap-5 p-8 sm:flex sm:p-12">
              {billboards.map((b, i) => (
                <button
                  key={b.tagline}
                  onClick={() => setIndex(i)}
                  className="group flex flex-col items-start gap-1.5"
                >
                  <span
                    className={cn(
                      "text-[9px] font-medium uppercase tracking-[0.3em] transition-colors duration-300",
                      i === index
                        ? "text-gold-light"
                        : "text-cream-dim/50 group-hover:text-cream-dim"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "h-px transition-all duration-500",
                      i === index
                        ? "w-10 bg-gold"
                        : "w-5 bg-white/25 group-hover:w-8 group-hover:bg-white/40"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile: full-width, compact heading */}
      <div className="sm:hidden">
        {!hideHeader && (
          <div className="flex items-center justify-between px-4 pb-3">
            <p className={cn("text-[10px] font-medium uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold")}>
              Spotlight
            </p>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous"
                onClick={() => go(-1)}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full border transition-all active:scale-95",
                  light ? "border-onyx/20 text-onyx" : "border-white/15 text-cream-dim"
                )}
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
              </button>
              <button
                aria-label="Next"
                onClick={() => go(1)}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full border transition-all active:scale-95",
                  light ? "border-onyx/20 text-onyx" : "border-white/15 text-cream-dim"
                )}
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative w-full overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: (billboards[index]?.duration || DEFAULT_DURATION), ease: "linear" }}
                >
                  <img
                    src={resolveImageUrl(current.img)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/30 to-transparent" />

            <div className="absolute inset-x-0 top-0 h-px bg-white/10">
                <div
                  className={cn(
                    "h-full origin-left",
                    light ? "bg-sapphire" : "bg-gold"
                  )}
                  style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            <span className="absolute left-3 top-3 grid h-5 w-5 place-items-center border border-white/25 bg-abyss/50 text-[8px] font-medium tracking-[0.2em] text-cream backdrop-blur-sm">
              AD
            </span>

            <div className="absolute inset-x-0 bottom-0 p-4">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                >
                  <h3 className="font-display text-xl font-semibold text-cream">
                    {current.tagline}
                  </h3>
                  <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-cream-dim line-clamp-2">
                    {current.line}
                  </p>
                  <Link
                    href={current.href}
                    className="group relative mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gold-light"
                  >
                    View
                    <ArrowRight size={12} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
