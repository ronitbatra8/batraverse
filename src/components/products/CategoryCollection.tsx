"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Camera,
  Home,
  Shirt,
  Car,
  BookOpen,
  Gift,
  Utensils,
  Milk,
  Cookie,
  Coffee,
  CupSoda,
  Baby,
  Sparkles,
  Package,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface CategoryCollectionProps {
  source: "store" | "mart";
  active: string;
  onCategoryChange: (slug: string) => void;
}

interface CatData {
  slug: string;
  name: string;
  icon: string | null;
  subcategories: { slug: string; name: string }[];
}

// The 5 image-backed collections — these are the ONLY tiles shown (single row, no second row).
const COLLECTION_ORDER = ["fashion", "watches", "accessories", "footwear", "tech"];

const COLLECTION_IMAGE: Record<string, string> = {
  fashion: "/images/collections/fashion.png",
  watches: "/images/collections/watches.png",
  accessories: "/images/collections/accessories.webp",
  footwear: "/images/collections/footwear.webp",
  tech: "/images/collections/tech.jpg",
};

const COLLECTION_LABEL: Record<string, string> = {
  fashion: "Fashion",
  watches: "Watches",
  accessories: "Accessories",
  footwear: "Footwear",
  tech: "Tech",
};

// Hidden on mobile (3-tile row) — only show these two on lg+.
const HIDE_ON_MOBILE = new Set(["fashion", "footwear"]);

export default function CategoryCollection({
  source: source,
  active,
  onCategoryChange,
}: CategoryCollectionProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [catData, setCatData] = useState<CatData[]>([]);

  const fetchCats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      const list = data?.[source];
      if (Array.isArray(list) && list.length > 0) {
        setCatData(list);
      }
    } catch {
      // keep empty → falls back to image defaults below
    }
  }, [source]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCats(); }, [fetchCats]);

  // Always render the 5 image tiles regardless of API state — single row (5 desktop / 3 mobile).
  const items = COLLECTION_ORDER.map((slug) => ({
    slug,
    name: COLLECTION_LABEL[slug] || slug,
    image: COLLECTION_IMAGE[slug],
  }));

  const handlePick = (slug: string) => {
    onCategoryChange(slug);
    const el = document.getElementById("products-anchor");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className={cn(
      "w-full border-b transition-colors duration-500",
      light ? "border-dark-100" : "border-white/5"
    )}>
      <div className="mx-auto w-full max-w-[100rem] px-5 py-10 sm:px-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className={cn("font-display text-xl font-bold tracking-tight sm:text-2xl", light ? "text-dark-900" : "text-cream")}>
              Collections
            </h2>
            <p className={cn("mt-1 text-[9px] uppercase tracking-[0.26em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Shop by category
            </p>
          </div>
          <span className={cn("text-[9px] uppercase tracking-[0.26em]", light ? "text-dark-400" : "text-cream-dim/40")}>
            {items.length} {items.length === 1 ? "category" : "categories"}
          </span>
        </div>

        {/* SINGLE ROW — no second row. 5 tiles desktop, 3 tiles mobile. Taller cards. */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch] snap-x snap-proximity lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:pb-0 lg:pt-0 lg:snap-none">
          {items.map((cat) => {
            const isActive = active === cat.slug;
            const hideOnMobile = HIDE_ON_MOBILE.has(cat.slug);
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => handlePick(cat.slug)}
                aria-pressed={isActive}
                className={cn(
                  "group relative flex min-h-[11rem] w-[64%] shrink-0 snap-start flex-col items-center justify-end overflow-hidden rounded-2xl border p-3 text-center transition-all duration-500 hover:-translate-y-0.5 sm:min-h-[13rem] sm:w-[46%] lg:min-h-[16rem] lg:w-auto lg:snap-none",
                  hideOnMobile && "lg:first-of-type:ml-0",
                  isActive
                    ? light
                      ? "border-sapphire ring-1 ring-sapphire/40"
                      : "border-gold ring-1 ring-gold/40"
                    : light
                      ? "border-dark-200/70 hover:border-sapphire/50"
                      : "border-white/10 hover:border-gold/40"
                )}
              >
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <span className={cn(
                  "relative w-full rounded-xl bg-gradient-to-t p-2.5 text-left",
                  light
                    ? "from-dark-900/85 via-dark-900/40 to-transparent"
                    : "from-abyss/85 via-abyss/40 to-transparent"
                )}>
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
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}