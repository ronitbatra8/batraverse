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

/* The theme lives in sessionStorage. A freshly opened tab (empty
   sessionStorage) always starts DARK by default; a tab opened from the
   current one (e.g. a product in a new tab) inherits a copy of that
   tab's sessionStorage, so it follows the opener's dark/light choice —
   the same way the signed-in account carries over.

   The choice is never written to localStorage, so it is not remembered
   across fresh loads. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  /* SSR always renders dark; any stored preference is applied after
     hydration in a layout effect so there's no client/server mismatch and
     no visible flash (the layout effect runs before paint). */
  const [theme, setTheme] = useState<Theme>("dark");

  /* Apply the stored theme once, before paint, after hydration */
  useLayoutEffect(() => {
    let stored: Theme = "dark";
    try {
      const v = window.sessionStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") stored = v;
    } catch {}
    document.documentElement.classList.toggle("light", stored === "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate once, then match the stored preference
    setTheme(stored);
  }, []);

  /* Mirror the current theme onto <html> and keep it in this tab's session */
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try { window.sessionStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

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
