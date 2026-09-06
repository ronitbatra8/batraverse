"use client";

import { motion, type Variants } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const BATRA = ["B", "A", "T", "R", "A"];
const VERSE = ["V", "E", "R", "S", "E"];

export default function Brand({
  light = false,
  heroWhite = false,
  size = "md",
  mobileWordmark = false,
}: {
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
      <div
        className={`flex ${cardSize} items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-br from-graphite via-onyx to-abyss shadow-[0_10px_30px_-8px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(212,175,55,0.2)]`}
      >
        <span
          className={`font-display ${markSize} font-bold tracking-tight text-gold-gradient`}
          style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.45))" }}
        >
          BV
        </span>
      </div>

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