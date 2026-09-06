"use client";

import { ReactNode, useEffect, useState } from "react";
import { useBootDone } from "./BootProvider";

export default function ContentWrapper({ children }: { children: ReactNode }) {
  const done = useBootDone();
  /* Dark from the first paint (server & client agree), so the home page never
     flashes before the boot. Only after mounting do we know whether the boot
     will play, and content reveals when it's safe. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ opacity: mounted && done ? 1 : 0 }}>
      {children}
    </div>
  );
}