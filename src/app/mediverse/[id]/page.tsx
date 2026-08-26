"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Star, ShoppingBag, ChevronRight, Check, Truck, Shield, RotateCcw, Zap } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import { MEDIVERSE_PRODUCTS, type MediverseProduct } from "../products";
import SiteLayout from "@/components/layout/SiteLayout";

export default function MediverseProductPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";
  const { addItem } = useCart();

  const id = params.id as string;
  const product = MEDIVERSE_PRODUCTS.find((p) => p.id === id);

  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Product not found
            </p>
            <Link
              href="/mediverse"
              className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
            >
              Back to Mediverse
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const related = MEDIVERSE_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 10);

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
      } as any,
      { color: "Default", colorHex: "#18181b", qty, source: "mediverse" }
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
      } as any,
      { color: "Default", colorHex: "#18181b", qty, source: "mediverse" }
    );
    router.push("/cart");
  };

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <Link href="/mediverse" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              Mediverse
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <Link href="/mediverse" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              {product.category}
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <span className={cn(light ? "text-dark-900" : "text-cream")}>{product.name}</span>
          </nav>
        </div>

        {/* Main product */}
        <div className="mx-auto mt-8 grid max-w-[100rem] gap-8 px-5 sm:px-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className={cn("relative aspect-square overflow-hidden rounded-2xl", light ? "bg-dark-100" : "bg-graphite")}>
              <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-700", product.gradient)} />
              {product.badge && (
                <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]", light ? "bg-white/90 text-dark-900 shadow-sm" : "bg-abyss/80 text-gold-light backdrop-blur-sm")}>
                  {product.badge}
                </span>
              )}
            </div>

            {/* Seller info */}
            <div className={cn("rounded-2xl border p-4", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                  {product.seller ? (product.seller.shopName || product.seller.name).charAt(0).toUpperCase() : "MV"}
                </div>
                <div className="flex-1">
                  <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>
                    {product.seller?.shopName || product.seller?.name || product.brand}
                  </p>
                  <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                    {product.seller?.email || "Mediverse Health & Wellness"}
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
                  {product.rating} ({product.reviews.toLocaleString()} reviews)
                </span>
              </div>
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
                    Save {formatPrice(product.originalPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />

            {/* Details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Category
                </span>
                <span className={cn("text-xs capitalize", light ? "text-dark-900" : "text-cream")}>
                  {product.category}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Unit
                </span>
                <span className={cn("text-xs", light ? "text-dark-900" : "text-cream")}>
                  {product.unit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                  Availability
                </span>
                <span className={cn("text-xs", product.inStock ? "text-emerald-500" : "text-red-500")}>
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>

            {/* Quantity + Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                  addedToCart
                    ? "bg-emerald-500 text-white"
                    : light
                      ? "border border-sapphire bg-sapphire/10 text-sapphire hover:bg-sapphire hover:text-white hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                      : "border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold hover:text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]",
                  !product.inStock && "opacity-40 cursor-not-allowed"
                )}
              >
                {addedToCart ? (
                  <>
                    <Check size={14} /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} /> {product.inStock ? "Add to Cart" : "Out of Stock"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!product.inStock}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                  light
                    ? "bg-dark-900 text-white hover:bg-dark-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.25)]"
                    : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]",
                  !product.inStock && "opacity-40 cursor-not-allowed"
                )}
              >
                <Zap size={14} /> Buy Now
              </button>
            </div>

            {/* Trust badges */}
            <div className={cn("mt-8 grid grid-cols-3 gap-3 rounded-2xl border p-4", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-graphite/50")}>
              {[
                { icon: <Truck size={16} />, label: "Express Delivery" },
                { icon: <Shield size={16} />, label: "Genuine Products" },
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

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16 sm:mx-auto sm:max-w-[100rem] sm:px-5 sm:px-10">
            <h2 className={cn("mb-6 px-5 text-[11px] font-semibold uppercase tracking-[0.35em] sm:px-0", light ? "text-dark-400" : "text-cream-dim/60")}>
              You May Also Like
            </h2>
            <div className="flex flex-col gap-3 sm:gap-5">
              {[related.slice(0, 5), related.slice(5, 10)].filter(row => row.length > 0).map((row, ri) => (
                <div key={ri} className="flex overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible lg:grid-cols-4">
                  {row.map((p) => (
                    <Link
                      key={p.id}
                      href={`/mediverse/${p.id}`}
                      className={cn(
                        "group shrink-0 w-[44vw] snap-start overflow-hidden rounded-none border-0 transition-all duration-500 sm:w-auto sm:shrink sm:rounded-2xl sm:border",
                    light
                      ? "border-dark-200/60 bg-white hover:border-sapphire/30 hover:shadow-[0_8px_40px_rgba(30,58,138,0.1)]"
                      : "border-white/5 bg-graphite hover:border-gold/20 hover:shadow-[0_8px_40px_rgba(212,175,55,0.08)]"
                  )}
                >
                  <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
                    <div className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105", p.gradient)} />
                  </div>
                  <div className="p-4">
                    <h3 className={cn("text-sm font-medium leading-tight", light ? "text-dark-900" : "text-cream")}>{p.name}</h3>
                    <span className={cn("mt-1 block text-sm font-semibold tabular-nums", light ? "text-sapphire" : "text-gold-light")}>{formatPrice(p.price)}</span>
                    <div className="mt-2 hidden sm:flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} className={cn(i < Math.floor(p.rating) ? light ? "fill-sapphire text-sapphire" : "fill-gold text-gold" : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10")} />
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
