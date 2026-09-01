/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Truck, UserCheck, UserX, ChevronDown, ChevronUp, Package, MapPin, Clock, LogIn, Search } from "lucide-react";
import { API, adminHeaders, statusColors } from "./types";
import { getAuth, getAuthJSON, setAuth, setAuthJSON } from "@/lib/authStorage";
import { formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";

export default function DeliveryExecTab({ adminKey }: { adminKey: string }) {
  const [execs, setExecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [execDetail, setExecDetail] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/api/admin/delivery-executives`, { headers: adminHeaders(adminKey) })
      .then(r => r.json()).then((data) => setExecs(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
  }, [adminKey]);

  const loadDetail = async (id: string) => {
    if (execDetail[id]) return;
    setDetailLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      setExecDetail(prev => ({ ...prev, [id]: data }));
    } catch {} finally {
      setDetailLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await fetch(`${API}/api/admin/users/${id}/approve`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ approved }),
      });
      setExecs(prev => prev.map(e => e.id === id ? { ...e, approved } : e));
    } catch {}
  };

  const handleAccess = async (userId: string) => {
    try {
      const res = await fetch(`${API}/api/admin/impersonate/${userId}`, {
        method: "POST", headers: adminHeaders(adminKey),
      });
      if (!res.ok) return;
      const { token, user } = await res.json();
      const accounts = getAuthJSON<{ token: string; user: unknown }[]>("bt-accounts") || [];
      const adminIdx = parseInt(getAuth("bt-current") || "0");
      accounts.push({ token, user });
      setAuthJSON("bt-accounts", accounts);
      setAuthJSON("bt-current", String(accounts.length - 1));
      setAuth("bt-token", token);
      setTimeout(() => {
        window.open(`${user.role === "SELLER" ? "/seller" : "/delivery"}?impersonate=${encodeURIComponent(token)}`, "_blank");
      }, 50);
      setTimeout(() => {
        setAuth("bt-current", String(adminIdx));
        setAuth("bt-token", (accounts[adminIdx] as { token?: string } | undefined)?.token || "");
      }, 2000);
    } catch {}
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    await loadDetail(id);
  };

  const withOrders = execs.filter(e => (e._count?.assignedOrders ?? 0) > 0).length;
  const approved = execs.filter(e => e.approved).length;
  const pending = execs.filter(e => !e.approved).length;

  const filtered = execs.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.phone?.includes(q);
  });

  const categories = [
    { key: "all", label: "All", count: execs.length, color: "text-white" },
    { key: "approved", label: "Approved", count: approved, color: "text-emerald-400" },
    { key: "pending", label: "Pending", count: pending, color: "text-amber-400" },
    { key: "active", label: "Active Orders", count: withOrders, color: "text-violet-400" },
  ];

  const [filter, setFilter] = useState("all");

  const display = filtered.filter(e => {
    if (filter === "all") return true;
    if (filter === "approved") return e.approved;
    if (filter === "pending") return !e.approved;
    if (filter === "active") return (e._count?.assignedOrders ?? 0) > 0;
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Truck className="text-gold-400" /> Delivery Executives</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 w-full sm:w-72"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilter(filter === cat.key ? "all" : cat.key)}
            className={`p-3 rounded-xl border text-center transition-all bg-gradient-to-br ${
              filter === cat.key
                ? cat.key === "approved"
                  ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30"
                  : cat.key === "pending"
                  ? "from-amber-500/15 to-amber-500/5 border-amber-500/30"
                  : cat.key === "active"
                  ? "from-violet-500/15 to-violet-500/5 border-violet-500/30"
                  : "from-sky-500/15 to-sky-500/5 border-sky-500/30"
                : "border-dark-800/50 from-dark-900/40 to-dark-900/20 hover:from-dark-800/30 hover:to-dark-800/10"
            }`}
          >
            <div className={`text-lg font-bold ${cat.color}`}>{cat.count}</div>
            <div className="text-xs text-dark-400">{cat.label}</div>
          </button>
        ))}
      </div>

      {display.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl"><Truck className="w-12 h-12 text-dark-600 mx-auto mb-3" /><p className="text-dark-400 text-sm">{execs.length === 0 ? "No delivery executives registered" : "No matching executives"}</p></div>
      ) : (
        <div className="space-y-3">
          {display.map((exec: any) => {
            const isExpanded = expandedId === exec.id;
            const detail = execDetail[exec.id];
            const orders = detail?.orders || [];
            const orderCount = exec._count?.assignedOrders ?? 0;
            const statusGrad = exec.approved ? "from-emerald-500/15 to-emerald-500/5" : "from-amber-500/15 to-amber-500/5";
            const statusBorder = exec.approved ? "border-l-emerald-400" : "border-l-amber-400";

            return (
              <div
                key={exec.id}
                className={`bg-gradient-to-r ${statusGrad} border border-dark-800/50 border-l-4 ${statusBorder} rounded-2xl overflow-hidden transition-all`}
              >
                <button
                  onClick={() => toggleExpand(exec.id)}
                  className="w-full px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${statusGrad} border border-dark-700/50`}>
                    {exec.approved ? <UserCheck className="w-5 h-5 text-emerald-400" /> : <UserX className="w-5 h-5 text-amber-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-white font-medium text-sm truncate">{exec.name}</span>
                      {exec.approved ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit bg-emerald-500/15 text-emerald-400">Approved</span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit bg-amber-500/15 text-amber-400">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-dark-400 text-xs flex-wrap">
                      <span>{exec.email}</span>
                      {exec.phone && <><span className="text-dark-600">&middot;</span><span>{exec.phone}</span></>}
                      <span className="text-dark-600">&middot;</span>
                      <span>{orderCount} order{orderCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />}
                </button>

                <div className="px-4 sm:px-6 pb-4 flex items-center gap-2 -mt-1">
                  <button onClick={(e) => { e.stopPropagation(); handleAccess(exec.id); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5" /> Access Account
                  </button>
                  {exec.approved ? (
                    <button onClick={(e) => { e.stopPropagation(); handleApprove(exec.id, false); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">Reject</button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleApprove(exec.id, true); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Approve</button>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 border-t border-dark-800/30">
                    {detailLoading[exec.id] ? (
                      <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>
                    ) : (
                      <>
                        <div className="pt-4 space-y-1">
                          <p className="text-xs text-dark-500">Joined {new Date(exec.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                          {detail?.phone && <p className="text-xs text-dark-400">Phone: {detail.phone}</p>}
                        </div>

                        <h4 className="text-xs text-purple-400 uppercase tracking-wider font-semibold mt-5 mb-3 flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" /> Assigned Orders ({orders.length})
                        </h4>

                        {orders.length === 0 ? (
                          <p className="text-dark-500 text-xs py-4 text-center">No orders assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {orders.map((order: any) => {
                              const statusColor = statusColors[order.status as keyof typeof statusColors] || "text-dark-400";
                              return (
                                <div key={order.id} className="bg-dark-900/40 border border-dark-800/30 rounded-xl p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-dark-500 font-mono">#{order.id?.slice(0, 8)}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>{order.status}</span>
                                  </div>
                                  <p className="text-sm text-white font-medium">{formatPrice(order.totalAmount)}</p>
                                  <div className="flex items-center gap-1.5 text-dark-400 text-xs">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {order.shippingAddress}, {order.shippingCity}
                                  </div>
                                  {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                      {item.image ? (
                                        <img src={resolveImageUrl(item.image)} alt={item.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-md bg-dark-800 flex items-center justify-center shrink-0">
                                          <Package size={12} className="text-dark-600" />
                                        </div>
                                      )}
                                      <span className="text-dark-500">{item.name} × {item.quantity} — {formatPrice(item.price * (item.quantity || 1))}</span>
                                    </div>
                                  ))}
                                  <p className="text-[10px] text-dark-600">
                                    <Clock className="inline w-3 h-3 mr-1" />
                                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
