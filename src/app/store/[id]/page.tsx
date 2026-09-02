"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Star, Heart, ShoppingBag, ChevronRight, Check, Truck, Shield, RotateCcw, Zap, ThumbsUp, MessageSquare, Loader2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { getProduct, getRelated } from "../products";
import { apiFetch } from "@/lib/api";
import { resolveImageUrl } from "@/lib/imageUrl";
import SiteLayout from "@/components/layout/SiteLayout";
import ProductDetailSkeleton from "@/components/ui/ProductDetailSkeleton";
import { getFullProduct, getSlimProduct, warmProduct } from "@/lib/productCache";
import type { Product } from "../products";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

function mapDbToProduct(found: any): Product {
  const specs = Array.isArray(found.specifications) ? (found.specifications as { key: string; value: string }[]) : [];
  const feats = Array.isArray(found.keyFeatures) ? (found.keyFeatures as string[]) : [];
  const rawColors = Array.isArray(found.colorOptions) ? found.colorOptions as { name: string; hex: string; colors?: string[]; images?: string[]; specifications?: { key: string; value: string }[]; keyFeatures?: string[]; price?: number; originalPrice?: number }[] : [];
  const colors = rawColors.length > 0 ? rawColors.map((c) => ({
    name: c.name,
    value: c.hex,
    colors: Array.isArray(c.colors) && c.colors.length > 0 ? c.colors : undefined,
    images: Array.isArray(c.images) ? c.images : undefined,
    specifications: Array.isArray(c.specifications) ? c.specifications.map((s) => ({ label: s.key, value: s.value })) : undefined,
    keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : undefined,
    price: c.price,
    originalPrice: c.originalPrice,
  })) : [{ name: "Default", value: "#18181b" }];
  const firstColor = rawColors.length > 0 ? rawColors[0] : null;
  const sizeOpts = (found.sizeOptions && typeof found.sizeOptions === "object" && !Array.isArray(found.sizeOptions))
    ? found.sizeOptions as Record<string, { name: string; price?: number; originalPrice?: number }[]>
    : {};
  const firstName = firstColor?.name || "";
  const firstSizes = sizeOpts[firstName] || Object.values(sizeOpts)[0] || [];
  const firstSizeWithPrice = firstSizes.find((s: { name: string; price?: number }) => s.price != null && s.price > 0);

  let effectivePrice = found.price;
  let effectiveOriginalPrice: number | undefined = found.originalPrice ?? undefined;
  if (effectivePrice === 0 || effectivePrice == null) {
    if (firstColor?.price) {
      effectivePrice = firstColor.price;
      effectiveOriginalPrice = firstColor.originalPrice ?? effectiveOriginalPrice;
    } else if (firstSizeWithPrice?.price) {
      effectivePrice = firstSizeWithPrice.price;
      effectiveOriginalPrice = firstSizeWithPrice.originalPrice ?? effectiveOriginalPrice;
    }
  }
  const effectiveImages = (Array.isArray(found.images) && found.images.length === 0 && firstColor?.images && firstColor.images.length > 0)
    ? firstColor.images
    : (found.images || []);

  return {
    id: `db-${found.id}`,
    name: found.name,
    price: effectivePrice,
    originalPrice: effectiveOriginalPrice,
    category: found.category || "uncategorized",
    sub: found.subCategory || "all",
    badge: found.badge || undefined,
    gradient: "from-zinc-700 to-zinc-900",
    rating: found.rating,
    reviews: found.reviewCount,
    description: found.description || "",
    features: feats,
    colors,
    sizes: Object.values(sizeOpts).flat().map((s: { name: string }) => s.name),
    sizeOptions: sizeOpts,
    specs: specs.length > 0 ? specs.map((s) => ({ label: s.key, value: s.value })) : undefined,
    sku: found.id,
    inStock: found.inStock,
    dbImages: effectiveImages,
    brand: found.brand || undefined,
    seller: found.seller || null,
  } as Product;
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";
  const id = params.id as string;
  const isDb = id.startsWith("db-");
  const { addItem } = useCart();
  const { has: isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [dbProduct, setDbProduct] = useState<Product | null>(null);
  const [dbAllProducts, setDbAllProducts] = useState<Product[]>([]);
  const [dbMissing, setDbMissing] = useState(false);

  const fetchDbProduct = useCallback(async () => {
    if (!isDb) return;
    const rawId = id.replace("db-", "");
    setDbMissing(false);

    const cachedFull = getFullProduct(rawId);
    if (cachedFull?.product) {
      setDbProduct(mapDbToProduct(cachedFull.product));
      setDbAllProducts((cachedFull.related || []).map(mapDbToProduct));
      return;
    }
    const slim = getSlimProduct<Product>(id);
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

      const allMapped = (data.related || []).map(mapDbToProduct);
      setDbAllProducts(allMapped);
      setDbProduct(mapDbToProduct(data.product));
    } catch { /* treat as offline; seeded content stays */ }
  }, [id, isDb]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDbProduct(); }, [fetchDbProduct]);

  const staticProduct = isDb ? null : getProduct(id);
  const product = staticProduct || dbProduct;

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [realReviews, setRealReviews] = useState<{ id: string; rating: number; comment: string | null; createdAt: string; user: { id: string; name: string; email: string } }[]>([]);
  const [realStats, setRealStats] = useState<{ total: number; avg: number; dist: number[] }>({ total: 0, avg: 0, dist: [0, 0, 0, 0, 0] });
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!product) return;
    const firstImg = product.dbImages?.[0]
      || product.colors?.[0]?.images?.[0]
      || "";
    const img = resolveImageUrl(firstImg) || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=1200&fit=crop";
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      category: product.category,
      price: `₹${product.price.toLocaleString("en-IN")}`,
      compareAt: product.originalPrice ? `₹${product.originalPrice.toLocaleString("en-IN")}` : undefined,
      img,
      href: `/store/${product.id}`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const pid = product.id.startsWith("db-") ? product.id.replace("db-", "") : product.id;
    apiFetch(`/reviews/${pid}`)
      .then((data) => {
        if (data && Array.isArray(data.reviews)) {
          setRealReviews(data.reviews);
          if (data.stats) setRealStats(data.stats);
        }
      })
      .catch(() => {});
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
              href="/store"
              className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
            >
              Back to Store
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
  const reviews = realReviews.map((r) => ({
    id: r.id,
    author: r.user?.name || "Anonymous",
    avatar: "bg-violet-600",
    rating: r.rating,
    date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    title: r.comment?.split("\n")[0] || "",
    body: r.comment || "",
    helpful: 0,
    verified: true,
    color: undefined as string | undefined,
    size: undefined as string | undefined,
    isReal: true as const,
  }));

  const stats = {
    total: realStats.total,
    avg: realStats.total > 0 ? realStats.avg : 0,
    dist: realStats.dist,
  };

  async function handleSubmitReview() {
    if (reviewRating === 0) { setReviewError("Please select a rating"); return; }
    setReviewSubmitting(true);
    setReviewError("");
    setReviewSuccess(false);
    try {
      const pid = product?.id.startsWith("db-") ? product.id.replace("db-", "") : product?.id;
      const newReview = await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({ productId: pid, rating: reviewRating, title: reviewTitle, body: reviewBody }),
      });
      if (newReview && newReview.id) {
        setRealReviews((prev) => [newReview, ...prev]);
        setRealStats((prev) => {
          const newDist = [...prev.dist];
          newDist[reviewRating - 1]++;
          return {
            total: prev.total + 1,
            avg: (prev.avg * prev.total + reviewRating) / (prev.total + 1),
            dist: newDist,
          };
        });
        setReviewRating(0);
        setReviewTitle("");
        setReviewBody("");
        setReviewSuccess(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      setReviewError(msg.includes("already reviewed") ? "You have already reviewed this product" : msg);
    } finally {
      setReviewSubmitting(false);
    }
  }
  const selectedColorData = product.colors[selectedColor];
  const selectedColorName = selectedColorData.name;

  const colorImages = selectedColorData.images && selectedColorData.images.length > 0 ? selectedColorData.images : product.dbImages || [];
  const colorSpecs = selectedColorData.specifications && selectedColorData.specifications.length > 0 ? selectedColorData.specifications : product.specs;
  const colorFeatures = selectedColorData.keyFeatures && selectedColorData.keyFeatures.length > 0 ? selectedColorData.keyFeatures : product.features;
  const colorPrice = selectedColorData.price ?? product.price;
  const colorOriginalPrice = selectedColorData.originalPrice ?? product.originalPrice;

  const currentSizes = (product.sizeOptions && typeof product.sizeOptions === "object" && !Array.isArray(product.sizeOptions))
    ? (product.sizeOptions[selectedColorName] || product.sizeOptions[Object.keys(product.sizeOptions)[0]] || [])
    : [];
  const activeSizeOption = (currentSizes.length > 0 && selectedSize !== null) ? currentSizes[selectedSize] : null;
  const effectivePrice = activeSizeOption?.price ?? colorPrice;
  const effectiveOriginalPrice = activeSizeOption?.originalPrice ?? colorOriginalPrice;

  const colorToGradient = (hex: string): string => {
    const h = hex.toLowerCase();
    const map: Record<string, string> = {
      "#18181b": "from-zinc-800 to-zinc-950",
      "#f5f5f5": "from-neutral-100 to-neutral-300",
      "#1e3a5f": "from-blue-800 to-blue-950",
      "#78350f": "from-amber-900 to-amber-950",
      "#d6b48a": "from-amber-300 to-amber-500",
      "#71717a": "from-zinc-500 to-zinc-700",
      "#a1a1aa": "from-zinc-400 to-zinc-600",
      "#d4af37": "from-yellow-600 to-yellow-800",
      "#faf8f2": "from-stone-50 to-stone-200",
      "#92400e": "from-amber-800 to-amber-950",
      "#09090b": "from-zinc-900 to-zinc-950",
      "#1e1b4b": "from-indigo-900 to-indigo-950",
    };
    return map[h] || `from-[${hex}] to-[${hex}]`;
  };

  const mainGradient = colorToGradient(selectedColorData.value);

  const hasImages = colorImages.length > 0;

  const handleAddToCart = () => {
    addItem(product, {
      color: selectedColorData.name,
      colorHex: selectedColorData.value,
      colorImage: colorImages[0] || undefined,
      colorPrice: effectivePrice,
      size: currentSizes[selectedSize ?? 0]?.name,
      qty,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    addItem(product, {
      color: selectedColorData.name,
      colorHex: selectedColorData.value,
      colorImage: colorImages[0] || undefined,
      colorPrice: effectivePrice,
      size: currentSizes[selectedSize ?? 0]?.name,
      qty,
    });
    router.push("/cart");
  };

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <Link href="/store" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              Store
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <Link href={`/store?cat=${encodeURIComponent(product.category)}`} className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              {product.category}
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <span className={cn("truncate", light ? "text-dark-900" : "text-cream")}>{product.name}</span>
          </nav>
        </div>

        {/* Main product */}
        <div className="mx-auto mt-8 grid max-w-[100rem] gap-8 px-5 sm:px-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className={cn("relative aspect-square overflow-hidden rounded-2xl", light ? "bg-dark-100" : "bg-graphite")}>
              {hasImages ? (
                <img
                  src={resolveImageUrl(colorImages[selectedImage] || colorImages[0])}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-700", mainGradient)} />
                  <div className="pointer-events-none absolute inset-0 opacity-30"
                    style={{ background: `radial-gradient(circle at 30% 40%, ${selectedColorData.value}44, transparent 70%)` }} />
                </>
              )}
              {product.badge && (
                <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]", light ? "bg-white/90 text-dark-900 shadow-sm" : "bg-abyss/80 text-gold-light backdrop-blur-sm")}>
                  {product.badge}
                </span>
              )}
              {hasImages && (
                <span className={cn("absolute bottom-4 right-4 rounded-full px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.2em]", light ? "bg-white/80 text-dark-700 backdrop-blur-sm" : "bg-abyss/60 text-cream-dim/80 backdrop-blur-sm")}>
                  {selectedColorData.name}
                </span>
              )}
            </div>
            {/* Thumbnail row */}
            <div className="flex gap-3">
              {colorImages.slice(0, 4).map((img, i) => (
                <div key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn("aspect-square w-1/4 cursor-pointer overflow-hidden rounded-xl border-2 transition-all",
                    i === selectedImage ? (light ? "border-sapphire" : "border-gold") : (light ? "border-dark-200 hover:border-dark-400" : "border-white/5 hover:border-white/20")
                  )}>
                  {img ? (
                    <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn("h-full w-full bg-gradient-to-br transition-all duration-500", i === 0 ? "from-zinc-800 to-zinc-950" : mainGradient, "opacity", i === 0 ? "100" : i === 1 ? "80" : i === 2 ? "60" : "40")} />
                  )}
                </div>
              ))}
              {colorImages.length < 4 && Array.from({ length: 4 - colorImages.length }).map((_, i) => (
                <div key={`empty-${i}`}
                  className="aspect-square w-1/4 overflow-hidden rounded-xl border-2 border-dashed border-dark-700/30">
                  <div className={cn("h-full w-full bg-gradient-to-br transition-all duration-500", mainGradient, "opacity-20")} />
                </div>
              ))}
            </div>

            {/* Store name section */}
            <div className={cn("rounded-2xl border p-4", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                  {product.seller ? (product.seller.shopName || product.seller.name).charAt(0).toUpperCase() : "BV"}
                </div>
                <div className="flex-1">
                  <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>
                    {product.seller?.shopName || product.seller?.name || "BATRAVERSE Store"}
                  </p>
                  <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                    {product.seller ? (product.seller.email || "Seller") : "Premium Lifestyle & Design"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                  {product.seller ? "Seller" : "Official"}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {/* Title + Rating */}
            <div>
              <p className={cn("text-[10px] uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                {product.sku}
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
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span className={cn("text-2xl font-semibold tabular-nums sm:text-3xl", light ? "text-dark-900" : "text-cream")}>
                {formatPrice(effectivePrice)}
              </span>
              {effectiveOriginalPrice && (
                <>
                  <span className={cn("text-lg line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
                    {formatPrice(effectiveOriginalPrice)}
                  </span>
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-500">
                    Save {formatPrice(effectiveOriginalPrice - effectivePrice)}
                  </span>
                </>
              )}
            </div>

            <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />

            {/* Description */}
            <p className={cn("text-sm leading-relaxed", light ? "text-dark-600" : "text-cream-dim")}>
              {product.description}
            </p>

            {/* Colors */}
            <div className="mt-6">
              <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                Color — <span className={cn("font-normal", light ? "text-dark-900" : "text-cream")}>{product.colors[selectedColor].name}</span>
              </p>
              <div className="flex gap-2.5">
                {product.colors.map((c, i) => {
                  const multi = c.colors && c.colors.length > 1;
                  const count = c.colors?.length || 0;
                  let gradient = "";
                  if (multi && count === 2) {
                    gradient = `linear-gradient(135deg, ${c.colors![0]} 50%, ${c.colors![1]} 50%)`;
                  } else if (multi && count === 3) {
                    gradient = `conic-gradient(from 60deg, ${c.colors![0]} 0deg 120deg, ${c.colors![1]} 120deg 240deg, ${c.colors![2]} 240deg 360deg)`;
                  } else if (multi && count >= 4) {
                    gradient = `conic-gradient(from 30deg, ${c.colors!.map((h, j) => `${h} ${(j * 360) / count}deg ${((j + 1) * 360) / count}deg`).join(", ")})`;
                  }
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => { setSelectedColor(i); setSelectedImage(0); setSelectedSize(0); }}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all relative",
                        i === selectedColor
                          ? light ? "border-sapphire scale-110 ring-2 ring-sapphire/20" : "border-gold scale-110 ring-2 ring-gold/20"
                          : light ? "border-dark-300 hover:border-dark-500" : "border-white/20 hover:border-white/40"
                      )}
                      title={c.name}
                    >
                      {multi ? (
                        <div className="absolute inset-[2px] rounded-full overflow-hidden">
                          <div
                            className="w-full h-full"
                            style={{ background: gradient }}
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-[2px] rounded-full" style={{ backgroundColor: c.value }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes — per color */}
            {currentSizes.length > 0 && (
              <div className="mt-6">
                <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Size {selectedSize !== null && <span className={cn("font-normal", light ? "text-dark-900" : "text-cream")}>— {currentSizes[selectedSize].name}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentSizes.map((s, i) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelectedSize(i)}
                      className={cn(
                        "min-w-[44px] rounded-xl border px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.15em] transition-all duration-300",
                        i === selectedSize
                          ? light
                            ? "border-sapphire bg-sapphire text-white"
                            : "border-gold bg-gold text-abyss"
                          : light
                            ? "border-dark-300 text-dark-500 hover:border-sapphire/40 hover:text-sapphire"
                            : "border-white/10 text-cream-dim hover:border-gold/30 hover:text-cream"
                      )}
                    >
                      {s.name}
                      {s.price !== undefined && (
                        <span className="block text-[9px] font-normal opacity-70">{formatPrice(s.price)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  −
                </button>
                <span className={cn("min-w-[40px] text-center text-sm font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className={cn("px-4 py-3 text-sm transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                >
                  +
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

              {/* Wishlist */}
              <button
                type="button"
                onClick={() => product && toggleWishlist(product.id)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 sm:px-3.5 sm:text-inherit",
                  product && isWishlisted(product.id)
                    ? "border-rose-500 bg-rose-500/10 text-rose-500"
                    : light
                      ? "border-dark-200 text-dark-400 hover:border-rose-400 hover:text-rose-500"
                      : "border-white/10 text-cream-dim hover:border-rose-400 hover:text-rose-400"
                )}
              >
                <Heart size={16} fill={product && isWishlisted(product.id) ? "currentColor" : "none"} />
                <span className="sm:hidden">Wishlist</span>
              </button>
            </div>
            )}

            {/* Trust badges */}
            <div className={cn("mt-8 grid grid-cols-3 gap-3 rounded-2xl border p-4", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-graphite/50")}>
              {[
                { icon: <Truck size={16} />, label: "Free Shipping\nAbove ₹800" },
                { icon: <RotateCcw size={16} />, label: "12-Hour Returns" },
                { icon: <Shield size={16} />, label: "No Warranty\nBuyer Verified" },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-2 text-center">
                  <span className={cn(light ? "text-sapphire" : "text-gold")}>{b.icon}</span>
                  <span className={cn("whitespace-pre-line text-[8px] font-semibold uppercase tracking-[0.2em] leading-tight", light ? "text-dark-500" : "text-cream-dim/60")}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Specifications */}
            {colorSpecs && colorSpecs.length > 0 && (
              <div className="mt-6">
                <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Specifications
                </p>
                <div className={cn("rounded-xl border divide-y", light ? "border-dark-200/60 divide-dark-100" : "border-white/5 divide-white/5")}>
                  {colorSpecs!.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span className={cn("min-w-0 shrink-0 text-[11px] font-medium", light ? "text-dark-500" : "text-cream-dim/60")}>
                        {s.label}
                      </span>
                      <span className={cn("min-w-0 text-right text-[11px] font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-16 max-w-[100rem] px-5 sm:px-10">
          <h2 className={cn("mb-6 text-[11px] font-semibold uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/60")}>
            Key Features
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {colorFeatures.map((f) => (
              <div
                key={f}
                className={cn(
                  "rounded-xl border px-4 py-4 text-center",
                  light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                )}
              >
                <p className={cn("text-xs font-medium", light ? "text-dark-700" : "text-cream")}>{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mx-auto mt-16 max-w-[100rem] px-5 sm:px-10">
          <h2 className={cn("mb-6 text-[11px] font-semibold uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/60")}>
            Customer Reviews
          </h2>

          {/* Summary */}
          <div className={cn("grid gap-8 rounded-2xl border p-6 sm:p-8 lg:grid-cols-[280px_1fr]", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
            {/* Score */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className={cn("text-5xl font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>
                {stats.avg.toFixed(1)}
              </span>
              <div className="mt-2 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={cn(
                      i < Math.round(stats.avg)
                        ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold"
                        : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <p className={cn("mt-2 text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>
                Based on {stats.total} reviews
              </p>
            </div>

            {/* Distribution bars */}
            <div className="flex flex-col gap-2 justify-center">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.dist[star - 1];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className={cn("w-8 text-right text-xs tabular-nums", light ? "text-dark-400" : "text-cream-dim/50")}>
                      {star} ★
                    </span>
                    <div className={cn("h-2 flex-1 overflow-hidden rounded-full", light ? "bg-dark-100" : "bg-white/5")}>
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", light ? "bg-sapphire" : "bg-gold")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn("w-8 text-xs tabular-nums", light ? "text-dark-400" : "text-cream-dim/50")}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review list */}
          <div className="mt-8 flex flex-col gap-4">
            {(showAllReviews ? reviews : reviews.slice(0, 2)).map((review) => (
              <div
                key={review.id}
                className={cn(
                  "rounded-2xl border p-5 sm:p-6 transition-all",
                  light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white", review.avatar)}>
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", light ? "text-dark-900" : "text-cream")}>
                          {review.author}
                        </span>
                        {review.verified && (
                          <span className={cn("rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.15em]", light ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400")}>
                            Verified
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/40")}>
                        {review.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={cn(
                          i < review.rating
                            ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold"
                            : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <h3 className={cn("mt-3 text-sm font-semibold", light ? "text-dark-900" : "text-cream")}>
                  {review.title}
                </h3>
                <p className={cn("mt-1.5 text-[13px] leading-relaxed", light ? "text-dark-600" : "text-cream-dim/70")}>
                  {review.body}
                </p>

                {/* Meta + helpful */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {review.color && (
                      <span className={cn("rounded-full border px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.15em]", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim/50")}>
                        {review.color}
                      </span>
                    )}
                    {review.size && (
                      <span className={cn("rounded-full border px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.15em]", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim/50")}>
                        Size {review.size}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={cn("flex items-center gap-1.5 text-[10px] transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/40 hover:text-gold-light")}
                  >
                    <ThumbsUp size={11} />
                    Helpful ({review.helpful})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Show all / Show less */}
          {reviews.length > 2 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowAllReviews((v) => !v)}
                className={cn(
                  "rounded-full border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] transition-all duration-300",
                  light
                    ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire"
                    : "border-white/10 text-cream-dim/60 hover:border-gold hover:text-gold-light"
                )}
              >
                {showAllReviews ? "Show Less" : `Show All ${reviews.length} Reviews`}
              </button>
            </div>
          )}

          {/* Write a review */}
          <div className={cn("mt-8 rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className={light ? "text-sapphire" : "text-gold"} />
              <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                Write a Review
              </h3>
            </div>
            {reviewSuccess && (
              <p className="mt-3 text-[11px] text-emerald-500 font-medium">Review submitted successfully!</p>
            )}
            {reviewError && (
              <p className="mt-3 text-[11px] text-red-500 font-medium">{reviewError}</p>
            )}
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setReviewRating(s)} className="transition-transform hover:scale-125">
                      <Star
                        size={20}
                        className={cn(
                          s <= reviewRating
                            ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold"
                            : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Title
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className={cn("w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none", light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx/50 text-cream placeholder:text-cream-dim/30 focus:border-gold")}
                />
              </div>
              <div>
                <label className={cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Review
                </label>
                <textarea
                  rows={4}
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Tell others about your experience..."
                  className={cn("w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none resize-none", light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx/50 text-cream placeholder:text-cream-dim/30 focus:border-gold")}
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className={cn(
                  "self-start rounded-xl px-8 py-3 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50",
                  light
                    ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                    : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                )}
              >
                {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Submit Review"}
              </button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16 mx-auto max-w-[100rem] px-5 sm:px-10">
            <h2 className={cn("mb-6 text-[11px] font-semibold uppercase tracking-[0.35em]", light ? "text-dark-400" : "text-cream-dim/60")}>
              You May Also Like
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-5 [&::-webkit-scrollbar]:hidden">
              {related.slice(0, 4).map((p) => {
                const img = p.dbImages?.[0] || p.colors?.[0]?.images?.[0] || "";
                return (
                  <Link
                    key={p.id}
                    href={`/store/${p.id}`}
                    onMouseEnter={() => warmProduct(p.id)}
                    className="group block w-[42%] shrink-0 snap-start overflow-hidden rounded-none border-0 transition-all duration-500 sm:w-[320px] sm:shrink-0 sm:rounded-2xl sm:border"
                  >
                    <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
                      <img
                        src={resolveImageUrl(img)}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      {!img && <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105", p.gradient)} />}
                      {p.badge && (
                        <span className={cn("absolute left-3 top-3 rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em]", light ? "bg-white/90 text-dark-900 shadow-sm" : "bg-abyss/80 text-gold-light backdrop-blur-sm")}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className={cn("p-4", light ? "sm:bg-white" : "sm:bg-graphite")}>
                      <h3 className={cn("text-sm font-medium leading-tight", light ? "text-dark-900" : "text-cream")}>
                        {p.name}
                      </h3>
                      <span className={cn("mt-1 block text-sm font-semibold tabular-nums", light ? "text-sapphire" : "text-gold-light")}>
                        {formatPrice(p.price)}
                      </span>
                      {p.originalPrice && (
                        <span className={cn("text-xs line-through", light ? "text-dark-400" : "text-cream-dim/40")}>
                          {formatPrice(p.originalPrice)}
                        </span>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={cn(i < Math.floor(p.rating) ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold" : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10")} />
                          ))}
                        </div>
                        <span className={cn("text-[9px] font-medium", light ? "text-dark-400" : "text-cream-dim/50")}>
                          ({p.reviews})
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
