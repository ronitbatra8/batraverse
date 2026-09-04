"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BootScreen from "@/components/boot/BootScreen";
import Navbar from "@/components/layout/Navbar";
import CustomCursor from "@/components/cursor/CustomCursor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { BootContext, type BootPhase, type BootState } from "@/components/boot/BootContext";
import { useAuth } from "@/components/auth/AuthContext";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Play the boot reveal once per session; refresh + tab switches skip it. */
const BOOT_KEY = "batraverse-booted";

export default function SiteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<BootPhase>("boot");
  const [boot, setBoot] = useState<BootState>("pending");

  /* Decide before the first paint. Until then everything is rendered hidden,
     so SSR is a quiet black page — a first visit paints the boot screen over
     it, a returning session paints the page directly. */
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: decide boot state from sessionStorage only after mount
    setBoot(sessionStorage.getItem(BOOT_KEY) ? "skip" : "play");
  }, []);

  /* pending = hidden, play = real phases, skip = instantly done */
  const effPhase =
    boot === "skip" ? "done" : boot === "play" ? phase : "boot";

  /* Lock scrolling via CSS class on html */
  useEffect(() => {
    const locked = effPhase !== "done";
    document.documentElement.classList.toggle("scroll-locked", locked);
    return () => { document.documentElement.classList.remove("scroll-locked"); };
  }, [effPhase]);

  /* Deterministic scroll management that matches what we actually want:
     - Back/forward navigation restores the exact position you left.
     - A fresh load of a main/top-level page (e.g. /store) goes to the top.
     - Nested pages (e.g. /store/[id]) are left to the browser's default.
     We detect back/forward via the popstate event (fires only on history
     traversal, not on link clicks or reloads), and remember each page's
     scroll position in sessionStorage so restoration is exact. */
  const traversal = useRef(false);

  useEffect(() => {
    const onPopState = () => { traversal.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /* Save the page we're leaving before the route changes */
  useEffect(() => {
    const leaving = pathname;
    return () => {
      try { sessionStorage.setItem(`scroll:${leaving}`, String(window.scrollY || 0)); } catch {}
    };
  }, [pathname]);

  /* On arrival: restore (back/forward) or go to top (fresh main page) */
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const isMain = segments.length <= 1;
    const apply = () => {
      if (traversal.current) {
        traversal.current = false;
        let y = 0;
        try { y = parseInt(sessionStorage.getItem(`scroll:${pathname}`) || "0", 10) || 0; } catch {}
        window.scrollTo(0, Math.max(0, y));
        document.documentElement.scrollTop = Math.max(0, y);
        document.body.scrollTop = Math.max(0, y);
      } else if (isMain) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }, [pathname]);

  /* Once the boot completes, give the morph a beat, then finish */
  useEffect(() => {
    if (phase !== "morph") return;
    const t = setTimeout(() => setPhase("done"), 1150);
    return () => clearTimeout(t);
  }, [phase]);

  /* Remember for the rest of this session */
  useEffect(() => {
    if (effPhase === "done") sessionStorage.setItem(BOOT_KEY, "1");
  }, [effPhase]);

  /* Auth gate: only the root path requires sign-in when signed out, and only
     the first time per tab. If the tab instead entered through a public page
     (shared product link, /contact, ...), the gate never appears this tab.
     Everything else stays public; private pages guard themselves. */
  const GATE_KEY = "batraverse-gated";

  useEffect(() => {
    if (loading) return;
    if (user || isGuest) return;

    /* Signed out and landed on a non-root page first: this tab skips the gate. */
    if (pathname !== "/") {
      try { sessionStorage.setItem(GATE_KEY, "1"); } catch {}
      return;
    }

    /* On "/" signed out: show sign-in exactly once per tab. */
    let gated = false;
    try { gated = sessionStorage.getItem(GATE_KEY) === "1"; } catch {}
    if (gated) return;
    try { sessionStorage.setItem(GATE_KEY, "1"); } catch {}
    router.replace("/login");
  }, [loading, user, isGuest, pathname, router]);

  return (
    <ThemeProvider>
      <ToastProvider>
      <CustomCursor />
      <BootContext.Provider value={{ phase: effPhase, boot }}>
      {/* Boot layer: abyss + progress (z-30, under the navbar brand) */}
      {boot === "play" && (
        <AnimatePresence mode="wait">
          {phase !== "done" && (
            <motion.div
              key="boot"
              exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE } }}
            >
              <BootScreen
                morphing={phase === "morph"}
                onComplete={() => setPhase("morph")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Navbar hosts the single brand element (z-50, above the boot bg) */}
      <Navbar />

      {/* Page content. Remounted once the session decision lands so it mounts
          with the correct hidden/visible initial state. */}
      <motion.div
        key={boot}
        className="relative z-10 flex min-h-screen w-full flex-col pt-16"
        initial={boot === "skip" ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
      >
        {children}
      </motion.div>
      </BootContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  );
}
