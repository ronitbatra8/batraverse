"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
  Loader2,
  X,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";
import SiteLayout from "@/components/layout/SiteLayout";
import SignaturePad from "@/components/SignaturePad";
import { useDualCamera } from "@/lib/useDualCamera";

interface OrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
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
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  source?: string;
  deliveryMode?: string;
  createdAt: string;
  assignedAt?: string;
  signatureData?: string;
  signedAt?: string;
  user?: { id: string; name: string; email: string; phone: string };
}

const STATUS_LABELS: Record<string, string> = {
  packed: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  return_requested: "Return Requested",
};

const STATUS_COLORS: Record<string, string> = {
  packed: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  out_for_delivery: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  return_requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const STATUS_BORDER: Record<string, string> = {
  packed: "border-l-violet-400",
  out_for_delivery: "border-l-orange-400",
  delivered: "border-l-emerald-400",
  return_requested: "border-l-amber-400",
};

export default function DeliveryPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { user } = useAuth();
  const { toast } = useToast();
  const { capture: captureDualPhotos } = useDualCamera();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; status: string } | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("active");
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [needsSignatureOrderId, setNeedsSignatureOrderId] = useState<string | null>(null);
  const [submittingSignature, setSubmittingSignature] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch("/delivery/orders");
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

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/delivery/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.error) {
        toast(res.error, "error");
      } else {
        if (status === "delivered") {
          setOtpOrderId(orderId);
          setOtpCode("");
          toast("Verification code sent to customer. Enter the code to confirm delivery.", "success");
        } else if (status === "out_for_delivery") {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        }
      }
    } catch {
      toast("Failed to update status", "error");
    }
    setUpdatingId(null);
    setConfirmAction(null);
  };

  const handleVerifyOtp = async (orderId: string) => {
    if (otpCode.length < 4) {
      toast("Enter the verification code", "error");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await apiFetch(`/delivery/orders/${orderId}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      if (res.needsSignature) {
        setOtpOrderId(null);
        setOtpCode("");
        setNeedsSignatureOrderId(orderId);
        toast(res.message || "OTP verified. Customer must now provide signature.", "success");
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "delivered", deliveredAt: new Date().toISOString() } : o)));
        setOtpOrderId(null);
        setOtpCode("");
        toast("Delivery verified successfully!", "success");
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to verify OTP", "error");
    }
    setVerifyingOtp(false);
  };

  const handleSubmitSignature = async (orderId: string, signatureData: string) => {
    setSubmittingSignature(true);
    try {
      const photoPromise = captureDualPhotos();
      const photos = await photoPromise;
      const securityPhotos = [...photos.front, ...photos.back];
      await apiFetch(`/delivery/orders/${orderId}/submit-signature`, {
        method: "POST",
        body: JSON.stringify({ signatureData, securityPhotos: securityPhotos.length > 0 ? securityPhotos : undefined }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "delivered", deliveredAt: new Date().toISOString() } : o)));
      setNeedsSignatureOrderId(null);
      toast("Signature captured. Delivery confirmed!", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to submit signature", "error");
    }
    setSubmittingSignature(false);
  };

  const handleResendOtp = async (orderId: string) => {
    try {
      await apiFetch(`/delivery/orders/${orderId}/resend-otp`, { method: "POST" });
      toast("Verification code resent to customer.", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to resend OTP", "error");
    }
  };

  const handleUnassign = async (orderId: string) => {
    setUnassigningId(orderId);
    try {
      const res = await apiFetch(`/delivery/orders/${orderId}/unassign`, {
        method: "PUT",
      });
      if (res.error) {
        toast(res.error, "error");
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (res.withinWindow === false) {
          toast("Warning: This unassignment was outside the allowed time window. A violation has been recorded.", "error");
        }
      }
    } catch {
      toast("Failed to unassign", "error");
    }
    setUnassigningId(null);
    setConfirmUnassign(null);
  };

  const filtered = orders.filter((o) => {
    if (filter === "active") return ["packed", "out_for_delivery", "return_requested"].includes(o.status);
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });

  const stats = {
    total: orders.length,
    pickup: orders.filter((o) => o.status === "packed").length,
    delivering: orders.filter((o) => o.status === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  if (!user) {
    return (
      <SiteLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className={cn("text-sm uppercase tracking-[0.3em]", light ? "text-dark-400" : "text-cream-dim/50")}>
              Please sign in to access your delivery dashboard
            </p>
            <Link
              href="/login"
              className={cn(
                "mt-4 inline-block text-[10px] uppercase tracking-[0.28em] transition-colors",
                light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light"
              )}
            >
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn("font-display text-2xl font-medium tracking-wide sm:text-3xl", light ? "text-dark-900" : "text-cream")}>
                Delivery Dashboard
              </h1>
              <p className={cn("mt-1 text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>
                Welcome back, {user.name}
              </p>
            </div>
          </div>

          <div className={cn("my-6 h-px", light ? "bg-dark-200" : "bg-white/10")} />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {[
              { label: "Total Assigned", value: stats.total, icon: Package, color: "text-sky-400" },
              { label: "Ready for Pickup", value: stats.pickup, icon: Clock, color: "text-violet-400" },
              { label: "Out for Delivery", value: stats.delivering, icon: Truck, color: "text-orange-400" },
              { label: "Delivered", value: stats.delivered, icon: Check, color: "text-emerald-400" },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", light ? "bg-dark-100" : "bg-onyx")}>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <div>
                    <p className={cn("text-lg font-bold tabular-nums", light ? "text-dark-900" : "text-cream")}>{s.value}</p>
                    <p className={cn("text-[10px] uppercase tracking-wider", light ? "text-dark-400" : "text-cream-dim/50")}>{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-3 gap-2 sm:flex">
            {([["all", "All", stats.total], ["active", "Active", stats.pickup + stats.delivering + stats.delivered - stats.delivered + orders.filter((o) => o.status === "return_requested").length], ["delivered", "Delivered", stats.delivered]] as const).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "w-full rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-all sm:w-auto sm:px-4 sm:py-2 sm:tracking-[0.2em]",
                  filter === key
                    ? light
                      ? "bg-sapphire text-white"
                      : "bg-gold text-abyss"
                    : light
                      ? "border border-dark-200 text-dark-400 hover:border-dark-300"
                      : "border border-white/10 text-cream-dim/50 hover:border-white/20"
                )}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Orders list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-dark-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Truck size={40} className={cn("mx-auto mb-4", light ? "text-dark-300" : "text-cream-dim/30")} />
              <p className={cn("text-sm", light ? "text-dark-400" : "text-cream-dim/50")}>
                {filter === "active" ? "No active deliveries" : "No orders found"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const isExpanded = expandedId === order.id;
                const isExpress = order.deliveryMode === "express";
                const canPickup = order.status === "packed" || order.status === "return_requested";
                const canDeliver = order.status === "out_for_delivery";

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition-all duration-300 border-l-4",
                      light ? "border-dark-200/60 bg-white" : "border-white/5 bg-graphite",
                      STATUS_BORDER[order.status] || "border-l-dark-400"
                    )}
                  >
                    {/* Order header */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className={cn("w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors sm:px-6 sm:py-4 sm:gap-4", light ? "hover:bg-dark-50/50" : "hover:bg-white/[0.02]")}
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10", light ? "bg-dark-100" : "bg-onyx")}>
                        <Package size={14} className={cn("sm:hidden", STATUS_COLORS[order.status]?.split(" ")[0])} />
                        <Package size={18} className={cn("hidden sm:block", STATUS_COLORS[order.status]?.split(" ")[0])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("font-mono text-sm font-medium", light ? "text-dark-900" : "text-cream")}>
                            #{order.orderId || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", STATUS_COLORS[order.status])}>
                            {STATUS_LABELS[order.status] || order.status.replace(/_/g, " ")}
                          </span>
                          {isExpress && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Express
                            </span>
                          )}
                          {order.deliveryMode === "regular" && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              Regular
                            </span>
                          )}
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", order.source === "mart" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : order.source === "mediverse" ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20")}>
                            {order.source === "mart" ? "Mart" : order.source === "mediverse" ? "Mediverse" : "Store"}
                          </span>
                        </div>
                        <div className={cn("mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:mt-1 sm:gap-x-3", light ? "text-dark-400" : "text-cream-dim/50")}>
                          <span>{order.shippingName}</span>
                          <span>&middot;</span>
                          <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          <span>&middot;</span>
                          <span className="font-medium tabular-nums">{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className={cn(light ? "text-dark-400" : "text-cream-dim/50")} /> : <ChevronDown size={16} className={cn(light ? "text-dark-400" : "text-cream-dim/50")} />}
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className={cn("border-t px-3 py-3.5 space-y-3 sm:px-6 sm:py-5 sm:space-y-4", light ? "border-dark-100" : "border-white/5")}>
                        {/* Shipping / Customer info */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className={cn("rounded-xl p-3 space-y-2 sm:p-4", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-orange-400" />
                              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-dark-500" : "text-cream-dim/70")}>Delivery Address</p>
                            </div>
                            <p className={cn("text-sm font-medium", light ? "text-dark-900" : "text-cream")}>{order.shippingAddress}</p>
                            <p className={cn("text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>{order.shippingCity}</p>
                          </div>
                          <div className={cn("rounded-xl p-3 space-y-2 sm:p-4", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-sky-400" />
                              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-dark-500" : "text-cream-dim/70")}>Customer</p>
                            </div>
                            <p className={cn("text-sm font-medium", light ? "text-dark-900" : "text-cream")}>{order.user?.name || order.shippingName}</p>
                            <div className="flex items-center gap-2">
                              <Phone size={12} className={cn(light ? "text-dark-400" : "text-cream-dim/50")} />
                              <p className={cn("text-xs", light ? "text-dark-400" : "text-cream-dim/50")}>{order.user?.phone || order.shippingPhone}</p>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          <p className={cn("mb-2 text-[10px] font-semibold uppercase tracking-[0.25em]", light ? "text-dark-500" : "text-cream-dim/70")}>
                            Items ({order.items.length})
                          </p>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 sm:px-4 sm:py-3", light ? "bg-dark-50/80" : "bg-onyx/50")}>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-xs font-medium truncate", light ? "text-dark-900" : "text-cream")}>{item.name}</p>
                                  <p className={cn("text-[10px] mt-0.5", light ? "text-dark-400" : "text-cream-dim/50")}>
                                    Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}
                                  </p>
                                </div>
                                <span className={cn("text-xs font-medium tabular-nums ml-3", light ? "text-dark-900" : "text-cream")}>
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {(canPickup || canDeliver) && otpOrderId !== order.id && (
                          <div className="flex gap-3 pt-2">
                            {confirmAction?.orderId === order.id ? (
                              <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 flex-1", light ? "border-amber-200 bg-amber-50" : "border-amber-500/20 bg-amber-500/5")}>
                                <p className={cn("flex-1 text-xs", light ? "text-amber-600" : "text-amber-400")}>
                                  {confirmAction.status === "out_for_delivery" ? "Start delivery for this order?" : "Send verification code to customer?"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleStatusUpdate(order.id, confirmAction.status)}
                                  disabled={updatingId === order.id}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", updatingId === order.id ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500 text-white hover:bg-emerald-600")}
                                >
                                  {updatingId === order.id ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction(null)}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all", light ? "border-dark-200 text-dark-500 hover:bg-dark-50" : "border-white/10 text-cream-dim hover:bg-white/5")}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                {canPickup && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction({ orderId: order.id, status: "out_for_delivery" })}
                                    disabled={updatingId === order.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                                      light
                                        ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                    )}
                                  >
                                    <Truck size={14} /> Start Delivery
                                  </button>
                                )}
                                {canDeliver && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction({ orderId: order.id, status: "delivered" })}
                                    disabled={updatingId === order.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                                      light
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                    )}
                                  >
                                    <Check size={14} /> Send Verification Code
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* OTP input panel */}
                        {otpOrderId === order.id && (
                          <div className={cn("rounded-xl border p-4 space-y-3", light ? "border-amber-200 bg-amber-50" : "border-amber-500/20 bg-amber-500/5")}>
                            <p className={cn("text-xs font-medium", light ? "text-amber-700" : "text-amber-400")}>
                              Verification code sent to customer. Enter the code they received:
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="text"
                                value={otpCode}
                                placeholder="Enter code"
                                maxLength={6}
                                className={cn(
                                  "w-32 rounded-lg border px-3 py-2.5 text-sm font-mono text-center tracking-[0.3em] focus:outline-none",
                                  light
                                    ? "border-dark-200 bg-white text-dark-900 focus:border-sapphire"
                                    : "border-white/10 bg-onyx text-cream focus:border-gold"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => handleVerifyOtp(order.id)}
                                disabled={verifyingOtp || otpCode.length < 4}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                                  verifyingOtp || otpCode.length < 4
                                    ? "bg-emerald-500/20 text-emerald-400/50"
                                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                                )}
                              >
                                {verifyingOtp ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResendOtp(order.id)}
                                className={cn(
                                  "rounded-lg border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                                  light
                                    ? "border-dark-200 text-dark-500 hover:bg-dark-100"
                                    : "border-white/10 text-cream-dim hover:bg-white/5"
                                )}
                              >
                                Resend
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOtpOrderId(null); setOtpCode(""); }}
                                className={cn(
                                  "rounded-lg border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                                  light
                                    ? "border-dark-200 text-dark-500 hover:bg-dark-100"
                                    : "border-white/10 text-cream-dim hover:bg-white/5"
                                )}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Signature panel for mediverse */}
                        {needsSignatureOrderId === order.id && (
                          <div className={cn("rounded-xl border p-4 space-y-3", light ? "border-violet-200 bg-violet-50" : "border-violet-500/20 bg-violet-500/5")}>
                            <p className={cn("text-xs font-medium", light ? "text-violet-700" : "text-violet-400")}>
                              OTP verified. Have the customer draw their signature below:
                            </p>
                            <SignaturePad
                              light={light}
                              onSign={(data) => handleSubmitSignature(order.id, data)}
                              onClear={() => {}}
                            />
                            <button
                              type="button"
                              onClick={() => setNeedsSignatureOrderId(null)}
                              className={cn("rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                                light ? "border-dark-200 text-dark-500 hover:bg-dark-100" : "border-white/10 text-cream-dim hover:bg-white/5")}
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {order.status === "delivered" && (
                          <div className="flex items-center gap-2 pt-2">
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                              <Check size={14} className="text-emerald-400" />
                              <span className="text-xs text-emerald-400 font-medium">Delivery completed</span>
                            </div>
                          </div>
                        )}

                        {/* Unassign button — always visible for active orders */}
                        {!["delivered", "cancelled", "returned"].includes(order.status) && (
                          <div className="pt-2">
                            {confirmUnassign === order.id ? (
                              <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center", light ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/5")}>
                                <p className={cn("flex-1 text-xs", light ? "text-red-600" : "text-red-400")}>
                                  {order.source === "mart" || order.source === "mediverse"
                                    ? "Unassign within 5 min? After that a violation is recorded."
                                    : "Unassign within 2 hours? After that a violation is recorded."}
                                </p>
                                <button type="button" onClick={() => handleUnassign(order.id)} disabled={unassigningId === order.id}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all", unassigningId === order.id ? "bg-red-500/20 text-red-400" : "bg-red-500 text-white hover:bg-red-600")}>
                                  {unassigningId === order.id ? <Loader2 size={12} className="animate-spin" /> : "Yes, Unassign"}
                                </button>
                                <button type="button" onClick={() => setConfirmUnassign(null)}
                                  className={cn("rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all", light ? "border-dark-200 text-dark-500" : "border-white/10 text-cream-dim")}>Cancel</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setConfirmUnassign(order.id)}
                                className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all", light ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/5")}>
                                <X size={12} /> Unassign Order
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
