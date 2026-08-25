/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { TrendingUp, Package, Users, CheckCircle2, Clock, ArrowUpRight, KeyRound, MessageSquare } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { statusColors, type Tab } from "./types";

export default function OverviewTab({ stats, orders, passwordResets, messages, onNavigate }: {
  stats: any;
  orders: any[];
  passwordResets: any[];
  messages: any;
  onNavigate: (tab: Tab, focusId?: string) => void;
}) {
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30", onClick: () => onNavigate("orders") },
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
            <h3 className="text-sm font-display font-bold text-white">Recent Orders</h3>
            <button onClick={() => onNavigate("orders")} className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors">View All <ArrowUpRight size={12} /></button>
          </div>
          {orders.length === 0 ? (
            <div className="py-12 text-center"><Package size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No orders yet</p></div>
          ) : (
            <div className="divide-y divide-dark-800/30">
              {orders.slice(0, 5).map((o: any) => (
                <div
                  key={o.id}
                  onClick={() => onNavigate("orders", o.id)}
                  className="px-6 py-3 flex items-center justify-between hover:bg-dark-800/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-dark-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-gold-400 transition-colors">{o.shippingName}</p>
                      <p className="text-xs text-dark-500">#{o.id.slice(-8)}</p>
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
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50">
            <h3 className="text-sm font-display font-bold text-white">Activity Feed</h3>
          </div>
          <div className="divide-y divide-dark-800/30 max-h-[400px] overflow-y-auto">
            {[
              ...orders.slice(0, 3).map((o: any) => ({ type: "order" as const, time: o.createdAt, data: o })),
              ...passwordResets.slice(0, 3).map((r: any) => ({ type: "security" as const, time: r.requestedAt || r.createdAt, data: r })),
              ...(messages?.messages || []).slice(0, 3).map((m: any) => ({ type: "message" as const, time: m.createdAt, data: m })),
            ].sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8).map((item: any, i: number) => (
              <div
                key={i}
                onClick={() => {
                  if (item.type === "order") onNavigate("orders", item.data.id);
                  else if (item.type === "security") onNavigate("security");
                  else if (item.type === "message") onNavigate("messages");
                }}
                className="px-6 py-3 flex items-start gap-3 hover:bg-dark-800/20 transition-colors cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  item.type === "order" ? "bg-sky-500/10 border border-sky-500/20" :
                  item.type === "security" ? "bg-red-500/10 border border-red-500/20" :
                  "bg-gold-500/10 border border-gold-500/20"
                }`}>
                  {item.type === "order" ? <Package size={14} className="text-sky-400" /> :
                   item.type === "security" ? <KeyRound size={14} className="text-red-400" /> :
                   <MessageSquare size={14} className="text-gold-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-dark-300">
                    {item.type === "order" && <><span className="text-white font-medium group-hover:text-gold-400 transition-colors">{item.data.shippingName}</span> placed an order <span className="text-dark-500">#{item.data.id.slice(-8)}</span></>}
                    {item.type === "security" && <><span className="text-white font-medium group-hover:text-gold-400 transition-colors">{item.data.user?.name || "User"}</span> — password reset <span className={`font-medium ${item.data.status === "completed" ? "text-emerald-400" : item.data.status === "failed" ? "text-red-400" : "text-amber-400"}`}>{item.data.status}</span></>}
                    {item.type === "message" && <><span className="text-white font-medium group-hover:text-gold-400 transition-colors">{item.data.name}</span> sent a message: <span className="text-dark-500">{item.data.subject}</span></>}
                  </p>
                  <p className="text-xs text-dark-600 mt-0.5">{new Date(item.time).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <ArrowUpRight size={12} className="text-dark-600 group-hover:text-gold-400 transition-colors shrink-0 mt-1" />
              </div>
            ))}
            {orders.length === 0 && passwordResets.length === 0 && (!messages?.messages || messages.messages.length === 0) && (
              <div className="py-12 text-center"><Clock size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No activity yet</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div
          onClick={() => onNavigate("messages")}
          className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 cursor-pointer hover:border-gold-500/20 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-bold text-white">Messages</h3>
            <span className="text-xs text-gold-400 flex items-center gap-1">View All <ArrowUpRight size={12} /></span>
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
              <p className="text-xl font-display font-bold text-emerald-400">{(messages?.messages || []).filter((m: any) => m.status === "replied").length}</p>
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
            <span className="text-xs text-gold-400 flex items-center gap-1">View All <ArrowUpRight size={12} /></span>
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
  );
}
