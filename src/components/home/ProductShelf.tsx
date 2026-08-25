"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* One continuous cascade — the whole shelf rises together through the parent
   trigger (no per-element `whileInView`, no blur), so the section slides in
   smoothly instead of snapping while individual pieces widen and settle. */
const shelfContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.85, ease: EASE } },
};

export type ShelfItem = {
  name: string;
  category: string;
  price: string;
  compareAt?: string;
  img: string;
  href: string;
};

export default function ProductShelf({
  eyebrow,
  title,
  accent,
  items,
  badge,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  items: ShelfItem[];
  badge?: string;
}) {
  const { theme } = useTheme();
  const light = theme === "light";

  return (
    <section className="relative overflow-x-clip py-16">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={shelfContainer}
        className="mx-auto w-full max-w-7xl px-6 sm:px-8"
      >
        {/* Header */}
        <motion.div
          variants={rise}
          className="flex items-center gap-3"
        >
          <span className={cn("h-px w-10", light ? "bg-sapphire" : "bg-gold")} />
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.4em]",
              light ? "text-sapphire" : "text-gold"
            )}
          >
            {eyebrow}
          </p>
        </motion.div>
        <motion.h2
          variants={rise}
          className={cn(
            "mt-5 whitespace-nowrap font-display text-2xl leading-[1.1] sm:text-3xl md:text-4xl",
            light ? "font-bold text-onyx" : "font-semibold text-cream"
          )}
        >
          {title}{" "}
          <span
            className={cn(
              light ? "text-sapphire-gradient" : "text-gold-gradient"
            )}
          >
            {accent}
          </span>
        </motion.h2>

        {/* Shelf — four cards in a single line, scrollable on narrow screens */}
        <motion.div
          variants={rise}
          className="mt-10 flex gap-6 overflow-x-auto overflow-y-hidden pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <ShelfCard
              key={item.href}
              item={item}
              light={light}
              badge={badge}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function ShelfCard({
  item,
  light,
  badge,
}: {
  item: ShelfItem;
  light: boolean;
  badge?: string;
}) {
  return (
    <motion.div
      variants={rise}
      className="w-[80%] shrink-0 sm:w-[45%] lg:w-[calc(25%-1.125rem)]"
    >
      <Link href={item.href} className="group block">
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden border transition-colors duration-500",
            light
              ? "border-onyx/10 hover:border-sapphire"
              : "border-white/10 hover:border-gold/60"
          )}
        >
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss/70 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-30" />

          {badge && (
            <span
              className={cn(
                "absolute left-3 top-3 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.25em] backdrop-blur-sm",
                light
                  ? "border border-sapphire/30 bg-white/70 text-sapphire"
                  : "border border-gold/30 bg-abyss/60 text-gold-light"
              )}
            >
              {badge}
            </span>
          )}

          {/* Quick view */}
          <span
            className={cn(
              "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-sm transition-all duration-300",
              "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
              light
                ? "border-onyx/15 bg-white/80 text-onyx hover:border-sapphire hover:text-sapphire"
                : "border-white/15 bg-abyss/70 text-cream hover:border-gold hover:text-gold-light"
            )}
          >
            <Eye size={15} strokeWidth={1.5} />
          </span>
        </div>

        <div className="mt-4">
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.3em]",
              light ? "text-sapphire" : "text-gold"
            )}
          >
            {item.category}
          </p>
          <h3
            className={cn(
              "mt-1.5 font-display text-base transition-colors duration-300 sm:text-lg",
              light
                ? "font-semibold text-onyx group-hover:text-sapphire"
                : "font-medium text-cream group-hover:text-gold-light"
            )}
          >
            {item.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className={cn(
                "text-sm font-semibold tracking-wide",
                light ? "text-sapphire" : "text-gold-light"
              )}
            >
              {item.price}
            </span>
            {item.compareAt && (
              <span
                className={cn(
                  "text-xs line-through",
                  light ? "text-onyx/40" : "text-cream-dim/60"
                )}
              >
                {item.compareAt}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
