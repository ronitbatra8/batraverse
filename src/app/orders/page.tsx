"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Package, ChevronDown, ChevronUp, Clock, Check, Truck, MapPin, X, Loader2, Shield, RotateCcw } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";
import SignaturePad from "@/components/SignaturePad";
import SiteLayout from "@/components/layout/SiteLayout";
import { useDualCamera } from "@/lib/useDualCamera";

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

function getTrackingIndex(status: string, paymentMethod?: string): number {
  if (status === "cancelled" || status === "returned" || status === "return_requested") return -1;
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
  returned: "bg-fuchsia-500/10 border-fuchsia-500/20",
};

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
  const [confirmItemCancel, setConfirmItemCancel] = useState<{ orderId: string; itemIdx: number } | null>(null);
  const [cancellingItem, setCancellingItem] = useState<string | null>(null);

  const [returningId, setReturningId] = useState<string | null>(null);
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");

  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [needsSignatureOrderId, setNeedsSignatureOrderId] = useState<string | null>(null);
  const [submittingSignature, setSubmittingSignature] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch("/orders/my");
      setOrders(Array.isArray(data) ? data : []);
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

  const handleCancelItem = async (orderId: string, itemIdx: number) => {
    setCancellingItem(`${orderId}-${itemIdx}`);
    try {
      const res = await apiFetch(`/orders/${orderId}/items/${itemIdx}/cancel`, { method: "PUT" });
      if (res.error) {
        toast(res.error, "error");
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? res : o));
      }
    } catch {
      toast("Failed to cancel item", "error");
    }
    setCancellingItem(null);
    setConfirmItemCancel(null);
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
    if (order.source === "mart" || order.source === "mediverse" || order.status !== "delivered" || !order.deliveredAt) return false;
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
                const isMediverse = order.source === "mediverse";
                const isQuickDelivery = isMart || isMediverse;
                const canCancel = !isQuickDelivery && CANCEL_STATUSES.includes(order.status);
                const returnWindow = isWithinReturnWindow(order);

                const steps = getTrackingSteps(order.paymentMethod);

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition-all duration-300",
                      light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                    )}
                  >
                    {/* Order header */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className={cn("w-full px-4 sm:px-6 py-4 flex items-center gap-4 text-left transition-colors", light ? "hover:bg-dark-50/50" : "hover:bg-white/[0.02]")}
                    >
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", light ? "bg-dark-100" : "bg-onyx")}>
                        <Package size={18} className={cn(statusColors[order.status])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("font-mono text-sm font-medium", light ? "text-dark-900" : "text-cream")}>
                            #{order.orderId || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusBg[order.status], statusColors[order.status])}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                          {isMart && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Mart
                            </span>
                          )}
                          {isMediverse && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              Mediverse
                            </span>
                          )}
                          {!isMart && !isMediverse && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold/80 border border-gold/20">
                              Store
                            </span>
                          )}
                        </div>
                        <div className={cn("mt-1 flex items-center gap-3 text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>
                          <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span>&middot;</span>
                          <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                          <span>&middot;</span>
                          <span className="font-medium tabular-nums">{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className={cn(light ? "text-dark-400" : "text-cream-dim/50")} /> : <ChevronDown size={16} className={cn(light ? "text-dark-400" : "text-cream-dim/50")} />}
                    </button>

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
                                      {step.label}
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
                          <div className="space-y-2">
                            {order.items.map((item, idx) => {
                              const itemStatus = item.status || "pending";
                              const isStore = item.source !== "mart" && item.source !== "mediverse";
                              const canCancelItem = isQuickDelivery ? false : isStore && ["pending", "confirmed"].includes(itemStatus);
                              const itemStatusColors: Record<string, string> = {
                                pending: light ? "text-amber-600 bg-amber-50 border-amber-200" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                confirmed: light ? "text-sky-600 bg-sky-50 border-sky-200" : "text-sky-400 bg-sky-500/10 border-sky-500/20",
                                packed: light ? "text-violet-600 bg-violet-50 border-violet-200" : "text-violet-400 bg-violet-500/10 border-violet-500/20",
                                out_for_delivery: light ? "text-orange-600 bg-orange-50 border-orange-200" : "text-orange-400 bg-orange-500/10 border-orange-500/20",
                                delivered: light ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                cancelled: light ? "text-red-600 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20",
                                return_requested: light ? "text-amber-600 bg-amber-50 border-amber-200" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                returned: light ? "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200" : "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
                              };
                              return (
                                <div key={idx} className={cn("flex items-center justify-between rounded-xl px-4 py-3", itemStatus === "cancelled" ? (light ? "bg-red-50/80 opacity-60" : "bg-red-500/5 opacity-60") : light ? "bg-dark-50/80" : "bg-onyx/50")}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className={cn("text-xs font-medium truncate", itemStatus === "cancelled" && "line-through", light ? "text-dark-900" : "text-cream")}>{item.name}</p>
                                      <span className={cn("inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border", itemStatusColors[itemStatus] || "")}>
                                        {itemStatus.replace(/_/g, " ")}
                                      </span>
                                      {isMart && (
                                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Mart</span>
                                      )}
                                      {isMediverse && (
                                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">Mediverse</span>
                                      )}
                                    </div>
                                    <p className={cn("text-[10px] mt-0.5", light ? "text-dark-400" : "text-cream-dim/50")}>
                                      Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className={cn("text-xs font-medium tabular-nums", light ? "text-dark-900" : "text-cream")}>
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                    {canCancelItem && (
                                      confirmItemCancel?.orderId === order.id && confirmItemCancel?.itemIdx === idx ? (
                                        <div className="flex items-center gap-1.5">
                                          <button type="button" onClick={() => handleCancelItem(order.id, idx)} disabled={cancellingItem === `${order.id}-${idx}`} className={cn("rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-all", cancellingItem === `${order.id}-${idx}` ? "bg-red-500/20 text-red-400" : "bg-red-500 text-white hover:bg-red-600")}>
                                            {cancellingItem === `${order.id}-${idx}` ? <Loader2 size={10} className="animate-spin" /> : "Yes"}
                                          </button>
                                          <button type="button" onClick={() => setConfirmItemCancel(null)} className={cn("rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim")}>No</button>
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => setConfirmItemCancel({ orderId: order.id, itemIdx: idx })} className={cn("rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all", light ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/5")}>
                                          <X size={10} className="inline" /> Cancel
                                        </button>
                                      )
                                    )}
                                    {isQuickDelivery && itemStatus !== "cancelled" && itemStatus !== "delivered" && (
                                      <span className={cn("text-[9px]", light ? "text-dark-400" : "text-cream-dim/40")}>Combined</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Shipping</p>
                            <p className={cn("mt-1 text-xs font-medium", light ? "text-dark-900" : "text-cream")}>{order.shippingName}</p>
                            <p className={cn("text-[10px] mt-0.5 leading-relaxed", light ? "text-dark-400" : "text-cream-dim/50")}>
                              {order.shippingAddress}, {order.shippingCity}
                            </p>
                          </div>
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Payment</p>
                            <p className={cn("mt-1 text-xs font-medium", light ? "text-dark-900" : "text-cream")}>{order.paymentMethod || "N/A"}</p>
                            <p className={cn("text-[10px] mt-0.5", light ? "text-dark-400" : "text-cream-dim/50")}>{order.paymentStatus || "Pending"}</p>
                          </div>
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Delivery</p>
                            <p className={cn("mt-1 text-xs font-medium", light ? "text-dark-900" : "text-cream")}>
                              {order.deliveryMode === "express" ? "10 Min Express" : order.deliveryMode === "regular" ? "3-5 Days Regular" : isQuickDelivery ? "30 Min Standard" : "Standard"}
                            </p>
                          </div>
                          <div className={cn("rounded-xl p-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <p className={cn("text-[9px] font-semibold uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>Total</p>
                            <p className={cn("mt-1 text-lg font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>{formatPrice(order.totalAmount)}</p>
                          </div>
                        </div>

                        {/* Signature proof for mediverse */}
                        {order.source === "mediverse" && order.signatureData && order.status === "delivered" && (
                          <div className={cn("rounded-xl border p-4", light ? "border-dark-200 bg-dark-50/50" : "border-white/5 bg-onyx/50")}>
                            <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", light ? "text-dark-500" : "text-cream-dim/60")}>
                              Delivery Signature
                            </p>
                            <div className={cn("rounded-lg border p-2 inline-block", light ? "border-dark-200 bg-dark-100" : "border-white/10 bg-dark-800")}>
                              <img src={order.signatureData} alt="Delivery signature" className="h-16 w-auto max-w-full" />
                            </div>
                            {order.signedAt && (
                              <p className={cn("text-[10px] mt-2", light ? "text-dark-400" : "text-cream-dim/40")}>
                                Signed at {new Date(order.signedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        )}

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
                                <RotateCcw size={12} /> Return within 2 hours
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
