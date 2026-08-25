"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    if (mq.matches) {
      setTouch(true);
      return;
    }

    const cursor = cursorRef.current;
    const border = cursor?.querySelector<HTMLElement>(".rrmc-cursor-border");
    if (!cursor || !border) return;

    cursor.style.display = "block";

    let raf: number;
    let mx = -100;
    let my = -100;
    let cx = -100;
    let cy = -100;
    let scale = 1;
    let targetScale = 1;
    let idle = true;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (idle) {
        idle = false;
        tick();
      }
    };

    const onLeave = () => {
      mx = -100;
      my = -100;
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest("a") ||
        t.closest("button") ||
        t.closest("[role='button']") ||
        t.closest("[data-cursor-hover]")
      ) {
        targetScale = 1.5;
      }
    };

    const onOut = (e: MouseEvent) => {
      const t = e.relatedTarget as HTMLElement | null;
      if (
        !t?.closest?.("a") &&
        !t?.closest?.("button") &&
        !t?.closest?.("[role='button']") &&
        !t?.closest?.("[data-cursor-hover]")
      ) {
        targetScale = 1;
      }
    };

    const tick = () => {
      const dx = mx - cx;
      const dy = my - cy;
      const ds = targetScale - scale;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.005) {
        cx = mx;
        cy = my;
        scale = targetScale;
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        border.style.transform = `scale(${scale})`;
        idle = true;
        return;
      }

      cx += dx * 0.45;
      cy += dy * 0.45;
      scale += ds * 0.15;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      border.style.transform = `scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (touch) return null;

  return (
    <>
      <div
        ref={cursorRef}
        className="rrmc-cursor"
        aria-hidden="true"
      >
        <div className="rrmc-cursor-inner">
          <div className="rrmc-cursor-border" />
        </div>
      </div>
    </>
  );
}
