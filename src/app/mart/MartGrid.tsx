"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import type { MartProduct } from "./products";
import { Star, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const DB_GRADIENT_MAP: Record<string, string> = {
  fruits: "bg-gradient-to-br from-green-400 to-green-600",
  dairy: "bg-gradient-to-br from-yellow-200 to-yellow-400",
  snacks: "bg-gradient-to-br from-orange-400 to-orange-600",
  beverages: "bg-gradient-to-br from-blue-400 to-blue-600",
  instant: "bg-gradient-to-br from-red-400 to-red-600",
  personal: "bg-gradient-to-br from-pink-400 to-pink-600",
  cleaning: "bg-gradient-to-br from-cyan-400 to-cyan-600",
  default: "bg-gradient-to-br from-stone-400 to-stone-600",
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
  specifications: unknown;
  keyFeatures: unknown;
  colorOptions: unknown;
}

function dbToMartProduct(p: DbProduct): MartProduct {
  return {
    id: `db-${p.id}`,
    name: p.name,
    brand: p.brand || "",
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    category: p.category || "uncategorized",
    sub: p.subCategory || "all",
    badge: p.badge || undefined,
    gradient: DB_GRADIENT_MAP[p.category || ""] || DB_GRADIENT_MAP.default,
    rating: p.rating,
    reviews: p.reviewCount,
    unit: "1 unit",
    inStock: p.inStock,
    dbImages: p.images || [],
    seller: p.seller || null,
  };
}

interface MartGridProps {
  category: string;
  subCategory: string;
  searchQuery: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  fruits: "Fruits & Vegetables",
  dairy: "Dairy & Bakery",
  snacks: "Snacks & Munchies",
  beverages: "Cold Drinks & Juices",
  instant: "Instant & Frozen Food",
  personal: "Personal Care",
  cleaning: "Cleaning Essentials",
  bakery: "Bakery & Biscuits",
};

export default function MartGrid({ category, subCategory, searchQuery }: MartGridProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [dbProducts, setDbProducts] = useState<MartProduct[]>([]);
  const [visibleCount, setVisibleCount] = useState(48);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchDbProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/products/mart`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) return;
      const data: DbProduct[] = await res.json();
      if (Array.isArray(data)) setDbProducts(data.map(dbToMartProduct));
    } catch {
      // ignore
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDbProducts(); }, [fetchDbProducts]);

  const allProducts = dbProducts;

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (subCategory !== "all" && p.sub !== subCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [category, subCategory, searchQuery, allProducts]);

  const grouped = useMemo(() => {
    const map = new Map<string, MartProduct[]>();
    for (const p of filtered.slice(0, visibleCount)) {
      const key = p.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered, visibleCount]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [category, subCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-[100rem] px-0 py-10 sm:px-5 md:px-10">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
            No products found
          </p>
        </div>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([cat, products]) => (
            <div key={cat} className="mb-14 last:mb-0">
              {category === "all" && (
                <h2 className={cn("mb-6 text-[11px] font-semibold uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-px sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <MartProductCard key={product.id} product={product} light={light} />
                ))}
              </div>
            </div>
          ))}
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
  );
}

function MartProductCard({ product, light }: { product: MartProduct; light: boolean }) {
  const { addItem } = useCart();
  const [quickAdded, setQuickAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        gradient: product.gradient,
        category: product.category,
        sub: product.sub,
        badge: product.badge,
        rating: product.rating,
        reviews: product.reviews,
        originalPrice: product.originalPrice,
        brand: product.brand,
        unit: product.unit,
        colors: [{ name: "Default", value: "#0a0a0a" }],
        sizes: [],
        description: "",
        features: [],
        sku: product.id,
        inStock: product.inStock,
      },
      { color: "Default", colorHex: "#0a0a0a", colorImage: product.dbImages?.[0], qty: 1, source: "mart" }
    );
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 1500);
  };

  return (
    <Link
      href={`/mart/${product.id}`}
      className={cn(
        "group block overflow-hidden rounded-none border-0 transition-all duration-500 sm:rounded-2xl sm:border",
        light
          ? "border-dark-200/60 bg-white hover:border-sapphire/30 hover:shadow-[0_8px_40px_rgba(30,58,138,0.1)]"
          : "border-white/5 bg-graphite hover:border-gold/20 hover:shadow-[0_8px_40px_rgba(212,175,55,0.08)]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
        {product.dbImages && product.dbImages.length > 0 ? (
          <img
            src={resolveImageUrl(product.dbImages[0])}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105",
              product.gradient
            )}
          />
        )}
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
        {!product.inStock ? (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-red-900/60 to-transparent py-8 text-[9px] font-bold uppercase tracking-[0.25em] text-white/80">
            Out of Stock
          </span>
        ) : (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent py-6 transition-transform duration-500 group-hover:translate-y-0"
          )}
        >
          <button
            type="button"
            onClick={handleQuickAdd}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-5 py-2 text-[9px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition-all duration-300",
              quickAdded
                ? "bg-emerald-500 text-white"
                : light
                  ? "bg-white text-dark-900 hover:bg-sapphire hover:text-white"
                  : "bg-abyss/80 text-gold-light hover:bg-gold hover:text-abyss"
            )}
          >
            {quickAdded ? (
              <>
                <Check size={11} /> Added
              </>
            ) : (
              "Quick Add"
            )}
          </button>
        </div>
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
        {product.originalPrice && (
          <span className={cn("text-xs line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
            {formatPrice(product.originalPrice)}
          </span>
        )}
        <div className="mt-2 hidden sm:flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
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
