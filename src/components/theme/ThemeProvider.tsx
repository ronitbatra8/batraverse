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

export type Theme = "dark" | "light";

/* Query param used to carry the opener's theme to a product opened in a new
   tab. Fresh opens (no param) always start dark. */
const THEME_QUERY_KEY = "bt-theme";

/* Returns ?bt-theme=<mode> for detail links that open in a new tab, so the
   new tab can open in the same mode. Dark is the default, so it is omitted. */
export function detailQuery(theme: Theme): string {
  return theme === "light" ? `?${THEME_QUERY_KEY}=light` : "";
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(
  null
);

const STORAGE_KEY = "bt-theme";

/* The theme lives in sessionStorage. A freshly opened tab (empty
   sessionStorage) always starts DARK by default. A product opened in a new
   tab carries the opener's mode via ?bt-theme=<mode>, which is applied on
   mount and then stripped from the URL — reliable in every browser (unlike
   sessionStorage cloning, which Firefox/Safari don't provide). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  /* SSR always renders dark; any stored preference is applied after
     hydration in a layout effect so there's no client/server mismatch and
     no visible flash (the layout effect runs before paint). */
  const [theme, setTheme] = useState<Theme>("dark");

  /* Apply the stored / URL-carried theme once, before paint, after hydration */
  useLayoutEffect(() => {
    let stored: Theme = "dark";
    try {
      const url = new URL(window.location.href);
      const carried = url.searchParams.get(THEME_QUERY_KEY);
      if (carried === "light" || carried === "dark") stored = carried;
      if (carried) {
        url.searchParams.delete(THEME_QUERY_KEY);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
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
