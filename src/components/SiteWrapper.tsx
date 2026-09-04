"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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
     so SSR is a quiet black page — a first visit to the homepage paints the
     boot screen over it. Boot only plays on "/" (skipped on product/listing
     tabs opened in new windows) and once per tab session. */
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: decide boot state from sessionStorage only after mount
    setBoot(pathname === "/" && !sessionStorage.getItem(BOOT_KEY) ? "play" : "skip");
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

  /* Always start every page at the top — on refresh/reload and on every
     visit/navigation, for every page (main and nested alike). Products open
     in a new tab, so the page you leave never changes its scroll position. */
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    const toTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    toTop();
    const t1 = window.setTimeout(toTop, 150);
    const t2 = window.setTimeout(toTop, 400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
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
