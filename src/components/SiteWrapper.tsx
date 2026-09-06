"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import CustomCursor from "@/components/cursor/CustomCursor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { useAuth } from "@/components/auth/AuthContext";
import { BootProvider } from "@/components/boot/BootProvider";
import BootScreen from "@/components/boot/BootScreen";
import ContentWrapper from "@/components/boot/ContentWrapper";

const EASE = [0.16, 1, 0.3, 1] as const;

const GATE_KEY = "batraverse-gated";

export default function SiteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* Auth gate: only the root path requires sign-in when signed out, and only
     the first time per tab. If the tab instead entered through a public page
     (shared product link, /contact, ...), the gate never appears this tab.
     Everything else stays public; private pages guard themselves. */

  /* The seller and owner dashboards replace the global top nav with their own
     chrome, so hide the top Navbar (and its offset) on those routes. */
  const isSellerRoute = pathname.startsWith("/seller");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isDashboardRoute = isSellerRoute || isOwnerRoute;

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

  return (
    <ThemeProvider>
      <ToastProvider>
        <BootProvider>
          <BootScreen />
          <ContentWrapper>
            <CustomCursor />
            <Navbar />
            <motion.div
              className={`relative z-10 flex min-h-screen w-full flex-col${isDashboardRoute ? "" : " pt-16"}`}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            >
              {children}
            </motion.div>
          </ContentWrapper>
        </BootProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}