"use client";

import { useEffect, useRef, useState } from "react";

// Rolls-Royce Motor Cars' .rrmc-cursor — literal port of the AEM
// clientlib-components state machine (rrmc-cursor module + icon_animator).
//
// Exact behavior:
// - boot                          : ring visible (default), inner opacity 0,
//                                   body cursor "none"; first mousemove fades inner in
// - idle (no hover)               : default  -> scale 0.3,  border 4px
// - hover a/button/[role=button]  : scale_cta -> scale 0.7, border 2px
// - hover carousel/media          : scale   -> scale 1,    border 1px + icon
// - hover peek/large              : scale_large -> scale 2.717391, border 1px + icon
// - document leave                : inner fades out; enter -> fades in
// - touch                         : disabled entirely
//
// Follow is 1:1 via translate3d(clientXpx, clientYpx, 0) on every mousemove
// (RR sets no lerp). Native cursor is managed via document.body.style.cursor.
// GSAP tweens are mirrored with CSS transitions (.1s scale / .2s opacity).

const SCALE_DEFAULT = 0.3;
const SCALE_CTA = 0.7;
const SCALE_MEDIA = 1;
const SCALE_LARGE = 2.717391;

// Which interaction an element belongs to (highest priority wins).
const ICON_NAME = "rrmc-cursor-icon";

function describe(elm: Element): string | null {
  if (elm.closest("[data-cursor-hover='play']")) return "play";
  if (elm.closest("[data-cursor-hover='cross']")) return "cross";
  if (elm.closest("[data-cursor-hover]")) return "add";
  if (elm.closest("[data-cursor-arrow='left']")) return "arrow-left";
  if (elm.closest("[data-cursor-arrow='right']")) return "arrow-right";
  if (elm.closest("[data-cursor-media]")) return "add";
  if (elm.closest("a, button, [role='button'], label, select, summary"))
    return "cta";
  return null;
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

    document.body.appendChild(cursor);
    document.body.classList.add("rrmc-cursor-enabled");

    let activeIcon = "";

    const setNative = (v: string) => {
      document.body.style.cursor = v;
    };

    // ---- transitions mirror RR's GSAP tweens ----------------------------
    const go = ({
      scale,
      borderWidth,
      icon: iconName,
      display,
      iconVisible,
    }: {
      scale: number;
      borderWidth: number;
      icon: string;
      display: "block" | "none";
      iconVisible: boolean;
    }) => {
      cursor.style.display = display;
      border.style.transform = `scale(${scale})`;
      border.style.borderWidth = `${borderWidth}px`;
      if (activeIcon && activeIcon !== iconName) {
        icon.classList.remove(activeIcon);
      }
      if (iconName) {
        icon.className = `${ICON_NAME} ${iconName}`;
        icon.style.opacity = iconVisible ? "1" : "0";
        icon.style.transform = `scale(${scale})`;
        activeIcon = iconName;
      } else {
        icon.className = ICON_NAME;
        icon.style.opacity = "0";
        activeIcon = "";
      }
    };

    // default idle ring (visible, native hidden)
    const toDefault = () => {
      setNative("none");
      go({
        scale: SCALE_DEFAULT,
        borderWidth: 4,
        icon: "",
        display: "block",
        iconVisible: false,
      });
    };

    // scale_cta over links/buttons
    const toCta = () => {
      setNative("none");
      go({
        scale: SCALE_CTA,
        borderWidth: 2,
        icon: "",
        display: "block",
        iconVisible: false,
      });
    };

    // scale + icon over media/carousels
    const toMedia = (iconName: string) => {
      setNative("none");
      go({
        scale: SCALE_MEDIA,
        borderWidth: 1,
        icon: iconName,
        display: "block",
        iconVisible: true,
      });
    };

    // scale_large + icon over peek/large reveal areas
    const toLarge = (iconName: string) => {
      setNative("none");
      go({
        scale: SCALE_LARGE,
        borderWidth: 1,
        icon: iconName,
        display: "block",
        iconVisible: true,
      });
    };

    toDefault();

    let started = false;
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

    const HOVER: Record<string, () => void> = {
      play: () => toMedia("play"),
      cross: () => toMedia("cross"),
      add: () => toMedia("add"),
      "arrow-left": () => toMedia("arrow-left"),
      "arrow-right": () => toMedia("arrow-right"),
      media: () => toMedia("add"),
      cta: toCta,
    };

    const hoverEnter = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      const kind = describe(t);
      if (kind && HOVER[kind]) HOVER[kind]();
    };

    const hoverLeave = (e: MouseEvent) => {
      const t = e.relatedTarget as Element | null;
      if (t && t instanceof Element && describe(t)) return;
      toDefault();
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
