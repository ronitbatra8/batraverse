/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RefreshCw, LogOut, Shield, Sparkles, LayoutDashboard, Package, Users, MessageSquare, KeyRound, BarChart3, Newspaper, Truck, Store, Eye, CreditCard, Wallet, AlertTriangle, ShoppingCart, ClipboardList, Tags, Megaphone, Quote } from "lucide-react";
import { Tab } from "./types";

export const topNavItems: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Package },
  { key: "users", label: "Users", icon: Users },
  { key: "cards", label: "Cards & Wallet", icon: CreditCard },
  { key: "walletrequests", label: "Wallet Top-Ups", icon: Wallet },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "sellers", label: "Sellers", icon: Store },
  { key: "productcatalog", label: "Products", icon: ShoppingCart },
];

export const sideNavItems: { key: Tab; label: string; icon: any }[] = [
  { key: "categories", label: "Categories", icon: Tags },
  { key: "sellerrequests", label: "Seller Requests", icon: ClipboardList },
  { key: "featured", label: "Featured", icon: Sparkles },
  { key: "testimonials", label: "Testimonials", icon: Quote },
  { key: "ads", label: "Ads", icon: Megaphone },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "security", label: "Security", icon: KeyRound },
  { key: "newsletter", label: "Newsletter", icon: Newspaper },
  { key: "privateviewing", label: "Private Viewing", icon: Eye },
  { key: "violations", label: "Violations", icon: AlertTriangle },
];

export default function Sidebar({ tab, setTab, loading, onRefresh, onSignOut, badges }: {
  tab: Tab;
  setTab: (t: Tab) => void;
  loading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  badges: Partial<Record<Tab, number>>;
}) {
  return (
    <>
      {/* Top horizontal nav */}
      <div className="fixed inset-x-0 top-0 z-30 bg-dark-900/85 backdrop-blur-xl border-b border-gold-500/10 shadow-[0_1px_0_0_rgba(0,0,0,0.2)]">
        <div className="mx-auto flex max-w-[100rem] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 shrink-0 py-3 pr-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-[0_0_18px_rgba(212,175,55,0.22)]">
              <Shield size={16} className="text-dark-950" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-display font-bold leading-tight text-white">Owner Dashboard</p>
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-400">
                <Sparkles size={9} /> BATRAVERSE
              </p>
            </div>
          </div>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-hide mx-2 sm:mx-4">
            {topNavItems.map((item) => (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  tab === item.key
                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                    : "text-dark-400 hover:text-white hover:bg-dark-800/40 border border-transparent"
                }`}>
                <item.icon size={15} />
                <span>{item.label}</span>
                {badges[item.key] !== undefined && badges[item.key]! > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === item.key ? "bg-gold-500/20 text-gold-400" : "bg-dark-800 text-dark-400"}`}>{badges[item.key]}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onRefresh} title="Refresh data"
              className="w-9 h-9 rounded-xl text-dark-400 hover:text-gold-400 hover:bg-dark-800/40 flex items-center justify-center transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={onSignOut} title="Sign out"
              className="w-9 h-9 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Left side nav */}
      <aside className="fixed left-0 top-16 bottom-0 z-20 w-56 bg-dark-900/60 backdrop-blur-xl border-r border-gold-500/10 hidden lg:flex flex-col">
        <nav className="flex-1 flex flex-col gap-1 p-3 pt-4">
          {sideNavItems.map((item) => {
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all text-left ${
                  active
                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                    : "text-dark-400 hover:text-white hover:bg-dark-800/40 border border-transparent"
                }`}>
                <item.icon size={16} />
                <span className="flex-1">{item.label}</span>
                {badges[item.key] !== undefined && badges[item.key]! > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-gold-500/20 text-gold-400" : "bg-dark-800 text-dark-400"}`}>{badges[item.key]}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile side nav — horizontal bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden bg-dark-900/90 backdrop-blur-xl border-t border-gold-500/10">
        <div className="flex items-center justify-around px-2 py-2">
          {sideNavItems.map((item) => {
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all ${
                  active
                    ? "text-gold-400"
                    : "text-dark-500 hover:text-white"
                }`}>
                <item.icon size={16} />
                <span>{item.label.split(" ")[0]}</span>
                {badges[item.key] !== undefined && badges[item.key]! > 0 && (
                  <span className="absolute -mt-6 -mr-3 text-[8px] px-1 py-0.5 rounded-full bg-gold-500/20 text-gold-400">{badges[item.key]}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
