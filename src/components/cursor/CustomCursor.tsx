"use client";

import { useEffect, useRef, useState } from "react";

// Port of Rolls-Royce Motor Cars' .rrmc-cursor state machine
// (rrmc/clientlibs clientlib-components). Faithful behavior:
// - 'default'       : show outlined ring, scale 0.3, border 4px (hidden native cursor)
// - 'scale'(icon)   : ring + hover icon, scale 1, border 1px
// - 'scale_cta'     : ring scale 0.7, border 2px
// - 'scale_large'   : ring scale 2.717391, border 1px
// - 'default_system': hide ring, restore native cursor
// The ring follows the pointer 1:1 via translate3d (no lerp, like RR).

const CURSOR_SCALE_DEFAULT = 0.3;
const CURSOR_SCALE_CTA = 0.7;
const CURSOR_SCALE_LARGE = 2.717391;

function transition({
  border,
  icon,
  inner,
  scale,
  borderWidth,
  iconMode,
  display,
}: {
  border: HTMLElement;
  icon: HTMLElement;
  inner: HTMLElement;
  scale: number;
  borderWidth: number;
  iconMode: "none" | "show" | "hide";
  display: "block" | "none";
}) {
  const c = border.parentElement?.parentElement as HTMLElement | null;
  if (c) c.style.display = display;
  border.style.transform = `scale(${scale})`;
  border.style.borderWidth = `${borderWidth}px`;
  if (iconMode === "none") {
    icon.className = "rrmc-cursor-icon";
    icon.style.transform = `scale(${scale})`;
  } else if (iconMode === "show") {
    icon.style.opacity = "1";
    icon.style.transform = `scale(${scale})`;
  } else {
    icon.style.opacity = "0";
    icon.style.transform = `scale(${scale})`;
  }
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) {
      setTouch(true);
      return;
    }

    const cursor = cursorRef.current;
    if (!cursor) return;
    const border = cursor.querySelector<HTMLElement>(".rrmc-cursor-border");
    const icon = cursor.querySelector<HTMLElement>(".rrmc-cursor-icon");
    const inner = cursor.querySelector<HTMLElement>(".rrmc-cursor-inner");
    if (!border || !icon || !inner) return;

    // RR appends to body and flags enabled state on body.
    document.body.appendChild(cursor);
    document.body.classList.add("rrmc-cursor-enabled");

    let started = false;

    const setNative = (v: string) => {
      document.body.style.cursor = v;
    };

    // default idle state (ring shown, native hidden)
    const toDefault = () => {
      setNative("none");
      transition({
        border,
        icon,
        inner,
        scale: CURSOR_SCALE_DEFAULT,
        borderWidth: 4,
        iconMode: "hide",
        display: "block",
      });
    };

    // hidden state (native cursor restored)
    const toSystem = () => {
      setNative("");
      transition({
        border,
        icon,
        inner,
        scale: CURSOR_SCALE_DEFAULT,
        borderWidth: 4,
        iconMode: "hide",
        display: "none",
      });
    };

    // magnified state with icon (media reveal / hover)
    const toScale = (iconName: string) => {
      setNative("none");
      icon.className = `rrmc-cursor-icon ${iconName}`;
      transition({
        border,
        icon,
        inner,
        scale: 1,
        borderWidth: 1,
        iconMode: "show",
        display: "block",
      });
    };

    toDefault();

    const onMove = (e: MouseEvent) => {
      cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!started) {
        started = true;
        inner.style.opacity = "1";
      }
    };

    const onDocumentOver = () => {
      inner.style.opacity = "1";
    };
    const onDocumentLeave = () => {
      inner.style.opacity = "0";
    };

    const hoverEnter = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest("[data-cursor-hover]")) {
        toScale("add");
      } else if (t.closest("[data-cursor-arrow='left']")) {
        toScale("arrow-left");
      } else if (t.closest("[data-cursor-arrow='right']")) {
        toScale("arrow-right");
      } else if (t.closest("[data-cursor-hover='play']")) {
        toScale("play");
      } else if (t.closest("[data-cursor-hover='cross']")) {
        toScale("cross");
      }
    };
    const hoverLeave = (e: MouseEvent) => {
      const t = e.relatedTarget as Element | null;
      const inHover =
        !!t?.closest?.("[data-cursor-hover]") ||
        !!t?.closest?.("[data-cursor-arrow='left']") ||
        !!t?.closest?.("[data-cursor-arrow='right']") ||
        !!t?.closest?.("[data-cursor-hover='play']") ||
        !!t?.closest?.("[data-cursor-hover='cross']");
      if (!inHover) toDefault();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseenter", onDocumentOver);
    document.addEventListener("mouseleave", onDocumentLeave);
    document.addEventListener("mouseover", hoverEnter, { passive: true });
    document.addEventListener("mouseout", hoverLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onDocumentOver);
      document.removeEventListener("mouseleave", onDocumentLeave);
      document.removeEventListener("mouseover", hoverEnter);
      document.removeEventListener("mouseout", hoverLeave);
      setNative("");
      document.body.classList.remove("rrmc-cursor-enabled");
      if (cursor.parentElement === document.body) {
        document.body.removeChild(cursor);
      }
    };
  }, []);

  if (touch) return null;

  return (
    <div ref={cursorRef} aria-hidden="true" className="rrmc-cursor">
      <div className="rrmc-cursor-inner" style={{ opacity: 0 }}>
        <div className="rrmc-cursor-border" />
        <div className="rrmc-cursor-icon" />
      </div>
    </div>
  );
}
