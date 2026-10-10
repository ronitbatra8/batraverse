const STORAGE_KEY = "bt-search-history";
const MAX_TERMS = 12;

export function trackSearchTerm(term: string) {
  if (typeof window === "undefined") return;
  const clean = term.trim();
  if (clean.length < 2) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const items: string[] = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(items) ? items.filter((t) => typeof t === "string") : [];
    const deduped = list.filter((t) => t.toLowerCase() !== clean.toLowerCase());
    deduped.unshift(clean);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped.slice(0, MAX_TERMS)));
  } catch {
    /* ignore */
  }
}

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    return items.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return [];
  }
}
