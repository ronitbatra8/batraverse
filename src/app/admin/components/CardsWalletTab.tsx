"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Wallet,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  Crown,
  Sparkles,
  Gem,
  Star,
  Plus,
  Minus,
  ListOrdered,
  RefreshCw,
  Save,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getEffectiveLevel } from "@/lib/levels";
import { useToast } from "@/components/Toast";
import { API, adminHeaders } from "./types";
import TopUpRequests from "./TopUpRequests";
import WalletHistory from "./WalletHistory";

const LEVELS = {
  none: {
    name: "",
    icon: null,
    grad: "from-red-500/25 via-red-600/15 to-red-700/30",
    border: "border-red-500/30",
    chip: "",
    avatar: "from-red-500/40 to-red-700/30",
    initial: "text-red-300",
    selectBg: "bg-dark-800/60 border-dark-700/50",
    selectText: "text-dark-400",
  },
  bronze: {
    name: "BRONZE",
    icon: Shield,
    grad: "from-amber-600/25 via-amber-700/15 to-amber-800/30",
    border: "border-amber-500/30",
    chip: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    avatar: "from-amber-400/50 to-amber-600/40",
    initial: "text-amber-200",
    selectBg: "bg-amber-500/10 border-amber-500/30",
    selectText: "text-amber-300",
  },
  silver: {
    name: "SILVER",
    icon: Shield,
    grad: "from-slate-300/25 via-slate-400/15 to-slate-500/30",
    border: "border-slate-300/30",
    chip: "bg-slate-200/10 border border-slate-300/30 text-slate-200",
    avatar: "from-slate-200/40 to-slate-400/30",
    initial: "text-slate-100",
    selectBg: "bg-slate-500/10 border-slate-400/30",
    selectText: "text-slate-300",
  },
  gold: {
    name: "GOLD",
    icon: Crown,
    grad: "from-gold-500/25 via-gold-400/15 to-gold-600/30",
    border: "border-gold-400/30",
    chip: "bg-gold-500/10 border border-gold-400/30 text-gold-300",
    avatar: "from-gold-400/50 to-gold-600/40",
    initial: "text-gold-200",
    selectBg: "bg-gold-500/10 border-gold-400/30",
    selectText: "text-gold-400",
  },
  platinum: {
    name: "PLATINUM",
    icon: Sparkles,
    grad: "from-white/25 via-gray-100/15 to-gray-300/30",
    border: "border-white/25",
    chip: "bg-white/10 border border-white/30 text-white",
    avatar: "from-white/50 to-gray-300/40",
    initial: "text-dark-900",
    selectBg: "bg-white/10 border-white/30",
    selectText: "text-gray-100",
  },
  diamond: {
    name: "DIAMOND",
    icon: Gem,
    grad: "from-sky-300/25 via-cyan-300/15 to-sky-500/30",
    border: "border-sky-300/30",
    chip: "bg-sky-400/10 border border-sky-300/30 text-sky-200",
    avatar: "from-sky-300/50 to-sky-500/40",
    initial: "text-sky-100",
    selectBg: "bg-sky-400/10 border-sky-300/30",
    selectText: "text-sky-300",
  },
  black: {
    name: "BLACK",
    icon: Star,
    grad: "from-black via-dark-900 to-black",
    border: "border-white/25",
    chip: "bg-white/10 border border-white/25 text-white",
    avatar: "from-white/25 to-black",
    initial: "text-white",
    selectBg: "bg-white/10 border-white/25",
    selectText: "text-white",
  },
  owner: {
    name: "OWNER",
    icon: Gem,
    grad: "from-rose-300/30 via-amber-200/15 to-rose-400/25",
    border: "border-rose-300/30",
    chip: "bg-rose-300/10 border border-rose-300/30 text-rose-200",
    avatar: "from-rose-300/50 to-rose-400/40",
    initial: "text-rose-100",
    selectBg: "bg-rose-400/10 border-rose-300/30",
    selectText: "text-rose-300",
  },
} as const;

type LevelKey = keyof typeof LEVELS;

interface UserCard {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  cardNumber: string | null;
  cardLevel: string | null;
  effectiveCardLevel?: string | null;
  approved: boolean;
  createdAt: string;
  walletBalance: number;
  peakWalletBalance: number;
}

export default function CardsWalletTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserCard[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [debitAmounts, setDebitAmounts] = useState<Record<string, string>>({});
  const [creditingId, setCreditingId] = useState<string | null>(null);
  const [debitingId, setDebitingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [view, setView] = useState<"users" | "requests" | "history">("users");
  const [cardNumberForm, setCardNumberForm] = useState<Record<string, { prefix: string; text: string; num: string }>>({});
  const [cardNumberBusy, setCardNumberBusy] = useState<string | null>(null);
  const [cardNumberError, setCardNumberError] = useState<Record<string, string>>({});

  useEffect(() => { setVisibleCount(50); }, [userSearch, userFilter]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users/cards`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {}
    setUsersLoading(false);
  };

  const handleLevelChange = async (userId: string, newLevel: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/card`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ cardLevel: newLevel }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                cardLevel: newLevel,
                ...(typeof data.peakWalletBalance === "number"
                  ? {
                      peakWalletBalance: data.peakWalletBalance,
                      effectiveCardLevel: getEffectiveLevel({ cardLevel: null, peakWalletBalance: data.peakWalletBalance, walletBalance: u.walletBalance ?? 0 }),
                    }
                  : {}),
              }
            : u
        )
      );
      toast(`Level set to ${newLevel.toUpperCase()}. Peak reset to ${formatPrice(data.peakWalletBalance ?? 0)}`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update card level", "error");
    }
    setUpdatingUserId(null);
  };

  const handleAdminCardNumber = async (userId: string, mode: "full" | "random") => {
    setCardNumberBusy(userId);
    setCardNumberError((prev) => ({ ...prev, [userId]: "" }));
    const form = cardNumberForm[userId] || { prefix: "", text: "", num: "" };
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/card-number`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ mode, customPrefix: form.prefix, customText: form.text, customNumber: form.num }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update card number");
      }
      const data = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, cardNumber: data.cardNumber } : u)));
      if (mode === "random") setCardNumberForm((prev) => ({ ...prev, [userId]: { prefix: "", text: "", num: "" } }));
      toast(`Card number updated to ${data.cardNumber}`, "success");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update card number";
      toast(message, "error");
      setCardNumberError((prev) => ({ ...prev, [userId]: message }));
    }
    setCardNumberBusy(null);
  };

  const setCardFormField = (userId: string, field: "prefix" | "text" | "num", value: string) => {
    setCardNumberForm((prev) => {
      const cur = prev[userId] || { prefix: "", text: "", num: "" };
      let v = value;
      if (field === "prefix" || field === "text") v = value.replace(/[^A-Za-z]/g, "").toUpperCase();
      if (field === "num") v = value.replace(/\D/g, "");
      return { ...prev, [userId]: { ...cur, [field]: v } };
    });
  };

  const handleCredit = async (userId: string, amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid positive amount", "error");
      return;
    }
    setCreditingId(userId);
    try {
      const res = await fetch(`${API}/api/wallet/admin/credit`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ userId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to credit wallet");
      toast(data.message || "Wallet credited", "success");
      setCreditAmounts((prev) => ({ ...prev, [userId]: "" }));
      const newPeak = typeof data.peakWalletBalance === "number" ? data.peakWalletBalance : undefined;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                walletBalance: data.newBalance,
                ...(newPeak !== undefined
                  ? {
                      peakWalletBalance: newPeak,
                      effectiveCardLevel: getEffectiveLevel({ cardLevel: u.cardLevel, peakWalletBalance: newPeak, walletBalance: data.newBalance }),
                    }
                  : {}),
              }
            : u
        )
      );
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to credit wallet", "error");
    }
    setCreditingId(null);
  };

  const handleDebit = async (userId: string, amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid positive amount", "error");
      return;
    }
    setDebitingId(userId);
    try {
      const res = await fetch(`${API}/api/wallet/admin/debit`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ userId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to debit wallet");
      toast(data.message || "Wallet debited", "success");
      setDebitAmounts((prev) => ({ ...prev, [userId]: "" }));
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, walletBalance: data.newBalance } : u)));
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to debit wallet", "error");
    }
    setDebitingId(null);
  };

  const levelOf = (u: UserCard) => {
    const cl = u.effectiveCardLevel || u.cardLevel || "none";
    return (cl in LEVELS ? cl : "none") as LevelKey;
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.cardNumber?.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === "all") return true;
    if (userFilter === "upgraded") return levelOf(u) !== "none";
    if (userFilter === "none") return levelOf(u) === "none";
    if (userFilter === "owner") return levelOf(u) === "owner";
    return true;
  });

  const visibleUsers = filteredUsers.slice(0, visibleCount);

  const countUpgraded = users.filter((u) => levelOf(u) !== "none").length;
  const countNone = users.filter((u) => levelOf(u) === "none").length;
  const countFounder = users.filter((u) => levelOf(u) === "owner").length;

  const categories = [
    { key: "all", label: "All Users", count: users.length, color: "text-white" },
    { key: "upgraded", label: "Upgraded", count: countUpgraded, color: "text-gold-400" },
    { key: "none", label: "No Card", count: countNone, color: "text-dark-400" },
    { key: "owner", label: "Owner", count: countFounder, color: "text-rose-300" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-gold-400" />
          Cards &amp; Wallet
        </h2>
        <p className="text-dark-400 text-sm mt-1">Manage member cards, wallet balances, top-up &amp; upgrade requests, and credit wallets manually</p>
      </div>

      <div className="flex items-center gap-2 border-b border-dark-800/50 pb-3">
        <button
          onClick={() => setView("users")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "users" ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-dark-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" /> All Users
        </button>
        <button
          onClick={() => setView("requests")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "requests" ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-dark-400 hover:text-white"
          }`}
        >
          <Wallet className="w-4 h-4" /> Top-Up Requests
        </button>
        <button
          onClick={() => setView("history")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "history" ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-dark-400 hover:text-white"
          }`}
        >
          <ListOrdered className="w-4 h-4" /> History
        </button>
      </div>

      {view === "requests" ? (
        <TopUpRequests adminKey={adminKey} />
      ) : view === "history" ? (
        <WalletHistory />
      ) : (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-400" />
            All Users
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setUserFilter(userFilter === cat.key ? "all" : cat.key)}
              className={`p-3 rounded-xl border text-center transition-all bg-gradient-to-br ${
                userFilter === cat.key
                  ? cat.key === "upgraded"
                    ? "from-gold-500/15 to-gold-500/5 border-gold-500/30"
                    : cat.key === "none"
                    ? "from-dark-700/30 to-dark-700/10 border-dark-500/30"
                    : cat.key === "owner"
                    ? "from-rose-500/15 to-rose-500/5 border-rose-500/30"
                    : "from-white/10 to-white/5 border-white/20"
                  : "border-dark-800/50 from-dark-900/40 to-dark-900/20 hover:from-dark-800/30 hover:to-dark-800/10"
              }`}
            >
              <div className={`text-lg font-bold ${cat.color}`}>{cat.count}</div>
              <div className="text-xs text-dark-400">{cat.label}</div>
            </button>
          ))}
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
            <span className="text-sm text-dark-400">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
            <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">
              {users.length === 0 ? "No users yet" : "No matching users"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleUsers.map((u) => {
              const level = levelOf(u);
              const meta = LEVELS[level];
              const LevelIcon = meta.icon;
              const isExpanded = expandedUser === u.id;

              return (
                <div
                  key={u.id}
                  className={`bg-gradient-to-r ${meta.grad} border ${meta.border} rounded-xl overflow-hidden transition-colors`}
                >
                  {/* Collapsed row — payout style */}
                  <div className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.avatar}`}>
                        <span className={`text-sm font-bold ${meta.initial}`}>
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {meta.name && LevelIcon && (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.14em] border ${meta.chip}`}>
                              <LevelIcon size={11} />
                              {meta.name}
                            </span>
                          )}
                          <span className="text-white font-semibold text-sm truncate">{u.name}</span>
                          <span className="text-[10px] text-dark-500 hidden sm:inline">· {u.cardNumber || "no card"}</span>
                        </div>
                        <p className="text-dark-400 text-xs mt-1 truncate">
                          {u.role === "ADMIN" ? "Owner" : u.role === "SELLER" ? "Seller" : u.role === "DELIVERY" ? "Delivery" : "Customer"}
                          <span className="text-dark-600 mx-1.5">&middot;</span>
                          {u.email}
                          {u.phone && (
                            <>
                              <span className="text-dark-600 mx-1.5">&middot;</span>
                              {u.phone}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-gold-400 flex items-center gap-1.5 justify-end">
                          <Wallet className="w-3.5 h-3.5 text-dark-500" />
                          {formatPrice(u.walletBalance ?? 0)}
                        </div>
                        <div className="text-[10px] text-dark-500 mt-0.5">Balance</div>
                      </div>
                    </button>
                    <span className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />
                      )}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-6 space-y-5 border-t border-dark-800/30 pt-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
                          <h4 className="text-xs text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Card Details
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-dark-400">Card Number</span>
                            <span className="text-white text-sm font-mono">{u.cardNumber || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-dark-400">Level</span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${meta.chip || LEVELS.none.chip}`}>
                              {LevelIcon && <LevelIcon size={11} />}
                              {meta.name || "NONE"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-dark-400">Role</span>
                            <span className="text-white text-sm">
                              {u.role === "ADMIN" ? "Owner" : u.role === "SELLER" ? "Seller" : u.role === "DELIVERY" ? "Delivery Executive" : "Customer"}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5" /> Wallet Balance
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-dark-400">Current</span>
                              <span className="text-white text-sm font-bold text-emerald-400">{formatPrice(u.walletBalance ?? 0)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-dark-400">Peak</span>
                              <span className="text-white text-sm font-bold text-sky-400">{formatPrice(u.peakWalletBalance ?? 0)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5" /> Manage Balance
                          </h4>

                          <div className="space-y-2">
                            <p className="text-[10px] text-dark-400 flex items-center gap-1.5">
                              <Plus className="w-3 h-3 text-emerald-400" /> Credit wallet manually
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={creditAmounts[u.id] || ""}
                                onChange={(e) => setCreditAmounts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                placeholder="Amount in ₹"
                                className="w-full px-3 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              />
                              <button
                                onClick={() => handleCredit(u.id, creditAmounts[u.id] || "")}
                                disabled={creditingId === u.id || !(creditAmounts[u.id] || "").trim()}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white transition-all disabled:opacity-50"
                              >
                                {creditingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {creditingId === u.id ? "Adding..." : "Add"}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-gold-500/10">
                            <p className="text-[10px] text-dark-400 flex items-center gap-1.5">
                              <Minus className="w-3 h-3 text-red-400" /> Remove money from wallet
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={debitAmounts[u.id] || ""}
                                onChange={(e) => setDebitAmounts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                placeholder="Amount in ₹"
                                className="w-full px-3 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-red-500/50"
                              />
                              <button
                                onClick={() => handleDebit(u.id, debitAmounts[u.id] || "")}
                                disabled={debitingId === u.id || !(debitAmounts[u.id] || "").trim()}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all disabled:opacity-50"
                              >
                                {debitingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
                                {debitingId === u.id ? "Removing..." : "Remove"}
                              </button>
                            </div>
                            <p className="text-[9px] text-dark-500">Cannot remove more than the current balance</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-sky-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" /> Change Card Level
                        </h4>
                        <div className="space-y-3">
                          {updatingUserId === u.id ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                              <span className="text-xs text-dark-400">Updating...</span>
                            </div>
                          ) : u.role === "ADMIN" ? (
                            <p className="text-[10px] text-dark-500">Owner card level cannot be changed here</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(["none", "bronze", "silver", "gold", "platinum", "diamond", "black"] as const).map((lvl) => {
                                const lvlMeta = LEVELS[lvl];
                                const LvlIcon = lvlMeta.icon;
                                const isActive = level === lvl;
                                return (
                                  <button
                                    key={lvl}
                                    onClick={() => !isActive && handleLevelChange(u.id, lvl)}
                                    disabled={isActive}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border transition-all ${
                                      isActive
                                        ? `${lvlMeta.chip || LEVELS.none.chip} ring-1 ring-white/20`
                                        : "border-dark-700/50 bg-dark-800/40 text-dark-400 hover:bg-dark-700/50 hover:text-white"
                                    }`}
                                  >
                                    {LvlIcon && <LvlIcon size={11} className={isActive ? lvlMeta.selectText : ""} />}
                                    {lvlMeta.name || "NONE"}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-violet-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" /> Card Number
                        </h4>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-dark-500">Current</span>
                          <span className="text-sm text-white font-mono truncate">{u.cardNumber || "—"}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              value={(cardNumberForm[u.id] || {}).prefix || ""}
                              onChange={(e) => setCardFormField(u.id, "prefix", e.target.value)}
                              placeholder="PREFIX"
                              maxLength={6}
                              className="w-24 px-2 py-2 bg-dark-800/60 border border-dark-700/50 rounded-lg text-white text-xs font-mono placeholder:text-dark-600 focus:outline-none focus:border-violet-500/50 text-center"
                            />
                            <span className="text-dark-600">-</span>
                            <input
                              value={(cardNumberForm[u.id] || {}).text || ""}
                              onChange={(e) => setCardFormField(u.id, "text", e.target.value)}
                              placeholder="TEXT"
                              maxLength={10}
                              className="flex-1 px-2 py-2 bg-dark-800/60 border border-dark-700/50 rounded-lg text-white text-xs font-mono placeholder:text-dark-600 focus:outline-none focus:border-violet-500/50 text-center"
                            />
                            <span className="text-dark-600">-</span>
                            <input
                              value={(cardNumberForm[u.id] || {}).num || ""}
                              onChange={(e) => setCardFormField(u.id, "num", e.target.value)}
                              placeholder="0000"
                              maxLength={6}
                              className="w-24 px-2 py-2 bg-dark-800/60 border border-dark-700/50 rounded-lg text-white text-xs font-mono placeholder:text-dark-600 focus:outline-none focus:border-violet-500/50 text-center"
                            />
                          </div>
                          {cardNumberError[u.id] && <p className="text-red-400 text-[10px]">{cardNumberError[u.id]}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAdminCardNumber(u.id, "full")}
                              disabled={cardNumberBusy === u.id}
                              className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg font-semibold text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white transition-all disabled:opacity-50"
                            >
                              {cardNumberBusy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              {cardNumberBusy === u.id ? "Saving..." : "Custom"}
                            </button>
                            <button
                              onClick={() => handleAdminCardNumber(u.id, "random")}
                              disabled={cardNumberBusy === u.id}
                              className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg font-semibold text-xs border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-all disabled:opacity-50"
                            >
                              {cardNumberBusy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              {cardNumberBusy === u.id ? "Generating..." : "Random"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {filteredUsers.length > visibleUsers.length && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setVisibleCount((c) => c + 50)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-dark-700 text-dark-300 text-sm hover:border-gold-500/40 hover:text-gold-400 transition-all"
            >
              Show more ({filteredUsers.length - visibleUsers.length} more)
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}