"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform,
} from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Boot layer — abyss black, an ambient gold bloom, and a quiet progress line.
 * The brand lockup lives in the navbar: it drops in from the top (e-commerce),
 * then flies home on morph (the MAISON DARK flight), so this layer never
 * renders a logo.
 */
export default function BootScreen({
  morphing,
  onComplete,
}: {
  morphing: boolean;
  onComplete: () => void;
}) {
  const [progressing, setProgressing] = useState(false);
  const progress = useMotionValue(0);
  const progressWidth = useTransform(progress, [0, 1], ["0%", "100%"]);
  const completedRef = useRef(false);

  const bgControls = useAnimationControls();
  const auxControls = useAnimationControls();

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    /* The progress line runs after the brand lockup has finished its drop,
       then reports completion so the wrapper can morph to the page. */
    timers.push(
      setTimeout(() => {
        setProgressing(true);
        animate(progress, 1, {
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1],
        });
      }, 1600)
    );

    timers.push(
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 2750)
    );

    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!morphing) return;
    bgControls.start({ opacity: 0, transition: { duration: 0.7, ease: EASE } });
    auxControls.start({ opacity: 0, transition: { duration: 0.4, ease: EASE } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morphing]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden">
      {/* Abyss backdrop */}
      <motion.div
        className="absolute inset-0 bg-abyss"
        animate={bgControls}
        style={{ opacity: 1 }}
      />

      {/* Ambient bloom behind the brand */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl"
        animate={auxControls}
        style={{
          x: "-50%",
          y: "-50%",
          background:
            "radial-gradient(closest-side, rgba(212,175,55,0.10), transparent)",
        }}
      />

      {/* One-shot bloom pulse as the brand lands at centre */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] rounded-full border border-gold/10"
        style={{ x: "-50%", y: "-50%" }}
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 0.55, 0], scale: [0.55, 1.08, 1.2] }}
        transition={{ delay: 1.4, duration: 1.1, ease: EASE, times: [0, 0.5, 1] }}
      />

      {/* Vignette keeps edges quiet */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(5,5,6,0.85) 100%)",
        }}
      />

      {/* Progress — resting below the settled brand */}
      <motion.div
        className="absolute left-1/2 flex flex-col items-center"
        style={{ top: "calc(50% + 190px)", x: "-50%" }}
        animate={auxControls}
      >
        <p className="text-[9px] font-medium uppercase tracking-[0.6em] text-cream-dim/80">
          Batra Verse · MMXXVI
        </p>

        <div className="mt-7 w-64 sm:w-72">
          <div className="relative h-px w-full overflow-hidden rounded-full bg-cream/10">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full hairline-gold"
              style={{ width: progressWidth }}
            />
          </div>

          <motion.p
            className="mt-6 text-center text-[9px] font-medium uppercase tracking-[0.55em] text-cream-dim/60"
            animate={{ opacity: progressing ? 1 : 0 }}
            transition={{ duration: 1 }}
          >
            Curating your experience
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
