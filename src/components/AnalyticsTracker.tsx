"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { API } from "@/app/admin/components/types";

const EXCLUDED = ["/owner", "/seller"];

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  const send = useCallback((page: string, duration: number | null) => {
    try {
      let visitorId = "";
      try { visitorId = localStorage.getItem("bv_visitor") || ""; } catch {}
      if (!visitorId) {
        visitorId = `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        try { localStorage.setItem("bv_visitor", visitorId); } catch {}
      }
      const body = JSON.stringify({
        visitorId,
        page,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        duration,
      });
      const url = `${API}/api/analytics/track`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      lastPath.current = null;
      return;
    }
    if (lastPath.current && lastPath.current !== pathname) {
      send(lastPath.current, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    }
    lastPath.current = pathname;
    startedAt.current = Date.now();
    send(pathname, null);
  }, [pathname, send]);

  useEffect(() => {
    const flush = () => {
      const p = lastPath.current;
      if (p && !EXCLUDED.some((x) => p === x || p.startsWith(`${x}/`))) {
        send(p, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [send]);

  return null;
}