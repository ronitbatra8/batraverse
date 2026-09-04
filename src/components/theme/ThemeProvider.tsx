"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(
  null
);

const STORAGE_KEY = "bt-theme";

/* Toggles the `light` class on <html> — globals.css re-maps the whole
   maison palette (background, neutrals, nav glass) onto a subtle-white
   scheme, so every token-based style flips with a single class.

   The chosen theme is persisted to localStorage so it holds across reloads
   and is inherited by new tabs (e.g. a product opened in a new tab follows
   the current tab's dark/light choice). */
export function ThemeProvider({ children, forceDark }: { children: ReactNode; forceDark?: boolean }) {
  /* SSR always renders dark; the stored preference is applied after
     hydration in a layout effect so there's no client/server mismatch and
     no visible flash (the layout effect runs before paint). */
  const [theme, setTheme] = useState<Theme>("dark");

  /* Apply the saved theme once, before paint, after hydration */
  useLayoutEffect(() => {
    let stored: Theme = "dark";
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") stored = v;
    } catch {}
    document.documentElement.classList.toggle("light", stored === "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate once, then match persisted preference
    setTheme(stored);
  }, []);

  /* Mirror the current theme onto <html> and persist it. While the boot
     animation is playing (forceDark), always use dark — regardless of the
     saved preference — then restore the saved theme once it's done. */
  useEffect(() => {
    if (forceDark) {
      document.documentElement.classList.remove("light");
      return;
    }
    document.documentElement.classList.toggle("light", theme === "light");
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [forceDark, theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
