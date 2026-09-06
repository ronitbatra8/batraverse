"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

const BootContext = createContext({ done: true });

export function useBootDone() {
  return useContext(BootContext).done;
}

export function BootProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  /* Content is visible from the very first render (server & client agree, so no
     hydration mismatch). Only after mounting do we peek at sessionStorage: if
     this is the first visit to "/" in this tab, play the boot overlay once. */
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (!isRoot) return;
    let cancelled = false;
    let firstVisit = false;
    try { firstVisit = !sessionStorage.getItem("btv-loaded"); } catch {}
    if (!firstVisit) return;
    setDone(false); /* show boot */
    const t = setTimeout(() => {
      if (cancelled) return;
      setDone(true);
      try { sessionStorage.setItem("btv-loaded", "1"); } catch {}
    }, 3000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isRoot]);

  return <BootContext.Provider value={{ done }}>{children}</BootContext.Provider>;
}