/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  UserCheck,
  Loader2,
  Check,
  X,
  Clock,
  Hash,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { statusColors, API, adminHeaders } from "./types";
import ConfirmModal from "@/components/ConfirmModal";

const statusGradients: Record<string, string> = {
  pending: "from-amber-500/15 to-amber-500/5",
  confirmed: "from-sky-500/15 to-sky-500/5",
  packed: "from-violet-500/15 to-violet-500/5",
  out_for_delivery: "from-orange-500/15 to-orange-500/5",
  delivered: "from-emerald-500/15 to-emerald-500/5",
  cancelled: "from-red-500/15 to-red-500/5",
  return_requested: "from-amber-500/15 to-amber-500/5",
  returned: "from-fuchsia-500/15 to-fuchsia-500/5",
};

const statusBorders: Record<string, string> = {
  pending: "border-l-amber-400",
  confirmed: "border-l-sky-400",
  packed: "border-l-violet-400",
  out_for_delivery: "border-l-orange-400",
  delivered: "border-l-emerald-400",
  cancelled: "border-l-red-400",
  return_requested: "border-l-amber-400",
  returned: "border-l-fuchsia-400",
};

function getOrderSource(order: any): string {
  if (order.source === "mart") return "mart";
  if (order.source === "mediverse") return "mediverse";
  if (order.source === "store") return "store";
  if (order.orderId) {
    if (order.orderId.startsWith("mt")) return "mart";
    if (order.orderId.startsWith("md")) return "mediverse";
    if (order.orderId.startsWith("st")) return "store";
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    const sources: string[] = order.items.map((it: any) => it.source || "store");
    const unique = [...new Set(sources)];
    return (unique[0] as string) || "store";
  }
  return "store";
}

export default function OrdersTab({
  orders,
  updatingId,
  onStatusUpdate,
  onItemStatusUpdate,
  onAssign,
  onPaymentAction,
  onReturnApprove,
  focusOrderId,
  onFocusHandled,
  adminKey,
}: {
  orders: any[];
  updatingId: string | null;
  onStatusUpdate: (orderId: string, status: string) => void;
  onItemStatusUpdate?: (orderId: string, itemIdx: number, status: string) => void;
  onAssign?: (orderId: string, deliveryId: string) => void;
  onPaymentAction?: (orderId: string, action: "approve" | "reject") => void;
  onReturnApprove?: (orderId: string, action: "approve" | "reject") => void;
  focusOrderId?: string | null;
  onFocusHandled?: () => void;
  adminKey?: string;
}) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "store" | "mart" | "mediverse">("all");
  const [deliveryExecs, setDeliveryExecs] = useState<any[]>([]);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<{ orderId: string; status: string } | null>(null);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<{ orderId: string; action: "approve" | "reject" } | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [unlockedOrders, setUnlockedOrders] = useState<Set<string>>(new Set());
  const [photoPasswordInput, setPhotoPasswordInput] = useState("");
  const [photoUnlockTarget, setPhotoUnlockTarget] = useState<string | null>(null);
  const lastFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (adminKey) {
      fetch(`${API}/api/admin/delivery-executives`, { headers: adminHeaders(adminKey) })
        .then((r) => r.json())
        .then((data) => { if (!data.error) setDeliveryExecs(data); })
        .catch(() => {});
    }
  }, [adminKey]);

  useEffect(() => {
    if (focusOrderId && focusOrderId !== lastFocusRef.current) {
      lastFocusRef.current = focusOrderId;
      setExpandedOrder(focusOrderId);
      setOrderFilter("all");
      setOrderSearch("");
      setTimeout(() => {
        const el = document.getElementById(`order-${focusOrderId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        onFocusHandled?.();
      }, 100);
    }
  }, [focusOrderId, onFocusHandled]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      orderSearch === "" ||
      order.id?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.orderId?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.shippingName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.user?.phone?.includes(orderSearch) ||
      order.shippingPhone?.includes(orderSearch);

    const matchesFilter =
      orderFilter === "all" || order.status === orderFilter;

    const matchesSource =
      sourceFilter === "all" || getOrderSource(order) === sourceFilter;

    return matchesSearch && matchesFilter && matchesSource;
  });

  const statuses = ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled", "return_requested", "returned"];

  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const sourceCounts = {
    all: orders.length,
    store: orders.filter((o) => getOrderSource(o) === "store").length,
    mart: orders.filter((o) => getOrderSource(o) === "mart").length,
    mediverse: orders.filter((o) => getOrderSource(o) === "mediverse").length,
  };

  function handleStatusChange(orderId: string, status: string) {
    if (status === "cancelled") {
      setPendingStatusAction({ orderId, status });
      return;
    }
    onStatusUpdate(orderId, status);
  }

  function handleItemStatusChange(orderId: string, itemIdx: number, status: string) {
    onItemStatusUpdate?.(orderId, itemIdx, status);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Orders</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 w-full sm:w-72"
            />
          </div>
          <select
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="px-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Source filter: Store / Mart / Mediverse */}
      <div className="flex items-center gap-2 p-1 bg-dark-900/80 border border-dark-800/50 rounded-xl w-fit">
        {(["all", "store", "mart", "mediverse"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`relative px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              sourceFilter === s
                ? s === "mart"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : s === "mediverse"
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                    : "bg-gold/15 text-gold border border-gold/30"
                : "text-dark-400 hover:text-dark-200 border border-transparent"
            }`}
          >
            <span className="flex items-center gap-2">
              {s === "all" ? "All Orders" : s === "store" ? "Store" : s === "mart" ? "Mart" : "Mediverse"}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                sourceFilter === s
                  ? s === "mart"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : s === "mediverse"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-gold/20 text-gold-light"
                  : "bg-dark-800 text-dark-500"
              }`}>
                {sourceCounts[s]}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() =>
              setOrderFilter(orderFilter === status ? "all" : status)
            }
            className={`p-3 rounded-xl border text-center transition-all bg-gradient-to-br ${
              orderFilter === status
                ? `${statusGradients[status]} border-${status === "pending" ? "amber" : status === "confirmed" ? "sky" : status === "packed" ? "violet" : status === "out_for_delivery" ? "orange" : status === "delivered" ? "emerald" : "red"}-500/30`
                : "border-dark-800/50 from-dark-900/40 to-dark-900/20 hover:from-dark-800/30 hover:to-dark-800/10"
            }`}
          >
            <div
              className="text-lg font-bold"
              style={{ color: statusColors[status as keyof typeof statusColors] }}
            >
              {statusCounts[status] || 0}
            </div>
            <div className="text-xs text-dark-400 capitalize">{status}</div>
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <Package className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const sc = statusColors[order.status as keyof typeof statusColors] || "";
            const storeItemCount = (order.items || []).filter((it: any) => it.source !== "mart").length;

            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`bg-gradient-to-r ${statusGradients[order.status] || "from-dark-900/40 to-dark-900/20"} border border-dark-800/50 border-l-4 ${statusBorders[order.status] || "border-l-dark-600"} rounded-2xl overflow-hidden transition-all`}
              >
                <button
                  onClick={() =>
                    setExpandedOrder(isExpanded ? null : order.id)
                  }
                  className="w-full px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${statusGradients[order.status] || ""} border border-dark-700/50`}>
                    <Package className="w-5 h-5" style={{ color: statusColors[order.status as keyof typeof statusColors] }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-white font-mono text-sm font-medium">
                        #{order.orderId || order.id?.slice(0, 8)}
                      </span>
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit capitalize"
                        style={{
                          backgroundColor: `${statusColors[order.status as keyof typeof statusColors]}20`,
                          color: statusColors[order.status as keyof typeof statusColors],
                        }}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          getOrderSource(order) === "mart"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : getOrderSource(order) === "mediverse"
                              ? "bg-violet-500/15 text-violet-400"
                              : "bg-gold/10 text-gold/80"
                        }`}
                      >
                        {getOrderSource(order) === "mart" ? "Mart" : getOrderSource(order) === "mediverse" ? "Mediverse" : "Store"}
                      </span>
                      {order.orderId && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-dark-800 text-dark-300">
                          {order.orderId}
                        </span>
                      )}
                      {(order.deliveryMode === "express" || order.deliveryMode === "regular") && (getOrderSource(order) === "mart" || getOrderSource(order) === "mediverse") && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          getOrderSource(order) === "mart" ? "bg-emerald-500/15 text-emerald-400" : "bg-violet-500/15 text-violet-400"
                        }`}>
                          {order.deliveryMode === "express" ? "10 min" : order.deliveryMode === "regular" ? "3-5 days" : "30 min"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                      <span className="text-dark-300 text-sm truncate">
                        {order.shippingName || "Unknown"}
                      </span>
                      <span className="text-dark-500 text-sm hidden sm:block">
                        &middot;
                      </span>
                      <span className="text-dark-500 text-sm truncate hidden sm:block">
                        {order.user?.email || order.shippingPhone || "No contact"}
                      </span>
                      <span className="text-dark-500 text-sm hidden sm:block">
                        &middot;
                      </span>
                      <span className="text-dark-500 text-sm hidden sm:block">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm text-dark-400">
                      {order.items?.length || 0} item
                      {(order.items?.length || 0) !== 1 ? "s" : ""}
                    </div>
                    <div className="text-white font-semibold">
                      {formatPrice(order.totalAmount || 0)}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 space-y-5 border-t border-dark-800/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> Customer Info
                        </h4>
                        <div className="space-y-2">
                          <p className="text-white text-sm font-medium">
                            {order.shippingName}
                          </p>
                          <div className="flex items-center gap-2 text-dark-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            {order.user?.email || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-dark-300 text-xs">
                            <Phone className="w-3.5 h-3.5 text-green-400" />
                            {order.shippingPhone || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-green-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" /> Shipping Info
                        </h4>
                        <div className="space-y-1">
                          <p className="text-dark-300 text-xs">
                            {order.shippingAddress}
                          </p>
                          <p className="text-dark-300 text-xs">
                            {order.shippingCity}, {order.shippingState}
                          </p>
                          <p className="text-dark-300 text-xs">
                            PIN: {order.shippingPincode}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-purple-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" /> Delivery Info
                        </h4>
                        <div className="space-y-2">
                          {["packed", "return_requested", "return_pickup_out"].includes(order.status) ? (
                            <>{order.assignedTo ? (
                            <div>
                              <p className="text-white text-sm">
                                Assigned to: <span className="text-purple-400 font-medium">{order.deliveryExecutive?.name || `#${order.assignedTo.slice(-8).toUpperCase()}`}</span>
                              </p>
                              {onAssign && (
                                <div className="flex gap-2 mt-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {deliveryExecs.length > 0 && (
                                      <>
                                        <select
                                          value={assignSelections[order.id] || ""}
                                          onChange={(e) => setAssignSelections((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                          className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                                        >
                                          <option value="">Reassign to...</option>
                                          {deliveryExecs.filter((e) => e.id !== order.assignedTo).map((exec) => (
                                            <option key={exec.id} value={exec.id}>{exec.name}</option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => {
                                            if (assignSelections[order.id]) {
                                              onAssign(order.id, assignSelections[order.id]);
                                              setAssignSelections((prev) => ({ ...prev, [order.id]: "" }));
                                            }
                                          }}
                                          disabled={assigningId === order.id || !assignSelections[order.id]}
                                          className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                        >
                                          Assign
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => { onAssign(order.id, ""); }}
                                      disabled={assigningId === order.id}
                                      className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                    >
                                      {assigningId === order.id ? "Removing..." : "Unassign"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-dark-400 text-sm">Not assigned</p>
                              {onAssign && (
                                <div className="flex gap-2">
                                  <select
                                    value={assignSelections[order.id] || ""}
                                    onChange={(e) => setAssignSelections((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                    className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                                  >
                                    <option value="">Select delivery exec...</option>
                                    {deliveryExecs.map((exec) => (
                                      <option key={exec.id} value={exec.id}>{exec.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      if (assignSelections[order.id]) {
                                        onAssign(order.id, assignSelections[order.id]);
                                        setAssignSelections((prev) => ({ ...prev, [order.id]: "" }));
                                      }
                                    }}
                                    disabled={assigningId === order.id || !assignSelections[order.id]}
                                    className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {assigningId === order.id ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Assigning</>
                                    ) : (
                                      <><UserCheck className="w-3 h-3" /> Assign</>
                                    )}
                                  </button>
                                </div>
                              )}
                              {!onAssign && (
                                <p className="text-dark-500 text-xs">Login as admin to assign</p>
                              )}
                            </div>
                          )}</>
                          ) : (
                            <div>
                              <p className="text-dark-400 text-sm">
                                  {order.assignedTo ? <>Assigned to: <span className="text-purple-400 font-medium">{order.deliveryExecutive?.name || `#${order.assignedTo.slice(-8).toUpperCase()}`}</span></> : (order.status === "delivered" || order.status === "returned") ? "Order completed — no assignment needed" : order.status === "confirmed" ? "Mark order as packed to assign a delivery executive" : "Assignment not available for this order status"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                      {/* Return approval */}
                      {order.status === "return_requested" && (
                        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                          <h4 className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2">Return Request</h4>
                          {order.returnReason && <p className="text-[11px] text-dark-400 mb-2">Reason: {order.returnReason}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => onReturnApprove?.(order.id, "approve")} className="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                              Approve Return
                            </button>
                            <button onClick={() => onReturnApprove?.(order.id, "reject")} className="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" /> Items
                      </h4>

                      {/* Store items — per-item status */}
                      {order.items?.some((it: any) => it.source !== "mart") && (
                        <div>
                          <p className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-gold" /> Store Items
                          </p>
                          <div className="space-y-2">
                            {order.items?.map((item: any, idx: number) => {
                              if (item.source === "mart") return null;
                              const itemStatus = item.status || "pending";
                              return (
                                <div key={idx} className="p-3 rounded-lg bg-dark-900/30 space-y-2">
                                  <div className="flex items-center gap-3">
                                    {item.image ? (
                                      <img src={resolveImageUrl(item.image)} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                                        <Package size={16} className="text-dark-600" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-white text-sm truncate">{item.name}</p>
                                        {storeItemCount > 1 ? (
                                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                            statusColors[itemStatus as keyof typeof statusColors] || "text-dark-400 bg-dark-800 border-dark-700"
                                          }`}>
                                            {itemStatus.replace(/_/g, " ")}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-dark-500">Single item — uses order status</span>
                                        )}
                                      </div>
                                      <p className="text-dark-500 text-xs">Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}</p>
                                    </div>
                                    <span className="text-white text-sm font-medium">{formatPrice(item.price * (item.quantity || 1))}</span>
                                  </div>
                                  {storeItemCount > 1 && order.paymentStatus !== "PENDING" && itemStatus !== "delivered" && itemStatus !== "cancelled" && itemStatus !== "returned" && (
                                    <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-13">
                                      {statuses.filter((s) => s !== "return_requested").map((st) => (
                                        <button
                                          key={st}
                                          disabled={updatingId === order.id || itemStatus === st}
                                          onClick={() => handleItemStatusChange(order.id, idx, st)}
                                          className={`text-[9px] font-medium px-2 py-1 rounded-md border transition-all disabled:opacity-50 ${
                                            itemStatus === st
                                              ? `${statusColors[st as keyof typeof statusColors]} ring-1 ring-gold-500/20`
                                              : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
                                          }`}
                                        >
                                          {st.charAt(0).toUpperCase() + st.slice(1).replace(/_/g, " ")}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mart items — follow overall order status */}
                      {order.items?.some((it: any) => it.source === "mart") && (
                        <div>
                          <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Mart Items
                          </p>
                          <div className="space-y-2">
                            {order.items?.map((item: any, idx: number) => {
                              if (item.source !== "mart") return null;
                              return (
                                <div key={idx} className="p-3 rounded-lg bg-dark-900/30">
                                  <div className="flex items-center gap-3">
                                    {item.image ? (
                                      <img src={resolveImageUrl(item.image)} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                                        <Package size={16} className="text-dark-600" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-white text-sm truncate">{item.name}</p>
                                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Mart</span>
                                      </div>
                                      <p className="text-dark-500 text-xs">Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}</p>
                                    </div>
                                    <span className="text-white text-sm font-medium">{formatPrice(item.price * (item.quantity || 1))}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-amber-400/60 mt-2 italic">Mart items follow the overall order status below</p>
                        </div>
                      )}
                    </div>

                    {/* Order Status — controls everything */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {order.paymentStatus !== "PENDING" ? (
                      <div className="space-y-2">
                        <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold">
                          Order Status
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {statuses.map((status) => (
                            <button
                              key={status}
                              disabled={updatingId === order.id || order.status === status}
                              onClick={() => handleStatusChange(order.id, status)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                                order.status === status
                                  ? `${statusColors[status as keyof typeof statusColors]} ring-1 ring-gold-500/20`
                                  : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                      ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-400 font-medium">Approve payment to update status</span>
                      </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-2">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-gold-400" />
                          <div>
                            <div className="text-xs text-dark-500">Payment</div>
                            <div className="text-gold-400 text-sm font-medium">
                              {order.paymentMethod === "ONLINE" ? "Online" : order.paymentMethod || "N/A"}
                              <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                order.paymentStatus === "APPROVED"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : order.paymentStatus === "FAILED" || order.paymentStatus === "EXPIRED"
                                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              }`}>
                                {order.paymentStatus || "PENDING"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {order.transactionId && (
                          <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-amber-400" />
                            <div>
                              <div className="text-xs text-dark-500">Transaction ID</div>
                              <div className="text-amber-400 text-sm font-mono font-medium">{order.transactionId}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${getOrderSource(order) === "mart" ? "bg-emerald-500" : getOrderSource(order) === "mediverse" ? "bg-violet-500" : "bg-gold"}`} />
                          <div>
                            <div className="text-xs text-dark-500">Source</div>
                            <div className={`text-sm font-medium ${getOrderSource(order) === "mart" ? "text-emerald-400" : getOrderSource(order) === "mediverse" ? "text-violet-400" : "text-gold-400"}`}>
                              {getOrderSource(order) === "mart" ? "Mart" : getOrderSource(order) === "mediverse" ? "Mediverse" : "Store"}
                            </div>
                          </div>
                        </div>
                        {order.deliveryMode && (getOrderSource(order) === "mart" || getOrderSource(order) === "mediverse") && (
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${order.deliveryMode === "express" ? "bg-emerald-500" : order.deliveryMode === "regular" ? "bg-violet-500" : "bg-sky-500"}`} />
                            <div>
                              <div className="text-xs text-dark-500">Delivery</div>
                              <div className={`text-sm font-medium ${order.deliveryMode === "express" ? "text-emerald-400" : order.deliveryMode === "regular" ? "text-violet-400" : "text-sky-400"}`}>
                                {order.deliveryMode === "express" ? "10 Min Express" : order.deliveryMode === "regular" ? "3-5 Days Regular" : "30 Min Standard"}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="border-l border-dark-700 pl-3 ml-1">
                          <div className="text-xs text-dark-500">Total</div>
                          <div className="text-white font-bold text-lg">{formatPrice(order.totalAmount || 0)}</div>
                        </div>
                        {getOrderSource(order) === "mediverse" && order.signatureData && (
                          <div className="flex flex-col gap-1 border-l border-dark-700 pl-3 ml-1">
                            <div className="text-xs text-dark-500">Signature</div>
                            <div className="rounded-lg border border-dark-700/50 bg-dark-800 p-1 inline-block">
                              <img src={resolveImageUrl(order.signatureData)} alt="Delivery signature" className="h-14" />
                            </div>
                            {order.signedAt && <div className="text-[9px] text-dark-600">{new Date(order.signedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                          </div>
                        )}
                        {getOrderSource(order) === "mediverse" && order.securityPhotos && Array.isArray(order.securityPhotos) && order.securityPhotos.length > 0 && (
                          <div className="flex flex-col gap-1 border-l border-dark-700 pl-3 ml-1">
                            <div className="text-xs text-dark-500">Security Photos</div>
                            {!unlockedOrders.has(order.id) ? (
                              photoUnlockTarget === order.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="password"
                                    value={photoPasswordInput}
                                    onChange={(e) => setPhotoPasswordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        if (photoPasswordInput === "0811") {
                                          setUnlockedOrders((prev) => new Set(prev).add(order.id));
                                          setPhotoUnlockTarget(null);
                                          setPhotoPasswordInput("");
                                        } else {
                                          setPhotoPasswordInput("");
                                        }
                                      }
                                      if (e.key === "Escape") { setPhotoUnlockTarget(null); setPhotoPasswordInput(""); }
                                    }}
                                    placeholder="PIN"
                                    autoFocus
                                    className="w-16 px-2 py-1 rounded text-[10px] bg-dark-800 border border-dark-600 text-white focus:border-gold focus:outline-none"
                                  />
                                  <button onClick={() => { setPhotoUnlockTarget(null); setPhotoPasswordInput(""); }} className="text-[9px] text-dark-500 hover:text-dark-300">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setPhotoUnlockTarget(order.id)} className="text-[9px] text-gold hover:text-gold-light cursor-pointer font-medium">
                                  {order.securityPhotos.length} photo{order.securityPhotos.length > 1 ? "s" : ""} — Enter PIN to view
                                </button>
                              )
                            ) : (
                              <div className="flex gap-1">
                                {order.securityPhotos.slice(0, 3).map((photo: string, idx: number) => (
                                  <button key={idx} onClick={() => setLightboxPhoto(photo)} className="cursor-pointer">
                                    <img src={resolveImageUrl(photo)} alt={`Security photo ${idx + 1}`} className="h-14 w-14 object-cover rounded-lg border border-dark-700/50 hover:border-gold/50 transition-colors" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {order.paymentStatus === "PENDING" && order.status !== "cancelled" && onPaymentAction && !["COD", "UPI_DELIVERY"].includes(order.paymentMethod) && (
                          <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-dark-700 sm:pl-3 sm:ml-1">
                            <button
                              onClick={() => setPendingPaymentAction({ orderId: order.id, action: "approve" })}
                              disabled={updatingId === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve Payment
                            </button>
                            <button
                              onClick={() => setPendingPaymentAction({ orderId: order.id, action: "reject" })}
                              disabled={updatingId === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Reject
                            </button>
                          </div>
                        )}
                        {order.paymentStatus === "PENDING" && order.status !== "cancelled" && !onPaymentAction && !["COD", "UPI_DELIVERY"].includes(order.paymentMethod) && (
                          <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium uppercase"><Clock className="w-3 h-3" /> Payment approval required</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!pendingStatusAction}
        title="Cancel Order?"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Yes, Cancel Order"
        variant="danger"
        onConfirm={() => {
          if (pendingStatusAction) onStatusUpdate(pendingStatusAction.orderId, pendingStatusAction.status);
          setPendingStatusAction(null);
        }}
        onCancel={() => setPendingStatusAction(null)}
      />
      <ConfirmModal
        open={!!pendingPaymentAction}
        title={pendingPaymentAction?.action === "approve" ? "Approve Payment?" : "Reject Payment?"}
        message={
          pendingPaymentAction?.action === "approve"
            ? "Confirm that this payment has been received. The order will be marked as confirmed and the customer will be notified."
            : "Rejecting the payment will cancel this order and notify the customer. Are you sure?"
        }
        confirmLabel={pendingPaymentAction?.action === "approve" ? "Yes, Approve Payment" : "Yes, Reject Payment"}
        variant={pendingPaymentAction?.action === "approve" ? "default" : "danger"}
        onConfirm={() => {
          if (pendingPaymentAction) onPaymentAction?.(pendingPaymentAction.orderId, pendingPaymentAction.action);
          setPendingPaymentAction(null);
        }}
        onCancel={() => setPendingPaymentAction(null)}
      />
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightboxPhoto(null)}>
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">&times;</button>
          <img src={resolveImageUrl(lightboxPhoto)} alt="Security photo" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
