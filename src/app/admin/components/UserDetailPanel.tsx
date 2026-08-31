/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Mail,
  Star,
  Heart,
  MessageSquare,
  KeyRound,
  Package,
  MapPin,
  LayoutDashboard,
  Globe,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { useLight } from "@/components/auth/auth-ui";
import { formatPrice, cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { apiFetch } from "@/lib/api";
import { statusColors, msgStatusColors } from "./types";
import type { UserDetailTab } from "./types";

interface UserDetailPanelProps {
  userId: string | null;
  onClose: () => void;
}

type DetailTab = UserDetailTab;

const tabs: { key: DetailTab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Package },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "security", label: "Security", icon: KeyRound },
];

export default function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const light = useLight();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await apiFetch(`/admin/users/${userId}/detail`);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tab on user change
      setActiveTab("overview");
      fetchDetail();
    }
  }, [userId, fetchDetail]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userId, onClose]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className={cn("absolute inset-0 backdrop-blur-sm", light ? "bg-black/30" : "bg-black/60")}
        onClick={onClose}
      />

      <div
        className={cn(
          "relative w-full max-w-[480px] overflow-y-auto animate-slide-in-right",
          light ? "bg-white border-l border-black/10" : "bg-dark-950 border-l border-dark-800/50"
        )}
      >
        {loading ? (
          <>
            <div
              className={cn(
                "sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b",
                light ? "bg-white/95 border-black/10" : "bg-dark-950/95 border-dark-800/50"
              )}
            >
              <h2 className={cn("text-lg font-serif", light ? "text-onyx" : "text-white")}>Loading...</h2>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  light ? "text-onyx/40 hover:text-onyx hover:bg-black/5" : "text-dark-400 hover:text-white hover:bg-dark-800/50"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center py-32">
              <div
                className={cn(
                  "w-8 h-8 border-2 rounded-full animate-spin",
                  light ? "border-silver-300 border-t-sapphire" : "border-dark-700 border-t-gold-500"
                )}
              />
            </div>
          </>
        ) : error ? (
          <>
            <div
              className={cn(
                "sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b",
                light ? "bg-white/95 border-black/10" : "bg-dark-950/95 border-dark-800/50"
              )}
            >
              <h2 className={cn("text-lg font-serif", light ? "text-onyx" : "text-white")}>Error</h2>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  light ? "text-onyx/40 hover:text-onyx hover:bg-black/5" : "text-dark-400 hover:text-white hover:bg-dark-800/50"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-32 px-6">
              <p className={cn("text-sm mb-4", light ? "text-red-500" : "text-red-400")}>{error}</p>
              <button
                onClick={fetchDetail}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  light
                    ? "bg-sapphire text-white hover:bg-sapphire-light"
                    : "bg-gold-500/10 text-gold-400 border border-gold-500/20 hover:bg-gold-500/20"
                )}
              >
                Retry
              </button>
            </div>
          </>
        ) : data ? (
          <>
            <div
              className={cn(
                "sticky top-0 z-10 backdrop-blur-xl border-b",
                light ? "bg-white/95 border-black/10" : "bg-dark-950/95 border-dark-800/50"
              )}
            >
              <div className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className={cn("text-lg font-serif truncate", light ? "text-onyx" : "text-white")}>
                    {data.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn("text-xs flex items-center gap-1", light ? "text-onyx/50" : "text-dark-400")}>
                      <Mail className="w-3 h-3" />
                      {data.email}
                    </span>
                    {data.role && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                          light
                            ? "bg-sapphire/10 text-sapphire border border-sapphire/20"
                            : "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                        )}
                      >
                        {data.role}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-xl transition-colors shrink-0 ml-3",
                    light ? "text-onyx/40 hover:text-onyx hover:bg-black/5" : "text-dark-400 hover:text-white hover:bg-dark-800/50"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 pb-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const count =
                      tab.key === "orders" ? data.orders?.length :
                      tab.key === "addresses" ? data.savedAddresses?.length :
                      tab.key === "reviews" ? data.reviews?.length :
                      tab.key === "wishlist" ? data.wishlists?.length :
                      tab.key === "messages" ? data.messages?.length :
                      tab.key === "security" ? data.passwordResets?.length :
                      undefined;

                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
                          activeTab === tab.key
                            ? light
                              ? "bg-sapphire/10 text-sapphire border border-sapphire/20"
                              : "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                            : light
                              ? "bg-black/5 text-onyx/60 border border-transparent hover:text-onyx hover:bg-black/10"
                              : "bg-dark-900 text-dark-400 border border-dark-800 hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {count !== undefined && count > 0 && (
                          <span
                            className={cn(
                              "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                              light
                                ? "bg-black/10 text-onyx/60"
                                : "bg-dark-800 text-dark-300"
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5">
              {activeTab === "overview" && <OverviewTab user={data} light={light} />}
              {activeTab === "orders" && <OrdersTab orders={data.orders || []} light={light} />}
              {activeTab === "addresses" && <AddressesTab addresses={data.savedAddresses || []} light={light} />}
              {activeTab === "reviews" && <ReviewsTab reviews={data.reviews || []} light={light} />}
              {activeTab === "wishlist" && <WishlistTab wishlists={data.wishlists || []} light={light} />}
              {activeTab === "messages" && <MessagesTab messages={data.messages || []} light={light} />}
              {activeTab === "security" && <SecurityTab resets={data.passwordResets || []} light={light} />}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Card({ light, children, className, ...props }: { light: boolean; children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border",
        light ? "bg-silver-50 border-silver-200" : "bg-dark-900/60 border-dark-800/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SectionTitle({ light, children }: { light: boolean; children: React.ReactNode }) {
  return (
    <h4 className={cn("text-sm font-medium mb-3", light ? "text-onyx/70" : "text-dark-300")}>
      {children}
    </h4>
  );
}

function EmptyState({ icon: Icon, label, light }: { icon: any; label: string; light: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", light ? "text-onyx/30" : "text-dark-500")}>
      <Icon className="w-10 h-10 mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function StatusBadge({ status, light }: { status: string; light: boolean }) {
  if (light) {
    const colorMap: Record<string, string> = {
      pending: "text-amber-700 bg-amber-50 border-amber-200",
      confirmed: "text-sky-700 bg-sky-50 border-sky-200",
      packed: "text-violet-700 bg-violet-50 border-violet-200",
      out_for_delivery: "text-orange-700 bg-orange-50 border-orange-200",
      delivered: "text-emerald-700 bg-emerald-50 border-emerald-200",
      cancelled: "text-red-700 bg-red-50 border-red-200",
      return_requested: "text-amber-700 bg-amber-50 border-amber-200",
      returned: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
    };
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", colorMap[status] || "text-onyx/60 bg-black/5 border-black/10")}>
        {status}
      </span>
    );
  }
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", statusColors[status] || "text-dark-400 bg-dark-800/50 border-dark-700/50")}>
      {status}
    </span>
  );
}

function MsgStatusBadge({ status, light }: { status: string; light: boolean }) {
  if (light) {
    const colorMap: Record<string, string> = {
      pending: "text-amber-700 bg-amber-50 border-amber-200",
      "in-progress": "text-sky-700 bg-sky-50 border-sky-200",
      replied: "text-emerald-700 bg-emerald-50 border-emerald-200",
      resolved: "text-sapphire bg-sapphire/10 border-sapphire/20",
    };
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", colorMap[status] || "text-onyx/60 bg-black/5 border-black/10")}>
        {status}
      </span>
    );
  }
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", msgStatusColors[status] || "text-dark-400 bg-dark-800/50 border-dark-700/50")}>
      {status}
    </span>
  );
}

function ResetStatusBadge({ status, light }: { status: string; light: boolean }) {
  if (light) {
    const colorMap: Record<string, string> = {
      completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
      verified: "text-sky-700 bg-sky-50 border-sky-200",
      requested: "text-amber-700 bg-amber-50 border-amber-200",
      failed: "text-red-700 bg-red-50 border-red-200",
    };
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", colorMap[status] || "text-onyx/60 bg-black/5 border-black/10")}>
        {status}
      </span>
    );
  }
  const colorMap: Record<string, string> = {
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    verified: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    failed: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", colorMap[status] || "text-dark-400 bg-dark-800/50 border-dark-700/50")}>
      {status}
    </span>
  );
}

function StarRating({ rating, light }: { rating: number; light: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= rating
              ? light ? "fill-amber-500 text-amber-500" : "fill-gold-400 text-gold-400"
              : light ? "text-silver-300" : "text-dark-700"
          )}
        />
      ))}
    </div>
  );
}

function OverviewTab({ user, light }: { user: any; light: boolean }) {
  const totalSpent = user.totalSpent || 0;
  const orderCount = user.orders?.length || 0;
  const reviewCount = user.reviews?.length || 0;
  const wishlistCount = user.wishlists?.length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Orders", value: orderCount, color: light ? "text-sapphire" : "text-gold-400" },
          { label: "Total Spent", value: formatPrice(totalSpent), color: light ? "text-sapphire" : "text-gold-400" },
          { label: "Reviews", value: reviewCount, color: light ? "text-emerald-600" : "text-emerald-400" },
          { label: "Wishlist", value: wishlistCount, color: light ? "text-violet-600" : "text-violet-400" },
        ].map((s) => (
          <Card key={s.label} light={light} className="p-4">
            <p className={cn("text-xs mb-1", light ? "text-onyx/50" : "text-dark-500")}>{s.label}</p>
            <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <SectionTitle light={light}>Recent Orders</SectionTitle>
        {user.orders?.length > 0 ? (
          <div className="space-y-2">
            {user.orders.slice(0, 5).map((order: any) => (
              <Card key={order.id} light={light} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className={cn("text-xs font-mono", light ? "text-onyx/40" : "text-dark-500")}>
                    #{order.id?.slice(0, 8)}
                  </p>
                  <StatusBadge status={order.status} light={light} />
                </div>
                <p className={cn("text-sm font-semibold", light ? "text-onyx" : "text-white")}>
                  {formatPrice(order.totalAmount)}
                </p>
                {order.items?.slice(0, 2).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    {item.image ? (
                      <img src={resolveImageUrl(item.image)} alt={item.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", light ? "bg-onyx/5" : "bg-dark-800")}>
                        <Package size={12} className={light ? "text-onyx/40" : "text-dark-600"} />
                      </div>
                    )}
                    <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>
                      {item.name} × {item.quantity}
                    </p>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Package} label="No orders yet" light={light} />
        )}
      </div>

      <div>
        <SectionTitle light={light}>Saved Addresses</SectionTitle>
        {user.savedAddresses?.length > 0 ? (
          <div className="space-y-2">
            {user.savedAddresses.slice(0, 3).map((addr: any) => (
              <Card key={addr.id} light={light} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className={cn("text-sm font-medium", light ? "text-onyx" : "text-white")}>{addr.label}</p>
                  {addr.isDefault && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        light
                          ? "bg-sapphire/10 text-sapphire border border-sapphire/20"
                          : "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                      )}
                    >
                      Default
                    </span>
                  )}
                </div>
                <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={MapPin} label="No saved addresses" light={light} />
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders, light }: { orders: any[]; light: boolean }) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  if (!orders.length) return <EmptyState icon={Package} label="No orders found" light={light} />;

  return (
    <div className="space-y-3">
      {orders.map((order: any) => {
        const isExpanded = expandedOrder === order.id;
        return (
          <Card key={order.id} light={light} className="overflow-hidden">
            <button
              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              className={cn(
                "w-full p-4 text-left transition-colors",
                light ? "hover:bg-black/[0.02]" : "hover:bg-dark-800/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs font-mono", light ? "text-onyx/40" : "text-dark-500")}>
                      #{order.id?.slice(0, 8)}
                    </p>
                    <StatusBadge status={order.status} light={light} />
                  </div>
                  <p className={cn("text-xs mt-1", light ? "text-onyx/50" : "text-dark-400")}>
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {order.items?.length > 0 && ` · ${order.items.length} item${order.items.length > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <p className={cn("text-sm font-semibold", light ? "text-sapphire" : "text-gold-400")}>
                    {formatPrice(order.totalAmount)}
                  </p>
                  {isExpanded ? (
                    <ChevronUp className={cn("w-4 h-4", light ? "text-onyx/40" : "text-dark-500")} />
                  ) : (
                    <ChevronDown className={cn("w-4 h-4", light ? "text-onyx/40" : "text-dark-500")} />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className={cn("px-4 pb-4 space-y-3 border-t", light ? "border-silver-200" : "border-dark-800/50")}>
                {order.items?.length > 0 && (
                  <div className="pt-3 space-y-2">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        {item.image ? (
                          <img src={resolveImageUrl(item.image)} alt={item.name} className={cn("w-10 h-10 rounded-lg object-cover", light ? "bg-silver-100" : "bg-dark-800")} />
                        ) : (
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", light ? "bg-silver-100" : "bg-dark-800")}>
                            <Package className={cn("w-4 h-4", light ? "text-onyx/30" : "text-dark-600")} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", light ? "text-onyx" : "text-white")}>{item.name}</p>
                          <p className={cn("text-xs", light ? "text-onyx/40" : "text-dark-500")}>
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className={cn("text-sm shrink-0", light ? "text-onyx" : "text-white")}>
                          {formatPrice(item.quantity * item.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={cn("pt-3 space-y-2 border-t", light ? "border-silver-200" : "border-dark-800/50")}>
                  {order.shippingAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", light ? "text-onyx/30" : "text-dark-500")} />
                      <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>
                        {order.shippingAddress}, {order.shippingCity}, {order.shippingState}
                      </p>
                    </div>
                  )}
                  {order.paymentMethod && (
                    <div className="flex items-center gap-2">
                      <CreditCard className={cn("w-3.5 h-3.5 shrink-0", light ? "text-onyx/30" : "text-dark-500")} />
                      <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>
                        {order.paymentMethod === "ONLINE" ? "Online Payment" : order.paymentMethod}
                        {order.paymentStatus === "APPROVED" ? " · Paid" : order.paymentStatus === "PENDING" ? " · Pending" : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function AddressesTab({ addresses, light }: { addresses: any[]; light: boolean }) {
  if (!addresses.length) return <EmptyState icon={MapPin} label="No saved addresses" light={light} />;

  return (
    <div className="space-y-3">
      {addresses.map((addr: any) => (
        <Card key={addr.id} light={light} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <p className={cn("text-sm font-medium", light ? "text-onyx" : "text-white")}>{addr.label}</p>
            {addr.isDefault && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium",
                  light
                    ? "bg-sapphire/10 text-sapphire border border-sapphire/20"
                    : "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                )}
              >
                Default
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <p className={cn("text-sm", light ? "text-onyx/70" : "text-dark-300")}>{addr.name}</p>
            {addr.phone && <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>{addr.phone}</p>}
            <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>{addr.address}</p>
            <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>
              {addr.city}, {addr.state} - {addr.pincode}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReviewsTab({ reviews, light }: { reviews: any[]; light: boolean }) {
  if (!reviews.length) return <EmptyState icon={Star} label="No reviews yet" light={light} />;

  return (
    <div className="space-y-3">
      {reviews.map((review: any) => (
        <Card key={review.id} light={light} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              {(review.product?.images?.[0] || review.product?.image) ? (
                <img
                  src={resolveImageUrl(review.product.images?.[0] || review.product.image)}
                  alt={review.product?.name || ""}
                  className={cn("w-12 h-12 rounded-lg object-cover mb-2", light ? "" : "")}
                />
              ) : (
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-2", light ? "bg-onyx/5" : "bg-dark-800")}>
                  <Star size={18} className={light ? "text-onyx/30" : "text-dark-600"} />
                </div>
              )}
              <p className={cn("text-sm font-medium truncate", light ? "text-onyx" : "text-white")}>
                {review.product?.name}
              </p>
              {review.product?.brand && (
                <p className={cn("text-xs", light ? "text-onyx/40" : "text-dark-500")}>{review.product.brand}</p>
              )}
            </div>
            <StarRating rating={review.rating} light={light} />
          </div>
          {review.comment && (
            <p className={cn("text-xs leading-relaxed mb-3", light ? "text-onyx/60" : "text-dark-400")}>
              {review.comment}
            </p>
          )}
          <p className={cn("text-[10px]", light ? "text-onyx/30" : "text-dark-600")}>
            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </Card>
      ))}
    </div>
  );
}

function WishlistTab({ wishlists, light }: { wishlists: any[]; light: boolean }) {
  if (!wishlists.length) return <EmptyState icon={Heart} label="Wishlist is empty" light={light} />;

  return (
    <div className="space-y-3">
      {wishlists.map((item: any) => (
        <Card key={item.id} light={light} className="p-4">
          <div className="flex items-center gap-4">
            {item.product?.images?.[0] ? (
              <img
                src={resolveImageUrl(item.product.images[0])}
                alt={item.product.name}
                className={cn("w-14 h-14 rounded-lg object-cover shrink-0", light ? "bg-silver-100" : "bg-dark-800")}
              />
            ) : (
              <div
                className={cn(
                  "w-14 h-14 rounded-lg flex items-center justify-center shrink-0",
                  light
                    ? "bg-gradient-to-br from-violet-100 to-pink-100"
                    : "bg-gradient-to-br from-violet-500/10 to-pink-500/10"
                )}
              >
                <Heart className={cn("w-5 h-5", light ? "text-violet-400" : "text-violet-400")} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium truncate", light ? "text-onyx" : "text-white")}>
                {item.product?.name}
              </p>
              <p className={cn("text-xs", light ? "text-onyx/40" : "text-dark-500")}>{item.product?.brand}</p>
            </div>
            <p className={cn("text-sm font-semibold shrink-0", light ? "text-sapphire" : "text-gold-400")}>
              {formatPrice(item.product?.price || 0)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MessagesTab({ messages, light }: { messages: any[]; light: boolean }) {
  if (!messages.length) return <EmptyState icon={MessageSquare} label="No messages" light={light} />;

  return (
    <div className="space-y-3">
      {messages.map((msg: any) => (
        <Card key={msg.id} light={light} className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className={cn("text-sm font-medium min-w-0 flex-1 truncate", light ? "text-onyx" : "text-white")}>
              {msg.subject}
            </p>
            <MsgStatusBadge status={msg.status} light={light} />
          </div>
          <p className={cn("text-xs leading-relaxed", light ? "text-onyx/50" : "text-dark-400")}>
            {msg.message}
          </p>
          {msg.replyMessage && (
            <div
              className={cn(
                "rounded-xl p-3 border",
                light
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-emerald-500/5 border-emerald-500/20"
              )}
            >
              <p className={cn("text-[10px] font-medium mb-1", light ? "text-emerald-600" : "text-emerald-400")}>
                Reply
              </p>
              <p className={cn("text-xs leading-relaxed", light ? "text-onyx/70" : "text-dark-300")}>
                {msg.replyMessage}
              </p>
            </div>
          )}
          <p className={cn("text-[10px]", light ? "text-onyx/30" : "text-dark-600")}>
            {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </Card>
      ))}
    </div>
  );
}

function SecurityTab({ resets, light }: { resets: any[]; light: boolean }) {
  const [expandedReset, setExpandedReset] = useState<string | null>(null);

  if (!resets.length) return <EmptyState icon={KeyRound} label="No password reset history" light={light} />;

  return (
    <div className="space-y-3">
      {resets.map((reset: any) => {
        const isExpanded = expandedReset === reset.id;
        return (
          <Card key={reset.id} light={light} className="overflow-hidden">
            <button
              onClick={() => setExpandedReset(isExpanded ? null : reset.id)}
              className={cn(
                "w-full p-4 text-left transition-colors",
                light ? "hover:bg-black/[0.02]" : "hover:bg-dark-800/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      light
                        ? reset.status === "completed"
                          ? "bg-emerald-50 border border-emerald-200"
                          : reset.status === "failed"
                          ? "bg-red-50 border border-red-200"
                          : "bg-amber-50 border border-amber-200"
                        : reset.status === "completed"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : reset.status === "failed"
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-amber-500/10 border border-amber-500/20"
                    )}
                  >
                    <KeyRound
                      className={cn(
                        "w-4 h-4",
                        reset.status === "completed"
                          ? light ? "text-emerald-600" : "text-emerald-400"
                          : reset.status === "failed"
                          ? light ? "text-red-600" : "text-red-400"
                          : light ? "text-amber-600" : "text-amber-400"
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <ResetStatusBadge status={reset.status} light={light} />
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          light
                            ? "bg-black/5 text-onyx/50 border border-black/10"
                            : "bg-dark-800 border border-dark-700/50 text-dark-400"
                        )}
                      >
                        {reset.method}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-1.5", light ? "text-onyx/40" : "text-dark-500")}>
                      {new Date(reset.requestedAt || reset.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className={cn("w-4 h-4 shrink-0", light ? "text-onyx/30" : "text-dark-500")} />
                ) : (
                  <ChevronDown className={cn("w-4 h-4 shrink-0", light ? "text-onyx/30" : "text-dark-500")} />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className={cn("px-4 pb-4 space-y-3 border-t", light ? "border-silver-200" : "border-dark-800/50")}>
                <div className="pt-3 space-y-2">
                  {[
                    { label: "Requested", time: reset.requestedAt, done: true },
                    { label: "Verified", time: reset.verifiedAt, done: !!reset.verifiedAt },
                    { label: reset.status === "failed" ? "Failed" : "Completed", time: reset.completedAt || (reset.status === "failed" ? reset.createdAt : null), done: reset.status === "completed" || reset.status === "failed" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          step.done
                            ? light ? "bg-emerald-500" : "bg-emerald-400"
                            : light ? "bg-silver-300" : "bg-dark-700"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-xs font-medium", light ? "text-onyx/70" : "text-dark-300")}>
                            {step.label}
                          </p>
                          {step.time && (
                            <p className={cn("text-[10px]", light ? "text-onyx/30" : "text-dark-600")}>
                              {new Date(step.time).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(reset.ipAddress || reset.failReason) && (
                  <div className={cn("pt-3 space-y-2 border-t", light ? "border-silver-200" : "border-dark-800/50")}>
                    {reset.ipAddress && (
                      <div className="flex items-center gap-2">
                        <Globe className={cn("w-3.5 h-3.5", light ? "text-onyx/30" : "text-dark-500")} />
                        <p className={cn("text-xs", light ? "text-onyx/50" : "text-dark-400")}>{reset.ipAddress}</p>
                      </div>
                    )}
                    {reset.failReason && (
                      <p className={cn("text-xs", light ? "text-red-500" : "text-red-400/80")}>
                        Reason: {reset.failReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
