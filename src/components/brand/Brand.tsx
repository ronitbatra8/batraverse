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
      className={`flex items-center ${lg ? "gap-3" : "gap-2.5"}`}
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* BV card — the gilded emblem from the boot splash: a matte onyx card
          with a gold hairline and a quiet gold sheen */}
      <div
        className={`flex ${cardSize} items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-graphite via-onyx to-abyss shadow-[0_10px_30px_-8px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(212,175,55,0.2)]`}
      >
        <span
          className={`font-display ${markSize} font-bold tracking-tight text-gold-gradient`}
          style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.45))" }}
        >
          BV
        </span>
      </div>

      {/* Wordmark — one continuous "BATRAVERSE" like the boot splash: BATRA in
          white/onyx/cream, VERSE gilded (sapphire in light mode), with the
          shopping bag hanging on the last E's bottom bar */}
      <span className={`${mobileWordmark ? "flex" : "hidden sm:flex"} relative items-baseline`}>
        {/* BATRA */}
        <motion.span
          variants={wordStagger}
          className="flex items-baseline"
        >
          {BATRA.map((ch, i) => (
            <motion.span
              key={`b-${i}`}
              variants={letter}
              className={`font-display ${wordSize} font-bold tracking-[0.06em] ${
                heroWhite
                  ? "text-white"
                  : light
                    ? "text-onyx"
                    : "text-cream"
              }`}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span><motion.span
          variants={verseStagger}
          className="flex items-baseline"
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
              className={`font-display ${wordSize} font-bold tracking-[0.06em] ${
                light ? "text-sapphire-gradient" : "text-gold-gradient"
              }`}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>

        {/* Shopping bag — the exact boot bag, hanging on the final E's bottom bar
            like the boot splash (same artwork, same anchor, scaled down) */}
        <div className="pointer-events-none absolute" style={{ right: "-4px", top: "60%" }}>
          <svg
            className="w-[30px] h-[21px] sm:w-[38px] sm:h-[26px] md:w-[44px] md:h-[30px]"
            viewBox="0 0 120 170"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="nvBagFront" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b3834" />
                <stop offset="50%" stopColor="#2a2825" />
                <stop offset="100%" stopColor="#201f1c" />
              </linearGradient>
              <linearGradient id="nvBagGusset" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#23211e" />
                <stop offset="100%" stopColor="#161513" />
              </linearGradient>
              <linearGradient id="nvGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f2cd74" />
                <stop offset="55%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#a88424" />
              </linearGradient>
              <filter id="nvShadow" x="-20%" y="-10%" width="140%" height="135%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
              </filter>
            </defs>

            <g filter="url(#nvShadow)">
              {/* Open dark interior (mouth of the bag) */}
              <path d="M24,20 C24,15 96,15 96,20 L94,32 C94,38 26,38 26,32 Z" fill="#121110" />

              {/* Left folded gusset panel */}
              <path d="M17,20 L24,20 L29,150 L21,150 Z" fill="url(#nvBagGusset)" />
              <path d="M20,20 L26,148" stroke="#4a463f" strokeWidth="1" opacity="0.7" />
              <path d="M24,20 L28,148" stroke="#0d0c0b" strokeWidth="1.2" opacity="0.8" />

              {/* Right folded gusset panel */}
              <path d="M96,20 L103,20 L99,150 L91,150 Z" fill="url(#nvBagGusset)" />
              <path d="M100,20 L94,148" stroke="#4a463f" strokeWidth="1" opacity="0.7" />
              <path d="M96,20 L92,148" stroke="#0d0c0b" strokeWidth="1.2" opacity="0.8" />

              {/* Front panel — structured shopping bag body */}
              <path d="M24,18 L96,18 L92,152 L28,152 Z" fill="url(#nvBagFront)" />

              {/* Top lip of the bag */}
              <path d="M24,20 C24,15 96,15 96,20" stroke="#4f4b44" strokeWidth="2" strokeLinecap="round" />

              {/* Bottom base fold */}
              <path d="M28,152 L92,152 L90,158 L30,158 Z" fill="#191815" />
              <path d="M28,152 L92,152" stroke="#0e0d0c" strokeWidth="2" />

              {/* Soft center highlight (flat paper front) */}
              <path d="M46,32 L42,148" stroke="#ffffff" strokeWidth="3" opacity="0.045" />
              <path d="M76,32 L78,148" stroke="#ffffff" strokeWidth="3" opacity="0.045" />

              {/* Paper sheen near the top */}
              <path d="M30,44 C52,49 68,49 90,44" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.05" />

              {/* Gold BV monogram */}
              <text
                x="60"
                y="106"
                textAnchor="middle"
                fontFamily="Playfair Display, serif"
                fontSize="22"
                fontWeight="700"
                fill="url(#nvGold)"
                opacity="0.9"
                style={{ letterSpacing: "4px" }}
              >
                BV
              </text>

              {/* Gold gently embossed line under the monogram */}
              <path d="M46,116 L74,116" stroke="url(#nvGold)" strokeWidth="1.5" opacity="0.5" />

              {/* Left gold handle strand — gathers over the bar */}
              <path d="M44,38 C46,18 52,4 59,1" stroke="url(#nvGold)" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M44,38 C46,19 51,6 58,3" stroke="#f7e3a8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />

              {/* Right gold handle strand */}
              <path d="M76,38 C74,18 68,4 61,1" stroke="url(#nvGold)" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M76,38 C74,19 69,6 62,3" stroke="#f7e3a8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
            </g>
          </svg>
        </div>
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