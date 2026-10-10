"use client";

import { useMemo, useState, useEffect, useCallback, Suspense, useRef, memo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Star, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Check, RotateCcw, Sparkles } from "lucide-react";
import SiteLayout from "@/components/layout/SiteLayout";
import AdsShowcase from "@/components/home/AdsShowcase";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn, formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { getAuth } from "@/lib/authStorage";
import { getRecentItems } from "@/lib/recentlyViewed";
import { getSearchHistory, trackSearchTerm } from "@/lib/searchHistory";

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
  source: "store" | "mart";
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

function SearchInput({ initialQuery, onDebounced, light, onFocusScroll }: { initialQuery: string; onDebounced: (q: string) => void; light: boolean; onFocusScroll: () => void }) {
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

type FilterSort = "default" | "price-asc" | "price-desc" | "rating" | "name";

interface FilterState {
  sources: ("store" | "mart")[];
  categories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number;
  sortBy: FilterSort;
}

function countActiveFilters(f: FilterState) {
  return (
    (f.sources.length > 0 ? 1 : 0) +
    (f.categories.length > 0 ? 1 : 0) +
    (f.brands.length > 0 ? 1 : 0) +
    (f.minPrice != null || f.maxPrice != null ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.sortBy !== "default" ? 1 : 0)
  );
}

const EMPTY_FILTERS: FilterState = {
  sources: [],
  categories: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  minRating: 0,
  sortBy: "default",
};

const FILTER_SORTS: { value: FilterSort; label: string }[] = [
  { value: "default", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "name", label: "Name A-Z" },
];

function toggleIn<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function applyFilters(items: UnifiedProduct[], f: FilterState): UnifiedProduct[] {
  let out = items;
  if (f.sources.length > 0) out = out.filter((p) => f.sources.includes(p.source));
  if (f.categories.length > 0) out = out.filter((p) => f.categories.includes(p.category));
  if (f.brands.length > 0) out = out.filter((p) => f.brands.includes(p.brand));
  const { minPrice, maxPrice } = f;
  if (minPrice != null) out = out.filter((p) => p.price >= minPrice);
  if (maxPrice != null) out = out.filter((p) => p.price <= maxPrice);
  if (f.minRating > 0) out = out.filter((p) => p.rating >= f.minRating);
  const sorted = [...out];
  switch (f.sortBy) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }
  return sorted;
}

const MENU_MAX_H = 232;

/* Custom multi-select, not a native <select>, so it can match the panel's
   sapphire/gold styling. The listbox is portaled to <body> because the panel
   body scrolls (overflow-y-auto) and would clip an in-panel overlay. */
function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  emptyText,
  light,
}: {
  label: string;
  options: { name: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyText: string;
  light: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; top: number; bottom: number; maxHeight: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 14;
    const above = r.top - 14;
    const openUp = below < Math.min(MENU_MAX_H, above);
    const next = {
      left: r.left,
      width: r.width,
      top: r.bottom + 6,
      bottom: window.innerHeight - r.top + 6,
      maxHeight: Math.max(132, Math.min(MENU_MAX_H, openUp ? above : below)),
      openUp,
    };
    setPos((prev) =>
      prev && prev.left === next.left && prev.width === next.width && prev.top === next.top && prev.bottom === next.bottom && prev.maxHeight === next.maxHeight && prev.openUp === next.openUp ? prev : next
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    /* capture phase so scrolling the panel body repositions the menu too */
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("scroll", place, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  const summary = selected.length === 0 ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) place();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200",
          open
            ? light
              ? "border-sapphire/40 bg-white"
              : "border-gold/40 bg-black/30"
            : light
              ? "border-onyx/10 bg-white hover:border-sapphire/40"
              : "border-white/10 bg-black/30 hover:border-gold/40"
        )}
      >
        <span className={cn("flex-1 truncate text-[13px] font-medium", selected.length > 0 ? (light ? "text-sapphire" : "text-gold-light") : light ? "text-dark-400" : "text-cream-dim/55")}>{summary}</span>
        <ChevronDown size={14} strokeWidth={2} className={cn("shrink-0 transition-transform duration-200", open && "rotate-180", light ? "text-dark-400" : "text-cream-dim/50")} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            data-panel-layer=""
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className={cn(
              "fixed z-[65] overscroll-contain overflow-y-auto rounded-2xl border p-1.5 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.6)]",
              light ? "border-dark-200/80 bg-white/98" : "border-gold/20 bg-[#0a0a0e]/98"
            )}
            style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }) }}
          >
            {options.length === 0 ? (
              <p className={cn("px-2.5 py-3 text-[11.5px]", light ? "text-dark-400" : "text-cream-dim/50")}>{emptyText}</p>
            ) : (
              options.map((o) => {
                const isSel = selected.includes(o.name);
                return (
                  <button
                    key={o.name}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => onToggle(o.name)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-150",
                      isSel ? (light ? "bg-sapphire/[0.07]" : "bg-gold/[0.08]") : light ? "hover:bg-onyx/[0.04]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150",
                        isSel
                          ? light
                            ? "border-sapphire bg-sapphire text-white"
                            : "border-gold bg-gradient-to-br from-gold-light via-gold to-gold-deep text-abyss"
                          : light
                            ? "border-dark-300 bg-white"
                            : "border-white/20 bg-black/40"
                      )}
                    >
                      {isSel && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={cn("flex-1 truncate text-[12.5px] font-medium", isSel ? (light ? "text-sapphire" : "text-gold-light") : light ? "text-dark-800" : "text-cream/90")}>{o.name}</span>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function GroupTitle({ children, light }: { children: ReactNode; light: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={cn("h-1 w-1 rounded-full", light ? "bg-sapphire" : "bg-gold")} />
      <h4 className={cn("text-[10px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-500" : "text-gold/80")}>{children}</h4>
    </div>
  );
}

function FilterPanel({
  open,
  light,
  filters,
  categories,
  brands,
  priceBounds,
  activeCount,
  onApply,
  onSubmit,
  onClose,
}: {
  open: boolean;
  light: boolean;
  filters: FilterState;
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  priceBounds: { min: number; max: number };
  activeCount: number;
  onApply: (patch: Partial<FilterState>) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const pill = (selected: boolean) =>
    cn(
      "rounded-full border px-3.5 py-2 text-[11.5px] font-medium tracking-wide transition-all duration-200",
      selected
        ? light
          ? "border-sapphire/45 bg-sapphire/[0.07] text-sapphire shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
          : "border-gold/55 bg-gold/10 text-gold-light shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : light
          ? "border-onyx/[0.08] text-dark-500 hover:border-sapphire/35 hover:text-sapphire"
          : "border-white/[0.07] text-cream-dim/70 hover:border-gold/30 hover:text-cream"
    );
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute right-0 top-2 z-40 w-full origin-top-right overflow-hidden rounded-3xl border backdrop-blur-2xl transition-all duration-300 ease-out",
        open
          ? "translate-y-0 scale-100 opacity-100 duration-[420ms] ease-[cubic-bezier(0.34,1.36,0.64,1)]"
          : "pointer-events-none translate-y-1 scale-[0.15] opacity-0",
        light
          ? "border-sapphire/30 bg-white/95 shadow-[0_0_0_1px_rgba(30,58,138,0.18),0_0_20px_-6px_rgba(30,58,138,0.35),0_40px_120px_-24px_rgba(15,23,42,0.35)]"
          : "border-gold/30 bg-[#0a0a0e]/95 shadow-[0_0_0_1px_rgba(212,175,55,0.20),0_0_22px_-6px_rgba(212,175,55,0.35),0_40px_120px_-24px_rgba(0,0,0,0.85)]"
      )}
    >
      {/* Gilded hairline */}
      <div className={cn("h-px w-full bg-gradient-to-r from-transparent to-transparent", light ? "via-sapphire/50" : "via-gold/50")} aria-hidden />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border", light ? "border-sapphire/20 bg-sapphire/[0.05] text-sapphire" : "border-gold/25 bg-gold/[0.06] text-gold")}>
            <SlidersHorizontal size={15} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className={cn("font-display text-base tracking-wide", light ? "text-dark-900" : "text-cream")}>Refine Results</h3>
            {activeCount > 0 ? (
              <p className={cn("mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.28em]", light ? "text-sapphire" : "text-gold/80")}>{activeCount} filter{activeCount > 1 ? "s" : ""} active</p>
            ) : (
              <p className={cn("mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.28em]", light ? "text-dark-400" : "text-cream-dim/50")}>Filter & sort results</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200",
            light
              ? "border-onyx/[0.08] text-dark-400 hover:border-sapphire/35 hover:text-sapphire"
              : "border-white/10 text-cream-dim/60 hover:border-gold/40 hover:text-gold"
          )}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className={cn("mx-6 h-px bg-gradient-to-r from-transparent to-transparent", light ? "via-dark-200" : "via-white/10")} aria-hidden />

      <div className="max-h-[min(60vh,400px)] space-y-6 overflow-y-auto px-6 py-5">
        <section>
          <GroupTitle light={light}>Sort by</GroupTitle>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_SORTS.map((s) => (
              <button key={s.value} type="button" onClick={() => onApply({ sortBy: s.value })} className={pill(filters.sortBy === s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <GroupTitle light={light}>
            Price <span className="ml-1 normal-case tracking-normal opacity-70">{formatPrice(priceBounds.min)} – {formatPrice(priceBounds.max)}</span>
          </GroupTitle>
          <div className="flex items-center gap-2.5">
            <input
              type="number"
              min={0}
              value={filters.minPrice ?? ""}
              onChange={(e) => onApply({ minPrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              placeholder={String(priceBounds.min)}
              aria-label="Minimum price"
              className={cn(
                "w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium tabular-nums outline-none transition-all duration-200",
                light
                  ? "border-onyx/10 bg-white text-dark-900 placeholder:text-dark-300 focus:border-sapphire/40 focus:shadow-[0_0_0_3px_rgba(30,58,138,0.08)]"
                  : "border-white/10 bg-black/30 text-cream placeholder:text-cream-dim/30 focus:border-gold/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
              )}
            />
            <span className={cn("h-px w-3", light ? "bg-dark-300" : "bg-white/20")} aria-hidden />
            <input
              type="number"
              min={0}
              value={filters.maxPrice ?? ""}
              onChange={(e) => onApply({ maxPrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              placeholder={String(priceBounds.max)}
              aria-label="Maximum price"
              className={cn(
                "w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-medium tabular-nums outline-none transition-all duration-200",
                light
                  ? "border-onyx/10 bg-white text-dark-900 placeholder:text-dark-300 focus:border-sapphire/40 focus:shadow-[0_0_0_3px_rgba(30,58,138,0.08)]"
                  : "border-white/10 bg-black/30 text-cream placeholder:text-cream-dim/30 focus:border-gold/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
              )}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <GroupTitle light={light}>Category</GroupTitle>
            <MultiSelect
              label="categories"
              options={categories}
              selected={filters.categories}
              onToggle={(name) => onApply({ categories: toggleIn(filters.categories, name) })}
              emptyText="No categories available"
              light={light}
            />
          </section>

          <section>
            <GroupTitle light={light}>Brand</GroupTitle>
            <MultiSelect
              label="brands"
              options={brands}
              selected={filters.brands}
              onToggle={(name) => onApply({ brands: toggleIn(filters.brands, name) })}
              emptyText="No brands available"
              light={light}
            />
          </section>
        </div>

        <section>
          <GroupTitle light={light}>Minimum rating</GroupTitle>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => onApply({ minRating: filters.minRating === i ? 0 : i })}
                aria-label={`Minimum rating ${i} star${i > 1 ? "s" : ""}`}
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  i <= filters.minRating
                    ? light
                      ? "text-sapphire"
                      : "text-gold"
                    : light
                      ? "text-dark-200 hover:text-dark-300"
                      : "text-white/15 hover:text-white/30"
                )}
              >
                <Star size={22} strokeWidth={1.5} className={i <= filters.minRating ? "fill-current" : ""} />
              </button>
            ))}
          </div>
          <p className={cn("mt-2 pl-0.5 text-[11px] tracking-wide", light ? "text-dark-500" : "text-cream-dim/60")}>
            {filters.minRating === 0 ? "Any rating" : `${filters.minRating} star${filters.minRating > 1 ? "s" : ""} & above`}
          </p>
        </section>
      </div>

      <div className={cn("flex items-center justify-between gap-3 border-t px-6 py-4", light ? "border-dark-200/70" : "border-white/[0.07]")}>
        <button
          type="button"
          onClick={() => onApply({ ...EMPTY_FILTERS })}
          className={cn("flex items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] transition-colors", light ? "text-dark-500 hover:text-sapphire" : "text-cream-dim/70 hover:text-gold")}
        >
          <RotateCcw size={12} strokeWidth={2} />
          Reset
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-300",
            light
              ? "bg-sapphire text-white shadow-[0_10px_30px_-8px_rgba(30,58,138,0.45)] hover:bg-sapphire/90"
              : "bg-gradient-to-r from-gold-deep via-gold to-gold-light text-abyss shadow-[0_10px_30px_-10px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_40px_-8px_rgba(212,175,55,0.55)]"
          )}
        >
          Apply filters
        </button>
      </div>
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
  /* Query that has "settled" (stopped changing) — committing to search history
     and (re)fetching personalised recommendations on every keystroke would be
     wasteful, so we wait for the user to pause. */
  const [settleQuery, setSettleQuery] = useState(initialQuery.trim());
  const [recommend, setRecommend] = useState<UnifiedProduct[]>([]);
  const [dbStore, setDbStore] = useState<UnifiedProduct[]>([]);
  const [dbMart, setDbMart] = useState<UnifiedProduct[]>([]);
  const [mlResults, setMlResults] = useState<UnifiedProduct[] | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hideTabs, setHideTabs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  /* Filters are staged in `draft` and only committed on Apply, so toggling an
     option never re-filters the grid. Reset to `filters` each time it opens. */
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);
  const panelWrapRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const searchSeq = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const navAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [debouncedQuery, router]);

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

  /* ML/ranked search: once a query appears, ask the backend for ranked results
     instead of filtering the catalog in the browser. If the API is unreachable
     we fall back to the client-side substring filter below. */
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || q.length < 2) {
      searchSeq.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMlResults(null);
      return;
    }
    const seq = ++searchSeq.current;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (searchSeq.current !== seq) return;
        if (res.ok && Array.isArray(data.products)) {
          setMlResults(data.products.map((p: DbProduct) => dbToUnified(p, p.source)));
        } else {
          setMlResults(null);
        }
      })
      .catch(() => {
        if (searchSeq.current !== seq) return;
        setMlResults(null);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const t = setTimeout(() => setSettleQuery(debouncedQuery.trim()), 1200);
    return () => clearTimeout(t);
  }, [debouncedQuery]);

  /* Remember what people search for — this is one of the recommendation signals. */
  useEffect(() => {
    if (settleQuery.length >= 2) trackSearchTerm(settleQuery);
  }, [settleQuery]);

  /* Personalised recommendations: signals = recent views (localStorage) + past
     searches + this query; the API adds the signed-in user's order history and
     blends them in the ML service. */
  useEffect(() => {
    const viewed = getRecentItems()
      .map((r) => r.id.replace(/^db-/, ""))
      .filter(Boolean)
      .slice(0, 16);
    const terms = getSearchHistory().slice(0, 8);
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (settleQuery) params.set("q", settleQuery);
    params.set("viewed", JSON.stringify(viewed));
    params.set("terms", JSON.stringify(terms));
    const token = getAuth("bt-token");

    fetch(`${API_BASE}/search/recommend?${params.toString()}`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          setRecommend([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setRecommend(data.products.map((p: DbProduct) => dbToUnified(p, p.source)));
        }
      })
      .catch(() => {
        /* offline — keep whatever we last had */
      });
    return () => ctrl.abort();
  }, [settleQuery]);

  const allProducts = useMemo(() => {
    return [...dbStore, ...dbMart];
  }, [dbStore, dbMart]);

  const categoryOptions = useMemo(() => {
    const m = new Map<string, number>();
    allProducts.forEach((p) => {
      if (p.inStock) m.set(p.category, (m.get(p.category) || 0) + 1);
    });
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  const brandOptions = useMemo(() => {
    const m = new Map<string, number>();
    allProducts.forEach((p) => {
      if (p.inStock && p.brand) m.set(p.brand, (m.get(p.brand) || 0) + 1);
    });
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  const priceBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    allProducts.forEach((p) => {
      if (p.inStock) {
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
      }
    });
    if (!isFinite(min)) return { min: 0, max: 1 };
    return { min: Math.floor(min), max: Math.ceil(max) };
  }, [allProducts]);

  const activeFilterCount = countActiveFilters(filters);

  /* panel edits stage into the draft, not into the applied filters */
  const updateDraft = useCallback((patch: Partial<FilterState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const openPanel = useCallback(() => {
    setDraft(filters);
    setFiltersOpen(true);
  }, [filters]);

  const applyDraft = useCallback(() => {
    setFilters(draft);
    setFiltersOpen(false);
  }, [draft]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelWrapRef.current?.contains(t)) return;
      /* dropdown listboxes are portaled to <body>, so treat them as part of the panel */
      if (t instanceof Element && t.closest("[data-panel-layer]")) return;
      setFiltersOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const clientFiltered = useMemo(() => {
    let results = allProducts.filter((p) => p.inStock);

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
  }, [allProducts, debouncedQuery]);

  const baseFiltered = mlResults ?? clientFiltered;

  const filtered = useMemo(() => applyFilters(baseFiltered, filters), [baseFiltered, filters]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [debouncedQuery, filters]);

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
        {recommend.length >= 4 && <RecommendedShelf products={recommend.slice(0, 20)} light={light} />}
        <div ref={heroRef}>
          <AdsShowcase page="search" hideHeader />
        </div>

        {/* Fixed floating search + tabs — spacer below reserves its flow height; whole block slides up on mobile scroll down */}
        <div ref={navAnchorRef} aria-hidden className="h-[60px] sm:h-[72px]" />
        <div
          className={cn(
            "fixed left-0 right-0 top-[82px] z-30 transition-all duration-500 max-sm:top-[78px]",
            hideTabs ? "max-sm:-translate-y-[calc(100%+84px)]" : "translate-y-0"
          )}
        >
{/* Search bar + filters */}
          <div className="relative z-10 mx-auto w-[calc(100%-1.5rem)] max-w-[1400px] sm:w-[calc(100%-4rem)]">
            <div ref={panelWrapRef} className="relative flex items-center gap-3 py-2">
              <SearchInput initialQuery={initialQuery} onDebounced={setDebouncedQuery} light={light} onFocusScroll={() => {
                const hero = heroRef.current;
                if (!hero) return;
                const r = hero.getBoundingClientRect();
                const pos = r.top + window.scrollY + r.height - 78;
                window.scrollTo({ top: Math.max(pos, 0), behavior: "smooth" });
              }} />
              <div className="relative z-50 shrink-0">
                <button
                  type="button"
                  onClick={() => (filtersOpen ? setFiltersOpen(false) : openPanel())}
                  aria-expanded={filtersOpen}
                  aria-label={filtersOpen ? "Close filters" : "Open filters"}
                  className={cn(
                    "flex h-[2.75rem] shrink-0 items-center gap-2.5 rounded-2xl border px-6 text-[12.5px] backdrop-blur-2xl transition-all duration-300 sm:h-14 sm:px-14",
                    light
                      ? "border-white/50 bg-white/50 text-dark-900 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.35)] hover:border-sapphire/40 hover:text-sapphire"
                      : "border-white/15 bg-black/50 text-cream shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] hover:border-gold/40 hover:text-gold-light",
                    filtersOpen && (light ? "border-sapphire/45 shadow-[0_20px_70px_-14px_rgba(30,58,138,0.55)]" : "border-gold/45 shadow-[0_20px_80px_-14px_rgba(212,175,55,0.5)]")
                  )}
                >
                  <SlidersHorizontal size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{filtersOpen ? "Close" : "Filters"}</span>
                </button>
              </div>
              <FilterPanel
                open={filtersOpen}
                light={light}
                filters={draft}
                categories={categoryOptions}
                brands={brandOptions}
                priceBounds={priceBounds}
                activeCount={countActiveFilters(draft)}
                onApply={updateDraft}
                onSubmit={applyDraft}
                onClose={() => setFiltersOpen(false)}
              />
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
                  {debouncedQuery ? `No results for "${debouncedQuery}"` : activeFilterCount > 0 ? "No products match your filters" : "No products available"}
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
      target="_blank"
      rel="noopener noreferrer"
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

/* Two horizontally-scrollable rows of cards — same card as the results grid
   below, sized so roughly six-to-ten are visible per row on desktop. Each row
   has its own prev/next control; the shelf is hidden entirely while cold. */
function RecommendedShelf({ products, light }: { products: UnifiedProduct[]; light: boolean }) {
  const rows = [products.slice(0, 10), products.slice(10, 20)].filter((r) => r.length > 0);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scroll = (rowIndex: number, dir: number) => {
    const el = rowRefs.current[rowIndex];
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow = (rowIndex: number, dir: number, Icon: typeof ChevronLeft, label: string) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => scroll(rowIndex, dir)}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-2xl transition-all duration-300",
        light
          ? "border-onyx/10 bg-white/70 text-dark-600 hover:border-sapphire/40 hover:text-sapphire"
          : "border-white/10 bg-black/50 text-cream-dim/70 hover:border-gold/40 hover:text-gold-light"
      )}
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  );

  return (
    <section className="mb-6 mt-6 sm:mt-10">
      <div className="mx-auto w-full max-w-[100rem] px-5 sm:px-8 md:px-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", light ? "border-sapphire/25 bg-sapphire/[0.06] text-sapphire" : "border-gold/30 bg-gold/[0.07] text-gold")}>
              <Sparkles size={17} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={cn("font-display text-lg leading-none sm:text-2xl", light ? "font-bold text-onyx" : "font-semibold text-cream")}>
                Recommended for you
              </h2>
              <p className={cn("mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.28em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                Based on your orders, views &amp; searches
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {rows.map((_, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {arrow(i, -1, ChevronLeft, `Scroll row ${i + 1} left`)}
                {arrow(i, 1, ChevronRight, `Scroll row ${i + 1} right`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-5">
        {rows.map((row, i) => (
          <div
            key={i}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className="flex snap-x snap-mandatory gap-px overflow-x-auto px-5 pb-2 sm:gap-5 sm:px-8 md:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {row.map((p) => (
              <div
                key={`${p.source}-${p.id}`}
                className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[18.5%] xl:w-[15.5%] 2xl:w-[13.5%]"
              >
                <MemoSearchCard product={p} light={light} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

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