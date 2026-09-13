/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { TrendingUp, Package, Users, CheckCircle2, ArrowUpRight, KeyRound, MessageSquare, PackageCheck, PackageX } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";
import { statusColors, type Tab } from "./types";

function dailyOrderCounts(orders: any[]): { label: string; count: number }[] {
  const days: { label: string; count: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const count = orders.filter((o) => {
      const c = new Date(o.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && c.getDate() === d.getDate();
    }).length;
    days.push({ label: key, count });
  }
  return days;
}

export default function OverviewTab({ stats, orders, passwordResets, messages, stockSummary, onNavigate }: {
  stats: any;
  orders: any[];
  passwordResets: any[];
  messages: any;
  stockSummary: any;
  onNavigate: (tab: Tab, focusId?: string) => void;
}) {
  if (!stats) return null;

  const daily = dailyOrderCounts(orders);
  const maxDayCount = Math.max(1, ...daily.map((d) => d.count));
  const dailyTotal = daily.reduce((sum, x) => sum + x.count, 0);
  const stock = stockSummary || { total: 0, inStock: 0, outOfStock: 0, inStockPct: 0, outOfStockPct: 0, byCategory: [] };
  const maxCat = Math.max(1, ...stock.byCategory.map((c: any) => c.total));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30", onClick: () => onNavigate("money") },
          { label: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-sky-400", bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30", sub: `${stats.pendingOrders || 0} pending, ${stats.outForDeliveryOrders || 0} out for delivery`, onClick: () => onNavigate("orders") },
          { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30", onClick: () => onNavigate("users") },
          { label: "Delivered", value: stats.deliveredOrders, icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30", sub: `${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}% rate`, onClick: () => onNavigate("orders") },
        ].map((s) => (
          <div
            key={s.label}
            onClick={s.onClick}
            className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all group`}
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className={s.color} />
              <ArrowUpRight size={14} className="text-white/0 group-hover:text-white/60 transition-colors" />
            </div>
            <p className="text-2xl font-display font-bold text-white">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs text-dark-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-sky-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Daily Orders</h3>
            <span className="text-xs text-dark-500">Last 5 days</span>
          </div>
          {orders.length === 0 ? (
            <div className="py-12 text-center"><Package size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No orders yet</p></div>
          ) : (
            <div className="p-6">
              <div className="flex items-end justify-between gap-3 h-44 border-b border-dark-800/40 pb-1">
                {daily.map((d) => {
                  return (
                    <div key={d.label} className="group flex flex-1 flex-col items-center justify-end h-full min-w-0">
                      <span className={`mb-1.5 text-[11px] font-display font-bold tabular-nums transition-all ${d.count > 0 ? "text-sky-300 opacity-0 group-hover:opacity-100" : "text-dark-600"}`}>
                        {d.count}
                      </span>
                      <div className="relative w-full max-w-[38px]">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 via-sky-500 to-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.25)] transition-all duration-500 ease-out"
                          style={{ height: `${Math.max(d.count > 0 ? 8 : 2, (d.count / maxDayCount) * 150)}px` }}
                        />
                        <div className="absolute inset-0 rounded-t-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-3 mt-3">
                {daily.map((d) => (
                  <div key={d.label} className="flex-1 text-center min-w-0">
                    <p className="text-[11px] text-dark-400 font-medium truncate">{d.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-3 mt-2 pt-3 border-t border-dark-800/30">
                <p className="text-xs text-dark-500">Total</p>
                <p className="text-sm font-display font-bold text-sky-300 tabular-nums">
                  {dailyTotal} order{dailyTotal === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-emerald-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Stock Analysis</h3>
            <button onClick={() => onNavigate("productcatalog")} className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors">Manage <ArrowUpRight size={12} /></button>
          </div>
          <div className="flex items-center gap-6 justify-center py-6">
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="3" strokeDasharray={`${stock.inStockPct}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PackageCheck size={20} className="text-emerald-400" />
                </div>
              </div>
              <p className="text-sm font-bold text-white mt-2">{stock.inStockPct}%</p>
              <p className="text-xs text-emerald-400 mt-0.5">In Stock ({stock.inStock})</p>
            </div>
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgb(248, 113, 113)" strokeWidth="3" strokeDasharray={`${stock.outOfStockPct}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PackageX size={20} className="text-red-400" />
                </div>
              </div>
              <p className="text-sm font-bold text-white mt-2">{stock.outOfStockPct}%</p>
              <p className="text-xs text-red-400 mt-0.5">Out of Stock ({stock.outOfStock})</p>
            </div>
          </div>
          <div className="px-6 pb-5 space-y-2">
            {stock.byCategory.slice(0, 4).map((c: any) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400 truncate">{c.category}</span>
                  <span className="text-white font-medium">{c.inStock}/{c.total}</span>
                </div>
                <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.max(c.total > 0 ? 3 : 0, (c.total / maxCat) * 100)}%` }} />
                </div>
              </div>
            ))}
            {stock.byCategory.length === 0 && <p className="text-dark-500 text-xs text-center py-2">No products yet</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div
          onClick={() => onNavigate("orders")}
          className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 cursor-pointer hover:border-gold-500/20 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-bold text-white">Recent Orders</h3>
            <span className="text-xs text-gold-400 flex items-center gap-1">View All <ArrowUpRight size={12} /></span>
          </div>
          <div className="divide-y divide-dark-800/30">
            {orders.slice(0, 5).map((o: any) => (
              <div
                key={o.id}
                onClick={(e) => { e.stopPropagation(); onNavigate("orders", o.id); }}
                className="px-0 py-3 flex items-center justify-between hover:bg-dark-800/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const firstItem: any = Array.isArray(o.items) ? o.items[0] : null;
                    const img = firstItem?.image;
                    return img ? (
                      <img src={resolveImageUrl(img)} alt={firstItem?.name || ""} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-dark-400" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-gold-400 transition-colors">{o.shippingName}</p>
                    <p className="text-xs text-dark-500">#{o.orderId || o.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{formatPrice(o.totalAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[o.status] || ""}`}>{o.status}</span>
                  </div>
                  <ArrowUpRight size={12} className="text-dark-600 group-hover:text-gold-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
          {orders.length === 0 && (
            <div className="py-8 text-center"><Package size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No orders yet</p></div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => onNavigate("messages")}
            className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 cursor-pointer hover:border-gold-500/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-bold text-white">Messages</h3>
              <MessageSquare size={16} className="text-gold-400" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-dark-800/50 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-white">{messages?.total || 0}</p>
                <p className="text-xs text-dark-500">Total</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-amber-400">{messages?.unread || 0}</p>
                <p className="text-xs text-dark-500">Unread</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-emerald-400">{Array.isArray(messages?.messages) ? (messages?.messages as any[]).filter((m: any) => m.status === "replied").length : 0}</p>
                <p className="text-xs text-dark-500">Replied</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => onNavigate("security")}
            className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 cursor-pointer hover:border-gold-500/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-bold text-white">Security</h3>
              <KeyRound size={16} className="text-gold-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-emerald-400">{passwordResets.filter((r: any) => r.status === "completed").length}</p>
                <p className="text-xs text-dark-500">Completed</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-amber-400">{passwordResets.filter((r: any) => r.status === "requested").length}</p>
                <p className="text-xs text-dark-500">Pending</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-red-400">{passwordResets.filter((r: any) => r.status === "failed" || r.status === "expired").length}</p>
                <p className="text-xs text-dark-500">Failed</p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-white">{passwordResets.length}</p>
                <p className="text-xs text-dark-500">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}