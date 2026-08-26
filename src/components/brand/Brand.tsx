"use client";

import { motion, type Variants } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const BATRA = ["B", "A", "T", "R", "A"];
const VERSE = ["V", "E", "R", "S", "E"];

/**
 * The single BATRAVERSE lockup hosted in the navbar — the e-commerce squared
 * BV card in maison-dark colours beside the BATRA / VERSE wordmark.
 *
 * During the boot the parent flies this exact element to the centre of the
 * screen (scaled up); here the card plays the e-commerce border-radius morph
 * (circle → squash shapes → rounded square) plus a quiet squash confined to
 * the card, while the wordmark cascades in — the text never bounces.
 * On morph the parent flies it back home — the MAISON DARK flight. On refresh
 * (`boot` false) the card stays a clean rounded square; the parent slides it
 * in from the top. The card never fades.
 */
export default function Brand({
  boot,
  light = false,
  heroWhite = false,
  size = "md",
  mobileWordmark = false,
}: {
  boot: boolean;
  light?: boolean;
  heroWhite?: boolean;
  size?: "md" | "lg";
  mobileWordmark?: boolean;
}) {
  const lg = size === "lg";
  const cardSize = lg ? "h-10 w-10 sm:h-11 sm:w-11" : "h-9 w-9 sm:h-10 sm:w-10";
  const markSize = lg ? "text-base" : "text-sm";
  const wordSize = lg ? "text-lg sm:text-xl" : "text-base sm:text-lg";

  return (
    <motion.div
      className={`flex items-center ${lg ? "gap-3.5" : "gap-3"}`}
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* Squared emblem — e-commerce design, maison-dark colours: a matte
          black card with a gilded hairline and a quiet gold sheen */}
      <motion.div
        variants={boot ? emblemBoot : emblemStatic}
        className={`flex ${cardSize} items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-br from-graphite via-onyx to-abyss shadow-[0_10px_30px_-8px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(212,175,55,0.2)]`}
      >
        <span
          className={`font-display ${markSize} font-bold tracking-tight text-gold-gradient`}
          style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.45))" }}
        >
          BV
        </span>
      </motion.div>

      {/* Wordmark — BATRA cream (onyx bold in light), VERSE gilded (dark-glow blue in light) */}
      <span className={`${mobileWordmark ? "flex" : "hidden sm:flex"} items-baseline gap-[0.28em]`}>
        <motion.span
          variants={wordStagger}
          className="flex items-baseline gap-[0.16em]"
        >
          {BATRA.map((ch, i) => (
            <motion.span
              key={`b-${i}`}
              variants={letter}
              className={`font-display ${wordSize} tracking-[0.24em] ${
                heroWhite
                  ? "font-semibold text-white"
                  : light
                    ? "font-bold text-onyx"
                    : "font-semibold text-cream"
              }`}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>

        <motion.span
          variants={verseStagger}
          className="flex items-baseline gap-[0.16em]"
          style={{
            filter: light
              ? "drop-shadow(0 0 10px rgba(30,58,138,0.55))"
              : "drop-shadow(0 0 10px rgba(212,175,55,0.35))",
          }}
        >
          {VERSE.map((ch, i) => (
            <motion.span
              key={`v-${i}`}
              variants={letter}
              className={`font-display ${wordSize} font-medium tracking-[0.24em] ${
                light ? "text-sapphire-gradient" : "text-gold-gradient"
              }`}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>
      </span>
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/* Boot: the card starts as a circle and squashes on impact like a real
   physical object — first big squash, bounce up, second smaller squash,
   then settles to the rounded square.  Matches the CSS ld-bt-squash feel. */
const emblemBoot: Variants = {
  hidden: { scaleX: 0.88, scaleY: 1.15, rotate: -5 },
  show: {
    scaleX: [0.88, 1.22, 0.92, 1.06, 0.97, 1],
    scaleY: [1.15, 0.72, 1.1, 0.94, 1.02, 1],
    rotate: [-5, 4, -3, 1.5, -0.5, 0],
    transition: {
      duration: 0.8,
      times: [0, 0.25, 0.45, 0.62, 0.82, 1],
      ease: EASE,
    },
  },
};

/* Refresh: the card stays a plain rounded square (the parent slides it in). */
const emblemStatic: Variants = {
  hidden: {},
  show: {},
};

const wordStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
};

const verseStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.8 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE },
  },
};
