"use client";

import { useLight } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

/* Rolls just like MAISON DARK's partner marquee: a barely-there frosted strip
   pinned to a page hero, with an infinite lineup of house promises separated
   by diamonds. Light mode = the exact MAISON DARK glass (white frosted strip,
   dark text); dark mode = a deep onyx frosted strip with cream/gold accents. */
const PROMISES = [
  "White-Glove Delivery",
  "Authenticity Guaranteed",
  "Private Returns Concierge",
  "Hand-Curated Edit",
];

function TrustMarquee() {
  const light = useLight();
  const row = [...PROMISES, ...PROMISES];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden border-t py-5 backdrop-blur-md",
        light
          ? "border-white/30 bg-gradient-to-b from-white/55 via-white/20 to-transparent"
          : "border-gold/15 bg-gradient-to-b from-onyx/70 via-onyx/35 to-transparent"
      )}
    >
      {/* glossy sheen sweep across the strip */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-transparent",
          light ? "via-white/[0.3]" : "via-gold/[0.12]"
        )}
      />

      <div
        className="flex w-max animate-[marquee_36s_linear_infinite] items-center hover:[animation-play-state:paused]"
        style={{ willChange: "transform" }}
      >
        {row.map((name, i) => (
          <span key={i} className="flex items-center">
            <span
              className={cn(
                "whitespace-nowrap px-8 font-display text-xs uppercase tracking-[0.45em] transition-colors sm:text-sm",
                light ? "text-abyss hover:text-black" : "text-cream hover:text-gold-light"
              )}
            >
              {name}
            </span>
            <span
              className={cn(
                "text-[7px]",
                light ? "text-abyss/60" : "text-gold/60"
              )}
            >
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default TrustMarquee;