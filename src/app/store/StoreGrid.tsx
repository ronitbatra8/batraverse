"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import ProductGridSkeleton from "@/components/ui/ProductGridSkeleton";
import { seedSlimProduct, warmProduct } from "@/lib/productCache";
import type { Product } from "./products";
import { Star, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const DB_GRADIENT_MAP: Record<string, string> = {
  watches: "from-zinc-700 to-zinc-900",
  fashion: "from-indigo-600 to-indigo-900",
  accessories: "from-amber-500 to-amber-800",
  footwear: "from-stone-500 to-stone-800",
  tech: "from-cyan-500 to-cyan-800",
  lifestyle: "from-purple-500 to-purple-800",
  limited: "from-gold-400 to-gold-700",
  default: "from-zinc-600 to-zinc-900",
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
  sizeOptions: unknown;
}

function dbToStoreProduct(p: DbProduct): Product {
  const specs = Array.isArray(p.specifications) ? (p.specifications as { key: string; value: string }[]) : [];
  const feats = Array.isArray(p.keyFeatures) ? (p.keyFeatures as string[]) : [];
  const rawColors = Array.isArray(p.colorOptions) ? p.colorOptions as { name: string; hex: string; colors?: string[]; images?: string[]; specifications?: { key: string; value: string }[]; keyFeatures?: string[]; price?: number; originalPrice?: number }[] : [];
  const colors = rawColors.length > 0 ? rawColors.map(c => ({
    name: c.name,
    value: c.hex,
    colors: Array.isArray(c.colors) && c.colors.length > 0 ? c.colors : undefined,
    images: Array.isArray(c.images) ? c.images : undefined,
    specifications: Array.isArray(c.specifications) ? c.specifications.map(s => ({ label: s.key, value: s.value })) : undefined,
    keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : undefined,
    price: c.price,
    originalPrice: c.originalPrice,
  })) : [{ name: "Default", value: "#18181b" }];
  // Use first color's price if base price is 0 and colors have prices
  const firstColor = rawColors.length > 0 ? rawColors[0] : null;
  const sizeOpts = (p.sizeOptions && typeof p.sizeOptions === "object" && !Array.isArray(p.sizeOptions))
    ? p.sizeOptions as Record<string, { name: string; price?: number; originalPrice?: number }[]>
    : {};
  const firstName = firstColor?.name || "";
  const firstSizes = sizeOpts[firstName] || Object.values(sizeOpts)[0] || [];

  let effectivePrice = p.price;
  let effectiveOriginalPrice: number | undefined = p.originalPrice ?? undefined;
  if (effectivePrice === 0 || effectivePrice == null) {
    // Match the detail page's default selection: first size of the first color
    // wins, then the color price, then the base price.
    if (firstSizes[0]?.price && firstSizes[0].price > 0) {
      effectivePrice = firstSizes[0].price;
      effectiveOriginalPrice = firstSizes[0].originalPrice ?? effectiveOriginalPrice;
    } else if (firstColor?.price && firstColor.price > 0) {
      effectivePrice = firstColor.price;
      effectiveOriginalPrice = firstColor.originalPrice ?? effectiveOriginalPrice;
    }
  }

  // Use first color's images if product-level images are empty
  const effectiveImages = (p.images.length === 0 && firstColor?.images && firstColor.images.length > 0)
    ? firstColor.images
    : p.images;

  return {
    id: `db-${p.id}`,
    name: p.name,
    price: effectivePrice,
    originalPrice: effectiveOriginalPrice,
    category: p.category || "uncategorized",
    sub: p.subCategory || "all",
    badge: p.badge || undefined,
    gradient: DB_GRADIENT_MAP[p.category || ""] || DB_GRADIENT_MAP.default,
    rating: p.rating,
    reviews: p.reviewCount,
    description: p.description || "",
    features: feats,
    colors,
    sizes: Object.values(sizeOpts).flat().map((s: { name: string }) => s.name),
    sizeOptions: sizeOpts,
    specs: specs.length > 0 ? specs.map(s => ({ label: s.key, value: s.value })) : undefined,
    sku: p.id,
    inStock: p.inStock,
    dbImages: effectiveImages,
    brand: p.brand || undefined,
    seller: p.seller || null,
  };
}

interface StoreGridProps {
  category: string;
  subCategories: string[];
}

export default function StoreGrid({ category, subCategories }: StoreGridProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(48);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchDbProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/products/store`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) return;
      const data: DbProduct[] = await res.json();
      if (Array.isArray(data)) setDbProducts(data.map(dbToStoreProduct));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDbProducts(); }, [fetchDbProducts]);

  const allProducts = dbProducts;

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (subCategories.length > 0 && !subCategories.includes(p.sub)) return false;
      return true;
    });
  }, [category, subCategories, allProducts]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
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
  }, [category, subCategories]);

  useEffect(() => {
    for (const p of filtered) seedSlimProduct(p.id, p);
  }, [filtered]);

  const categoryLabels: Record<string, string> = {
    watches: "Watches",
    fashion: "Fashion",
    accessories: "Accessories",
    footwear: "Footwear",
    tech: "Tech",
    lifestyle: "Lifestyle",
    limited: "Limited Editions",
  };

  return (
    <div className="mx-auto max-w-[100rem] px-0 py-10 sm:px-5 md:px-10">
      {loading && dbProducts.length === 0 ? (
        <ProductGridSkeleton light={light} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p
            className={cn(
              "text-sm uppercase tracking-[0.3em]",
              light ? "text-dark-400" : "text-cream-dim/50"
            )}
          >
            No products found
          </p>
        </div>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([cat, products]) => (
            <div key={cat} className="mb-14 last:mb-0">
              {category === "all" && (
                <h2
                  className={cn(
                    "mb-6 scroll-mt-32 text-[11px] font-semibold uppercase tracking-[0.35em]",
                    light ? "text-dark-400" : "text-cream-dim/60"
                  )}
                >
                  {categoryLabels[cat] || cat}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-px sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    light={light}
                  />
                ))}
              </div>
            </div>
          ))}
          {filtered.length > visibleCount && (
            <div ref={sentinelRef} className="flex items-center justify-center py-12">
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.3em]",
                  light ? "text-dark-400" : "text-cream-dim/40"
                )}
              >
                Loading more…
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({
  product,
  light,
}: {
  product: Product;
  light: boolean;
}) {
  const { addItem } = useCart();
  const [quickAdded, setQuickAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, {
      color: product.colors[0]?.name || "Black",
      colorHex: product.colors[0]?.value || "#18181b",
      colorImage: product.dbImages?.[0] || product.colors[0]?.images?.[0],
      colorPrice: product.price,
      size: product.sizes?.[0],
      qty: 1,
    });
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 1500);
  };

  return (
    <a
      href={`/store/${product.id}`}
      target="_blank"
      onMouseEnter={() => warmProduct(product.id)}
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
            "absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent py-6 transition-transform duration-500 group-hover:translate-y-0",
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
        <h3
          className={cn(
            "text-sm font-medium leading-tight",
            light ? "text-dark-900" : "text-cream"
          )}
        >
          {product.name}
        </h3>
        <span
          className={cn(
            "mt-1 block text-sm font-semibold tabular-nums",
            light ? "text-sapphire" : "text-gold-light"
          )}
        >
          {formatPrice(product.price)}
        </span>
        {product.originalPrice && (
          <span
            className={cn(
              "text-xs line-through",
              light ? "text-dark-400" : "text-cream-dim/40"
            )}
          >
            {formatPrice(product.originalPrice)}
          </span>
        )}
        {/* Rating */}
        <div className="mt-2 flex items-center gap-1.5">
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
          <span
            className={cn(
              "text-[9px] font-medium",
              light ? "text-dark-400" : "text-cream-dim/50"
            )}
          >
            ({product.reviews})
          </span>
        </div>
      </div>
    </a>
  );
}
