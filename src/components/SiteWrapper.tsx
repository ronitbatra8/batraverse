"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import CustomCursor from "@/components/cursor/CustomCursor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { BootProvider } from "@/components/boot/BootProvider";
import BootScreen from "@/components/boot/BootScreen";
import ContentWrapper from "@/components/boot/ContentWrapper";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SiteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /* The seller and owner dashboards replace the global top nav with their own
     chrome, so hide the top Navbar (and its offset) on those routes. */
  const isSellerRoute = pathname.startsWith("/seller");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isDashboardRoute = isSellerRoute || isOwnerRoute;

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
              className={`relative z-10 flex min-h-screen w-full flex-col${isDashboardRoute ? "" : " pt-20"}`}
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