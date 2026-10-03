"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ChevronRight, ChevronLeft } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface CategoryCollectionProps {
  source: "store" | "mart";
  active?: string;
  /** When provided, tiles navigate to dedicated category pages instead of filtering in place. */
  navigate?: boolean;
  /** When set, renders that category page's SUBCATEGORY section instead of main categories. */
  parentSlug?: string;
  /** Hides this slug from the strip (e.g. the category you are already inside). */
  exclude?: string;
  title?: string;
  subtitle?: string;
}

interface SectionItem {
  id: string;
  categorySlug: string;
  name: string;
  image: string | null;
}

export default function CategoryCollection({
  source,
  active: activeProp,
  navigate = false,
  parentSlug,
  exclude,
  title = "Collections",
  subtitle = "Shop by category",
}: CategoryCollectionProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const router = useRouter();
  const searchParams = useSearchParams();
  const subMode = Boolean(parentSlug);
  const active = subMode ? searchParams.get("sub") || "all" : activeProp ?? "all";
  const [items, setItems] = useState<SectionItem[]>([]);

  const fetchSections = useCallback(async () => {
    try {
      const url = subMode
        ? `${API_BASE}/category-sections/sub?category=${parentSlug}`
        : `${API_BASE}/category-sections?source=${source}`;
      const res = await fetch(url, {
        headers: { "ngrok-skip-browser-warning": "true" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setItems(
        data.map((d: { id: string; categorySlug?: string; subcategorySlug?: string; name: string; image: string | null }) => ({
          id: d.id,
          categorySlug: d.categorySlug ?? d.subcategorySlug ?? "",
          name: d.name,
          image: d.image,
        }))
      );
    } catch {
      // keep empty
    }
  }, [source, subMode, parentSlug]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSections(); }, [fetchSections]);

  const visible = items.filter((cat) => cat.categorySlug !== exclude);

  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    syncEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges, visible.length]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("[data-tile]");
    const gap = 12;
    const step = tile ? tile.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  if (visible.length === 0) return null;

  const inner = visible.map((cat) => {
    const isActive = active === cat.categorySlug;
    const body = (
      <>
        {cat.image ? (
          <img
            src={cat.image}
            alt={cat.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 transition-colors duration-500",
              light ? "bg-gradient-to-br from-dark-300 to-dark-100" : "bg-gradient-to-br from-abyss to-black"
            )}
          />
        )}
        <span className="relative w-full rounded-xl bg-gradient-to-t from-black/95 via-black/60 to-black/10 p-3 text-left">
          <span className={cn(
            "block text-[11px] font-semibold leading-tight tracking-tight",
            light ? "text-white" : "text-cream"
          )}>
            {cat.name}
          </span>
          <span className={cn(
            "mt-1.5 flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-[0.22em]",
            light ? "text-white/70" : "text-cream-dim/50"
          )}>
            Explore
            <ChevronRight size={10} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </span>
      </>
    );

    const shell = cn(
      // Widths mirror the original 5-column grid exactly (1/5 of container minus
      // the 0.75rem gaps) while staying a horizontally scrollable flex row.
      "group relative flex min-h-[11rem] w-[64%] shrink-0 snap-start flex-col items-center justify-end overflow-hidden rounded-2xl border p-3 text-center transition-all duration-500 hover:-translate-y-0.5 sm:min-h-[13rem] sm:w-[46%] lg:min-h-[16rem] lg:w-[calc(20%-0.6rem)] lg:shrink-0 lg:snap-none",
      isActive
        ? light
          ? "border-sapphire ring-1 ring-sapphire/40"
          : "border-gold ring-1 ring-gold/40"
        : light
          ? "border-dark-200/70 hover:border-sapphire/50"
          : "border-white/10 hover:border-gold/40"
    );

    if (navigate && subMode && parentSlug) {
      // On a category page the tiles are subcategories -> their own page.
      return (
        <Link
          key={cat.id}
          data-tile
          href={`/${source}/category/${parentSlug}/sub/${cat.categorySlug}`}
          className={shell}
          aria-current={isActive ? "page" : undefined}
        >
          {body}
        </Link>
      );
    }

    if (navigate) {
      return (
        <Link
          key={cat.id}
          data-tile
          href={`/${source}/category/${cat.categorySlug}`}
          className={shell}
          aria-current={isActive ? "page" : undefined}
        >
          {body}
        </Link>
      );
    }

    return (
      <button
        key={cat.id}
        data-tile
        type="button"
        onClick={() => {
          // In-place filtering fallback when tiles are not links.
          if (subMode && parentSlug) {
            router.push(`/${source}/category/${parentSlug}?sub=${cat.categorySlug}`, { scroll: false });
          }
          const el = document.getElementById("products-anchor");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        aria-pressed={isActive}
        className={shell}
      >
        {body}
      </button>
    );
  });

  return (
    <section className={cn(
      "w-full border-b transition-colors duration-500",
      light ? "border-dark-100" : "border-white/5"
    )}>
      <div className="mx-auto w-full max-w-[100rem] px-5 py-10 sm:px-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className={cn("font-display text-xl font-bold tracking-tight sm:text-2xl", light ? "text-dark-900" : "text-cream")}>
              {title}
            </h2>
            <p className={cn("mt-1 text-[9px] uppercase tracking-[0.26em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 active:scale-95 disabled:opacity-30",
                light
                  ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire"
                  : "border-white/15 text-cream-dim hover:border-gold hover:text-gold"
              )}
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 active:scale-95 disabled:opacity-30",
                light
                  ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire"
                  : "border-white/15 text-cream-dim hover:border-gold hover:text-gold"
              )}
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Horizontally scrollable at every breakpoint so more tiles can be added. */}
        <div
          ref={trackRef}
          className={cn(
            "flex snap-x snap-proximity gap-2.5 overflow-x-auto pb-3 pt-1 [-webkit-overflow-scrolling:touch] lg:gap-3 lg:snap-none",
            "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:rounded-full",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            light
              ? "[&::-webkit-scrollbar-thumb]:bg-dark-300 [&::-webkit-scrollbar-thumb]:rounded-full"
              : "[&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-thumb]:rounded-full"
          )}
        >
          {inner}
        </div>
      </div>
    </section>
  );
}