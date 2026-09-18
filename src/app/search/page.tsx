"use client";

import { useMemo, useState, useEffect, useCallback, Suspense, useRef, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Star, ChevronUp } from "lucide-react";
import SiteLayout from "@/components/layout/SiteLayout";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn, formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { getAuth } from "@/lib/authStorage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_HEADERS = { "ngrok-skip-browser-warning": "true" };

const DB_STORE_GRADIENT: Record<string, string> = {
  watches: "from-zinc-700 to-zinc-900",
  fashion: "from-indigo-600 to-indigo-900",
  accessories: "from-amber-500 to-amber-800",
  footwear: "from-stone-500 to-stone-800",
  tech: "from-cyan-500 to-cyan-800",
  lifestyle: "from-purple-500 to-purple-800",
  limited: "from-gold-400 to-gold-700",
  default: "from-zinc-600 to-zinc-900",
};

const DB_MART_GRADIENT: Record<string, string> = {
  fruits: "from-green-400 to-green-600",
  dairy: "from-yellow-200 to-yellow-400",
  snacks: "from-orange-400 to-orange-600",
  beverages: "from-blue-400 to-blue-600",
  instant: "from-red-400 to-red-600",
  personal: "from-pink-400 to-pink-600",
  cleaning: "from-cyan-400 to-cyan-600",
  default: "from-stone-400 to-stone-600",
};

interface DbProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subCategory: string | null;
  price: number;
  originalPrice: number | null;
  description: string | null;
  images: string[];
  inStock: boolean;
  badge: string | null;
  rating: number;
  reviewCount: number;
  seller: { name: string; shopName: string | null; email: string } | null;
  colorOptions: unknown;
  sizeOptions: unknown;
}

/* Shape of a search result from GET /api/search (slim catalog product). */
interface SlimResult {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subCategory: string | null;
  price: number;
  originalPrice: number | null;
  images: string[];
  inStock: boolean;
  badge: string | null;
  rating: number;
  reviewCount: number;
  source: string;
  colorOptions: unknown;
  sizeOptions: unknown;
}

interface UnifiedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  category: string;
  sub: string;
  badge?: string;
  gradient: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  img?: string;
  dbImages?: string[];
  source: "store" | "mart";
  unit?: string;
}

/* A filter pulled out of the user's query (mirrors the backend `chips`). */
interface SearchChip {
  kind: "range" | "discount" | "under" | "toprated" | "new" | "color" | "size" | "gender" | "type";
  min?: number;
  max?: number;
  pct?: number;
  num?: number;
  color?: string;
  size?: string;
  gender?: string;
  type?: string;
  tokens?: string[];
}

function chipLabel(chip: SearchChip): string {
  switch (chip.kind) {
    case "range":
      return `${formatPrice(chip.min ?? 0)} — ${formatPrice(chip.max ?? 0)}`;
    case "discount":
      return `${chip.pct}% off`;
    case "under":
      return `Under ${formatPrice(chip.num ?? 0)}`;
    case "toprated":
      return "Top rated";
    case "new":
      return "New arrivals";
    case "color":
      return `Color: ${capitalize(chip.color ?? "")}`;
    case "size":
      return `Size: ${(chip.size ?? "").toUpperCase()}`;
    case "gender":
      return capitalize(chip.gender ?? "");
    case "type":
      return capitalize(chip.type ?? "");
    default:
      return "";
  }
}

/* Any chip backed by source query words can be dropped from the query; pure
   ranking biases ("top rated", "new arrivals") carry no tokens so stay. */
function chipRemovable(chip: SearchChip): boolean {
  return !!chip.tokens && chip.tokens.length > 0;
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/* Drop the source words (e.g. "under10000", "30% off") out of the query text
   so hitting x re-searches without that constraint. */
function stripChip(query: string, chip: SearchChip): string {
  const tokens = chip.tokens;
  if (!tokens || tokens.length === 0) return query;
  const rx = new RegExp(tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
  return query.replace(rx, "").replace(/\s+/g, " ").trim();
}

/* Bold-ish highlight of the matched terms inside a product title. */
function HighlightedText({ text, terms, markClass }: { text: string; terms: string[]; markClass: string }) {
  if (!text || terms.length === 0) return <>{text}</>;
  const rx = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(rx);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={markClass}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function dbToUnified(p: DbProduct, source: "store" | "mart"): UnifiedProduct {
  const rawColors = Array.isArray(p.colorOptions)
    ? (p.colorOptions as { name: string; hex: string; colors?: string[]; images?: string[]; price?: number; originalPrice?: number }[])
    : [];
  const firstColor = rawColors.length > 0 ? rawColors[0] : null;
  const sizeOpts = (p.sizeOptions && typeof p.sizeOptions === "object" && !Array.isArray(p.sizeOptions))
    ? p.sizeOptions as Record<string, { name: string; price?: number; originalPrice?: number }[]>
    : {};
  const firstName = firstColor?.name || "";
  const firstSizes = sizeOpts[firstName] || Object.values(sizeOpts)[0] || [];

  // Real goods uploaded by sellers/owners may price by color/size variant instead
  // of a base price — resolve an effective price just like the store grid and the
  // detail page's default selection (first size of first color, then color, then base).
  let effectivePrice = p.price;
  let effectiveOriginalPrice = p.originalPrice ?? undefined;
  if (effectivePrice === 0 || effectivePrice == null) {
    if (firstSizes[0]?.price && firstSizes[0].price > 0) {
      effectivePrice = firstSizes[0].price;
      effectiveOriginalPrice = firstSizes[0].originalPrice ?? effectiveOriginalPrice;
    } else if (firstColor?.price && firstColor.price > 0) {
      effectivePrice = firstColor.price;
      effectiveOriginalPrice = firstColor.originalPrice ?? effectiveOriginalPrice;
    }
  }

  const effectiveImages =
    p.images.length > 0 ? p.images : firstColor?.images && firstColor.images.length > 0 ? firstColor.images : [];
  const gradientMap = source === "store" ? DB_STORE_GRADIENT : DB_MART_GRADIENT;
  return {
    id: `db-${p.id}`,
    name: p.name,
    brand: p.brand || "",
    price: effectivePrice,
    originalPrice: effectiveOriginalPrice,
    category: p.category || "uncategorized",
    sub: p.subCategory || "all",
    badge: p.badge || undefined,
    gradient: gradientMap[p.category || ""] || gradientMap.default,
    rating: p.rating,
    reviews: p.reviewCount,
    inStock: p.inStock,
    dbImages: effectiveImages,
    source,
    unit: source === "mart" ? "1 unit" : undefined,
  };
}

function SearchInput({ query, onQueryChange, onDebounced, light, onFocusScroll }: { query: string; onQueryChange: (q: string) => void; onDebounced: (q: string) => void; light: boolean; onFocusScroll: () => void }) {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("focus") === "1") inputRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => onDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query, onDebounced]);

  return (
    <div className="relative flex-1">
      <Search size={16} strokeWidth={1.5} className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/50")} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onClick={onFocusScroll}
        placeholder="Search products..."
        aria-label="Search products"
        className={cn(
          "w-full rounded-2xl border py-0 pl-11 pr-10 text-[13px] font-light tracking-wide backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-500 focus:outline-none h-[2.75rem] sm:h-14",
          light
            ? "border-white/50 bg-white/50 text-dark-900 placeholder:text-dark-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_-10px_rgba(0,0,0,0.45)] focus:border-sapphire/40"
            : "border-white/15 bg-black/50 text-cream placeholder:text-cream-dim/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_-10px_rgba(0,0,0,0.6)] focus:border-gold/40"
        )}
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300", light ? "text-dark-400 hover:text-dark-900" : "text-cream-dim/50 hover:text-cream")}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

function SearchContent() {
  const { theme } = useTheme();
  const light = theme === "light";
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [ranked, setRanked] = useState<UnifiedProduct[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [resultTotal, setResultTotal] = useState<number | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const [relaxed, setRelaxed] = useState(false);
  const [autoCorrected, setAutoCorrected] = useState(false);
  const [related, setRelated] = useState<UnifiedProduct[]>([]);
  const [noResultsSuggestions, setNoResultsSuggestions] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [dbStore, setDbStore] = useState<UnifiedProduct[]>([]);
  const [dbMart, setDbMart] = useState<UnifiedProduct[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hideTabs, setHideTabs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const lastScrollY = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const navAnchorRef = useRef<HTMLDivElement>(null);

  /* Identity (logged-in user or anonymous visitor) for personalisation + search history. */
  const getIdentity = useCallback((): { userId: string; visitorId: string; qs: string } => {
    let userId = "";
    let visitorId = "";
    try { userId = getAuth("bt-current-user-id") || ""; } catch {}
    try { visitorId = localStorage.getItem("bv_visitor") || ""; } catch {}
    const qs =
      userId
        ? `userId=${encodeURIComponent(userId)}`
        : visitorId
          ? `visitorId=${encodeURIComponent(visitorId)}`
          : "";
    return { userId, visitorId, qs };
  }, []);

  /* One-shot record of the search (feeds trending + the user's recent list). */
  const logSearch = useCallback((q: string) => {
    const { userId, visitorId } = getIdentity();
    if (!q || q.length < 2) return;
    fetch(`${API_BASE}/search/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...API_HEADERS },
      body: JSON.stringify({ q, userId: userId || undefined, visitorId: visitorId || undefined }),
    }).catch(() => {});
  }, [getIdentity]);

  const refreshRecent = useCallback(async () => {
    const { qs } = getIdentity();
    if (!qs) {
      setRecent([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/search/recent?${qs}`, { headers: API_HEADERS });
      const data = await res.json();
      if (Array.isArray(data)) setRecent(data.slice(0, 8));
    } catch {
      // ignore
    }
  }, [getIdentity]);

  const removeRecent = useCallback(
    (q: string) => {
      const { qs } = getIdentity();
      if (!qs) return;
      fetch(`${API_BASE}/search/recent?${qs}&query=${encodeURIComponent(q)}`, { method: "DELETE", headers: API_HEADERS })
        .catch(() => {})
        .finally(() => refreshRecent());
    },
    [getIdentity, refreshRecent]
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [debouncedQuery, router]);

  /* Keep the input in sync when navigating back/forward. */
  useEffect(() => {
    const q = searchParams.get("q") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(q);
    setDebouncedQuery(q);
  }, [searchParams]);

  /* Ranked results + autocomplete terms come from the backend relevance engine. */
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRanked([]);
      setDidYouMean(null);
      setChips([]);
      setTerms([]);
      setRelated([]);
      setNoResultsSuggestions([]);
      setRelaxed(false);
      setAutoCorrected(false);
      setResultTotal(null);
      return;
    }
    const ctrl = new AbortController();
    const headers = API_HEADERS;
    setSearching(true);
    const enc = encodeURIComponent(q);
    fetch(`${API_BASE}/search?q=${enc}&limit=80`, { signal: ctrl.signal, headers })
      .then(async (res) => {
        const data = await res.json();
        const results: UnifiedProduct[] = Array.isArray(data.results)
          ? (data.results as SlimResult[]).map((r) => dbToUnified(r as unknown as DbProduct, r.source === "mart" ? "mart" : "store"))
          : [];
        if (!ctrl.signal.aborted) {
          setRanked(results);
          setDidYouMean(data.didYouMean || null);
          setResultTotal(typeof data.total === "number" ? data.total : null);
          setTerms(Array.isArray(data.terms) ? data.terms : []);
          setChips(Array.isArray(data.chips) ? data.chips : []);
          setRelaxed(!!data.relaxed);
          setAutoCorrected(!!data.autoCorrected);
          setNoResultsSuggestions(
            Array.isArray(data.suggestions) ? (data.suggestions as string[]).slice(0, 6) : []
          );
          setRelated(
            Array.isArray(data.related)
              ? (data.related as SlimResult[]).map((r) => dbToUnified(r as unknown as DbProduct, r.source === "mart" ? "mart" : "store"))
              : []
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setSearching(false);
          logSearch(q);
          refreshRecent();
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  /* Trending + recent searches fetched once on mount — shown when the box is
   empty (browse mode) and inside the no-results "Explore" panel. */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_BASE}/search/trending?limit=8`, { signal: ctrl.signal, headers: API_HEADERS })
      .then((r) => r.json())
      .then((d) => {
        if (!ctrl.signal.aborted) setTrending(Array.isArray(d) ? d.slice(0, 8) : []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRecent();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastScrollY.current;
      setShowScrollTop(y > 400);
      if (Math.abs(diff) < 10) return;
      const anchor = navAnchorRef.current;
      const stickY = anchor ? anchor.getBoundingClientRect().top + y : Infinity;
      if (diff > 0 && y > stickY) setHideTabs(true);
      else if (diff < 0) setHideTabs(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchDb = useCallback(async () => {
    try {
      const [storeRes, martRes] = await Promise.all([
        fetch(`${API_BASE}/categories/products/store`, { headers: { "ngrok-skip-browser-warning": "true" } }),
        fetch(`${API_BASE}/categories/products/mart`, { headers: { "ngrok-skip-browser-warning": "true" } }),
      ]);
      if (storeRes.ok) {
        const data: DbProduct[] = await storeRes.json();
        if (Array.isArray(data)) setDbStore(data.map((p) => dbToUnified(p, "store")));
      }
      if (martRes.ok) {
        const data: DbProduct[] = await martRes.json();
        if (Array.isArray(data)) setDbMart(data.map((p) => dbToUnified(p, "mart")));
      }
    } catch {
      // ignore
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDb(); }, [fetchDb]);

  const allProducts = useMemo(() => {
    return [...dbStore, ...dbMart];
  }, [dbStore, dbMart]);

  const storeCount = useMemo(() => allProducts.filter((p) => p.inStock && p.source === "store").length, [allProducts]);
  const martCount = useMemo(() => allProducts.filter((p) => p.inStock && p.source === "mart").length, [allProducts]);

  const filtered = useMemo(() => {
    if (debouncedQuery.trim()) return ranked;
    return allProducts
      .filter((p) => p.inStock)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, debouncedQuery, ranked]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [debouncedQuery]);

  /* Progressive render: grow the visible slice as the sentinel scrolls in */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || filtered.length <= visibleCount) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => Math.min(c + 48, filtered.length));
      },
      { rootMargin: "800px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, visibleCount]);

  return (
    <SiteLayout>
      <div className="min-h-screen pt-24 pb-20">
        {/* Hero */}
        <div ref={heroRef} className={cn("border-b transition-colors duration-300", light ? "border-onyx/5 bg-white" : "border-white/5 bg-abyss")}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="py-12 sm:py-16">
              <h1 className={cn("font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl", light ? "text-onyx" : "text-cream")}>
                Search{" "}
                <span className={cn(light ? "text-sapphire-gradient" : "text-gold-gradient")}>Products</span>
              </h1>
              <p className={cn("mt-3 text-sm tracking-wide", light ? "text-dark-400" : "text-cream-dim/50")}>
                Browse {storeCount} store items and {martCount} mart items
              </p>
            </div>
          </div>
        </div>

        {/* Sticky floating search + tabs — whole block slides up on mobile scroll down */}
        <div ref={navAnchorRef} aria-hidden />
        <div
          className={cn(
            "sticky top-[82px] z-30 transition-all duration-500 max-sm:top-[78px]",
            hideTabs ? "max-sm:-translate-y-[calc(100%+84px)]" : "translate-y-0"
          )}
        >
          {/* Search bar */}
          <div className="relative z-10 mx-auto w-[calc(100%-1.5rem)] max-w-[1400px] sm:w-[calc(100%-4rem)]">
            <div className="flex items-center gap-3 py-2">
              <SearchInput query={query} onQueryChange={setQuery} onDebounced={setDebouncedQuery} light={light} onFocusScroll={() => {
                const hero = heroRef.current;
                if (!hero) return;
                const r = hero.getBoundingClientRect();
                const pos = r.top + window.scrollY + r.height - 78;
                window.scrollTo({ top: Math.max(pos, 0), behavior: "smooth" });
              }} />
            </div>

            {autoCorrected && didYouMean ? (
              <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 pb-2 text-[11px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                <span>Showing results for</span>
                <button
                  type="button"
                  onClick={() => setQuery(didYouMean)}
                  className={cn("font-semibold underline underline-offset-4", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
                >
                  {didYouMean}
                </button>
                <span className="mx-1">·</span>
                <span>You searched</span>
                <span className={cn("line-through", light ? "text-dark-300" : "text-cream-dim/40")}>{debouncedQuery}</span>
              </div>
            ) : didYouMean && filtered.length <= 3 ? (
              <div className={cn("flex items-center gap-2 pb-2 text-[11px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                <span>Did you mean</span>
                <button
                  type="button"
                  onClick={() => setQuery(didYouMean)}
                  className={cn("font-semibold underline underline-offset-4", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
                >
                  {didYouMean}
                </button>
                <span>?</span>
              </div>
            ) : null}

            {/* Applied query chips (price/discount/color/size/audience/type) — click × to drop one */}
            {debouncedQuery && chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pb-2">
                {chips.map((chip, i) => (
                  <span
                    key={`${chip.kind}-${chip.num ?? chip.min ?? chip.pct ?? i}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px]",
                      light
                        ? "border-sapphire/40 bg-sapphire/5 text-sapphire"
                        : "border-gold/40 bg-gold/5 text-gold-light"
                    )}
                  >
                    {chipLabel(chip)}
                    {chipRemovable(chip) && (
                      <button
                        type="button"
                        onClick={() => setQuery(stripChip(query, chip))}
                        aria-label={`Remove ${chipLabel(chip)}`}
                        className="transition-colors hover:text-red-500"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    )}
                  </span>
                ))}
                {relaxed && (
                  <span
                    className={cn(
                      "rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-500 dark:text-amber-300"
                    )}
                  >
                    No exact matches — showing closest available
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="mx-auto max-w-[100rem] px-0 py-8 sm:px-5 md:px-10">
          <div className="mt-8">
            {searching && debouncedQuery ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Search size={48} strokeWidth={1} className={cn("mb-6", light ? "text-onyx/15" : "text-cream/10")} />
                <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>Searching…</p>
              </div>
            ) : filtered.length === 0 && debouncedQuery ? (
              /* No-results: offer a corrected word, trending/recent, related products */
              <div className="mx-auto max-w-6xl">
                <div className="flex flex-col items-center text-center pb-10">
                  <Search size={48} strokeWidth={1} className={cn("mb-6", light ? "text-onyx/15" : "text-cream/10")} />
                  <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                    No results for “{debouncedQuery}”
                  </p>
                  {didYouMean && (
                    <p className={cn("mt-3 text-sm", light ? "text-dark-500" : "text-cream-dim/70")}>
                      Did you mean{" "}
                      <button
                        type="button"
                        onClick={() => setQuery(didYouMean)}
                        className={cn("font-semibold underline underline-offset-4", light ? "text-sapphire" : "text-gold")}
                      >
                        {didYouMean}
                      </button>
                      ?
                    </p>
                  )}
                  {didYouMean && noResultsSuggestions.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {noResultsSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setQuery(s)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-300",
                            light
                              ? "border-dark-300 text-dark-500 hover:border-sapphire/50 hover:text-sapphire"
                              : "border-white/10 text-cream-dim/60 hover:border-gold/40 hover:text-gold-light"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                  {related.length > 0 && (
                    <section>
                      <h3 className={cn("mb-4 font-display text-lg font-bold tracking-tight", light ? "text-onyx" : "text-cream")}>
                        Related products
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {related.map((p) => (
                          <MemoSearchCard key={`${p.source}-${p.id}`} product={p} light={light} terms={terms} />
                        ))}
                      </div>
                    </section>
                  )}
                  {(trending.length > 0 || recent.length > 0) && (
                    <section>
                      <h3 className={cn("mb-4 font-display text-lg font-bold tracking-tight", light ? "text-onyx" : "text-cream")}>
                        Explore
                      </h3>
                      {trending.length > 0 && (
                        <div className="mb-5">
                          <p className={cn("mb-2 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-400" : "text-cream-dim/40")}>
                            Trending searches
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {trending.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setQuery(t)}
                                className={cn(
                                  "rounded-full border px-3.5 py-1.5 text-[11px] transition-all duration-300",
                                  light
                                    ? "border-dark-200 bg-white/60 text-dark-600 hover:border-sapphire/50 hover:text-sapphire"
                                    : "border-white/10 bg-black/30 text-cream-dim/70 hover:border-gold/40 hover:text-gold-light"
                                )}
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {recent.length > 0 && (
                        <div>
                          <p className={cn("mb-2 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-400" : "text-cream-dim/40")}>
                            Your recent searches
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {recent.map((r) => (
                              <span key={r} className="inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() => setQuery(r)}
                                  className={cn(
                                    "rounded-full border px-3.5 py-1.5 text-[11px] transition-all duration-300",
                                    light
                                      ? "border-sapphire/30 bg-sapphire/5 text-sapphire hover:border-sapphire hover:bg-sapphire/10"
                                      : "border-gold/30 bg-gold/5 text-gold-light hover:border-gold hover:bg-gold/10"
                                  )}
                                >
                                  {r}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRecent(r)}
                                  aria-label={`Remove ${r} from recent searches`}
                                  className={cn("-ml-1 mr-1 rounded-full p-0.5 transition-colors", light ? "text-dark-400 hover:text-red-500" : "text-cream-dim/40 hover:text-red-400")}
                                >
                                  <X size={10} strokeWidth={2} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <>
                {debouncedQuery && !searching && filtered.length > 0 && (
                  <p className={cn("mb-4 text-sm", light ? "text-dark-400" : "text-cream-dim/50")}>
                    Showing {resultTotal ?? filtered.length} result{resultTotal === 1 ? "" : "s"} for{" "}
                    <strong className={light ? "text-dark-900" : "text-cream"}>
                      “{autoCorrected && didYouMean ? didYouMean : debouncedQuery}”
                    </strong>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-px sm:gap-5 lg:grid-cols-4">
                  {visible.map((p) => (
                    <MemoSearchCard key={`${p.source}-${p.id}`} product={p} light={light} terms={terms} />
                  ))}
                </div>
                {filtered.length > visibleCount && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-12">
                    <span className={cn("text-[10px] uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/40")}>
                      Loading more…
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Scroll to top */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={cn(
              "fixed bottom-8 right-8 z-50 flex h-10 w-10 items-center justify-center shadow-lg transition-all duration-300",
              light ? "bg-sapphire text-white hover:bg-sapphire/90" : "bg-gold text-abyss hover:bg-gold/90"
            )}
          >
            <ChevronUp size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </SiteLayout>
  );
}

function SearchCard({ product, light, terms }: { product: UnifiedProduct; light: boolean; terms?: string[] }) {
  const source = product.source;
  const href =
    source === "store"
      ? `/store/${product.id}`
      : `/mart/${product.id}`;
  const hasImage = (product.dbImages && product.dbImages.length > 0) || product.img;
  const isStocked = product.inStock;
  const img = product.dbImages?.[0] || product.img;

  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-none border-0 transition-all duration-500 sm:rounded-2xl sm:border",
        light
          ? "border-dark-200/60 bg-white hover:border-sapphire/30 hover:shadow-[0_8px_40px_rgba(30,58,138,0.1)]"
          : "border-white/5 bg-graphite hover:border-gold/20 hover:shadow-[0_8px_40px_rgba(212,175,55,0.08)]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
        {hasImage ? (
          <img
            src={resolveImageUrl(img)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105", product.gradient)} />
        )}
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em]",
            source === "store"
              ? light
                ? "bg-sapphire/90 text-white"
                : "bg-gold/90 text-abyss"
              : light
                ? "bg-emerald-600/90 text-white"
                : "bg-emerald-500/90 text-white"
          )}
        >
          {source === "store" ? "Store" : "Mart"}
        </span>
        {product.badge && (
          <span
            className={cn(
              "absolute left-3 top-11 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em]",
              light
                ? "bg-white/90 text-dark-900 shadow-sm"
                : "bg-abyss/80 text-gold-light backdrop-blur-sm"
            )}
          >
            {product.badge}
          </span>
        )}
        {!isStocked && (
          <span className={cn("absolute inset-0 flex items-center justify-center bg-black/40 text-[9px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm")}>
            Out of Stock
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className={cn("text-sm font-medium leading-tight", light ? "text-dark-900" : "text-cream")}>
          {terms && terms.length > 0 ? (
            <HighlightedText
              text={product.name}
              terms={terms}
              markClass={cn(
                "rounded-sm px-0.5 font-semibold",
                light ? "bg-amber-200/80 text-dark-900" : "bg-gold/30 text-gold-light"
              )}
            />
          ) : (
            product.name
          )}
        </h3>
        <span className={cn("mt-1 block text-sm font-semibold tabular-nums", light ? "text-sapphire" : "text-gold-light")}>
          {formatPrice(product.price)}
        </span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className={cn("text-xs line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
            {formatPrice(product.originalPrice)}
          </span>
        )}
        <div className="mt-2 hidden sm:flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={10}
                className={cn(
                  i < Math.floor(product.rating)
                    ? light
                      ? "fill-sapphire text-sapphire"
                      : "fill-gold text-gold"
                    : light
                      ? "fill-dark-200 text-dark-200"
                      : "fill-white/10 text-white/10"
                )}
              />
            ))}
          </div>
          <span className={cn("text-[9px] font-medium", light ? "text-dark-400" : "text-cream-dim/50")}>
            ({product.reviews})
          </span>
        </div>
      </div>
    </Link>
  );
}

const MemoSearchCard = memo(SearchCard);

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <div className="min-h-screen pt-24 pb-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
              <div className="py-12 sm:py-16">
                <div className="h-10 w-64 animate-pulse bg-white/5 rounded" />
                <div className="h-4 w-48 mt-4 animate-pulse bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </SiteLayout>
      }
    >
      <SearchContent />
    </Suspense>
  );
}