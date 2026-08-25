"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Loader2,
  Check,
  X,
  Search,
  ArrowRight,
  Clock,
  Shield,
  Crown,
  Sparkles,
  Gem,
  Star,
  ChevronDown,
  ChevronUp,
  Users,
  Mail,
  Phone,
  CalendarDays,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { API, adminHeaders } from "./types";

const LEVELS = {
  none: {
    name: "",
    icon: null,
    grad: "from-red-500/25 via-red-600/15 to-red-700/30",
    border: "border-l-red-400",
    text: "text-red-300",
    chip: "",
    badge: "",
    avatar: "from-red-500/40 to-red-700/30",
    initial: "text-red-300",
    selectBg: "bg-dark-800/60 border-dark-700/50",
    selectText: "text-dark-400",
  },
  bronze: {
    name: "BRONZE",
    icon: Shield,
    grad: "from-amber-600/25 via-amber-700/15 to-amber-800/30",
    border: "border-l-amber-500",
    text: "text-amber-300",
    chip: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    badge: "bg-amber-500/15 border border-amber-500/30 text-amber-300",
    avatar: "from-amber-400/50 to-amber-600/40",
    initial: "text-amber-200",
    selectBg: "bg-amber-500/10 border-amber-500/30",
    selectText: "text-amber-300",
  },
  silver: {
    name: "SILVER",
    icon: Shield,
    grad: "from-slate-300/25 via-slate-400/15 to-slate-500/30",
    border: "border-l-slate-300/70",
    text: "text-slate-200",
    chip: "bg-slate-200/10 border border-slate-300/30 text-slate-200",
    badge: "bg-slate-300/15 border border-slate-300/30 text-slate-200",
    avatar: "from-slate-200/40 to-slate-400/30",
    initial: "text-slate-100",
    selectBg: "bg-slate-500/10 border-slate-400/30",
    selectText: "text-slate-300",
  },
  gold: {
    name: "GOLD",
    icon: Crown,
    grad: "from-gold-500/25 via-gold-400/15 to-gold-600/30",
    border: "border-l-gold-400",
    text: "text-gold-300",
    chip: "bg-gold-500/10 border border-gold-400/30 text-gold-300",
    badge: "bg-gold-500/15 border border-gold-400/30 text-gold-300",
    avatar: "from-gold-400/50 to-gold-600/40",
    initial: "text-gold-200",
    selectBg: "bg-gold-500/10 border-gold-400/30",
    selectText: "text-gold-400",
  },
  platinum: {
    name: "PLATINUM",
    icon: Sparkles,
    grad: "from-white/25 via-gray-100/15 to-gray-300/30",
    border: "border-l-gray-100",
    text: "text-gray-100",
    chip: "bg-white/10 border border-white/30 text-white",
    badge: "bg-white/15 border border-white/30 text-white",
    avatar: "from-white/50 to-gray-300/40",
    initial: "text-dark-900",
    selectBg: "bg-white/10 border-white/30",
    selectText: "text-gray-100",
  },
  diamond: {
    name: "DIAMOND",
    icon: Gem,
    grad: "from-sky-300/25 via-cyan-300/15 to-sky-500/30",
    border: "border-l-sky-300",
    text: "text-sky-200",
    chip: "bg-sky-400/10 border border-sky-300/30 text-sky-200",
    badge: "bg-sky-300/15 border border-sky-300/30 text-sky-200",
    avatar: "from-sky-300/50 to-sky-500/40",
    initial: "text-sky-100",
    selectBg: "bg-sky-400/10 border-sky-300/30",
    selectText: "text-sky-300",
  },
  black: {
    name: "BLACK",
    icon: Star,
    grad: "from-black via-dark-900 to-black",
    border: "border-l-white/70",
    text: "text-white",
    chip: "bg-white/10 border border-white/25 text-white",
    badge: "bg-white/15 border border-white/30 text-white",
    avatar: "from-white/25 to-black",
    initial: "text-white",
    selectBg: "bg-white/10 border-white/25",
    selectText: "text-white",
  },
  owner: {
    name: "OWNER",
    icon: Gem,
    grad: "from-rose-300/30 via-amber-200/15 to-rose-400/25",
    border: "border-l-rose-300",
    text: "text-rose-200",
    chip: "bg-rose-300/10 border border-rose-300/30 text-rose-200",
    badge: "bg-rose-300/15 border border-rose-300/30 text-rose-200",
    avatar: "from-rose-300/50 to-rose-400/40",
    initial: "text-rose-100",
    selectBg: "bg-rose-400/10 border-rose-300/30",
    selectText: "text-rose-300",
  },
} as const;

type LevelKey = keyof typeof LEVELS;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
};

interface UpgradeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  fromLevel: string;
  toLevel: string;
  duration: string;
  price: number;
  status: string;
  createdAt: string;
  note?: string;
}

interface UserCard {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  cardNumber: string | null;
  cardLevel: string | null;
  cardExpiry: string | null;
  approved: boolean;
  createdAt: string;
}

export default function CardManagement({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [users, setUsers] = useState<UserCard[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignLevel, setAssignLevel] = useState("silver");
  const [assignExpiry, setAssignExpiry] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");
  const [assignErr, setAssignErr] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/admin/card-upgrades?status=PENDING`, {
          headers: adminHeaders(adminKey),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!ctrl.signal.aborted && Array.isArray(data)) {
          setRequests(data);
        }
      } catch {}
      if (!ctrl.signal.aborted) setLoading(false);
    };
    load();
    return () => ctrl.abort();
  }, [adminKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch(`${API}/api/admin/users/cards`, {
          headers: adminHeaders(adminKey),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!ctrl.signal.aborted && Array.isArray(data)) {
          setUsers(data);
        }
      } catch {}
      if (!ctrl.signal.aborted) setUsersLoading(false);
    };
    loadUsers();
    return () => ctrl.abort();
  }, [adminKey]);

  const handleProcess = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch(`${API}/api/admin/card-upgrades/${id}/process`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : null) || "Failed to process request", "error");
    }
    setProcessingId(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignMsg("");
    setAssignErr("");
    if (!assignEmail.trim()) {
      setAssignErr("Email is required");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`${API}/api/admin/users/card-by-email`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({
          email: assignEmail.trim(),
          cardLevel: assignLevel,
          cardExpiry: assignExpiry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign card");
      setAssignMsg("Card level assigned successfully");
      setAssignEmail("");
      setAssignExpiry("");
      setTimeout(() => setAssignMsg(""), 3000);
    } catch (err: unknown) {
      setAssignErr(err instanceof Error ? err.message : "Failed");
    }
    setAssigning(false);
  };

  const filtered = requests.filter(
    (r) =>
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.cardNumber?.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === "all") return true;
    if (userFilter === "upgraded") return !!u.cardLevel && u.cardLevel !== "none";
    if (userFilter === "none") return !u.cardLevel || u.cardLevel === "none";
    if (userFilter === "expired") return !!u.cardExpiry && new Date(u.cardExpiry) < new Date();
    if (userFilter === "owner") return u.cardLevel === "owner";
    return true;
  });

  const countUpgraded = users.filter((u) => u.cardLevel && u.cardLevel !== "none").length;
  const countNone = users.filter((u) => !u.cardLevel || u.cardLevel === "none").length;
  const countExpired = users.filter((u) => u.cardExpiry && new Date(u.cardExpiry) < new Date()).length;
  const countFounder = users.filter((u) => u.cardLevel === "owner").length;

  const categories = [
    { key: "all", label: "All Users", count: users.length, color: "text-white" },
    { key: "upgraded", label: "Upgraded", count: countUpgraded, color: "text-gold-400" },
    { key: "none", label: "No Card", count: countNone, color: "text-dark-400" },
    { key: "expired", label: "Expired", count: countExpired, color: "text-amber-400" },
    { key: "owner", label: "Founder", count: countFounder, color: "text-rose-300" },
  ];

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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, cardLevel: newLevel } : u))
      );
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to update card level", "error");
    }
    setUpdatingUserId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedUser((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-gold-400" />
            Card Management
          </h2>
          <p className="text-dark-400 text-sm mt-1">
            Manage upgrade requests and assign card levels
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {requests.length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
              Ready to Process
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {requests.filter((r) => r.status === "PENDING").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-sky-400 uppercase tracking-wider font-semibold">
              Total Requests
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{requests.length}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Pending Upgrade Requests
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
            <span className="text-sm text-dark-400">Loading requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
            <CreditCard className="w-10 h-10 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">
              {requests.length === 0
                ? "No pending upgrade requests"
                : "No matching requests"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const fromMeta = LEVELS[req.fromLevel as LevelKey] || LEVELS.none;
              const toMeta = LEVELS[req.toLevel as LevelKey] || LEVELS.none;
              const FromIcon = fromMeta.icon;
              const ToIcon = toMeta.icon;
              return (
                <div
                  key={req.id}
                  className="bg-gradient-to-r from-dark-900/80 to-dark-900/60 border border-dark-800/50 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {req.userName}
                        </p>
                        <p className="text-dark-400 text-xs">{req.userEmail}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${STATUS_COLORS[req.status] || STATUS_COLORS.PENDING}`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-dark-800/40 rounded-xl p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${fromMeta.chip || LEVELS.none.chip}`}
                    >
                      {FromIcon && (
                        <FromIcon size={12} className={fromMeta.text} />
                      )}
                      {(req.fromLevel || "none").toUpperCase()}
                    </span>
                    <ArrowRight className="w-4 h-4 text-dark-500 shrink-0" />
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${toMeta.chip || LEVELS.none.chip}`}
                    >
                      {ToIcon && (
                        <ToIcon size={12} className={toMeta.text} />
                      )}
                      {req.toLevel.toUpperCase()}
                    </span>
                    <span className="ml-auto text-dark-400 text-xs">
                      {req.duration}
                    </span>
                    <span className="text-gold-400 font-semibold text-sm ml-2">
                      {formatPrice(req.price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-dark-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProcess(req.id, "reject")}
                        disabled={processingId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleProcess(req.id, "approve")}
                        disabled={processingId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white transition-all disabled:opacity-50"
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-dark-800/50 pt-8">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sky-400" />
          Manual Card Assignment
        </h3>
        <form
          onSubmit={handleAssign}
          className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-dark-400 uppercase tracking-wider mb-1.5 block">
                User Email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 uppercase tracking-wider mb-1.5 block">
                Card Level
              </label>
              <div className="relative">
                <select
                  value={assignLevel}
                  onChange={(e) => setAssignLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none"
                >
                  <option value="none">None</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                  <option value="diamond">Diamond</option>
                  <option value="black">Black</option>
                  <option value="owner">Founder</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 uppercase tracking-wider mb-1.5 block">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={assignExpiry}
                onChange={(e) => setAssignExpiry(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/50"
              />
            </div>
          </div>
          {assignMsg && (
            <p className="text-emerald-400 text-sm">{assignMsg}</p>
          )}
          {assignErr && <p className="text-red-400 text-sm">{assignErr}</p>}
          <button
            type="submit"
            disabled={assigning}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950 transition-all disabled:opacity-50"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Assigning...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Assign Card
              </>
            )}
          </button>
        </form>
      </div>

      <div className="border-t border-dark-800/50 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-400" />
            All Users Cards
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

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
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
                    : cat.key === "expired"
                    ? "from-amber-500/15 to-amber-500/5 border-amber-500/30"
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
            {filteredUsers.map((u) => {
              const level = (u.cardLevel && u.cardLevel in LEVELS ? u.cardLevel : "none") as LevelKey;
              const meta = LEVELS[level];
              const LevelIcon = meta.icon;
              const isExpanded = expandedUser === u.id;
              const isExpired = u.cardExpiry && new Date(u.cardExpiry) < new Date();

              return (
                <div
                  key={u.id}
                  className={`bg-gradient-to-r ${meta.grad} border border-dark-800/50 border-l-4 ${meta.border} rounded-2xl overflow-hidden transition-all`}
                >
                  <button
                    onClick={() => toggleExpand(u.id)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.avatar} border border-dark-700/50`}>
                      <span className={`text-sm font-bold ${meta.initial}`}>
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-white font-medium text-sm truncate">
                          {u.name}
                        </span>
                        {meta.name && LevelIcon && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.14em] border ${meta.chip}`}>
                            <LevelIcon size={11} />
                            {meta.name}
                          </span>
                        )}
                        <span className="text-dark-500 text-xs font-mono">
                          {u.cardNumber || "—"}
                        </span>
                        {isExpired && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border text-amber-400 bg-amber-500/10 border-amber-500/20">
                            EXPIRED
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                        <span className="text-dark-300 text-sm truncate flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-dark-500 shrink-0" />
                          {u.email}
                        </span>
                        {u.phone && (
                          <>
                            <span className="text-dark-500 text-sm hidden sm:block">&middot;</span>
                            <span className="text-dark-500 text-sm truncate hidden sm:flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-dark-500 shrink-0" />
                              {u.phone}
                            </span>
                          </>
                        )}
                        <span className="text-dark-500 text-sm hidden sm:block">&middot;</span>
                        <span className="text-dark-500 text-sm hidden sm:flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-dark-500 shrink-0" />
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-xs text-dark-400">
                        {u.role === "ADMIN" ? "Owner" : u.role === "SELLER" ? "Seller" : u.role === "DELIVERY" ? "Delivery" : "Customer"}
                      </div>
                      {u.cardExpiry && (
                        <div className={`text-xs mt-0.5 ${isExpired ? "text-amber-400" : "text-dark-400"}`}>
                          {isExpired ? "Expired" : `Exp ${new Date(u.cardExpiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                        </div>
                      )}
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-6 space-y-5 border-t border-dark-800/30 pt-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Card Details
                          </h4>
                          <div className="space-y-2">
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
                              <span className="text-xs text-dark-400">Expiry</span>
                              <span className={`text-sm ${isExpired ? "text-amber-400" : "text-white"}`}>
                                {u.cardExpiry
                                  ? new Date(u.cardExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                                  : "No expiry"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-dark-400">Role</span>
                              <span className="text-white text-sm">
                                {u.role === "ADMIN" ? "Owner" : u.role === "SELLER" ? "Seller" : u.role === "DELIVERY" ? "Delivery Executive" : "Customer"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-2">
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
                                {(["none", "silver", "gold", "platinum", "diamond", "black", "owner"] as const).map((lvl) => {
                                  const lvlMeta = LEVELS[lvl];
                                  const LvlIcon = lvlMeta.icon;
                                  const isActive = (u.cardLevel || "none") === lvl;
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
                                      {LvlIcon && <LvlIcon size={11} className={isActive ? lvlMeta.text : ""} />}
                                      {lvlMeta.name || "NONE"}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
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
      </div>
    </div>
  );
}
