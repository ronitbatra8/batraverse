"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBootDone } from "./BootProvider";

export default function BootScreen() {
  const done = useBootDone();
  const pathname = usePathname();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (done) {
      setFadeOut(false);
      return;
    }
    const t = setTimeout(() => setFadeOut(true), 2700);
    return () => clearTimeout(t);
  }, [done]);

  if (done || pathname !== "/") return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-abyss transition-opacity duration-300 ${fadeOut ? "opacity-0" : "opacity-100"}`}>
      <div className="flex select-none flex-col items-center px-4">
        {/* Row: BV card (falls with squash) + single "BATRAVERSE" wordmark.
            overflow-visible lets the bag dangle below without clipping. */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
          {/* BV card — the gilded emblem that drops in like the BT card, larger */}
          <div className="ld-bv-fall">
            <div className="ld-bv-squash flex h-16 w-16 items-center justify-center rounded-[var(--bv-r)] border border-gold/40 bg-gradient-to-br from-graphite via-onyx to-abyss shadow-[0_10px_28px_-6px_rgba(212,175,55,0.45),inset_0_1px_0_rgba(212,175,55,0.2)] sm:h-24 sm:w-24">
              <span
                className="font-display text-3xl font-bold tracking-tight text-gold-gradient sm:text-5xl"
                style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.5))" }}
              >
                BV
              </span>
            </div>
          </div>

          {/* Single "BATRAVERSE" word — one type-reveal; polybag hangs from the last E */}
          <div className="ld-wm relative">
            <div className="ld-wm-reveal flex">
              <span className="ld-wm-letter font-display text-cream">B</span>
              <span className="ld-wm-letter font-display text-cream">A</span>
              <span className="ld-wm-letter font-display text-cream">T</span>
              <span className="ld-wm-letter font-display text-cream">R</span>
              <span className="ld-wm-letter font-display text-cream">A</span>
              <span className="ld-wm-letter ld-wm-gold font-display text-gold-gradient">V</span>
              <span className="ld-wm-letter ld-wm-gold font-display text-gold-gradient">E</span>
              <span className="ld-wm-letter ld-wm-gold font-display text-gold-gradient">R</span>
              <span className="ld-wm-letter ld-wm-gold font-display text-gold-gradient">S</span>
              <span className="ld-wm-letter ld-wm-gold font-display text-gold-gradient">E</span>
            </div>

            {/* Luxury shopping bag — matte onyx paper, gold handles & BV monogram.
                Hangs on the LAST (bottom) bar of the final E: the two handle strands
                gather over that bar (like the headphone over the T) and the structured
                bag body dangles below, swung a little as if just hung. */}
            <div className="ld-bag absolute" style={{ right: "-4px", top: "60%" }}>
              <svg
                className="w-[84px] h-[58px] sm:w-[112px] sm:h-[82px] md:w-[160px] md:h-[110px]"
                viewBox="0 0 120 170"
                fill="none"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="ldBagFront" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b3834" />
                    <stop offset="50%" stopColor="#2a2825" />
                    <stop offset="100%" stopColor="#201f1c" />
                  </linearGradient>
                  <linearGradient id="ldBagGusset" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#23211e" />
                    <stop offset="100%" stopColor="#161513" />
                  </linearGradient>
                  <linearGradient id="ldGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f2cd74" />
                    <stop offset="55%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#a88424" />
                  </linearGradient>
                  <filter id="ldShadow" x="-20%" y="-10%" width="140%" height="135%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
                  </filter>
                </defs>

                <g filter="url(#ldShadow)">
                  {/* Open dark interior (mouth of the bag) */}
                  <path d="M24,20 C24,15 96,15 96,20 L94,32 C94,38 26,38 26,32 Z" fill="#121110" />

                  {/* Left folded gusset panel */}
                  <path d="M17,20 L24,20 L29,150 L21,150 Z" fill="url(#ldBagGusset)" />
                  <path d="M20,20 L26,148" stroke="#4a463f" strokeWidth="1" opacity="0.7" />
                  <path d="M24,20 L28,148" stroke="#0d0c0b" strokeWidth="1.2" opacity="0.8" />

                  {/* Right folded gusset panel */}
                  <path d="M96,20 L103,20 L99,150 L91,150 Z" fill="url(#ldBagGusset)" />
                  <path d="M100,20 L94,148" stroke="#4a463f" strokeWidth="1" opacity="0.7" />
                  <path d="M96,20 L92,148" stroke="#0d0c0b" strokeWidth="1.2" opacity="0.8" />

                  {/* Front panel — structured shopping bag body */}
                  <path d="M24,18 L96,18 L92,152 L28,152 Z" fill="url(#ldBagFront)" />

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
                    fontSize="17"
                    fontWeight="700"
                    fill="url(#ldGold)"
                    opacity="0.9"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "4px" }}
                  >
                    BV
                  </text>

                  {/* Gold gently embossed line under the monogram */}
                  <path d="M46,116 L74,116" stroke="url(#ldGold)" strokeWidth="1.5" opacity="0.5" />

                  {/* Left gold handle strand — gathers over the bar */}
                  <path d="M44,38 C46,18 52,4 59,1" stroke="url(#ldGold)" strokeWidth="6" strokeLinecap="round" fill="none" />
                  <path d="M44,38 C46,19 51,6 58,3" stroke="#f7e3a8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />

                  {/* Right gold handle strand */}
                  <path d="M76,38 C74,18 68,4 61,1" stroke="url(#ldGold)" strokeWidth="6" strokeLinecap="round" fill="none" />
                  <path d="M76,38 C74,19 69,6 62,3" stroke="#f7e3a8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Mobile-only note — desktop viewers skip it entirely */}
        <p className="ld-note mt-8 px-6 text-center text-[10px] font-medium uppercase tracking-[0.4em] text-cream/70 md:hidden">
          For the best visual experience, use a desktop
        </p>
      </div>
    </div>
  );
}
