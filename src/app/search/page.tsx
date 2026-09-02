"use client";

import { useMemo, useState, useEffect, useCallback, Suspense, useRef, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Star, ChevronUp } from "lucide-react";
import SiteLayout from "@/components/layout/SiteLayout";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn, formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

const SOURCE_TABS = [
  { key: "all" as const, label: "All Products" },
  { key: "store" as const, label: "Store" },
  { key: "mart" as const, label: "Mart" },
];

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

function SearchInput({ initialQuery, onDebounced, light }: { initialQuery: string; onDebounced: (q: string) => void; light: boolean }) {
  const [value, setValue] = useState(initialQuery);
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("focus") === "1") inputRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => onDebounced(value), 200);
    return () => clearTimeout(t);
  }, [value, onDebounced]);

  return (
    <div className="relative flex-1">
      <Search size={16} strokeWidth={1.5} className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/50")} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        className={cn(
          "w-full rounded-full border py-3.5 pl-11 pr-10 text-[13px] font-light tracking-wide backdrop-blur-xl transition-all duration-300 focus:outline-none",
          light ? "border-dark-200/60 bg-white/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire/40" : "border-white/10 bg-white/10 text-cream placeholder:text-cream-dim/40 focus:border-gold/40"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
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
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [dbStore, setDbStore] = useState<UnifiedProduct[]>([]);
  const [dbMart, setDbMart] = useState<UnifiedProduct[]>([]);
  const [activeSource, setActiveSource] = useState<"all" | "store" | "mart">("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hideTabs, setHideTabs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const lastScrollY = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [debouncedQuery, router]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 400);
      if (y > lastScrollY.current && y > 200) {
        setHideTabs(true);
      } else {
        setHideTabs(false);
      }
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

  const sourceCounts = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const base = allProducts.filter((p) => {
      if (!p.inStock) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !p.sub.toLowerCase().includes(q)) return false;
      return true;
    });
    return {
      all: base.length,
      store: base.filter((p) => p.source === "store").length,
      mart: base.filter((p) => p.source === "mart").length,
    };
  }, [allProducts, debouncedQuery]);

  const filtered = useMemo(() => {
    let results = allProducts.filter((p) => p.inStock);

    if (activeSource !== "all") {
      results = results.filter((p) => p.source === activeSource);
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sub.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  }, [allProducts, activeSource, debouncedQuery]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [activeSource, debouncedQuery]);

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
        <div className={cn("border-b transition-colors duration-300", light ? "border-onyx/5 bg-white" : "border-white/5 bg-abyss")}>
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
        <div
          className={cn(
            "sticky z-30 transition-all duration-500",
            hideTabs ? "max-sm:-translate-y-[calc(100%+84px)]" : "translate-y-0"
          )}
          style={{ top: "84px" }}
        >
          {/* Search bar */}
          <div className="relative z-10 mx-auto max-w-[100rem] px-5 sm:px-10">
            <div className="flex items-center gap-3 pt-3 pb-2">
              <SearchInput initialQuery={initialQuery} onDebounced={setDebouncedQuery} light={light} />
            </div>
          </div>

          {/* Source tabs — desktop only */}
          <div className="relative z-10 hidden sm:block">
            <div className={cn("border-t transition-colors duration-500", light ? "border-dark-100/40" : "border-white/5")}>
            <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 overflow-x-auto px-14 py-4 [&::-webkit-scrollbar]:hidden">
              {SOURCE_TABS.map((tab) => {
                const isActive = activeSource === tab.key;
                const count = sourceCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveSource(tab.key)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.24em] backdrop-blur-sm transition-all duration-300",
                      isActive
                        ? light
                          ? "border-sapphire/40 bg-sapphire/10 text-sapphire"
                          : "border-gold/40 bg-gold/10 text-gold-light"
                        : light
                          ? "border-dark-200 text-dark-400 hover:border-sapphire/30 hover:text-sapphire"
                          : "border-white/5 text-cream-dim/60 hover:border-gold/20 hover:text-cream-dim"
                    )}
                  >
                    {tab.label}
                    <span className={cn("ml-1 text-[8px]", isActive ? (light ? "text-sapphire/50" : "text-gold-light/50") : (light ? "text-dark-300" : "text-cream-dim/30"))}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <span className={cn("ml-auto shrink-0 text-[10px] font-medium whitespace-nowrap", light ? "text-dark-400" : "text-cream-dim/50")}>
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                {debouncedQuery && <span className="ml-1">for &ldquo;{debouncedQuery}&rdquo;</span>}
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* Grid */}
        <div className="mx-auto max-w-[100rem] px-0 py-8 sm:px-5 md:px-10">
          <div className="mt-8">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Search size={48} strokeWidth={1} className={cn("mb-6", light ? "text-onyx/15" : "text-cream/10")} />
                <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                  {debouncedQuery ? `No results for "${debouncedQuery}"` : "No products available"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-px sm:gap-5 lg:grid-cols-4">
                  {visible.map((p) => (
                    <MemoSearchCard key={`${p.source}-${p.id}`} product={p} light={light} />
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

function SearchCard({ product, light }: { product: UnifiedProduct; light: boolean }) {
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
          {product.name}
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