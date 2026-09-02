"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, ArrowRight, Shield, Truck, RotateCcw, Zap, Clock } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import SiteLayout from "@/components/layout/SiteLayout";
import { resolveImageUrl } from "@/lib/imageUrl";

export default function CartPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { items, removeItem, updateQty, clear, totalItems, subtotal, deliveryMode, setDeliveryMode } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <SiteLayout><div className="min-h-screen" /></SiteLayout>;

  const storeItems = items.filter((it) => it.source !== "mart");
  const martItems = items.filter((it) => it.source === "mart");
  const hasMartItems = martItems.length > 0;

  const storeSubtotal = storeItems.reduce((s, i) => s + (i.colorPrice ?? i.product.price) * i.qty, 0);
  const martSubtotal = martItems.reduce((s, i) => s + (i.colorPrice ?? i.product.price) * i.qty, 0);
  const storeDelivery = storeItems.length > 0 ? (storeSubtotal >= 800 ? 0 : 49) : 0;
  const martDelivery = martItems.length > 0 ? (martSubtotal >= 200 ? 0 : 49) : 0;
  const deliveryCharge = storeDelivery + martDelivery;
  const expressFee = hasMartItems && deliveryMode === "express" ? 49 : 0;
  const total = subtotal + deliveryCharge + expressFee;

  const itemKey = (productId: string, color: string, size?: string) => `${productId}::${color}::${size ?? ""}`;

  const imgSrc = (colorImage?: string) =>
    colorImage ? (resolveImageUrl(colorImage) || null) : null;

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20 overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <Link href="/store" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>
              Store
            </Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <span className={cn(light ? "text-dark-900" : "text-cream")}>Cart</span>
          </nav>
        </div>

        <div className="mx-auto mt-8 max-w-[100rem] px-5 sm:px-10">
          <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>
            Shopping Cart
          </h1>
          <p className={cn("mt-1 text-sm", light ? "text-dark-400" : "text-cream-dim/50")}>
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mx-auto mt-20 max-w-[100rem] px-5 text-center sm:px-10">
            <div className={cn("mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full", light ? "bg-dark-100" : "bg-graphite")}>
              <ShoppingBag size={28} className={light ? "text-dark-400" : "text-cream-dim/50"} />
            </div>
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Your cart is empty
            </p>
            <Link
              href="/store"
              className={cn(
                "mt-6 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                light
                  ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                  : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              )}
            >
              Continue Shopping <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="mx-auto mt-8 grid max-w-[100rem] gap-6 px-5 sm:gap-10 sm:px-10 lg:grid-cols-3">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className={cn("text-[10px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  Cart Items
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className={cn("text-[10px] uppercase tracking-[0.2em] transition-colors", light ? "text-dark-400 hover:text-red-500" : "text-cream-dim/50 hover:text-rose-400")}
                >
                  Clear All
                </button>
              </div>

              {/* Store Items */}
              {storeItems.length > 0 && (
                <div className="mt-4">
                  {hasMartItems && (
                    <p className={cn("mb-3 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                      <Truck size={11} />
                      Store Items — Standard Delivery
                    </p>
                  )}
                  <div className="flex flex-col gap-4">
                    {storeItems.map((item) => {
                      const key = itemKey(item.product.id, item.color, item.size);
                      const src = imgSrc(item.colorImage);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex gap-4 rounded-2xl border p-4 transition-all sm:p-5",
                            light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                          )}
                        >
                          <Link
                            href={`/store/${item.product.id}`}
                            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28"
                          >
                            {src ? (
                              <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                                <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 40%, ${item.colorHex}88, transparent 70%)` }} />
                              </>
                            )}
                            <span className={cn("absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider backdrop-blur-sm", light ? "bg-white/80 text-dark-700" : "bg-abyss/70 text-cream-dim/80")}>
                              {item.color}
                            </span>
                          </Link>

                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  href={`/store/${item.product.id}`}
                                  className={cn("text-sm font-medium leading-tight transition-colors", light ? "text-dark-900 hover:text-sapphire" : "text-cream hover:text-gold-light")}
                                >
                                  {item.product.name}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeItem(key)}
                                  className={cn("shrink-0 p-1 transition-colors", light ? "text-dark-300 hover:text-red-500" : "text-cream-dim/30 hover:text-rose-400")}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {item.size && (
                                  <span className={cn("text-[9px] uppercase tracking-[0.2em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                                    Size: {item.size}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className={cn("flex items-center rounded-xl border", light ? "border-dark-200" : "border-white/10")}>
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, item.qty - 1)}
                                  className={cn("px-3 py-1.5 text-xs transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                                >
                                  <Minus size={12} />
                                </button>
                                <span className={cn("min-w-[32px] text-center text-xs font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, item.qty + 1)}
                                  className={cn("px-3 py-1.5 text-xs transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <p className={cn("text-sm font-semibold tabular-nums", light ? "text-dark-900" : "text-cream")}>
                                {formatPrice((item.colorPrice ?? item.product.price) * item.qty)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mart Items */}
              {martItems.length > 0 && (
                <div className={cn("mt-4", storeItems.length > 0 ? "pt-6" : "")}>
                  {hasMartItems && (
                    <p className={cn("mb-3 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                      <Zap size={11} />
                      Mart Items — Express Available
                    </p>
                  )}
                  <div className="flex flex-col gap-4">
                    {martItems.map((item) => {
                      const key = itemKey(item.product.id, item.color, item.size);
                      const src = imgSrc(item.colorImage);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex gap-4 rounded-2xl border p-4 transition-all sm:p-5",
                            light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                          )}
                        >
                          <Link
                            href={`/mart/${item.product.id}`}
                            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28"
                          >
                            {src ? (
                              <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                                <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 40%, ${item.colorHex}88, transparent 70%)` }} />
                              </>
                            )}
                            <span className={cn("absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider backdrop-blur-sm", light ? "bg-white/80 text-dark-700" : "bg-abyss/70 text-cream-dim/80")}>
                              {item.color}
                            </span>
                          </Link>

                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  href={`/mart/${item.product.id}`}
                                  className={cn("text-sm font-medium leading-tight transition-colors", light ? "text-dark-900 hover:text-sapphire" : "text-cream hover:text-gold-light")}
                                >
                                  {item.product.name}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeItem(key)}
                                  className={cn("shrink-0 p-1 transition-colors", light ? "text-dark-300 hover:text-red-500" : "text-cream-dim/30 hover:text-rose-400")}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {item.size && (
                                  <span className={cn("text-[9px] uppercase tracking-[0.2em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                                    Size: {item.size}
                                  </span>
                                )}
                                {deliveryMode === "express" && (
                                  <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                                    <Zap size={7} /> 20 Min
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className={cn("flex items-center rounded-xl border", light ? "border-dark-200" : "border-white/10")}>
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, item.qty - 1)}
                                  className={cn("px-3 py-1.5 text-xs transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                                >
                                  <Minus size={12} />
                                </button>
                                <span className={cn("min-w-[32px] text-center text-xs font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, item.qty + 1)}
                                  className={cn("px-3 py-1.5 text-xs transition-colors", light ? "text-dark-500 hover:text-dark-900" : "text-cream-dim hover:text-cream")}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                {deliveryMode === "express" && (
                                  <span className={cn("text-[9px] font-medium", light ? "text-sapphire" : "text-gold")}>+{formatPrice(49)}</span>
                                )}
                                <p className={cn("text-sm font-semibold tabular-nums", light ? "text-dark-900" : "text-cream")}>
                                  {formatPrice((item.colorPrice ?? item.product.price) * item.qty)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery mode toggle — card style matching mart detail page */}
                  <div className="mt-5">
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
                </div>
              )}

              {/* Continue shopping */}
              <Link
                href="/store"
                className={cn("mt-6 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}
              >
                <ArrowRight size={12} className="rotate-180" /> Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className={cn("sticky top-28 rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  Order Summary
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between">
                    <span className={cn("text-sm", light ? "text-dark-500" : "text-cream-dim/60")}>Subtotal ({totalItems} items)</span>
                    <span className={cn("text-sm font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(subtotal)}</span>
                  </div>
                  {storeItems.length > 0 && (
                    <div>
                      <div className="flex justify-between">
                        <span className={cn("text-sm", light ? "text-dark-500" : "text-cream-dim/60")}>Store Delivery</span>
                        <span className={cn("text-sm font-medium tabular-nums", storeDelivery === 0 ? "text-emerald-500" : "", light ? "text-dark-900" : "text-cream")}>
                          {storeDelivery === 0 ? "Free" : formatPrice(storeDelivery)}
                        </span>
                      </div>
                      {storeDelivery === 0 && (
                        <p className="text-[9px] text-emerald-500">Free store delivery on orders above ₹800</p>
                      )}
                    </div>
                  )}
                  {martItems.length > 0 && (
                    <div>
                      <div className="flex justify-between">
                        <span className={cn("text-sm", light ? "text-dark-500" : "text-cream-dim/60")}>Mart Delivery</span>
                        <span className={cn("text-sm font-medium tabular-nums", martDelivery === 0 ? "text-emerald-500" : "", light ? "text-dark-900" : "text-cream")}>
                          {martDelivery === 0 ? "Free" : formatPrice(martDelivery)}
                        </span>
                      </div>
                      {martDelivery === 0 && (
                        <p className="text-[9px] text-emerald-500">Free mart delivery on orders above ₹200</p>
                      )}
                    </div>
                  )}
                  {hasMartItems && deliveryMode === "express" && (
                    <div className="flex items-center gap-1.5">
                      <Zap size={10} className={light ? "text-sapphire" : "text-gold"} />
                      <span className={cn("text-[9px] font-medium", light ? "text-sapphire" : "text-gold")}>
                        Express delivery for {martItems.length} {martItems.length === 1 ? "item" : "items"} — +{formatPrice(49)}
                      </span>
                    </div>
                  )}
                </div>

                <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />

                <div className="flex items-baseline justify-between">
                  <span className={cn("text-sm font-semibold uppercase tracking-[0.2em]", light ? "text-dark-700" : "text-cream-dim")}>Total</span>
                  <span className={cn("text-xl font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(total)}</span>
                </div>

                <Link
                  href="/checkout"
                  className={cn(
                    "mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                    light
                      ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                      : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                  )}
                >
                  Checkout
                </Link>

                <div className={cn("mt-5 grid grid-cols-3 gap-2 rounded-xl border p-3", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-onyx/50")}>
                  {[
                    { icon: <Truck size={13} />, label: "Free Ship" },
                    { icon: <Shield size={13} />, label: "Warranty" },
                    { icon: <RotateCcw size={13} />, label: "Returns" },
                  ].map((b) => (
                    <div key={b.label} className="flex flex-col items-center gap-1.5 text-center">
                      <span className={cn(light ? "text-sapphire" : "text-gold")}>{b.icon}</span>
                      <span className={cn("text-[7px] font-semibold uppercase tracking-[0.15em]", light ? "text-dark-500" : "text-cream-dim/60")}>
                        {b.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
