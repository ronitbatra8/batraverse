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
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return `${API_BASE}${raw}`;
}

function WishlistRow({ product, light }: { product: Product; light: boolean }) {
  const { remove } = useWishlist();
  const { addItem } = useCart();
  const imgSrc = getImageSrc(product);

  return (
    <Link href={getHref(product.id)} className="group block">
      {/* Mobile: row */}
      <div className={cn(
        "flex flex-col rounded-xl border overflow-hidden transition-all duration-300 sm:hidden",
        light ? "border-dark-100 bg-white" : "border-white/5 bg-graphite"
      )}>
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            {imgSrc ? (
              <img src={imgSrc} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className={cn("h-full w-full bg-gradient-to-br", product.gradient)} />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className={cn("text-xs font-semibold leading-snug line-clamp-2", light ? "text-dark-900" : "text-cream")}>
              {product.name}
            </h3>
            <span className={cn("mt-1.5 text-sm font-bold", light ? "text-dark-900" : "text-cream")}>
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
        <div className={cn("flex gap-2 border-t px-3 py-2.5", light ? "border-dark-100" : "border-white/5")}>
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
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-bold uppercase tracking-[0.2em]",
              light ? "bg-dark-900 text-white" : "bg-gold text-abyss"
            )}
          >
            <ShoppingBag size={10} />
            Add to Cart
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(product.id); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-bold transition-all",
              light ? "bg-dark-100/60 text-rose-500" : "bg-white/5 text-rose-400"
            )}
          >
            <Heart size={12} fill="currentColor" />
            Remove
          </button>
        </div>
      </div>

      {/* Desktop: compact card */}
      <div className={cn(
        "hidden sm:block overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg",
        light ? "border-dark-100 bg-white hover:shadow-dark-200/40" : "border-white/5 bg-graphite hover:shadow-black/40"
      )}>
        <div className="relative aspect-[5/3] overflow-hidden">
          {imgSrc ? (
            <img src={imgSrc} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br transition-transform duration-500 group-hover:scale-105", product.gradient)} />
          )}
          {product.badge && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-rose-500 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className={cn("text-xs font-semibold leading-snug line-clamp-1", light ? "text-dark-900" : "text-cream")}>
            {product.name}
          </h3>
          <span className={cn("mt-1 block text-sm font-bold", light ? "text-dark-900" : "text-cream")}>
            {formatPrice(product.price)}
          </span>
          <div className="mt-2.5 flex gap-2">
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
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                light ? "bg-dark-900 text-white hover:bg-dark-800" : "bg-gold text-abyss hover:bg-gold-light"
              )}
            >
              <ShoppingBag size={10} />
              Add to Cart
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(product.id); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-bold transition-all",
                light ? "bg-dark-100/60 text-rose-500 hover:bg-rose-50" : "bg-white/5 text-rose-400 hover:bg-rose-500/20"
              )}
            >
              <Heart size={12} fill="currentColor" />
              Remove
            </button>
          </div>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {items.map((product) => (
                <WishlistRow key={product.id} product={product} light={light} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
