"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, Lock, Shield } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart, type CartItem } from "@/components/cart/CartContext";
import { useAuth, type SavedAddress } from "@/components/auth/AuthContext";
import SiteLayout from "@/components/layout/SiteLayout";
import { apiFetch } from "@/lib/api";

type PriceRow = { label: string; amount: number };

type ShippingForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_SHIP: ShippingForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  pincode: "",
};

interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  source: string;
  gstPct?: number | null;
  subcategories?: { id: string; name: string; slug: string; gstPct?: number | null }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const priceOf = (i: CartItem) => i.colorPrice ?? i.product.price;

const normPid = (id: string) => (id.startsWith("db-") ? id.slice(3) : id);

const totalItemsLabel = (items: CartItem[]): string => {
  const n = items.reduce((s, i) => s + i.qty, 0);
  return `${n} ${n === 1 ? "item" : "items"}`;
};

let rzpLoadPromise: Promise<boolean> | null = null;
function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (!rzpLoadPromise) {
    rzpLoadPromise = new Promise<boolean>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }
  return rzpLoadPromise;
}

export default function CheckoutPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const router = useRouter();
  const { items, clear, deliveryMode, setDeliveryMode } = useCart();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [cats, setCats] = useState<CategoryDto[]>([]);
  const [wallet, setWallet] = useState<number | null>(null);
  const [rzpReady, setRzpReady] = useState(false);
  const [rzpKeyId, setRzpKeyId] = useState("");

  const [payMethod, setPayMethod] = useState<"razorpay" | "wallet">("razorpay");
  const [cardPin, setCardPin] = useState("");
  const [ship, setShip] = useState<ShippingForm>(EMPTY_SHIP);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Prefill shipping + detect payment options once the session loads.
  useEffect(() => {
    if (!user) return;
    const nameParts = (user.name || "").split(" ");
    const saved: SavedAddress[] = (user.savedAddresses as SavedAddress[]) || [];
    const addr = saved.find((a) => a.isDefault) || saved[0];
    setShip((p) => ({
      ...p,
      name: p.name || (nameParts[0] ? `${nameParts[0]}${nameParts.slice(1).length ? " " + nameParts.slice(1).join(" ") : ""}` : ""),
      phone: p.phone || user.phone || "",
      email: p.email || user.email || "",
      address: p.address || addr?.address || "",
      apartment: p.apartment || addr?.apartment || "",
      city: p.city || addr?.city || "",
      state: p.state || addr?.state || "",
      pincode: p.pincode || addr?.pincode || "",
    }));
  }, [user]);

  // GST lookup data
  useEffect(() => {
    apiFetch("/categories")
      .then((j: any) => {
        const list: CategoryDto[] = Array.isArray(j?.all) ? j.all : [];
        setCats(list);
      })
      .catch(() => { /* categories unreachable — GST defaults to 18% */ });
  }, []);

  // Wallet balance
  useEffect(() => {
    apiFetch("/wallet/balance")
      .then((j: any) => setWallet(typeof j?.balance === "number" ? j.balance : 0))
      .catch(() => setWallet(0));
  }, []);

  // Razorpay readiness
  useEffect(() => {
    apiFetch("/payments/keys")
      .then((j: any) => {
        const enabled = Boolean(j?.enabled) && Boolean(j?.keyId);
        setRzpKeyId(j?.keyId || "");
        setRzpReady(enabled);
        if (!enabled) setPayMethod((p) => (p === "razorpay" ? "wallet" : p));
      })
      .catch(() => setRzpReady(false));
  }, []);

  const gstFor = useCallback(
    (item: CartItem) => {
      const catName = item.product.category;
      const cat = cats.find((c) => c.name === catName);
      const subName = item.product.sub && item.product.sub !== "all" ? item.product.sub : undefined;
      const sub = cat?.subcategories?.find((s) => s.name === subName);
      if (sub && sub.gstPct != null) return sub.gstPct;
      if (cat && cat.gstPct != null) return cat.gstPct;
      return 18;
    },
    [cats]
  );

  const gstRows = useMemo<PriceRow[]>(() => {
    const map: Record<string, { pct: number; base: number }> = {};
    for (const it of items) {
      const base = priceOf(it) * it.qty;
      const gst = gstFor(it);
      const key = String(gst);
      map[key] = map[key] || { pct: gst, base: 0 };
      map[key].base += base;
    }
    return Object.values(map).map((g) => ({ label: `GST (${g.pct}%)`, amount: round2((g.base * g.pct) / 100) }));
  }, [items, gstFor]);

  const itemBase = useMemo(() => items.reduce((s, i) => s + priceOf(i) * i.qty, 0), [items]);
  const gstTotal = gstRows.reduce((s, r) => s + r.amount, 0);

  const storeItems = items.filter((it) => it.source !== "mart");
  const martItems = items.filter((it) => it.source === "mart");
  const hasMartItems = martItems.length > 0;
  const storeSubtotal = storeItems.reduce((s, i) => s + priceOf(i) * i.qty, 0);
  const martSubtotal = martItems.reduce((s, i) => s + priceOf(i) * i.qty, 0);
  const storeDelivery = storeItems.length > 0 ? (storeSubtotal >= 250 ? 0 : 49) : 0;
  const martDelivery = martItems.length > 0 ? (martSubtotal >= 200 ? 0 : 49) : 0;
  const expressFee = hasMartItems && deliveryMode === "express" ? 49 : 0;
  const deliveryCharge = storeDelivery + martDelivery;

  const grandTotal = itemBase + gstTotal + deliveryCharge + expressFee;
  const walletEnough = typeof wallet === "number" && wallet >= grandTotal;
  const canWallet = payMethod === "wallet" && typeof wallet === "number" && walletEnough;

  const shipValid = Boolean(ship.name.trim() && ship.phone.trim() && ship.address.trim() && ship.city.trim() && ship.state.trim() && ship.pincode.trim());

  const placeOrders = async (paymentMethod: "CARD" | "WALLET") => {
    const shipping = {
      name: ship.name.trim(),
      phone: ship.phone.trim(),
      alternatePhone: undefined,
      address: ship.address.trim(),
      apartment: ship.apartment.trim() || undefined,
      city: ship.city.trim(),
      state: ship.state.trim(),
      pincode: ship.pincode.trim(),
    };
    const reqs: any[] = [];
    for (const [srcItems, source] of [[storeItems, "store"], [martItems, "mart"]] as const) {
      if (srcItems.length === 0) continue;
      const itemsPayload = srcItems.map((it) => {
        const base = priceOf(it);
        const gstPct = gstFor(it);
        return {
          productId: normPid(it.product.id),
          name: it.product.name,
          price: round2(base * (1 + gstPct / 100)),
          qty: it.qty,
          color: it.color,
          colorHex: it.colorHex,
          size: it.size || null,
          source,
          image: it.colorImage || null,
        };
      });
      reqs.push({
        items: itemsPayload,
        shipping,
        paymentMethod,
        source,
        deliveryMode,
        deliveryAmount: source === "mart" ? martDelivery : storeDelivery,
        expressAmount: source === "mart" ? expressFee : 0,
        cardPin: paymentMethod === "WALLET" ? cardPin.trim() : undefined,
      });
    }
    const results = await Promise.all(reqs.map((r) => apiFetch("/orders", { method: "POST", body: JSON.stringify(r) })));
    return results.map((r: any) => r?.orderId || r?.id || "").filter(Boolean).join(", ");
  };

  const startRazorpay = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setPaying(true);
    setError("");
    try {
      if (!rzpKeyId || !(await loadRazorpay())) {
        setError("Razorpay is not configured. Please use your wallet balance or contact support.");
        setPayMethod("wallet");
        setPaying(false);
        return;
      }
      const orderData: any = await apiFetch("/payments/order-create", {
        method: "POST",
        body: JSON.stringify({
          amountPaise: Math.round(grandTotal * 100),
          currency: "INR",
          receipt: "checkout_" + Date.now(),
        }),
      });
      if (!orderData?.id) {
        setError("Failed to create Razorpay order. Please try again or pay from wallet.");
        setPaying(false);
        return;
      }
      const RZP: any = (window as any).Razorpay;
      const rzp = new RZP({
        key_id: rzpKeyId,
        amount: orderData.amount || Math.round(grandTotal * 100),
        currency: orderData.currency || "INR",
        order_id: orderData.id,
        name: "Batraverse",
        description: "Order checkout",
        handler: async (resp: any) => {
          try {
            await apiFetch("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId: orderData.id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            });
            const ids = await placeOrders("CARD");
            setPlaced(ids || "confirmed");
            clear();
          } catch (e: any) {
            setError(e?.message || "Payment verification failed");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message || "Razorpay request failed");
      setPaying(false);
    }
  };

  const payWithWallet = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!canWallet) {
      setError(`Insufficient wallet balance. You have ${formatPrice(wallet ?? 0)} but need ${formatPrice(grandTotal)}.`);
      return;
    }
    setPaying(true);
    setError("");
    try {
      const ids = await placeOrders("WALLET");
      setPlaced(ids || "confirmed");
      clear();
    } catch (e: any) {
      setError(e?.message || "Wallet payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (!mounted) {
    return <SiteLayout><div className="min-h-screen" /></SiteLayout>;
  }

  if (placed) {
    return (
      <SiteLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center">
            <div className={cn("mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full", light ? "bg-emerald-50" : "bg-emerald-500/10")}>
              <Check size={32} className="text-emerald-500" />
            </div>
            <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>
              Order Confirmed
            </h1>
            <p className={cn("mt-3 text-sm leading-relaxed max-w-md mx-auto", light ? "text-dark-500" : "text-cream-dim/60")}>
              Your order <span className={cn("font-semibold", light ? "text-dark-900" : "text-cream")}>#{placed.toUpperCase()}</span> has been placed successfully.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/store" className={cn("rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all", light ? "bg-sapphire text-white hover:bg-sapphire-light" : "bg-gold text-abyss hover:bg-gold-light")}>
                Continue Shopping
              </Link>
              <Link href="/orders" className={cn("rounded-xl border px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all", light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold hover:text-gold-light")}>
                View Orders
              </Link>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Your cart is empty
            </p>
            <Link href="/store" className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}>
              Back to Store
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const inputCls = cn("w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none", light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx/50 text-cream placeholder:text-cream-dim/30 focus:border-gold");
  const labelCls = cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/70");

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20 overflow-x-hidden">
        <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
            <Link href="/store" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>Store</Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <Link href="/cart" className={cn("transition-colors", light ? "text-dark-400 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light")}>Cart</Link>
            <ChevronRight size={10} className={light ? "text-dark-300" : "text-cream-dim/30"} />
            <span className={cn(light ? "text-dark-900" : "text-cream")}>Checkout</span>
          </nav>
        </div>

        <div className="mx-auto mt-8 max-w-[100rem] px-5 sm:px-10">
          <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>
            Checkout
          </h1>

          <div className="mt-8 grid gap-6 lg:grid-cols-3 sm:gap-10">
            {/* Left column — shipping + payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping details */}
              <div className={cn("rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  Shipping Details
                </h2>
                {!user && (
                  <p className="mt-3 text-xs text-amber-500">
                    Please <Link href="/login" className="underline">sign in</Link> to place your order.
                  </p>
                )}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input value={ship.name} onChange={(e) => setShip((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input value={ship.phone} onChange={(e) => setShip((p) => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone" className={inputCls} inputMode="tel" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Email</label>
                    <input value={ship.email} onChange={(e) => setShip((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className={inputCls} type="email" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address</label>
                    <input value={ship.address} onChange={(e) => setShip((p) => ({ ...p, address: e.target.value }))} placeholder="House no, street, area" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Apartment / Landmark (optional)</label>
                    <input value={ship.apartment} onChange={(e) => setShip((p) => ({ ...p, apartment: e.target.value }))} placeholder="Apartment, landmark" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input value={ship.city} onChange={(e) => setShip((p) => ({ ...p, city: e.target.value }))} placeholder="City" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input value={ship.state} onChange={(e) => setShip((p) => ({ ...p, state: e.target.value }))} placeholder="State" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Pincode</label>
                    <input value={ship.pincode} onChange={(e) => setShip((p) => ({ ...p, pincode: e.target.value }))} placeholder="6-digit pincode" className={inputCls} inputMode="numeric" />
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className={cn("rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  Payment Method
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod("razorpay")}
                    disabled={!rzpReady}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      payMethod === "razorpay" ? (light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5") : (light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"),
                      !rzpReady && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                      <Lock size={16} />
                    </span>
                    <div>
                      <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>Razorpay</p>
                      <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                        {rzpReady ? "Card / UPI / NetBanking" : "Not configured"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod("wallet")}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      payMethod === "wallet" ? (light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5") : (light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20")
                    )}
                  >
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                      <Shield size={16} />
                    </span>
                    <div>
                      <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>Wallet</p>
                      <p className={cn("text-[10px]", walletEnough ? "text-emerald-500" : "text-amber-500")}>
                        Balance: {formatPrice(wallet ?? 0)}
                      </p>
                    </div>
                  </button>
                </div>

                {payMethod === "wallet" && !walletEnough && (
                  <p className="mt-4 text-xs text-amber-500">
                    Wallet balance is less than the order total ({formatPrice(grandTotal)}). Please recharge your wallet or use Razorpay.
                  </p>
                )}

                {payMethod === "wallet" && walletEnough && (
                  <div className="mt-4">
                    <label className={labelCls}>Card PIN (6 digits) to pay from wallet</label>
                    <input
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className={cn(inputCls, "max-w-xs")}
                      type="password"
                      inputMode="numeric"
                    />
                    <p className="mt-2 text-[10px] text-dark-400">
                      Set or manage your card PIN on the <Link href="/cards" className="underline">Cards</Link> page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column — order summary */}
            <div>
              <div className={cn("rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>
                  Order Summary
                </h2>

                <div className="mt-5 space-y-3">
                  {items.map((it) => (
                    <div key={`${it.product.id}::${it.color}::${it.size ?? ""}`} className="flex items-center justify-between gap-3">
                      <div>
                        <p className={cn("text-sm font-medium", light ? "text-dark-900" : "text-cream")}>{it.product.name}</p>
                        <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                          {it.color}{it.size ? ` · ${it.size}` : ""} × {it.qty}
                        </p>
                      </div>
                      <p className={cn("text-sm font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                        {formatPrice(priceOf(it) * it.qty)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className={light ? "text-dark-500" : "text-cream-dim/60"}>Item Value</span>
                    <span className="tabular-nums">{formatPrice(itemBase)}</span>
                  </div>
                  {gstRows.map((r) => (
                    <div key={r.label} className="flex justify-between">
                      <span className={light ? "text-dark-500" : "text-cream-dim/60"}>{r.label}</span>
                      <span className="tabular-nums">{formatPrice(r.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className={light ? "text-dark-500" : "text-cream-dim/60"}>Delivery</span>
                    <span className={cn("tabular-nums", deliveryCharge === 0 && "text-emerald-500")}>
                      {deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={light ? "text-dark-500" : "text-cream-dim/60"}>Total ({totalItemsLabel(items)})</span>
                    <span className={cn("text-lg font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className={cn("mt-4 rounded-lg px-4 py-3 text-xs", light ? "bg-red-50 text-red-700" : "bg-red-500/10 text-red-400")}>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={payMethod === "razorpay" ? startRazorpay : payWithWallet}
                  disabled={paying || !shipValid || !user || (payMethod === "wallet" && !canWallet)}
                  className={cn(
                    "mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                    light
                      ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]"
                      : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]",
                    (paying || !shipValid || !user || (payMethod === "wallet" && !canWallet)) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {paying ? <Loader2 size={14} className="animate-spin" /> : payMethod === "razorpay" ? <Lock size={14} /> : <Shield size={14} />}
                  {paying ? "Processing…" : payMethod === "razorpay" ? `Pay ${formatPrice(grandTotal)}` : `Pay ${formatPrice(grandTotal)} from Wallet`}
                </button>

                {!shipValid && user && (
                  <p className="mt-3 text-center text-[10px] text-amber-500">Complete shipping details to continue.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}