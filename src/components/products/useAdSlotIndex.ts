"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `lg` — the breakpoint where the product grid becomes 4 columns. */
const MQ = "(min-width: 1024px)";

/**
 * Cards rendered before the inline ad on the 4-column desktop grid.
 *
 * The ad spans 2 columns, so 9 puts it in the middle of the row:
 *   row 3  ▢ [ AD ▢▢ ] ▢
 */
export const AD_SLOT_DESKTOP = 9;
/** Cards rendered before the inline ad below `lg` (2/3 column grids). */
export const AD_SLOT_MOBILE = 6;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * How many product cards come before the inline ad.
 *
 * Desktop: 2 full rows of 4, then the ad shares row 3 with 2 cards.
 * Below lg: 3 rows of 2, then the ad runs full width.
 *
 * `getServerSnapshot` returns the desktop value so SSR and the first client
 * render agree; the real value is applied right after hydration.
 */
export function useAdSlotIndex(): number {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MQ).matches,
    () => true
  );
  return isDesktop ? AD_SLOT_DESKTOP : AD_SLOT_MOBILE;
}