/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Sparkles, LayoutDashboard, Package, Users, Mail, MessageSquare, KeyRound, BarChart3, Newspaper, Truck, Store, CreditCard, IndianRupee, AlertTriangle, ShoppingCart, Megaphone, Quote, RefreshCw, LogOut, Menu, X } from "lucide-react";
import { Tab } from "./types";
import Brand from "@/components/brand/Brand";
import { cn } from "@/lib/utils";

export const topNavItems: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Package },
  { key: "users", label: "Users", icon: Users },
  { key: "mail", label: "Mail", icon: Mail },
  { key: "cards", label: "Cards & Wallet", icon: CreditCard },
  { key: "sellersystem", label: "Seller System", icon: Store },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "delivery", label: "Delivery", icon: Truck },
];

export const sideNavItems: { key: Tab; label: string; icon: any }[] = [
  { key: "productcatalog", label: "Products", icon: ShoppingCart },
  { key: "money", label: "Money", icon: IndianRupee },
  { key: "featured", label: "Featured", icon: Sparkles },
  { key: "testimonials", label: "Testimonials", icon: Quote },
  { key: "ads", label: "Ads", icon: Megaphone },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "security", label: "Security", icon: KeyRound },
  { key: "newsletter", label: "Newsletter", icon: Newspaper },
  { key: "violations", label: "Violations", icon: AlertTriangle },
];

/* Site-centre-link typography: small caps, wide tracking, underline on hover. */
const centreLink = "relative py-2 text-[11px] font-medium uppercase tracking-[0.3em] transition-colors duration-300";

export default function Sidebar({ tab, setTab, loading, onRefresh, onSignOut, badges, collapsed, onToggleCollapsed }: {
  tab: Tab;
  setTab: (t: Tab) => void;
  loading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  badges: Partial<Record<Tab, number>>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleOpen = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      if (collapsed) onToggleCollapsed();
    } else {
      setMobileOpen(true);
    }
  };

  const handleClose = () => {
    setMobileOpen(false);
    if (window.matchMedia("(min-width: 1024px)").matches && !collapsed) onToggleCollapsed();
  };

  const goToTab = (key: Tab) => {
    setTab(key);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {/* Top nav — mirrors the public Navbar floating pill (links only). The
          sidebar open button is a hamburger with its own dedicated slot in the
          pill's flex layout (mobile: always; desktop: only while collapsed). */}
      <div className={cn("pointer-events-none fixed inset-x-0 top-0 z-30 transition-[padding] duration-500 ease-in-out", collapsed ? "lg:pl-0" : "lg:pl-64")}>
        <nav className="pointer-events-auto relative mx-auto mt-3 flex h-16 w-[calc(100%-1.5rem)] max-w-[1400px] items-center rounded-2xl border px-3 backdrop-blur-2xl border-white/15 bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_-10px_rgba(0,0,0,0.6)] sm:w-[calc(100%-4rem)] sm:px-4">
          <button
            onClick={handleOpen}
            aria-label="Open sidebar"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cream-dim transition-colors hover:bg-white/10 hover:text-cream", collapsed ? "" : "lg:hidden")}
          >
            <Menu size={16} />
          </button>
          <ul className="flex flex-1 items-center justify-center gap-1 overflow-x-auto scrollbar-hide px-1 sm:gap-9">
            {topNavItems.map((item) => {
              const active = tab === item.key;
              return (
                <li key={item.key} className="pointer-events-auto shrink-0">
                  <button
                    onClick={() => goToTab(item.key)}
                    className={`group ${centreLink} ${active ? "text-gold-light" : "text-cream-dim hover:text-cream"}`}
                  >
                    {item.label}
                    {badges[item.key] !== undefined && badges[item.key]! > 0 && (
                      <span className={`ml-2 align-middle text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${active ? "bg-gold/15 text-gold-light border-gold/30" : "bg-white/5 text-cream-dim border-white/10"}`}>
                        {badges[item.key]}
                      </span>
                    )}
                    <span
                      className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-500 bg-gold ${active ? "w-full" : "w-0 group-hover:w-full"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Mobile backdrop — only when the drawer is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Full-height sidebar — frosted glass, gold hairline. Close button sits
          inside (top row), open button lives in the top pill. Slides smoothly and
          the content area padding follows on desktop. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gold/15 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(212,175,55,0.12),24px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"
        )}
      >
        <div className="flex w-full items-center justify-between gap-3 border-b border-gold/15 p-4">
          <div className="min-w-0 flex-1">
            <Brand size="md" />
          </div>
          <button
            onClick={handleClose}
            aria-label="Close sidebar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cream-dim transition-colors hover:bg-white/10 hover:text-cream"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sideNavItems.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => goToTab(item.key)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-300",
                  active
                    ? "bg-gold/15 text-gold-light border border-gold/25"
                    : "border border-transparent text-dark-400 hover:bg-white/5 hover:text-dark-200"
                )}
              >
                <item.icon size={16} strokeWidth={1.5} className={cn("shrink-0", active ? "text-gold-light" : "text-cream-dim group-hover:text-cream")} />
                <span className={cn("flex-1 truncate text-sm font-medium", active ? "text-gold-light" : "text-cream-dim group-hover:text-cream")}>
                  {item.label}
                </span>
                {badges[item.key] !== undefined && badges[item.key]! > 0 && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-gold/30 bg-gold/15 text-gold-light">
                    {badges[item.key]}
                  </span>
                )}
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-px rounded-full transition-all duration-500",
                    active ? "bg-gold opacity-100" : "bg-gold/50 opacity-0 group-hover:opacity-70"
                  )}
                />
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gold/15 p-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-dark-300 transition-all duration-200 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={18} className={`shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span className="truncate">{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}