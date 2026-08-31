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
        "pointer-events-none mt-auto w-full overflow-hidden border-t py-5 backdrop-blur-xl",
        light
          ? "border-gold/15 bg-onyx/80"
          : "border-white/25 bg-white/80"
      )}
    >
      {/* glossy sheen sweep across the strip */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-transparent",
          light ? "via-gold/[0.12]" : "via-white/[0.35]"
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
                light ? "text-cream hover:text-gold-light" : "text-abyss hover:text-black"
              )}
            >
              {name}
            </span>
            <span
              className={cn(
                "text-[7px]",
                light ? "text-gold/60" : "text-abyss/60"
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