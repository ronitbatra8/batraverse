"use client";

import { useState, useEffect } from "react";
import { Eye, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Check } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { API_URL } from "@/lib/api";
import SiteLayout from "@/components/layout/SiteLayout";

interface PVRequest {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  reply: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  requested: { label: "Requested", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-sky-400 bg-sky-500/10 border-sky-500/20", icon: CheckCircle },
  completed: { label: "Completed", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
};

const TRACKING_STEPS = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "completed", label: "Completed", icon: Check },
];

function trackingIndex(status: string): number {
  if (status === "cancelled") return -1;
  const idx = TRACKING_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function PrivateViewingPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PVRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.phone) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/private-viewing/my?phone=${encodeURIComponent(user.phone)}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-gold-400" />
            </div>
            <h1 className="text-2xl font-serif text-white mb-2">Private Viewing Requests</h1>
            <p className="text-dark-400 text-sm mb-6">Sign in to view your private viewing requests and status.</p>
            <a
              href="/login"
              className="inline-block px-6 py-2.5 rounded-xl bg-gold-500 text-dark-950 text-sm font-semibold hover:bg-gold-400 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen bg-dark-950">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-white">Private Viewing Requests</h1>
              <p className="text-dark-400 text-xs">Track status and view replies from our team</p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-20 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
              <Eye className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm mb-2">No private viewing requests yet</p>
              <p className="text-dark-500 text-xs">Submit a request from the homepage and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const cfg = statusConfig[req.status] || statusConfig.requested;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={req.id}
                    className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-dark-500">
                          {new Date(req.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-dark-500">#{req.id.slice(-8).toUpperCase()}</p>
                    </div>

                    {req.status === "cancelled" ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                        <p className="text-xs text-red-400 font-medium">
                          This request was cancelled on {new Date(req.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-dark-400">
                          Request Tracking
                        </p>
                        <div className="flex items-start gap-0 overflow-x-auto">
                          {TRACKING_STEPS.map((step, i) => {
                            const isCompleted = i <= trackingIndex(req.status);
                            const isCurrent = i === trackingIndex(req.status);
                            const Icon = step.icon;
                            return (
                              <div key={step.key} className="relative flex flex-1 flex-col items-center">
                                {i > 0 && (
                                  <div className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${isCompleted ? "bg-emerald-500" : "bg-white/10"}`} />
                                )}
                                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${isCompleted ? "border-emerald-500 bg-emerald-500/10" : isCurrent ? "border-emerald-500 bg-emerald-500/10 animate-pulse" : "border-white/10 bg-dark-900/60"}`}>
                                  <Icon size={14} className={isCompleted ? "text-emerald-500" : "text-cream-dim/40"} />
                                </div>
                                <p className={`mt-2 text-center text-[8px] font-medium leading-tight ${isCompleted ? "text-emerald-500" : "text-cream-dim/40"}`}>
                                  {step.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {req.note && (
                      <div className="mb-3 bg-dark-950/50 rounded-xl px-4 py-2.5">
                        <p className="text-[10px] font-semibold text-dark-400 mb-1">Your Request</p>
                        <p className="text-xs text-dark-300">{req.note}</p>
                      </div>
                    )}

                    {req.reply && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-[11px] font-semibold text-emerald-400">Reply from Batra House</p>
                        </div>
                        <p className="text-xs text-dark-300 whitespace-pre-wrap">{req.reply}</p>
                      </div>
                    )}

                    {!req.reply && req.status === "requested" && (
                      <div className="flex items-center gap-2 text-dark-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <p className="text-[11px]">Awaiting response from our team</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
