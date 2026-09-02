"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  Lock,
  Check,
  Truck,
  Shield,
  MapPin,
  User,
  Mail,
  Phone,
  Home,
  Building2,
  Globe,
  Hash,
  Banknote,
  Smartphone,
  Wallet,
  CircleDollarSign,
  Zap,
  Clock,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCart } from "@/components/cart/CartContext";
import { useAuth } from "@/components/auth/AuthContext";
import { getDiscountPercent, getFreeDeliveries, LEVELS, type LevelKey } from "@/lib/levels";
import { apiFetch } from "@/lib/api";
import SiteLayout from "@/components/layout/SiteLayout";
import UpiPaymentModal from "@/components/UpiPaymentModal";
import { resolveImageUrl } from "@/lib/imageUrl";

type Step = "shipping" | "payment" | "confirm";
type PaymentMethod = "cod" | "upi_delivery" | "upi" | "wallet_balance";

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

const EMPTY_SHIP: ShippingForm = { firstName: "", lastName: "", email: "", phone: "", alternatePhone: "", address: "", apartment: "", city: "", state: "", pincode: "", country: "India" };

const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = { cod: "COD", upi_delivery: "UPI_DELIVERY", upi: "UPI", wallet_balance: "WALLET" };

export default function CheckoutPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const router = useRouter();
  const { items, subtotal, clear, deliveryMode, setDeliveryMode } = useCart();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [step, setStep] = useState<Step>("shipping");
  const [placed, setPlaced] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [upiModal, setUpiModal] = useState(false);
  const [upiAmount, setUpiAmount] = useState(0);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const [ship, setShip] = useState<ShippingForm>(EMPTY_SHIP);
  const [payMethod, setPayMethod] = useState<PaymentMethod | "">("");

  useEffect(() => {
    if (!user) return;
    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const saved = user.savedAddresses;
    const defaultAddr = saved && saved.length > 0 ? saved[0] : null;
    setShip({
      firstName,
      lastName,
      email: user.email || "",
      phone: user.phone || "",
      alternatePhone: defaultAddr?.alternatePhone || "",
      address: defaultAddr?.address || "",
      apartment: defaultAddr?.apartment || "",
      city: defaultAddr?.city || "",
      state: defaultAddr?.state || "",
      pincode: defaultAddr?.pincode || "",
      country: "India",
    });
  }, [user]);

  const hasMartItems = items.some((it) => it.source === "mart");
  const hasStoreItems = items.some((it) => it.source === "store");
  const storeItems = items.filter((it) => it.source === "store");
  const martItems = items.filter((it) => it.source === "mart");
  const hasQuickDeliveryItems = hasMartItems;
  const expressFee = hasQuickDeliveryItems && deliveryMode === "express" ? 49 : 0;

  const storeSubtotal = storeItems.reduce((s, i) => s + (i.colorPrice ?? i.product.price) * i.qty, 0);
  const martSubtotal = martItems.reduce((s, i) => s + (i.colorPrice ?? i.product.price) * i.qty, 0);

  const effectiveLevel: LevelKey = user?.cardLevel && user.cardLevel in LEVELS ? user.cardLevel as LevelKey : "none";
  const discountPct = getDiscountPercent(effectiveLevel);
  const discountAmount = discountPct > 0 ? Math.round(subtotal * discountPct / 100 * 100) / 100 : 0;
  const discountedSubtotal = subtotal - discountAmount;

  const freeDelLimit = getFreeDeliveries(effectiveLevel);
  const freeDeliveryUsed = user?.freeDeliveryUsed || 0;
  const hasFreeDelivery = freeDelLimit > 0 && freeDeliveryUsed < freeDelLimit;

  const storeDelivery = hasFreeDelivery ? 0 : (hasStoreItems ? (storeSubtotal >= 800 ? 0 : 49) : 0);
  const martDelivery = hasFreeDelivery ? 0 : (hasMartItems ? (martSubtotal >= 200 ? 0 : 49) : 0);
  const deliveryCharge = storeDelivery + martDelivery;
  const total = discountedSubtotal + deliveryCharge + expressFee;

  const steps: { key: Step; label: string; num: number }[] = [
    { key: "shipping", label: "Shipping", num: 1 },
    { key: "payment", label: "Payment", num: 2 },
    { key: "confirm", label: "Review", num: 3 },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  const updateShip = (field: keyof ShippingForm, value: string) => setShip((p) => ({ ...p, [field]: value }));

  const shipValid = ship.firstName && ship.email && ship.phone && ship.address && ship.city;
  const payValid = payMethod !== "" && (
    payMethod === "cod" || payMethod === "upi_delivery" || payMethod === "upi" || payMethod === "wallet_balance"
  );

  const isUpiPayment = payMethod === "upi";

  const handlePlaceOrder = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const orderItems = items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.colorPrice ?? i.product.price,
        qty: i.qty,
        color: i.color,
        colorHex: i.colorHex,
        size: i.size || null,
        source: i.source || "store",
      }));

      const shippingData = {
        name: `${ship.firstName} ${ship.lastName}`,
        phone: ship.phone,
        alternatePhone: ship.alternatePhone || undefined,
        address: ship.address,
        apartment: ship.apartment,
        city: ship.city,
        state: ship.state,
        pincode: ship.pincode,
      };
      const paymentMethod = PAYMENT_METHOD_MAP[payMethod as PaymentMethod];

      const buildOrderRequests = (sourceItems: typeof orderItems, source: string) => {
        const srcSubtotal = sourceItems.reduce((s, i) => s + i.price * i.qty, 0);
        if (srcSubtotal <= 0) return [];
        const srcDelivery = source === "mart" ? martDelivery : storeDelivery;
        const srcExpress = source === "mart" ? expressFee : 0;
        return sourceItems.map((i) => {
          const itemTotal = i.price * i.qty;
          const share = itemTotal / srcSubtotal;
          return {
            items: [i],
            shipping: shippingData,
            paymentMethod,
            source,
            deliveryMode,
            deliveryAmount: srcDelivery > 0 ? Math.round(share * srcDelivery * 100) / 100 : 0,
            expressAmount: srcExpress > 0 ? Math.round(share * srcExpress * 100) / 100 : 0,
          };
        });
      };

      const orderRequests = [
        ...buildOrderRequests(orderItems.filter((i) => i.source === "store"), "store"),
        ...buildOrderRequests(orderItems.filter((i) => i.source === "mart"), "mart"),
      ];

      if (isUpiPayment) {
        setPendingOrderData({ orderRequests, total });
        setUpiAmount(total);
        setUpiModal(true);
        return;
      }

      const results = await Promise.all(orderRequests.map((r) => apiFetch("/orders", { method: "POST", body: JSON.stringify(r) })));
      const createdOrderId = results.map((r: { orderId?: string; id: string }) => r.orderId || r.id).join(", ");

      setOrderId(createdOrderId);
      setPlaced(true);
      clear();

      // Save address for future orders
      if (ship.address && ship.city) {
        apiFetch("/addresses", {
          method: "POST",
          body: JSON.stringify({ address: ship.address, apartment: ship.apartment, city: ship.city, state: ship.state, pincode: ship.pincode, alternatePhone: ship.alternatePhone || undefined }),
        }).catch(() => {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setProcessing(false);
    }
  };

  if (items.length === 0 && !placed && !upiModal) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center">
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

  if (placed) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className={cn("mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full", light ? "bg-emerald-50" : "bg-emerald-500/10")}>
              <Check size={32} className="text-emerald-500" />
            </div>
            <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>
              Order Confirmed
            </h1>
            <p className={cn("mt-3 text-sm leading-relaxed max-w-md mx-auto", light ? "text-dark-500" : "text-cream-dim/60")}>
              Thank you for your purchase. Your order <span className={cn("font-semibold", light ? "text-dark-900" : "text-cream")}>#{orderId.toUpperCase()}</span> has been placed successfully.
            </p>
            <p className={cn("mt-2 text-xs", light ? "text-dark-400" : "text-cream-dim/40")}>
              A confirmation email will be sent shortly.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/store" className={cn("rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", light ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]" : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]")}>
                Continue Shopping
              </Link>
              <Link href="/account" className={cn("rounded-xl border px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold hover:text-gold-light")}>
                View Orders
              </Link>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const inputCls = cn("w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none", light ? "border-dark-200 bg-dark-50/50 text-dark-900 placeholder:text-dark-400 focus:border-sapphire" : "border-white/10 bg-onyx/50 text-cream placeholder:text-cream-dim/30 focus:border-gold");
  const labelCls = cn("mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-500" : "text-cream-dim/70");

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20">
        {/* Breadcrumb */}
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
          <h1 className={cn("font-display text-3xl font-medium tracking-wide", light ? "text-dark-900" : "text-cream")}>Checkout</h1>
        </div>

        {/* Step indicator */}
        <div className="mx-auto mt-8 max-w-[100rem] px-5 sm:px-10">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 sm:gap-4">
                <button type="button" onClick={() => { if (i < currentIdx) setStep(s.key); }} disabled={i > currentIdx}
                  className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300",
                    s.key === step ? (light ? "bg-sapphire text-white" : "bg-gold text-abyss")
                    : i < currentIdx ? (light ? "bg-sapphire/10 text-sapphire cursor-pointer" : "bg-gold/10 text-gold-light cursor-pointer")
                    : (light ? "bg-dark-100 text-dark-400" : "bg-graphite text-cream-dim/40")
                  )}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold">
                    {i < currentIdx ? <Check size={12} /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < steps.length - 1 && <div className={cn("h-px w-8 sm:w-16", i < currentIdx ? (light ? "bg-sapphire" : "bg-gold") : (light ? "bg-dark-200" : "bg-white/10"))} />}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className={cn("mx-auto mt-4 max-w-[100rem] rounded-xl border px-5 py-3 text-xs sm:px-10", light ? "border-red-300 bg-red-50 text-red-600" : "border-red-500/30 bg-red-500/10 text-red-300")}>
            {error}
          </div>
        )}

        {/* Guest lock: cover entire checkout section when not signed in */}
        {mounted && !user && (
          <div className="relative mx-auto mt-10 grid max-w-[100rem] gap-10 px-5 sm:px-10 lg:grid-cols-3">
            {/* Dummy grid to preserve layout height */}
            <div className="lg:col-span-2 invisible" aria-hidden>
              <div className="rounded-2xl border p-6 sm:p-8" style={{ minHeight: 500 }}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-black/5" />)}
                </div>
              </div>
            </div>
            <div className="invisible" aria-hidden>
              <div className="rounded-2xl border p-6 sm:p-8" style={{ minHeight: 300 }} />
            </div>

            {/* Sign-in overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className={cn(
                "w-full max-w-md rounded-2xl border px-8 py-10 text-center backdrop-blur-sm",
                light
                  ? "border-dark-200/60 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.08)]"
                  : "border-white/10 bg-graphite/95 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
              )}>
                <div className={cn("mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border", light ? "border-sapphire/20 bg-sapphire/5 text-sapphire" : "border-gold/20 bg-gold/5 text-gold")}>
                  <Lock size={22} strokeWidth={1.5} />
                </div>
                <h3 className={cn("text-lg font-semibold", light ? "text-onyx" : "text-cream")}>Sign in required</h3>
                <p className={cn("mt-2 text-sm", light ? "text-onyx/60" : "text-cream-dim/60")}>
                  You need to sign in to place your order and track deliveries.
                </p>
                <Link
                  href="/login"
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                    light
                      ? "bg-sapphire text-white hover:shadow-[0_0_40px_rgba(30,58,138,0.35)]"
                      : "bg-gold text-abyss hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
                  )}
                >
                  Sign In
                </Link>
                <p className={cn("mt-4 text-xs", light ? "text-onyx/40" : "text-cream-dim/40")}>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className={cn("font-medium transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}>
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checkout content — only rendered when signed in */}
        {(!mounted || user) && (
        <div className="mx-auto mt-10 grid max-w-[100rem] gap-6 px-5 sm:gap-10 sm:px-10 lg:grid-cols-3">
          {/* Form area */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {step === "shipping" && (
              <div className={cn("rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={16} className={light ? "text-sapphire" : "text-gold"} />
                  <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Shipping Address</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <div className="relative">
                      <User size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="text" value={ship.firstName} readOnly className={cn(inputCls, "pl-10 opacity-70 cursor-not-allowed")} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input type="text" value={ship.lastName} readOnly placeholder="Optional" className={cn(inputCls, "opacity-70 cursor-not-allowed")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Email</label>
                    <div className="relative">
                      <Mail size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="email" value={ship.email} readOnly className={cn(inputCls, "pl-10 opacity-70 cursor-not-allowed")} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Phone *</label>
                    <div className="relative">
                      <Phone size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="tel" value={ship.phone} readOnly className={cn(inputCls, "pl-10 opacity-70 cursor-not-allowed")} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={cn(labelCls, "!mb-1")}>Alternate Phone <span className={cn("font-normal", light ? "text-dark-400" : "text-cream-dim/40")}>(optional)</span></label>
                    <div className="relative">
                      <Phone size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="tel" placeholder="Alternate number" value={ship.alternatePhone} onChange={(e) => updateShip("alternatePhone", e.target.value)} className={cn(inputCls, "pl-10")} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address *</label>
                    <div className="relative">
                      <Home size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="text" placeholder="123 Main Street" value={ship.address} onChange={(e) => updateShip("address", e.target.value)} className={cn(inputCls, "pl-10")} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Apartment / Suite</label>
                    <div className="relative">
                      <Building2 size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="text" placeholder="Apt 4B" value={ship.apartment} onChange={(e) => updateShip("apartment", e.target.value)} className={cn(inputCls, "pl-10")} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>City *</label>
                    <input type="text" placeholder="New Delhi" value={ship.city} onChange={(e) => updateShip("city", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input type="text" placeholder="Delhi" value={ship.state} onChange={(e) => updateShip("state", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Pincode</label>
                    <div className="relative">
                      <Hash size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="text" placeholder="110001" value={ship.pincode} onChange={(e) => updateShip("pincode", e.target.value)} className={cn(inputCls, "pl-10")} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Country</label>
                    <div className="relative">
                      <Globe size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", light ? "text-dark-400" : "text-cream-dim/30")} />
                      <input type="text" value="India" readOnly className={cn(inputCls, "pl-10 opacity-70 cursor-not-allowed")} />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={() => setStep("payment")} disabled={!shipValid}
                    className={cn("rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", !shipValid ? "opacity-40 cursor-not-allowed" : "", light ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]" : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]")}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && (
              <div className={cn("rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard size={16} className={light ? "text-sapphire" : "text-gold"} />
                  <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Payment Method</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: "cod" as PaymentMethod, icon: <Banknote size={20} />, label: "Cash on Delivery", desc: "Pay when you receive" },
                    { key: "upi_delivery" as PaymentMethod, icon: <Smartphone size={20} />, label: "UPI on Delivery", desc: "Scan & pay at delivery" },
                    { key: "upi" as PaymentMethod, icon: <CircleDollarSign size={20} />, label: "Online UPI", desc: "QR / Transaction ID" },
                    { key: "wallet_balance" as PaymentMethod, icon: <Wallet size={20} />, label: "Pay via Wallet", desc: `Balance: ₹${(user?.walletBalance ?? 0).toFixed(0)}` },
                  ].map((m) => (
                    <button type="button" key={m.key} onClick={() => setPayMethod(m.key)}
                      className={cn("group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300 text-center",
                        payMethod === m.key
                          ? (light ? "border-sapphire bg-sapphire/5 shadow-[0_0_20px_rgba(30,58,138,0.08)]" : "border-gold bg-gold/5 shadow-[0_0_20px_rgba(212,175,55,0.08)]")
                          : (light ? "border-dark-200/60 bg-dark-50/30 hover:border-dark-300" : "border-white/10 bg-graphite hover:border-white/20")
                      )}>
                      <span className={cn("transition-colors duration-300", payMethod === m.key ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50"))}>{m.icon}</span>
                      <div>
                        <p className={cn("text-xs font-semibold", payMethod === m.key ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-600" : "text-cream-dim/80"))}>{m.label}</p>
                        <p className={cn("text-[9px] mt-0.5", light ? "text-dark-400" : "text-cream-dim/40")}>{m.desc}</p>
                      </div>
                      {payMethod === m.key && <span className={cn("absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full", light ? "bg-sapphire text-white" : "bg-gold text-abyss")}><Check size={10} /></span>}
                    </button>
                  ))}
                </div>

                {/* Online UPI (QR / Transaction ID) */}
                {payMethod === "upi" && (
                  <div className="mt-5">
                    <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-400" : "text-cream-dim/50")}>Online UPI</p>
                    <div className="mt-1 rounded-xl border p-4 sm:p-5" style={{ borderColor: light ? "rgb(229 231 235 / 0.6)" : "rgb(255 255 255 / 0.1)" }}>
                      <div className="mb-3 flex items-center gap-2">
                        <Smartphone size={13} className={light ? "text-sapphire" : "text-gold"} />
                        <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-400" : "text-cream-dim/50")}>Pay via UPI</p>
                      </div>
                      <p className={cn("text-xs leading-relaxed", light ? "text-dark-500" : "text-cream-dim/60")}>
                        After placing your order, a QR code will appear to complete payment of <span className="font-bold">{formatPrice(total)}</span>. Enter the transaction ID after payment.
                      </p>
                    </div>
                  </div>
                )}

                {/* COD info */}
                {payMethod === "cod" && (
                  <div className={cn("mt-5 rounded-xl border p-4 text-xs leading-relaxed", light ? "border-dark-200/60 bg-dark-50/30 text-dark-500" : "border-white/10 bg-graphite text-cream-dim/50")}>
                    Pay with cash when your order is delivered. Please keep exact change ready.
                  </div>
                )}

                {/* UPI on Delivery info */}
                {payMethod === "upi_delivery" && (
                  <div className={cn("mt-5 rounded-xl border p-4 text-xs leading-relaxed", light ? "border-dark-200/60 bg-dark-50/30 text-dark-500" : "border-white/10 bg-graphite text-cream-dim/50")}>
                    Our delivery partner will share a UPI QR code at the time of delivery. Scan and pay to complete your purchase.
                  </div>
                )}

                {/* Wallet balance info */}
                {payMethod === "wallet_balance" && (
                  <div className={cn("mt-5 rounded-xl border p-4 text-xs leading-relaxed", light ? "border-sapphire/20 bg-sapphire/5 text-sapphire" : "border-gold/20 bg-gold/5 text-gold-light")}>
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={14} />
                      <span className="font-semibold">Wallet Payment</span>
                    </div>
                    <p>₹{(subtotal + deliveryCharge + expressFee - discountAmount).toFixed(2)} will be deducted from your wallet balance of ₹{(user?.walletBalance ?? 0).toFixed(2)}.</p>
                    {(user?.walletBalance ?? 0) < (subtotal + deliveryCharge + expressFee - discountAmount) && (
                      <p className="mt-2 text-red-500 font-semibold">Insufficient wallet balance. Please recharge your wallet first.</p>
                    )}
                  </div>
                )}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep("shipping")} className={cn("rounded-xl border px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold hover:text-gold-light")}>Back</button>
                  <button type="button" onClick={() => setStep("confirm")} disabled={!payValid}
                    className={cn("rounded-xl px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", !payValid ? "opacity-40 cursor-not-allowed" : "", light ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]" : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]")}>Review Order</button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className={cn("rounded-2xl border p-6 sm:p-8", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                  <div className="flex items-center gap-2 mb-6">
                    <Check size={16} className={light ? "text-sapphire" : "text-gold"} />
                    <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Order Review</h2>
                  </div>
                  <div className="space-y-4">
                    {items.map((item) => {
                      const key = `${item.product.id}::${item.color}::${item.size ?? ""}`;
                      const isMart = item.source === "mart";
                      const itemPrice = item.colorPrice ?? item.product.price;
                      return (
                        <div key={key} className="flex gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                            {item.colorImage ? (
                              <img
src={resolveImageUrl(item.colorImage) || ""}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                                <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 40%, ${item.colorHex}88, transparent 70%)` }} />
                              </>
                            )}
                            <span className={cn("absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold", light ? "bg-dark-900 text-white" : "bg-gold text-abyss")}>{item.qty}</span>
                          </div>
                          <div className="flex flex-1 justify-between">
                            <div>
                              <p className={cn("text-sm font-medium", light ? "text-dark-900" : "text-cream")}>{item.product.name}</p>
                              <p className={cn("text-[10px] mt-0.5 flex items-center gap-1.5", light ? "text-dark-400" : "text-cream-dim/50")}>
                                {item.color}{item.size ? ` · ${item.size}` : ""}
                                {isMart && deliveryMode === "express" && (
                                  <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[7px] font-bold uppercase", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                                    <Zap size={7} /> 20 Min
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-sm font-semibold tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(itemPrice * item.qty)}</p>
                              {isMart && deliveryMode === "express" && (
                                <p className={cn("text-[9px] font-medium", light ? "text-sapphire" : "text-gold")}>+{formatPrice(49)} express</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={cn("rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className={cn("text-[9px] font-semibold uppercase tracking-[0.2em] mb-2", light ? "text-dark-400" : "text-cream-dim/50")}>Shipping To</p>
                      <p className={cn("text-sm", light ? "text-dark-700" : "text-cream-dim")}>{ship.firstName} {ship.lastName}</p>
                      <p className={cn("text-xs mt-0.5", light ? "text-dark-400" : "text-cream-dim/40")}>{ship.address}{ship.apartment ? `, ${ship.apartment}` : ""}</p>
                      <p className={cn("text-xs", light ? "text-dark-400" : "text-cream-dim/40")}>{ship.city}{ship.state ? `, ${ship.state}` : ""} {ship.pincode}</p>
                    </div>
                    <div>
                      <p className={cn("text-[9px] font-semibold uppercase tracking-[0.2em] mb-2", light ? "text-dark-400" : "text-cream-dim/50")}>Payment</p>
                      <p className={cn("text-sm", light ? "text-dark-700" : "text-cream-dim")}>
                        {payMethod === "cod" && "Cash on Delivery"}
                        {payMethod === "upi_delivery" && "UPI on Delivery"}
                        {payMethod === "upi" && "Online UPI"}
                        {payMethod === "wallet_balance" && `Wallet (Balance: ₹${(user?.walletBalance ?? 0).toFixed(2)})`}
                      </p>
                      {hasMartItems && (
                        <p className={cn("text-xs mt-1 flex items-center gap-1", light ? "text-dark-400" : "text-cream-dim/40")}>
                          {deliveryMode === "express" ? <Zap size={10} /> : deliveryMode === "regular" ? <Truck size={10} /> : <Clock size={10} />}
                          Mart: {deliveryMode === "express" ? "Express (20 Min)" : deliveryMode === "regular" ? "Regular (3-5 Days)" : "Standard (1 Hour)"}
                        </p>
                      )}
                      <p className={cn("text-xs mt-0.5", light ? "text-dark-400" : "text-cream-dim/40")}>{ship.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep("payment")} className={cn("rounded-xl border px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold hover:text-gold-light")}>Back</button>
                  <button type="button" onClick={handlePlaceOrder} disabled={processing}
                    className={cn("flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300", processing ? "opacity-60 cursor-not-allowed" : "", light ? "bg-dark-900 text-white hover:bg-dark-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.25)]" : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]")}>
                    {processing ? (<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</>) : (<><Lock size={12} /> Place Order — {formatPrice(total)}</>)}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary sidebar */}
          <div className="lg:col-span-1">
            <div className={cn("sticky top-28 rounded-2xl border p-6", light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite")}>
              <h2 className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/60")}>Order Summary</h2>
              <div className="mt-4 max-h-48 space-y-3 overflow-y-auto">
                {items.map((item) => {
                  const key = `${item.product.id}::${item.color}::${item.size ?? ""}`;
                  const isMart = item.source === "mart";
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        {item.colorImage ? (
                          <img
                            src={resolveImageUrl(item.colorImage) || ""}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                            <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 40%, ${item.colorHex}88, transparent 70%)` }} />
                          </>
                        )}
                        <span className={cn("absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[7px] font-bold", light ? "bg-dark-900 text-white" : "bg-gold text-abyss")}>{item.qty}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", light ? "text-dark-900" : "text-cream")}>{item.product.name}</p>
                        <p className={cn("text-[9px] flex items-center gap-1", light ? "text-dark-400" : "text-cream-dim/40")}>
                          {item.color}{item.size ? ` · ${item.size}` : ""}
                          {isMart && deliveryMode === "express" && (
                            <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[6px] font-bold uppercase", light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold")}>
                              <Zap size={6} /> 20 Min
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice((item.colorPrice ?? item.product.price) * item.qty)}</p>
                        {isMart && deliveryMode === "express" && (
                          <p className={cn("text-[8px] font-medium", light ? "text-sapphire" : "text-gold")}>+₹49</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={cn("my-5 h-px", light ? "bg-dark-200" : "bg-white/10")} />
              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className={cn("text-xs", light ? "text-dark-500" : "text-cream-dim/60")}>Subtotal</span>
                  <span className={cn("text-xs font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-emerald-500">Card Discount ({discountPct}%)</span>
                    <span className="text-xs font-medium tabular-nums text-emerald-500">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {hasStoreItems && (
                  <div>
                    <div className="flex justify-between">
                      <span className={cn("text-xs", light ? "text-dark-500" : "text-cream-dim/60")}>Store Delivery</span>
                      <span className={cn("text-xs font-medium tabular-nums", (hasFreeDelivery || storeSubtotal >= 800) ? "text-emerald-500" : "", light ? "text-dark-900" : "text-cream")}>
                        {(hasFreeDelivery || storeSubtotal >= 800) ? "Free" : formatPrice(49)}
                      </span>
                    </div>
                    {hasFreeDelivery ? (
                      <p className="text-[9px] text-emerald-500">Free via card benefit</p>
                    ) : storeSubtotal >= 800 ? (
                      <p className="text-[9px] text-emerald-500">Free store delivery above ₹800</p>
                    ) : (
                      <p className="text-[9px] text-amber-500">Add {formatPrice(800 - storeSubtotal)} more to get free store delivery</p>
                    )}
                  </div>
                )}
                {hasMartItems && (
                  <div>
                    <div className="flex justify-between">
                      <span className={cn("text-xs", light ? "text-dark-500" : "text-cream-dim/60")}>Mart Delivery</span>
                      <span className={cn("text-xs font-medium tabular-nums", (hasFreeDelivery || martSubtotal >= 200) ? "text-emerald-500" : "", light ? "text-dark-900" : "text-cream")}>
                        {(hasFreeDelivery || martSubtotal >= 200) ? "Free" : formatPrice(49)}
                      </span>
                    </div>
                    {hasFreeDelivery ? (
                      <p className="text-[9px] text-emerald-500">Free via card benefit</p>
                    ) : martSubtotal >= 200 ? (
                      <p className="text-[9px] text-emerald-500">Free mart delivery above ₹200</p>
                    ) : (
                      <p className="text-[9px] text-amber-500">Add {formatPrice(200 - martSubtotal)} more to get free mart delivery</p>
                    )}
                  </div>
                )}
                {hasQuickDeliveryItems && (
                  <div className={cn("rounded-lg border p-3", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-onyx/50")}>
                    <p className={cn("text-[9px] font-semibold uppercase tracking-[0.2em] mb-2", light ? "text-dark-500" : "text-cream-dim/60")}>
                      Mart Delivery
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("standard")}
                        className={cn(
                          "flex flex-1 items-center gap-2 rounded-xl border-2 px-3 py-3 transition-all duration-300",
                          deliveryMode === "standard"
                            ? light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5"
                            : light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <Clock size={14} className={deliveryMode === "standard" ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50")} />
                        <div className="text-left">
                          <p className={cn("text-[10px] font-semibold", deliveryMode === "standard" ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-500" : "text-cream-dim/60"))}>
                            1 Hour
                          </p>
                          <p className={cn("text-[8px]", light ? "text-dark-400" : "text-cream-dim/40")}>Standard</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("express")}
                        className={cn(
                          "flex flex-1 items-center gap-2 rounded-xl border-2 px-3 py-3 transition-all duration-300",
                          deliveryMode === "express"
                            ? light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5"
                            : light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <Zap size={14} className={deliveryMode === "express" ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50")} />
                        <div className="text-left">
                          <p className={cn("text-[10px] font-semibold", deliveryMode === "express" ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-500" : "text-cream-dim/60"))}>
                            20 Min
                          </p>
                          <p className={cn("text-[8px]", deliveryMode === "express" ? (light ? "text-sapphire font-medium" : "text-gold-light font-medium") : (light ? "text-dark-400" : "text-cream-dim/40"))}>
                            Express +₹49
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("regular")}
                        className={cn(
                          "flex flex-1 items-center gap-2 rounded-xl border-2 px-3 py-3 transition-all duration-300",
                          deliveryMode === "regular"
                            ? light ? "border-sapphire bg-sapphire/5" : "border-gold bg-gold/5"
                            : light ? "border-dark-200 hover:border-dark-300" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <Truck size={14} className={deliveryMode === "regular" ? (light ? "text-sapphire" : "text-gold") : (light ? "text-dark-400" : "text-cream-dim/50")} />
                        <div className="text-left">
                          <p className={cn("text-[10px] font-semibold", deliveryMode === "regular" ? (light ? "text-dark-900" : "text-cream") : (light ? "text-dark-500" : "text-cream-dim/60"))}>
                            3-5 Days
                          </p>
                          <p className={cn("text-[8px]", deliveryMode === "regular" ? (light ? "text-sapphire font-medium" : "text-gold-light font-medium") : (light ? "text-dark-400" : "text-cream-dim/40"))}>
                            Regular
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className={cn("my-4 h-px", light ? "bg-dark-200" : "bg-white/10")} />
              {hasMartItems && deliveryMode === "express" && (
                <div className="mb-3 flex items-center gap-1.5">
                  <Zap size={10} className={light ? "text-sapphire" : "text-gold"} />
                  <span className={cn("text-[9px] font-medium", light ? "text-sapphire" : "text-gold")}>
                    Express for mart items — +{formatPrice(49)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className={cn("text-xs font-semibold uppercase tracking-[0.2em]", light ? "text-dark-700" : "text-cream-dim")}>Total</span>
                <span className={cn("text-lg font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(total)}</span>
              </div>
              <div className={cn("mt-5 grid grid-cols-3 gap-2 rounded-xl border p-3", light ? "border-dark-100 bg-dark-50/50" : "border-white/5 bg-onyx/50")}>
                {[{ icon: <Lock size={13} />, label: "Secure" }, { icon: <Truck size={13} />, label: "Free Del ₹800+ / ₹200+" }, { icon: <Shield size={13} />, label: "Protected" }].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-1.5 text-center">
                    <span className={cn(light ? "text-sapphire" : "text-gold")}>{b.icon}</span>
                    <span className={cn("text-[7px] font-semibold uppercase tracking-[0.15em]", light ? "text-dark-500" : "text-cream-dim/60")}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <UpiPaymentModal
        open={upiModal}
        onClose={() => setUpiModal(false)}
        amount={upiAmount}
        pendingOrderData={pendingOrderData!}
        onSuccess={(createdIds: string) => { setOrderId(createdIds); setUpiModal(false); clear(); setPlaced(true); }}
      />
    </SiteLayout>
  );
}
