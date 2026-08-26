"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Star } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const TESTIMONIALS = [
  {
    rating: 5,
    title: "Quiet Perfection",
    quote:
      "A discretion I have rarely encountered. The piece arrived as promised — and the manner of its delivery was itself a work of art.",
    name: "Rahul Malhotra",
    location: "New Delhi · Private Collector",
  },
  {
    rating: 5,
    title: "Immaculate Service",
    quote:
      "They understand that true luxury is quiet. Every detail, from the first call to the final unwrapping, was immaculate.",
    name: "Amelia Hart",
    location: "London · Interior Designer",
  },
  {
    rating: 5,
    title: "Taste One Cannot Purchase",
    quote:
      "I came for a single piece and left with a relationship. Batra Verse curates with a taste one cannot simply purchase.",
    name: "Kabir Anand",
    location: "Mumbai · Entrepreneur",
  },
] as const;

function ReviewInner({
  review,
  number,
  light,
}: {
  review: (typeof TESTIMONIALS)[number];
  number: number;
  light: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col border p-6 transition-colors duration-500 sm:p-7",
        light ? "border-onyx/10 bg-white" : "border-white/[0.08] bg-onyx/60"
      )}
    >
      <div className={cn("flex gap-1", light ? "text-sapphire" : "text-gold")}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={13}
            strokeWidth={1.5}
            fill={i < review.rating ? "currentColor" : "none"}
            className={i < review.rating ? "" : "opacity-30"}
          />
        ))}
      </div>
      <h3
        className={cn(
          "mt-4 font-display text-xl font-medium tracking-wide",
          light ? "text-onyx" : "text-cream"
        )}
      >
        {review.title}
      </h3>
      <p
        className={cn(
          "mt-3 flex-1 text-sm font-light leading-relaxed tracking-wide",
          light ? "text-onyx/85" : "text-cream-dim"
        )}
      >
        &ldquo;{review.quote}&rdquo;
      </p>
      <div
        className={cn(
          "mt-6 flex items-center justify-between gap-3 border-t pt-4",
          light ? "border-onyx/10" : "border-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "truncate text-[10px] uppercase tracking-[0.25em]",
            light ? "text-onyx" : "text-cream"
          )}
        >
          {review.name}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "hidden text-[9px] uppercase tracking-[0.2em] sm:inline",
              light ? "text-onyx/50" : "text-cream-dim/50"
            )}
          >
            {review.location}
          </span>
          <span
            className={cn(
              "text-[9px] uppercase tracking-[0.3em]",
              light ? "text-sapphire/70" : "text-gold/60"
            )}
          >
            N° 0{number}
          </span>
        </span>
      </div>
    </div>
  );
}

function ScrubReview({
  review,
  number,
  progress,
  start,
  end,
  light,
}: {
  review: (typeof TESTIMONIALS)[number];
  number: number;
  progress: import("framer-motion").MotionValue<number>;
  start: number;
  end: number;
  light: boolean;
}) {
  const reveal = useTransform(progress, [start, end], [0, 1]);
  const opacity = useTransform(reveal, (v) => Math.min(1, v * 1.35));
  const y = useTransform(reveal, (v) => (1 - v) * 90);
  const scale = useTransform(reveal, (v) => 0.88 + v * 0.12);
  const blur = useTransform(reveal, (v) => `blur(${Math.round((1 - v) * 12)}px)`);

  return (
    <motion.div style={{ opacity, y, scale, filter: blur }} className="h-full">
      <ReviewInner review={review} number={number} light={light} />
    </motion.div>
  );
}

/** Testimonials — the panel pins and the reviews reveal one by one as you
 *  keep scrolling; on small screens each card simply rises into view.
 *  The scroll hook lives inside the pinned branch so it always mounts with
 *  its target present — no hydration race, the cards reliably reveal. */
export default function Testimonials() {
  const { theme } = useTheme();
  const light = theme === "light";

  const [pinned, setPinned] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setPinned(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return pinned ? <PinnedTestimonials light={light} /> : <MobileTestimonials light={light} />;
}

/* Desktop — a 300svh track pins and the reviews scrub in one by one. */
function PinnedTestimonials({ light }: { light: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const n = TESTIMONIALS.length;

  const count = useTransform(scrollYProgress, (v) => {
    const shown = Math.min(n, Math.floor(v * n) + 1);
    return String(shown).padStart(2, "0");
  });

  return (
    <div
      id="testimonials"
      ref={trackRef}
      className={cn("relative", light ? "bg-white" : "bg-abyss")}
      style={{ height: "300svh" }}
    >
      <div
        className={cn(
          "sticky top-16 flex h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden border px-6 sm:px-12",
          light
            ? "border-onyx/10 bg-white/70"
            : "border-white/[0.06] bg-onyx/40"
        )}
      >
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-px",
            light ? "bg-sapphire/20" : "hairline-gold"
          )}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[20rem] sm:w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: light
              ? "radial-gradient(closest-side, rgba(30,58,138,0.06), transparent)"
              : "radial-gradient(closest-side, rgba(212,175,55,0.07), transparent)",
          }}
        />

        {/* pinned header */}
        <div className="absolute inset-x-6 top-16 sm:inset-x-12">{header(light)}</div>

        {/* reviews reveal one by one */}
        <div className="relative z-10 mt-24 grid w-full max-w-5xl grid-cols-1 gap-5 md:h-[23rem] md:grid-cols-3">
          {TESTIMONIALS.map((r, i) => (
            <ScrubReview
              key={r.name}
              review={r}
              number={i + 1}
              progress={scrollYProgress}
              start={i / n}
              end={(i + 1) / n}
              light={light}
            />
          ))}
        </div>

        {/* progress cue */}
        <div className="absolute inset-x-6 bottom-8 flex items-center justify-between sm:inset-x-12">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-[9px] uppercase tracking-[0.35em]",
                light ? "text-onyx/50" : "text-cream-dim/50"
              )}
            >
              Scroll · the reviews reveal
            </span>
            <div
              className={cn(
                "hidden h-px w-36 overflow-hidden sm:block",
                light ? "bg-onyx/10" : "bg-cream/10"
              )}
            >
              <motion.div
                className={cn(
                  "h-full origin-left",
                  light ? "bg-sapphire" : "bg-gold"
                )}
                style={{ scaleX: scrollYProgress }}
              />
            </div>
          </div>
          <span
            className={cn(
              "font-display text-sm tracking-[0.3em]",
              light ? "text-sapphire/70" : "text-gold/70"
            )}
          >
            <motion.span>{count}</motion.span>
            <span className="opacity-40">
              {" "}/ {String(n).padStart(2, "0")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* Small screens — natural flow, cards rise in one by one. */
function MobileTestimonials({ light }: { light: boolean }) {
  return (
    <section
      id="testimonials"
      className={cn(
        "relative overflow-hidden px-6 py-24 sm:px-10 lg:py-32",
        light ? "bg-white" : "bg-abyss"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[20rem] sm:w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: light
            ? "radial-gradient(closest-side, rgba(30,58,138,0.05), transparent)"
            : "radial-gradient(closest-side, rgba(212,175,55,0.07), transparent)",
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl">
        {header(light)}
        <div className="mt-10 grid grid-cols-1 gap-5 md:h-[23rem] md:grid-cols-3">
          {TESTIMONIALS.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 60, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.12 }}
            >
              <ReviewInner review={r} number={i + 1} light={light} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function header(light: boolean) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.5em]",
            light ? "text-sapphire" : "text-gold/90"
          )}
        >
          In Their Words
        </p>
        <h2
          className={cn(
            "mt-3 whitespace-nowrap font-display text-3xl tracking-wide sm:text-4xl md:text-5xl",
            light ? "font-bold text-onyx" : "font-medium text-cream"
          )}
        >
          Words{" "}
          <span
            className={cn(
              light ? "text-sapphire-gradient" : "text-gold-gradient"
            )}
          >
            From the Few
          </span>
        </h2>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "font-display text-5xl font-medium leading-none",
            light ? "text-sapphire" : "text-gold-light"
          )}
        >
          5.0
        </p>
        <p
          className={cn(
            "mt-2 text-[9px] uppercase tracking-[0.3em]",
            light ? "text-onyx/50" : "text-cream-dim/60"
          )}
        >
          Private clients
        </p>
      </div>
    </div>
  );
}
