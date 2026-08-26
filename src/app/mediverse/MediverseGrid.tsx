"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { MEDIVERSE_PRODUCTS, type MediverseProduct } from "./products";
import { Star } from "lucide-react";

interface MediverseGridProps {
  category: string;
  subCategory: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  wellness: "Wellness & Supplements",
  fitness: "Fitness & Performance",
  healthcare: "Healthcare & Diagnostics",
  nutrition: "Nutrition & Protein",
  beauty: "Beauty & Skincare",
  sleep: "Sleep & Recovery",
};

export default function MediverseGrid({ category, subCategory }: MediverseGridProps) {
  const { theme } = useTheme();
  const light = theme === "light";

  const filtered = useMemo(() => {
    return MEDIVERSE_PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (subCategory !== "all" && p.sub !== subCategory) return false;
      return true;
    });
  }, [category, subCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, MediverseProduct[]>();
    for (const p of filtered) {
      const key = p.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[100rem] px-0 py-10 sm:px-5 md:px-10">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
            No products found
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([cat, products]) => (
          <div key={cat} className="mb-14 last:mb-0">
            {category === "all" && (
              <h2 className={cn("mb-6 text-[11px] font-semibold uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                {CATEGORY_LABELS[cat] || cat}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-px sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <MediverseProductCard key={product.id} product={product} light={light} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MediverseProductCard({ product, light }: { product: MediverseProduct; light: boolean }) {
  return (
    <Link
      href={`/mediverse/${product.id}`}
      className={cn(
        "group block overflow-hidden rounded-none border-0 transition-all duration-500 sm:rounded-2xl sm:border",
        light
          ? "border-dark-200/60 bg-white hover:border-sapphire/30 hover:shadow-[0_8px_40px_rgba(30,58,138,0.1)]"
          : "border-white/5 bg-graphite hover:border-gold/20 hover:shadow-[0_8px_40px_rgba(212,175,55,0.08)]"
      )}
    >
      <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105",
            product.gradient
          )}
        />
        {product.badge && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em]",
              light
                ? "bg-white/90 text-dark-900 shadow-sm"
                : "bg-abyss/80 text-gold-light backdrop-blur-sm"
            )}
          >
            {product.badge}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] bg-red-500/90 text-white backdrop-blur-sm">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className={cn("text-sm font-medium leading-tight", light ? "text-dark-900" : "text-cream")}>
          {product.name}
        </h3>
        <span className={cn("mt-1 block text-sm font-semibold tabular-nums", light ? "text-sapphire" : "text-gold-light")}>
          {formatPrice(product.price)}
        </span>
        {product.originalPrice && (
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
