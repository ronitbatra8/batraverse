"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ChevronRight, Star } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useCart } from "@/components/cart/CartContext";
import SiteLayout from "@/components/layout/SiteLayout";
import type { Product } from "@/app/store/products";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

function getHref(id: string) {
  if (id.startsWith("m")) return `/mart/${id}`;
  return `/store/${id}`;
}

function getImageSrc(p: Product): string {
  const raw = p.dbImages?.[0] || p.colors?.[0]?.images?.[0] || "";
  if (!raw) return `https://placehold.co/600x400/14141a/d4af37?text=${encodeURIComponent(p.name.slice(0, 12))}`;
  if (raw.startsWith("http")) return raw;
  return `${API_BASE}${raw}`;
}

function ProductCard({ product, light }: { product: Product; light: boolean }) {
  const { remove } = useWishlist();
  const { addItem } = useCart();

  return (
    <Link href={getHref(product.id)} className="group block">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        light ? "border-dark-100 bg-white hover:shadow-lg hover:shadow-dark-200/40" : "border-white/5 bg-graphite hover:shadow-lg hover:shadow-black/40"
      )}>
        {/* Image */}
        <div className="relative aspect-[3/2] overflow-hidden">
          <img
            src={getImageSrc(product)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Remove button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(product.id); }}
            className={cn(
              "absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all",
              light ? "bg-white/90 text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm" : "bg-abyss/80 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 shadow-sm"
            )}
          >
            <Heart size={14} fill="currentColor" />
          </button>
          {product.badge && (
            <span className="absolute top-3 left-3 rounded-full bg-rose-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className={cn("text-[9px] font-medium uppercase tracking-[0.2em] mb-1", light ? "text-dark-400" : "text-cream-dim/50")}>
            {product.category}
          </p>
          <h3 className={cn("text-sm font-semibold leading-snug line-clamp-2 mb-2", light ? "text-dark-900" : "text-cream")}>
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-gold text-gold" />
              <span className={cn("text-[10px] font-medium", light ? "text-dark-700" : "text-cream")}>
                {product.rating}
              </span>
            </div>
            <span className={cn("text-[10px]", light ? "text-dark-300" : "text-cream-dim/30")}>({product.reviews})</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-base font-bold", light ? "text-dark-900" : "text-cream")}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className={cn("text-[10px] line-through", light ? "text-dark-300" : "text-cream-dim/40")}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
          {/* Quick Add */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product, {
                color: product.colors?.[0]?.name || "",
                colorHex: product.colors?.[0]?.value || "#0a0a0a",
                qty: 1,
                source: product.id.startsWith("m") ? "mart" : "store",
              });
            }}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
              light
                ? "bg-dark-900 text-white hover:bg-dark-800"
                : "bg-gold text-abyss hover:bg-gold-light"
            )}
          >
            <ShoppingBag size={12} />
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function WishlistPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { items, count } = useWishlist();

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
            <span className={cn(light ? "text-dark-900" : "text-cream")}>Wishlist</span>
          </nav>
        </div>

        <div className="mx-auto max-w-[100rem] px-5 pt-8 sm:px-10">
          <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>
            My Wishlist
          </h1>
          <p className={cn("mt-1 text-sm", light ? "text-dark-400" : "text-cream-dim/50")}>
            {count} {count === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="mx-auto max-w-[100rem] px-5 pt-8 sm:px-10">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Heart size={48} className={cn("mb-4", light ? "text-dark-200" : "text-white/10")} />
              <h2 className={cn("text-lg font-semibold mb-1", light ? "text-dark-700" : "text-cream")}>
                Your wishlist is empty
              </h2>
              <p className={cn("text-sm mb-6", light ? "text-dark-400" : "text-cream-dim/50")}>
                Save items you love for later.
              </p>
              <Link
                href="/store"
                className={cn(
                  "rounded-xl px-8 py-3 text-[11px] font-bold uppercase tracking-[0.25em] transition-all",
                  light
                    ? "bg-dark-900 text-white hover:bg-dark-800"
                    : "bg-gold text-abyss hover:bg-gold-light"
                )}
              >
                Browse Store
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} light={light} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
