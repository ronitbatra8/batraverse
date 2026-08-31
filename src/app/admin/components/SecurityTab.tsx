/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  KeyRound,
  Globe,
  AlertTriangle,
  Search,
  Shield,
  Loader2,
  Mail,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useLight } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
  verified: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  failed: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  expired: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
};

const statusDot: Record<string, string> = {
  requested: "bg-yellow-500",
  verified: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  expired: "bg-red-500",
};

export default function SecurityTab() {
  const light = useLight();
  const [resets, setResets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/admin/security/password-resets");
      const list = Array.isArray(data?.resets) ? (data.resets as any[]) : (Array.isArray(data) ? data : []);
      setResets(list);
    } catch (err: any) {
      setError(err.message || "Failed to load password resets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return resets;
    const q = search.toLowerCase();
    return resets.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q)
    );
  }, [resets, search]);

  const total = resets.length;
  const completed = resets.filter((r) => r.status === "completed").length;
  const pending = resets.filter(
    (r) => r.status === "requested" || r.status === "verified"
  ).length;
  const failed = resets.filter(
    (r) => r.status === "failed" || r.status === "expired"
  ).length;

  const stats = [
    { label: "Total", value: total, icon: Shield, color: light ? "text-sapphire" : "text-gold-light", bg: light ? "bg-sapphire/5 border-sapphire/20" : "bg-gold/5 border-gold/20" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/5 border-green-500/20" },
    { label: "Pending", value: pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
    { label: "Failed", value: failed, icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/5 border-red-500/20" },
  ];

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              light ? "bg-sapphire/10 border-sapphire/20" : "bg-gold/10 border-gold/20"
            )}
          >
            <KeyRound className={cn("w-5 h-5", light ? "text-sapphire" : "text-gold-light")} />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", light ? "text-onyx" : "text-white")}>
              Security Audit
            </h2>
            <p className={cn("text-xs", light ? "text-onyx/50" : "text-white/50")}>
              Password reset attempts &amp; security overview
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={cn(
            "p-2 rounded-lg transition-colors",
            light
              ? "text-onyx/40 hover:text-sapphire hover:bg-sapphire/5"
              : "text-white/40 hover:text-gold-light hover:bg-gold/5"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn("rounded-2xl border p-5", s.bg)}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className={cn("text-xs font-medium uppercase tracking-wider", light ? "text-onyx/50" : "text-white/50")}>
                {s.label}
              </span>
            </div>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-onyx/30 dark:text-white/30" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors focus:outline-none",
            light
              ? "bg-white border border-black/10 text-onyx placeholder:text-onyx/35 focus:border-sapphire"
              : "bg-dark-800/60 border border-white/10 text-white placeholder:text-white/35 focus:border-gold-light"
          )}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className={cn("w-5 h-5 animate-spin", light ? "text-sapphire" : "text-gold-light")} />
          <span className={cn("text-sm", light ? "text-onyx/50" : "text-white/50")}>
            Loading security data...
          </span>
        </div>
      ) : error ? (
        <div className="text-center py-16 rounded-2xl border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cn(
            "text-center py-16 rounded-2xl border",
            light ? "bg-white border-black/10" : "bg-dark-900/60 border-white/10"
          )}
        >
          <KeyRound className={cn("w-12 h-12 mx-auto mb-3", light ? "text-onyx/20" : "text-white/20")} />
          <p className={cn("text-sm", light ? "text-onyx/40" : "text-white/40")}>
            {total === 0 ? "No password resets yet" : "No matching records"}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border overflow-hidden",
            light ? "bg-white border-black/10" : "bg-dark-900/60 border-white/10"
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold",
                    light ? "text-onyx/40 border-b border-black/10" : "text-white/40 border-b border-white/10"
                  )}
                >
                  <th className="text-left px-6 py-3">User</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">IP Address</th>
                  <th className="text-left px-4 py-3">Requested</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Verified</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reset) => (
                  <tr
                    key={reset.id}
                    className={cn(
                      "transition-colors",
                      light
                        ? "border-b border-black/5 hover:bg-sapphire/[0.03]"
                        : "border-b border-white/5 hover:bg-white/[0.02]"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                            light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold-light"
                          )}
                        >
                          {reset.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className={cn("font-medium text-sm truncate", light ? "text-onyx" : "text-white")}>
                            {reset.user?.name || "Unknown User"}
                          </p>
                          <p className={cn("text-xs truncate", light ? "text-onyx/40" : "text-white/40")}>
                            {reset.user?.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                          light
                            ? "bg-onyx/5 border-onyx/10 text-onyx/60"
                            : "bg-white/5 border-white/10 text-white/60"
                        )}
                      >
                        {reset.method === "sms" ? (
                          <Smartphone className="w-3 h-3" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        {reset.method || "email"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border capitalize",
                          statusColors[reset.status] || ""
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[reset.status] || "bg-gray-400")} />
                        {reset.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {reset.ipAddress ? (
                        <span className={cn("inline-flex items-center gap-1 text-xs", light ? "text-onyx/50" : "text-white/50")}>
                          <Globe className="w-3 h-3" />
                          {reset.ipAddress}
                        </span>
                      ) : (
                        <span className={cn("text-xs", light ? "text-onyx/25" : "text-white/25")}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("text-xs", light ? "text-onyx/50" : "text-white/50")}>
                        {fmtDate(reset.requestedAt || reset.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={cn("text-xs", light ? "text-onyx/50" : "text-white/50")}>
                        {fmtDate(reset.verifiedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={cn("text-xs", light ? "text-onyx/50" : "text-white/50")}>
                        {fmtDate(reset.completedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < total && (
            <div
              className={cn(
                "px-6 py-3 text-xs border-t",
                light ? "text-onyx/40 border-black/10" : "text-white/40 border-white/10"
              )}
            >
              Showing {filtered.length} of {total} records
            </div>
          )}
        </div>
      )}
    </div>
  );
}
