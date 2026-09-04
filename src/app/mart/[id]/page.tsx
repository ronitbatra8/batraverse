"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Star, ShoppingBag, ChevronRight, Check, Shield, RotateCcw, Zap, Clock, Info, Minus, Plus } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { getMartProduct } from "../products";
import SiteLayout from "@/components/layout/SiteLayout";
import ProductDetailSkeleton from "@/components/ui/ProductDetailSkeleton";
import { getFullProduct, getSlimProduct, warmProduct } from "@/lib/productCache";
import { resolveImageUrl } from "@/lib/imageUrl";
import type { MartProduct } from "../products";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

const CATEGORY_LABELS: Record<string, string> = {
  fruits: "Fruits & Vegetables",
  dairy: "Dairy & Bakery",
  snacks: "Snacks",
  beverages: "Beverages",
  instant: "Instant Food",
  personal: "Personal Care",
  cleaning: "Cleaning",
};

function mapDbToMart(found: any): MartProduct {
  return {
    id: `db-${found.id}`,
    name: found.name,
    brand: found.brand || "",
    price: found.price,
    originalPrice: found.originalPrice ?? undefined,
    category: found.category || "uncategorized",
    sub: found.subCategory || "all",
    badge: found.badge || undefined,
    gradient: "bg-gradient-to-br from-stone-400 to-stone-600",
    rating: found.rating,
    reviews: found.reviewCount,
    unit: "1 unit",
    inStock: found.inStock,
    dbImages: found.images || [],
    seller: found.seller || null,
  };
}

export default function MartProductPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";
  const id = params.id as string;
  const isDb = id.startsWith("db-");
  const { addItem, deliveryMode, setDeliveryMode } = useCart();

  const [dbProduct, setDbProduct] = useState<MartProduct | null>(null);
  const [dbAllProducts, setDbAllProducts] = useState<MartProduct[]>([]);
  const [dbMissing, setDbMissing] = useState(false);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const fetchDbProduct = useCallback(async () => {
    if (!isDb) return;
    const rawId = id.replace("db-", "");
    setDbMissing(false);

    const cachedFull = getFullProduct(rawId);
    if (cachedFull?.product) {
      setDbProduct(mapDbToMart(cachedFull.product));
      setDbAllProducts((cachedFull.related || []).map(mapDbToMart));
      return;
    }
    const slim = getSlimProduct<MartProduct>(id);
    if (slim) setDbProduct(slim);

    try {
      const res = await fetch(`${API_BASE}/api/products/${rawId}?related=true`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.product) {
        setDbMissing(true);
        return;
      }

      const allMapped = (data.related || []).map(mapDbToMart);
      setDbAllProducts(allMapped);
      setDbProduct(mapDbToMart(data.product));
    } catch { /* treat as offline; seeded content stays */ }
  }, [id, isDb]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDbProduct(); }, [fetchDbProduct]);

  const staticProduct = isDb ? null : getMartProduct(id);
  const product = staticProduct || dbProduct;

  useEffect(() => {
    if (!product) return;
    const firstImg = product.dbImages?.[0] || "";
    const img = resolveImageUrl(firstImg) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&h=1200&fit=crop";
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      category: product.category,
      price: `₹${product.price.toLocaleString("en-IN")}`,
      compareAt: product.originalPrice ? `₹${product.originalPrice.toLocaleString("en-IN")}` : undefined,
      img,
      href: `/mart/${product.id}`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (isDb && !dbProduct && !dbMissing) {
    return (
      <SiteLayout>
        <ProductDetailSkeleton light={light} />
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Product not found
            </p>
            <Link
              href="/mart"
              className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
            >
              Back to Mart
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const related = (() => {
    const all = dbAllProducts;
    const seen = new Set<string>();
    return all.filter((p) => {
      if (p.category !== product.category || p.id === product.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, 20);
  })();

  const hasImages = product.dbImages && product.dbImages.length > 0;

  const handleAddToCart = () => {
    const firstImage = hasImages ? product.dbImages![0] : undefined;
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
        dbImages: product.dbImages,
      },
      { color: "Default", colorHex: "#0a0a0a", colorImage: firstImage, qty, source: "mart" }
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/cart");
  };

  const savings = product.originalPrice
    ? (product.originalPrice - product.price)
    : null;
  const savingsPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <Link href="/mart" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              Mart
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <Link href="/mart" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              {CATEGORY_LABELS[product.category] || product.category}
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <span className={cn(light ? "text-dark-900" : "text-cream")}>{product.name}</span>
          </nav>
        </div>

        {/* Main product */}
        <div className="mx-auto mt-8 grid max-w-[100rem] gap-8 px-5 sm:px-10 lg:grid-cols-2 lg:gap-14">
          {/* Image */}
          <div className="flex flex-col gap-3">
            <div className={cn("relative aspect-square overflow-hidden rounded-2xl", light ? "bg-dark-100" : "bg-graphite")}>
              {hasImages ? (
                <img
                  src={resolveImageUrl(product.dbImages![0])}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-700", product.gradient)} />
              )}
              {product.badge && (
                <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]", light ? "bg-white/90 text-dark-900 shadow-sm" : "bg-abyss/80 text-gold-light backdrop-blur-sm")}>
                  {product.badge}
                </span>
              )}
              <span className={cn("absolute bottom-4 right-4 rounded-full px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.2em]", light ? "bg-white/80 text-dark-700 backdrop-blur-sm" : "bg-abyss/60 text-cream-dim/80 backdrop-blur-sm")}>
                {product.unit}
              </span>
            </div>

            {/* Store name section */}
            <div className={cn("rounded-2xl border p-4", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                  {product.seller ? (product.seller.shopName || product.seller.name).charAt(0).toUpperCase() : "BV"}
                </div>
                <div className="flex-1">
                  <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>
                    {product.seller?.shopName || product.seller?.name || "BATRAVERSE Mart"}
                  </p>
                  <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                    {product.seller ? (product.seller.email || "Seller") : `Quick Commerce · ${product.brand}`}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider", light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400")}>
                  {product.seller ? "Seller" : "Official"}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {/* Brand + Title */}
            <div>
              <p className={cn("text-[10px] uppercase tracking-[0.35em]", light ? "text-sapphire font-semibold" : "text-gold font-semibold")}>
                {product.brand}
              </p>
              <h1 className={cn("mt-2 font-display text-3xl font-medium tracking-wide sm:text-4xl", light ? "text-dark-900" : "text-cream")}>
                {product.name}
              </h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={cn(
                        i < Math.floor(product.rating)
                          ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold"
                          : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10"
                      )}
                    />
                  ))}
                </div>
                <span className={cn("text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>
                  {product.rating} ({product.reviews} ratings)
                </span>
              </div>
            </div>

            {/* Unit */}
            <div className={cn("mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2", light ? "bg-dark-50" : "bg-onyx/50")}>
              <Info size={12} className={light ? "text-dark-400" : "text-cream-dim/50"} />
              <span className={cn("text-xs font-medium", light ? "text-dark-600" : "text-cream-dim/70")}>
                Unit: {product.unit}
              </span>
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span className={cn("text-2xl font-semibold tabular-nums sm:text-3xl", light ? "text-dark-900" : "text-cream")}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className={cn("text-lg line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-500">
                    {savingsPercent}% OFF
                  </span>
                </>
              )}
            </div>
            {savings && (
              <p className={cn("mt-1 text-xs font-medium", light ? "text-emerald-600" : "text-emerald-400")}>
                 You save {formatPrice(savings)} on this order
              </p>
            )}

            <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />

            {/* Delivery mode selector */}
            <div>
              <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                Delivery
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("standard")}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all duration-300",
                    deliveryMode === "standard"
                      ? light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5"
                      : light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"
                  )}
                >
                  <Clock size={18} className={deliveryMode === "standard" ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50")} />
                  <div className="text-left">
                    <p className={cn("text-xs font-semibold", deliveryMode === "standard" ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-500" : "text-cream-dim/60"))}>
                      1 Hour
                    </p>
                    <p className={cn("text-[9px]", light ? "text-dark-400" : "text-cream-dim/40")}>Standard</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("express")}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all duration-300",
                    deliveryMode === "express"
                      ? light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5"
                      : light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"
                  )}
                >
                  <Zap size={18} className={deliveryMode === "express" ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50")} />
                  <div className="text-left">
                    <p className={cn("text-xs font-semibold", deliveryMode === "express" ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-500" : "text-cream-dim/60"))}>
                      20 Min
                    </p>
                    <p className={cn("text-[9px]", deliveryMode === "express" ? (light ? "text-sapphire font-medium" : "text-gold-light font-medium") : (light ? "text-dark-400" : "text-cream-dim/40"))}>
                       Express +₹49
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity + Actions */}
            {!product.inStock ? (
              <div className={cn("mt-8 flex items-center justify-center gap-3 rounded-xl border px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em]", light ? "border-red-200 bg-red-50 text-red-500" : "border-red-500/20 bg-red-500/10 text-red-400")}>
                <ShoppingBag size={18} /> Out of Stock
              </div>
            ) : (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Qty */}
              <div className={cn("flex items-center rounded-xl border", light ? "border-dark-200" : "border-white/10")}>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className={cn("px-4 py-3 text-sm transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                >
                  <Minus size={14} />
                </button>
                <span className={cn("min-w-[40px] text-center text-sm font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className={cn("px-4 py-3 text-sm transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add to cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                  addedToCart
                    ? "bg-emerald-500 text-white"
                    : light
                      ? "border border-sapphire bg-sapphire/10 text-sapphire hover:bg-sapphire hover:text-white hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                      : "border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold hover:text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                )}
              >
                {addedToCart ? (
                  <>
                    <Check size={14} /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} /> Add to Cart
                  </>
                )}
              </button>

              {/* Buy Now */}
              <button
                type="button"
                onClick={handleBuyNow}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                  light
                    ? "bg-dark-900 text-white hover:bg-dark-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.25)]"
                    : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]"
                )}
              >
                <Zap size={14} /> Buy Now
              </button>
            </div>
            )}

            {/* Trust badges */}
            <div className={cn("mt-8 grid grid-cols-3 gap-3 rounded-2xl border p-4", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-graphite/50")}>
              {[
                { icon: <Clock size={16} />, label: deliveryMode === "express" ? "20 Min Delivery" : "1 Hour Delivery" },
                { icon: <Shield size={16} />, label: "Quality Checked" },
                { icon: <RotateCcw size={16} />, label: "Easy Returns" },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-2 text-center">
                  <span className={cn(light ? "text-sapphire" : "text-gold")}>{b.icon}</span>
                  <span className={cn("text-[8px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/60")}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16 sm:mx-auto sm:max-w-[100rem] sm:px-5 sm:px-10">
            <h2 className={cn("mb-6 px-5 text-[11px] font-semibold uppercase tracking-[0.35em] sm:px-0", light ? "text-dark-400" : "text-cream-dim/60")}>
              You May Also Like
            </h2>
            <div className="flex flex-col gap-5">
              {[related.slice(0, 10), related.slice(10, 20)].filter(row => row.length > 0).map((row, ri) => (
                <div key={ri} className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 sm:gap-5">
                  {row.map((rp) => {
                    const img = rp.dbImages?.[0] || "";
                    return (
                      <Link
                        key={rp.id}
                        href={`/mart/${rp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => warmProduct(rp.id)}
                        className={cn(
                          "group w-[calc(50%-6px)] shrink-0 snap-start overflow-hidden rounded-none border-0 transition-all duration-500 sm:w-[calc(33.333%-17px)] md:w-[calc(25%-18px)] md:shrink-0 md:rounded-2xl md:border",
                          light
                            ? "md:border-dark-200/60 md:bg-white md:hover:border-sapphire/30 md:hover:shadow-[0_8px_40px_rgba(30,58,138,0.1)]"
                            : "md:border-white/5 md:bg-graphite md:hover:border-gold/20 md:hover:shadow-[0_8px_40px_rgba(212,175,55,0.08)]"
                        )}
                      >
                        <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
                          {img ? (
                            <img
                              src={resolveImageUrl(img)}
                              alt={rp.name}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105", rp.gradient)} />
                          )}
                          {rp.badge && (
                            <span
                              className={cn(
                                "absolute left-3 top-3 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em]",
                                light
                                  ? "bg-white/90 text-dark-900 shadow-sm"
                                  : "bg-abyss/80 text-gold-light backdrop-blur-sm"
                              )}
                            >
                              {rp.badge}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className={cn("text-sm font-medium leading-tight", light ? "text-dark-900" : "text-cream")}>
                            {rp.name}
                          </h3>
                          <span className={cn("mt-1 block text-sm font-semibold tabular-nums", light ? "text-sapphire" : "text-gold-light")}>
                            {formatPrice(rp.price)}
                          </span>
                          {rp.originalPrice && (
                            <span className={cn("text-xs line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
                              {formatPrice(rp.originalPrice)}
                            </span>
                          )}
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={10} className={cn(i < Math.floor(rp.rating) ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold" : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10")} />
                              ))}
                            </div>
                            <span className={cn("text-[9px] font-medium", light ? "text-dark-400" : "text-cream-dim/50")}>
                              ({rp.reviews})
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
