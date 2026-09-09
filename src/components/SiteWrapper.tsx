"use client";

import { useEffect, useRef, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import CustomCursor from "@/components/cursor/CustomCursor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { BootProvider, useBootDone } from "@/components/boot/BootProvider";
import BootScreen from "@/components/boot/BootScreen";
import ContentWrapper from "@/components/boot/ContentWrapper";
import { useAuth } from "@/components/auth/AuthContext";
import { Spinner } from "@/components/auth/auth-ui";

const EASE = [0.16, 1, 0.3, 1] as const;

function SellerGuard({ children }: { children: ReactNode }) {
  const bootDone = useBootDone();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isSellerRoute = pathname.startsWith("/seller");
  const sellerLocked = !authLoading && user?.role === "SELLER" && !isSellerRoute;
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current || !sellerLocked || !bootDone) return;
    redirected.current = true;
    router.replace("/seller");
  }, [sellerLocked, bootDone, router]);

  if (sellerLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}

export default function SiteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isSellerRoute = pathname.startsWith("/seller");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isDashboardRoute = isSellerRoute || isOwnerRoute;

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
            {!isDashboardRoute && <Navbar />}
            <motion.div
              className={`relative z-10 flex min-h-screen w-full flex-col${!isDashboardRoute && pathname !== "/" ? " pt-20 sm:pt-[92px]" : ""}`}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            >
              <SellerGuard>{children}</SellerGuard>
            </motion.div>
          </ContentWrapper>
        </BootProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}