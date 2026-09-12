"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, ChevronDown, ChevronUp, Clock, Check, Truck, MapPin, X, Loader2, Shield, RotateCcw, Star } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";
import SignaturePad from "@/components/SignaturePad";
import SiteLayout from "@/components/layout/SiteLayout";
import { useDualCamera } from "@/lib/useDualCamera";
import { resolveImageUrl } from "@/lib/imageUrl";

interface OrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  colorHex?: string;
  size?: string;
  source?: string;
  status?: string;
  image?: string | null;
}

interface Order {
  id: string;
  orderId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  source?: string;
  deliveryMode?: string;
  createdAt: string;
  cancelledAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  returnRequestedAt?: string;
  signatureData?: string;
  signedAt?: string;
  securityPhotos?: string[];
}

const ONLINE_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"];

const TRACKING_STEPS_BASE = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "packed", label: "Packed", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

function getTrackingSteps(paymentMethod?: string) {
  if (paymentMethod && ONLINE_METHODS.includes(paymentMethod)) {
    return [
      TRACKING_STEPS_BASE[0],
      { key: "payment_approved", label: "Payment Approved", icon: Shield },
      TRACKING_STEPS_BASE[1],
      TRACKING_STEPS_BASE[2],
      TRACKING_STEPS_BASE[3],
      TRACKING_STEPS_BASE[4],
    ];
  }
  return TRACKING_STEPS_BASE;
}

const CANCEL_STATUSES = ["pending", "confirmed"];

/* Store orders show "shipped" instead of "packed"; mart keeps "packed". */
function displayStatus(status: string, isMart: boolean): string {
  if (status === "packed" && !isMart) return "shipped";
  return status;
}

/* Catalogs expose ids prefixed with "db-"; the DB stores them without. */
function normalizePid(pid?: string): string {
  if (!pid) return "";
  return pid.startsWith("db-") ? pid.slice(3) : pid;
}

function getTrackingIndex(status: string, paymentMethod?: string): number {
  if (status === "cancelled" || status === "returned" || status === "return_requested" || status === "return_approved" || status === "return_rejected") return -1;
  const steps = getTrackingSteps(paymentMethod);
  if (status === "confirmed" && paymentMethod && ONLINE_METHODS.includes(paymentMethod)) {
    return 2;
  }
  if (status === "confirmed" && !(paymentMethod && ONLINE_METHODS.includes(paymentMethod))) {
    return 1;
  }
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const statusColors: Record<string, string> = {
  pending: "text-amber-400",
  confirmed: "text-sky-400",
  packed: "text-violet-400",
  out_for_delivery: "text-orange-400",
  delivered: "text-emerald-400",
  cancelled: "text-red-400",
  return_requested: "text-amber-400",
  return_approved: "text-teal-400",
  return_rejected: "text-rose-400",
  returned: "text-fuchsia-400",
};

const statusBg: Record<string, string> = {
  pending: "bg-amber-500/10 border-amber-500/20",
  confirmed: "bg-sky-500/10 border-sky-500/20",
  packed: "bg-violet-500/10 border-violet-500/20",
  out_for_delivery: "bg-orange-500/10 border-orange-500/20",
  delivered: "bg-emerald-500/10 border-emerald-500/20",
  cancelled: "bg-red-500/10 border-red-500/20",
  return_requested: "bg-amber-500/10 border-amber-500/20",
  return_approved: "bg-teal-500/10 border-teal-500/20",
  return_rejected: "bg-rose-500/10 border-rose-500/20",
  returned: "bg-fuchsia-500/10 border-fuchsia-500/20",
};

const statusGradients: Record<string, string> = {
  pending: "from-amber-500/15 to-amber-500/5",
  confirmed: "from-sky-500/15 to-sky-500/5",
  packed: "from-violet-500/15 to-violet-500/5",
  out_for_delivery: "from-orange-500/15 to-orange-500/5",
  delivered: "from-emerald-500/15 to-emerald-500/5",
  cancelled: "from-red-500/15 to-red-500/5",
  return_requested: "from-amber-500/15 to-amber-500/5",
  return_approved: "from-teal-500/15 to-teal-500/5",
  return_rejected: "from-rose-500/15 to-rose-500/5",
  returned: "from-fuchsia-500/15 to-fuchsia-500/5",
};

const statusBorders: Record<string, string> = {
  pending: "border-amber-500/25",
  confirmed: "border-sky-500/25",
  packed: "border-violet-500/25",
  out_for_delivery: "border-orange-500/25",
  delivered: "border-emerald-500/25",
  cancelled: "border-red-500/25",
  return_requested: "border-amber-500/25",
  return_approved: "border-teal-500/25",
  return_rejected: "border-rose-500/25",
  returned: "border-fuchsia-500/25",
};

function ReviewForm({ item, light, onSubmitted }: { item: OrderItem; light: boolean; onSubmitted?: (review: any) => void }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast("Please select a star rating", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({ productId: item.productId, rating, body }),
      });
      setDone(true);
      onSubmitted?.(res);
      toast("Review submitted — thank you!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit review", "error");
    }
    setSubmitting(false);
  };

  const imgSrc = resolveImageUrl(item.image);

  return (
    <div className={cn("rounded-xl p-3", light ? "border border-dark-100 bg-white" : "border border-white/5 bg-graphite")}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg", light ? "bg-dark-100" : "bg-dark-800")}>
          {imgSrc ? (
            <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Package size={16} className={light ? "text-dark-300" : "text-dark-500"} />
          )}
        </div>
        <p className={cn("min-w-0 flex-1 truncate text-xs font-medium", light ? "text-dark-900" : "text-cream")}>{item.name}</p>
      </div>
      <div className={cn("mt-3 flex items-center gap-1", done && "opacity-50")}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={done}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="disabled:cursor-not-allowed"
            aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
          >
            <Star
              size={18}
              className={cn("transition-colors", (hover || rating) >= s ? (light ? "text-amber-500" : "text-gold") : light ? "text-dark-200" : "text-dark-600")}
              fill={(hover || rating) >= s ? "currentColor" : "none"}
            />
          </button>
        ))}
        <span className={cn("ml-2 text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
          {rating ? `${rating}/5` : "Tap to rate"}
        </span>
      </div>
      <textarea
        value={body}
        disabled={done}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience with this product (optional)"
        rows={2}
        className={cn("mt-3 w-full rounded-lg border px-3 py-2 text-xs outline-none disabled:opacity-50", light ? "border-dark-200 bg-white text-dark-900 placeholder:text-dark-300" : "border-white/10 bg-onyx text-cream placeholder:text-dark-500")}
      />
      <div className="mt-2 flex justify-end">
        {done ? (
          <span className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider", light ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/10 text-emerald-400")}>
            <Check size={12} /> Review Submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", submitting ? "opacity-50" : "", light ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-gold text-abyss hover:brightness-110")}
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : "Submit Review"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item, review, light }: { item: OrderItem; review: any; light: boolean }) {
  const imgSrc = resolveImageUrl(item.image);
  const rating = Number(review?.rating) || 0;
  return (
    <div className={cn("rounded-xl p-3", light ? "border border-dark-100 bg-white" : "border border-white/5 bg-graphite")}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg", light ? "bg-dark-100" : "bg-dark-800")}>
          {imgSrc ? (
            <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Package size={16} className={light ? "text-dark-300" : "text-dark-500"} />
          )}
        </div>
        <p className={cn("min-w-0 flex-1 truncate text-xs font-medium", light ? "text-dark-900" : "text-cream")}>{item.name}</p>
      </div>
      <div className={cn("mt-3 flex items-center gap-1")}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            fill={s <= rating ? "currentColor" : "none"}
            className={cn(s <= rating ? (light ? "text-amber-500" : "text-gold") : light ? "text-dark-200" : "text-dark-600")}
          />
        ))}
        <span className={cn("ml-2 text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
          {rating}/5
          {review?.createdAt ? ` · ${new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </span>
      </div>
      {review?.comment ? (
        <p className={cn("mt-2 text-xs leading-relaxed", light ? "text-dark-600" : "text-cream-dim/80")}>{review.comment}</p>
      ) : (
        <p className={cn("mt-2 text-[10px] italic", light ? "text-dark-300" : "text-dark-500")}>No written comment</p>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { user } = useAuth();
  const { toast } = useToast();
  const { capture: captureDualPhotos } = useDualCamera();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const [returningId, setReturningId] = useState<string | null>(null);
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");

  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [needsSignatureOrderId, setNeedsSignatureOrderId] = useState<string | null>(null);
  const [submittingSignature, setSubmittingSignature] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [myReviews, setMyReviews] = useState<Record<string, any>>({});

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch("/orders/my");
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      const deliveredPids = [
        ...new Set(
          list
            .filter((o) => o.status === "delivered")
            .flatMap((o) => (o.items || []).map((it: any) => it.productId).filter(Boolean))
        ),
      ];
      if (deliveredPids.length > 0) {
        try {
          const reviews = await apiFetch(`/reviews/mine?productIds=${encodeURIComponent(deliveredPids.join(","))}`);
          if (Array.isArray(reviews)) {
            setMyReviews((prev) => ({
              ...prev,
              ...Object.fromEntries(reviews.map((r: any) => [normalizePid(r.productId), r])),
            }));
          }
        } catch {
          /* ignore — review state is best-effort */
        }
      }
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const res = await apiFetch(`/orders/${orderId}/cancel`, { method: "PUT" });
      if (res.error) {
        toast(res.error, "error");
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? res : o));
      }
    } catch {
      toast("Failed to cancel order", "error");
    }
    setCancellingId(null);
    setConfirmCancelId(null);
  };

  const handleReturnRequest = async (orderId: string) => {
    setReturningId(orderId);
    try {
      const res = await apiFetch(`/orders/${orderId}/return-request`, {
        method: "POST",
        body: JSON.stringify({ reason: returnReason || undefined }),
      });
      if (res.error) {
        toast(res.error, "error");
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? res : o));
        setConfirmReturnId(null);
        setReturnReason("");
        toast("Return request submitted", "success");
      }
    } catch {
      toast("Failed to request return", "error");
    }
    setReturningId(null);
  };

  const handleVerifyDelivery = async (orderId: string) => {
    setVerifyingOtp(true);
    try {
      const res = await apiFetch(`/orders/${orderId}/verify-delivery`, {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      if (res.needsSignature) {
        setOtpOrderId(null);
        setOtpCode("");
        setNeedsSignatureOrderId(orderId);
        toast(res.message || "OTP verified. Please provide your signature.", "success");
      } else if (res.error) {
        toast(res.error, "error");
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? res : o));
        setOtpOrderId(null);
        setOtpCode("");
        toast("Delivery confirmed!", "success");
      }
    } catch {
      toast("Failed to verify delivery", "error");
    }
    setVerifyingOtp(false);
  };

  const handleSubmitSignature = async (orderId: string, signatureData: string) => {
    setSubmittingSignature(true);
    try {
      const photos = await captureDualPhotos();
      const securityPhotos = [...photos.front, ...photos.back];
      const res = await apiFetch(`/orders/${orderId}/submit-signature`, {
        method: "POST",
        body: JSON.stringify({ signatureData, securityPhotos: securityPhotos.length > 0 ? securityPhotos : undefined }),
      });
      setOrders((prev) => prev.map((o) => o.id === orderId ? res : o));
      setNeedsSignatureOrderId(null);
      toast("Delivery confirmed with signature!", "success");
    } catch {
      toast("Failed to submit signature", "error");
    }
    setSubmittingSignature(false);
  };

  const isWithinReturnWindow = useCallback((order: Order) => {
    if (order.source === "mart" || order.status !== "delivered" || !order.deliveredAt) return false;
    return Date.now() - new Date(order.deliveredAt).getTime() <= 2 * 60 * 60 * 1000;
  }, []);

  if (!user) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Please sign in to view your orders
            </p>
            <Link href="/login" className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}>
              Sign In
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen pb-20">
        <div className="mx-auto max-w-4xl px-5 pt-8 sm:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn("font-display text-2xl font-medium tracking-wide sm:text-3xl", light ? "text-dark-900" : "text-cream")}>
                My Orders
              </h1>
              <p className={cn("mt-1 text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>
                {orders.length} order{orders.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>

          <div className={cn("my-6 h-px", light ? "bg-dark-200" : "bg-white/10")} />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-dark-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className={cn("mx-auto mb-4", light ? "text-dark-300" : "text-cream-dim/30")} />
              <p className={cn("text-sm", light ? "text-dark-400" : "text-cream-dim/50")}>No orders yet</p>
              <Link href="/store" className={cn("mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const trackIdx = getTrackingIndex(order.status, order.paymentMethod);
                const isMart = order.source === "mart";
                const isQuickDelivery = isMart;
                const canCancel = !isQuickDelivery && CANCEL_STATUSES.includes(order.status);
                const returnWindow = isWithinReturnWindow(order);
                const primaryName = order.items?.[0]?.name || "Order";
                const mainTitle = order.items.length > 1 ? `${primaryName} +${order.items.length - 1}` : primaryName;

                const steps = getTrackingSteps(order.paymentMethod);

                const reviewItems = (order.items || []).filter((it): it is OrderItem & { productId: string } => !!it.productId);
                const reviewedPids = reviewItems.filter((it) => myReviews[normalizePid(it.productId)]).map((it) => it.productId);
                const allReviewed = reviewItems.length > 0 && reviewedPids.length === reviewItems.length;

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-gradient-to-r transition-all duration-300",
                      statusGradients[order.status] || "from-dark-900/40 to-dark-900/20",
                      statusBorders[order.status] || "border-dark-800/40"
                    )}
                  >
                    {/* Collapsed row — payout style */}
                    <div className="flex items-center gap-3 px-4 py-3.5 text-left sm:px-5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className={cn("flex min-w-0 flex-1 items-center gap-3 text-left", light ? "hover:brightness-95" : "hover:brightness-110")}
                      >
                        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br", statusGradients[order.status] || "from-dark-900/40 to-dark-900/20")}>
                          {(() => {
                            const rowImg = order.items?.find((i) => i.image)?.image;
                            const src = resolveImageUrl(rowImg);
                            return src ? (
                              <img src={src} alt={order.items?.[0]?.name || "Order"} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <Package size={18} className={statusColors[order.status]} />
                            );
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusBg[order.status], statusColors[order.status])}>
                              {displayStatus(order.status, isMart).replace(/_/g, " ")}
                            </span>
                            <span className={cn("truncate text-sm font-semibold", light ? "text-dark-900" : "text-cream")}>
                              {mainTitle}
                            </span>
                            <span className={cn("hidden text-[10px] sm:inline", light ? "text-dark-400" : "text-dark-500")}>
                              &middot; {isMart ? "Mart" : "Store"}
                            </span>
                            {isMart && order.deliveryMode === "express" && (
                              <span className="hidden text-[10px] text-emerald-400/80 sm:inline">&middot; 10 min</span>
                            )}
                          </div>
                          <p className={cn("mt-1 truncate text-xs", light ? "text-dark-400" : "text-dark-400")}>
                            #{order.orderId || order.id.slice(0, 8).toUpperCase()}
                            <span className={cn("mx-1.5", light ? "text-dark-300" : "text-dark-600")}>&middot;</span>
                            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            <span className={cn("mx-1.5", light ? "text-dark-300" : "text-dark-600")}>&middot;</span>
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={cn("text-base font-bold tabular-nums sm:text-lg", light ? "text-dark-900" : "text-cream")}>
                            {formatPrice(order.totalAmount)}
                          </div>
                          <div className={cn("mt-0.5 text-[10px]", light ? "text-dark-400" : "text-dark-500")}>Total</div>
                        </div>
                      </button>
                      <span className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp size={16} className={cn("shrink-0", light ? "text-dark-400" : "text-dark-400")} />
                        ) : (
                          <ChevronDown size={16} className={cn("shrink-0", light ? "text-dark-400" : "text-dark-400")} />
                        )}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className={cn("border-t px-4 sm:px-6 py-5 space-y-5", light ? "border-dark-100" : "border-white/5")}>
                        {/* Tracking stepper */}
                        {trackIdx >= 0 && (
                          <div>
                            <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                              Order Tracking
                            </p>
                            <div className="flex items-start gap-0 overflow-x-auto">
                              {steps.map((step, i) => {
                                const isCompleted = i <= trackIdx;
                                const isCurrent = i === trackIdx;
                                const Icon = step.icon;
                                return (
                                  <div key={step.key} className="flex flex-1 flex-col items-center relative">
                                    {i > 0 && (
                                      <div className={cn("absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2", isCompleted ? "bg-emerald-500" : light ? "bg-dark-200" : "bg-white/10")} />
                                    )}
                                    <div className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all", isCompleted ? "border-emerald-500 bg-emerald-500/10" : isCurrent ? "border-emerald-500 bg-emerald-500/10 animate-pulse" : light ? "border-dark-200 bg-white" : "border-white/10 bg-graphite")}>
                                      <Icon size={14} className={cn(isCompleted ? "text-emerald-500" : light ? "text-dark-400" : "text-cream-dim/40")} />
                                    </div>
                                    <p className={cn("mt-2 text-center text-[8px] font-medium leading-tight", isCompleted ? "text-emerald-500" : light ? "text-dark-400" : "text-cream-dim/40")}>
                                      {step.key === "packed" && !isMart ? "Shipped" : step.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Cancelled notice */}
                        {order.status === "cancelled" && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                            <p className="text-xs text-red-400 font-medium">
                              This order has been cancelled{order.cancelledAt ? ` on ${new Date(order.cancelledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
                            </p>
                          </div>
                        )}

                        {/* Return requested notice */}
                        {order.status === "return_requested" && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                            <p className="text-xs text-amber-400 font-medium">
                              Return request pending approval{order.returnRequestedAt ? ` — requested ${new Date(order.returnRequestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
                            </p>
                          </div>
                        )}

                        {/* Return approved notice */}
                        {order.status === "return_approved" && (
                          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
                            <p className="text-xs text-teal-400 font-medium">
                              Return request approved{order.returnedAt ? ` on ${new Date(order.returnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}. Pickup will be done soon, after which your refund will be processed.
                            </p>
                          </div>
                        )}

                        {/* Return rejected notice */}
                        {order.status === "return_rejected" && (
                          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                            <p className="text-xs text-rose-400 font-medium">
                              Return request rejected{order.returnRequestedAt ? ` on ${new Date(order.returnRequestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}. Contact support if you believe this is a mistake.
                            </p>
                          </div>
                        )}

                        {/* OTP verification panel */}
                        {order.status === "out_for_delivery" && (
                          <div className={cn("rounded-xl border px-4 py-4", light ? "border-sapphire/30 bg-sapphire/5" : "border-gold/30 bg-gold/5")}>
                            {needsSignatureOrderId === order.id ? (
                              <SignaturePad
                                light={light}
                                onSign={(data) => handleSubmitSignature(order.id, data)}
                                onClear={() => {}}
                              />
                            ) : otpOrderId === order.id ? (
                              <div className="space-y-3">
                                <p className={cn("text-xs font-medium", light ? "text-dark-900" : "text-cream")}>
                                  Enter the OTP sent to your email to confirm delivery:
                                </p>
                                <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/60")}>
                                  Not received? Check your Spam, Promotions, or All Mail folders.
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="6-digit OTP"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                    className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono tracking-[0.3em]", light ? "border-dark-200 bg-white text-dark-900" : "border-white/10 bg-onyx text-cream")}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyDelivery(order.id)}
                                    disabled={verifyingOtp || otpCode.length !== 6}
                                    className={cn("rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all", verifyingOtp || otpCode.length !== 6 ? "opacity-40 cursor-not-allowed" : "", light ? "bg-sapphire text-white" : "bg-gold text-abyss")}
                                  >
                                    {verifyingOtp ? <Loader2 size={14} className="animate-spin" /> : "Verify"}
                                  </button>
                                  <button type="button" onClick={() => { setOtpOrderId(null); setOtpCode(""); }} className={cn("rounded-xl px-3 py-2.5 border transition-all", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim")}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Shield size={18} className={cn(light ? "text-sapphire" : "text-gold")} />
                                <div className="flex-1">
                                  <p className={cn("text-xs font-medium", light ? "text-dark-900" : "text-cream")}>Delivery verification required</p>
                                  <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>Click to request OTP and confirm delivery</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOtpOrderId(order.id)}
                                  className={cn("rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", light ? "bg-sapphire text-white" : "bg-gold text-abyss")}
                                >
                                  Get OTP
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Items */}
                        <div>
                          <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                            Items
                          </p>
                          <div className="space-y-2.5">
                            {order.items.map((item, idx) => {
                              const itemStatus = item.status || "pending";
                              const imgSrc = resolveImageUrl(item.image);
                              return (
                                <div key={idx} className={cn("flex items-center gap-4 rounded-xl px-4 py-4 transition-colors", itemStatus === "cancelled" ? (light ? "bg-red-50/80 opacity-60" : "bg-red-500/5 opacity-60") : light ? "bg-dark-50/80" : "bg-onyx/50")}>
                                  <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl", light ? "bg-dark-100" : "bg-graphite")}>
                                    {imgSrc ? (
                                      <img
                                        src={imgSrc}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <Package size={22} className={cn(light ? "text-dark-300" : "text-dark-500")} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className={cn("truncate text-sm font-medium", itemStatus === "cancelled" && "line-through", light ? "text-dark-900" : "text-cream")}>{item.name}</p>
                                      {isMart && (
                                        <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">Mart</span>
                                      )}
                                      {isQuickDelivery && itemStatus !== "cancelled" && itemStatus !== "delivered" && (
                                        <span className={cn("whitespace-nowrap text-[9px]", light ? "text-dark-400" : "text-cream-dim/40")}>Combined</span>
                                      )}
                                    </div>
                                    <p className={cn("mt-1 text-xs", light ? "text-dark-500" : "text-cream-dim/60")}>
                                      Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}
                                    </p>
                                  </div>
                                  <p className={cn("shrink-0 text-base font-bold tabular-nums sm:text-lg", light ? "text-dark-900" : "text-cream")}>
                                    {formatPrice(item.price * item.quantity)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Payment</p>
                            <p className={cn("mt-1 text-xs font-medium", light ? "text-dark-900" : "text-cream")}>{order.paymentMethod || "N/A"}</p>
                            <p className={cn("text-[10px] mt-0.5", light ? "text-dark-400" : "text-cream-dim/50")}>{order.paymentStatus || "Pending"}</p>
                          </div>
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Delivery</p>
                            <p className={cn("mt-1 text-xs font-medium", light ? "text-dark-900" : "text-cream")}>
                              {order.deliveryMode === "express" ? "20 Min Express" : isQuickDelivery ? "1 Hour Standard" : "Standard"}
                            </p>
                          </div>
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Total</p>
                            <p className={cn("mt-1 text-lg font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(order.totalAmount)}</p>
                          </div>
                        </div>

                        {/* Cancel order button */}
                        {canCancel && (
                          <div>
                            {confirmCancelId === order.id ? (
                              <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center", light ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/5")}>
                                <p className={cn("flex-1 text-xs", light ? "text-red-600" : "text-red-400")}>
                                  Are you sure? This action cannot be undone.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(order.id)}
                                  disabled={cancellingId === order.id}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", cancellingId === order.id ? "bg-red-500/20 text-red-400" : "bg-red-500 text-white hover:bg-red-600")}
                                >
                                  {cancellingId === order.id ? <Loader2 size={12} className="animate-spin" /> : "Yes, Cancel"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all", light ? "border-dark-200 text-dark-500 hover:bg-dark-50" : "border-white/10 text-cream-dim hover:bg-white/5")}
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(order.id)}
                                className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all", light ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/5")}
                              >
                                <X size={12} /> Cancel Order
                              </button>
                            )}
                          </div>
                        )}

                        {/* Return request (store only, within 2h) */}
                        {returnWindow && order.status === "delivered" && (
                          <div>
                            {confirmReturnId === order.id ? (
                              <div className={cn("rounded-xl border px-4 py-4 space-y-3", light ? "border-amber-200 bg-amber-50" : "border-amber-500/20 bg-amber-500/5")}>
                                <p className={cn("text-xs font-medium", light ? "text-amber-700" : "text-amber-400")}>
                                  Request return — this must be approved by the owner
                                </p>
                                <input
                                  type="text"
                                  placeholder="Reason for return (optional)"
                                  value={returnReason}
                                  onChange={(e) => setReturnReason(e.target.value)}
                                  className={cn("w-full rounded-lg border px-3 py-2 text-xs", light ? "border-dark-200 bg-white text-dark-900" : "border-white/10 bg-onyx text-cream")}
                                />
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => handleReturnRequest(order.id)} disabled={returningId === order.id}
                                    className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", light ? "bg-amber-500 text-white" : "bg-amber-500 text-abyss")}>
                                    {returningId === order.id ? <Loader2 size={12} className="animate-spin" /> : "Submit Request"}
                                  </button>
                                  <button type="button" onClick={() => { setConfirmReturnId(null); setReturnReason(""); }}
                                    className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim")}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmReturnId(order.id)}
                                className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all", light ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-amber-500/20 text-amber-400 hover:bg-amber-500/5")}
                              >
                                <RotateCcw size={12} /> Return within 12 hours
                              </button>
                            )}
                          </div>
                        )}

                        {/* Write a review (delivered only) */}
                        {order.status === "delivered" && (
                          <div>
                            {reviewOrderId === order.id ? (
                              <div className={cn("space-y-4 rounded-xl border p-4", light ? "border-sky-200 bg-sky-50/50" : "border-gold/20 bg-onyx/50")}>
                                <div className="flex items-center justify-between">
                                  <p className={cn("text-xs font-semibold", light ? "text-dark-900" : "text-cream")}>
                                    {allReviewed ? "Your Reviews" : "Write a Review"}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setReviewOrderId(null)}
                                    className={cn("flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider transition-colors", light ? "text-dark-400 hover:text-dark-600" : "text-cream-dim/60 hover:text-cream")}
                                  >
                                    <X size={12} /> Close
                                  </button>
                                </div>
                                <p className={cn("text-[10px]", light ? "text-dark-400" : "text-cream-dim/50")}>
                                  {allReviewed
                                    ? "These are the reviews you added for this order."
                                    : "Rate the products from this order — your reviews help other customers."}
                                </p>
                                <div className="space-y-3">
                                  {reviewItems.map((item, i) =>
                                    myReviews[normalizePid(item.productId)] ? (
                                      <ReviewCard key={`${order.id}-${i}`} item={item} review={myReviews[normalizePid(item.productId)]} light={light} />
                                    ) : (
                                      <ReviewForm
                                        key={`${order.id}-${i}`}
                                        item={item}
                                        light={light}
                                        onSubmitted={(review) =>
                                          setMyReviews((prev) => ({ ...prev, [normalizePid(item.productId)]: review }))
                                        }
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReviewOrderId(order.id)}
                                className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all", light ? "border-sky-200 text-sky-600 hover:bg-sky-50" : "border-gold/30 text-gold hover:bg-gold/5")}
                              >
                                <Star size={12} /> {allReviewed ? "View Review" : "Write a Review"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
