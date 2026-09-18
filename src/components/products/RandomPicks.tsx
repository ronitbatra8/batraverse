"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import { resolveImageUrl } from "@/lib/imageUrl";
import { formatPrice } from "@/lib/utils";
import { Shuffle, ChevronRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RandomPicksProps {
  source: "store" | "mart";
  onCategoryChange?: () => void;
}

interface PickProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  sub: string;
  badge?: string | null;
  rating: number;
  reviews: number;
  dbImages?: string[];
  gradient: string;
}

// Seed a reshuffled array every time this component mounts (fresh pick per refresh).
function seededShuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toPickProduct(p: any): PickProduct {
  return {
    id: p.id || p._id,
    name: p.name || "",
    price: Number(p.price) || 0,
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    category: p.category || "all",
    sub: p.subCategory || "all",
    badge: p.badge || null,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviewCount) || 0,
    dbImages: Array.isArray(p.images) ? p.images : [],
    gradient:
      "bg-gradient-to-br from-sapphire/25 via-sapphire/10 to-transparent",
  };
}

export default function RandomPicks({ source }: RandomPicksProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [all, setAll] = useState<PickProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/categories/products/${source}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
        if (active && list.length > 0) {
          setAll(list.map(toPickProduct).filter((p: PickProduct) => p.id && p.name));
        }
      } catch {
        // keep empty — section hides itself
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [source]);

  // Re-roll whenever the source changes; new shuffle each render refresh too.
  const picks = useMemo(() => seededShuffle(all).slice(0, 10), [all]);

  if (picks.length === 0) return null;

  return (
    <section className={cn("w-full border-b transition-colors duration-500", light ? "border-dark-100" : "border-white/5")}>
      <div className="mx-auto w-full max-w-[100rem] px-5 py-10 sm:px-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className={cn("font-display text-xl font-bold tracking-tight sm:text-2xl", light ? "text-dark-900" : "text-cream")}>
              Just For You
            </h2>
            <p className={cn("mt-1 text-[9px] uppercase tracking-[0.26em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Fresh picks across every category — new every visit
            </p>
          </div>
          <button
            type="button"
            onClick={() => useMemo(() => Math.random(), [])}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.22em] transition-all duration-300 hover:translate-x-0.5",
              light
                ? "border-sapphire/40 text-sapphire hover:bg-sapphire hover:text-white"
                : "border-gold/40 text-gold-light hover:bg-gold hover:text-abyss"
            )}
          >
            <Shuffle size={11} />
            Shuffle
          </button>
        </div>

        <div className="auto-cols-[minmax(10.5rem,1fr)] grid-rows-2 grid-flow-col grid gap-2.5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-proximity md:gap-3 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible lg:pb-0 lg:snap-none">
          {picks.slice(0, 10).map((product, index) => (
            <a
              key={product.id}
              href={`/${source === "store" ? "store" : "mart"}/${product.id}`}
              target="_blank"
              className={cn(
                "group relative flex min-w-[10.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-0.5 sm:min-w-[12rem] md:min-w-0 md:w-auto md:shrink md:snap-none",
                light
                  ? "border-dark-200/70 hover:border-sapphire/50"
                  : "border-white/10 hover:border-gold/40"
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-sapphire/20 via-sapphire/10 to-transparent">
                {product.dbImages?.[0] ? (
                  <img
                    src={resolveImageUrl(product.dbImages[0])}
                    alt={product.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className={cn(
                    "flex h-full w-full items-center justify-center text-[9px] font-bold uppercase tracking-[0.26em]",
                    light ? "text-dark-400" : "text-cream-dim/40"
                  )}>
                    {product.category}
                  </span>
                )}
                {product.badge && (
                  <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-abyss">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5">
                <span className={cn("line-clamp-2 text-[10px] font-semibold leading-tight", light ? "text-dark-900" : "text-cream")}>
                  {product.name}
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[13px] font-bold tabular-nums text-sapphire">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-[10px] text-dark-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "mt-1.5 flex items-center gap-0.5 text-[8px] uppercase tracking-[0.22em]",
                  light ? "text-dark-400" : "text-cream-dim/50"
                )}>
                  View
                  <ChevronRight size={10} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
        {/* hidden the 7th/8th on mobile: 2x2=4 per row, 6 shown → hides 2 via nothing (grid handles) */}
      </div>
    </section>
  );
}
