/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Newspaper, UserCheck, UserX, Trash2, Eye, Phone, Send, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { adminHeaders } from "./types";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { useConfirm } from "@/components/useConfirm";

const PV_STATUSES = ["requested", "confirmed", "completed", "cancelled"] as const;

const pvColors: Record<string, { text: string; gradient: string; border: string }> = {
  requested: { text: "text-amber-400", gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/25" },
  confirmed: { text: "text-sky-400", gradient: "from-sky-500/15 to-sky-500/5", border: "border-sky-500/25" },
  completed: { text: "text-emerald-400", gradient: "from-emerald-500/15 to-emerald-500/5", border: "border-emerald-500/25" },
  cancelled: { text: "text-red-400", gradient: "from-red-500/15 to-red-500/5", border: "border-red-500/25" },
};

const pvPills: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-400",
  confirmed: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

export default function NewsletterTab({
  newsletter,
  privateViewing,
  adminKey,
  setNewsletter,
  setPrivateViewing,
}: {
  newsletter: any;
  privateViewing: any;
  adminKey: string;
  setNewsletter: React.Dispatch<React.SetStateAction<any>>;
  setPrivateViewing: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { confirm, prompt, ConfirmDialog, PromptDialog } = useConfirm();
  const [sub, setSub] = useState<"subscriptions" | "privateviewing">("subscriptions");
  const [pvStatus, setPvStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  if (!newsletter || !privateViewing) return null;

  const unsubscribed = newsletter.total - newsletter.active;
  const pending = privateViewing.requests.filter((r: any) => r.status === "requested").length;
  const filteredRequests = pvStatus === "all" ? privateViewing.requests : privateViewing.requests.filter((r: any) => r.status === pvStatus);

  const SUB_TABS = [
    { key: "subscriptions", label: "Subscriptions" },
    { key: "privateviewing", label: "Private Viewing" },
  ] as const;

  async function handleToggle(id: string) {
    try {
      const res = await fetch(`${API_URL}/newsletter/${id}/toggle`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setNewsletter((prev: any) => ({
        ...prev,
        active: prev.subscribers.filter((s: any) => s.id === id)[0]?.active
          ? prev.active - 1
          : prev.active + 1,
        subscribers: prev.subscribers.map((s: any) =>
          s.id === id ? { ...s, active: updated.active } : s
        ),
      }));
    } catch {}
  }

  async function handleDeleteSub(id: string) {
    if (!(await confirm("Delete this subscriber?"))) return;
    try {
      const res = await fetch(`${API_URL}/newsletter/${id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) return;
      setNewsletter((prev: any) => ({
        ...prev,
        total: prev.total - 1,
        active: prev.subscribers.find((s: any) => s.id === id)?.active
          ? prev.active - 1
          : prev.active,
        subscribers: prev.subscribers.filter((s: any) => s.id !== id),
      }));
    } catch {}
  }

  async function handleStatus(id: string, status: string) {
    try {
      const res = await fetch(`${API_URL}/private-viewing/${id}/status`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPrivateViewing((prev: any) => ({
        ...prev,
        unread: Math.max(0, prev.unread - (prev.requests.find((r: any) => r.id === id)?.read ? 0 : 1)),
        requests: prev.requests.map((r: any) => (r.id === id ? { ...r, ...updated } : r)),
      }));
    } catch {}
  }

  async function handleReply(id: string) {
    const text = replyTexts[id]?.trim();
    if (!text) return;
    setReplying(id);
    try {
      const res = await fetch(`${API_URL}/private-viewing/${id}/reply`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ reply: text }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPrivateViewing((prev: any) => ({
        ...prev,
        requests: prev.requests.map((r: any) => (r.id === id ? { ...r, reply: updated.reply, status: updated.status || "completed" } : r)),
      }));
      setReplyTexts((prev) => ({ ...prev, [id]: "" }));
    } catch {}
    setReplying(null);
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Delete this request?", { variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      const res = await fetch(`${API_URL}/private-viewing/${id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) return;
      setPrivateViewing((prev: any) => ({
        ...prev,
        total: prev.total - 1,
        unread: Math.max(0, prev.unread - (prev.requests.find((r: any) => r.id === id)?.read ? 0 : 1)),
        requests: prev.requests.filter((r: any) => r.id !== id),
      }));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Newsletter</h2>

      {/* Sub-nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sub === t.key
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                : "text-dark-400 hover:text-white border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "subscriptions" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-gold-400">{newsletter.total}</p>
              <p className="text-xs text-dark-400 mt-1">Total</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-emerald-400">{newsletter.active}</p>
              <p className="text-xs text-dark-400 mt-1">Active</p>
            </div>
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-dark-400">{unsubscribed}</p>
              <p className="text-xs text-dark-400 mt-1">Unsubscribed</p>
            </div>
          </div>

          {newsletter.subscribers.length === 0 ? (
            <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
              <Newspaper className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">No subscribers yet</p>
            </div>
          ) : (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
              <div className="divide-y divide-dark-800/30">
                {newsletter.subscribers.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-dark-800/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-dark-800/50 bg-dark-800/40">
                      {sub.active ? (
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <UserX className="w-4 h-4 text-dark-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{sub.email}</p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            sub.active
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-dark-500 bg-dark-800/60 border-dark-700/50"
                          }`}
                        >
                          {sub.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {sub.name && (
                        <p className="text-xs text-dark-400 mt-0.5">{sub.name}</p>
                      )}
                      <p className="text-[10px] text-dark-500 mt-0.5">
                        Joined {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(sub.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          sub.active
                            ? "text-amber-400 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20"
                            : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20"
                        }`}
                      >
                        {sub.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {sub === "privateviewing" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-gold-400">{privateViewing.total}</p>
              <p className="text-xs text-dark-400 mt-1">Total Requests</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-amber-400">{pending}</p>
              <p className="text-xs text-dark-400 mt-1">Pending</p>
            </div>
            <div className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/20 rounded-2xl p-5 text-center">
              <p className="text-2xl font-display font-bold text-sky-400">{privateViewing.unread}</p>
              <p className="text-xs text-dark-400 mt-1">Unread</p>
            </div>
          </div>

          {/* Status filter — OrdersTab-style */}
          <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
            {["all", ...PV_STATUSES].map((s) => {
              const count = s === "all"
                ? privateViewing.requests.length
                : privateViewing.requests.filter((r: any) => r.status === s).length;
              const c = pvColors[s] || pvColors.requested;
              return (
                <button
                  key={s}
                  onClick={() => { setPvStatus(s); setExpandedId(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pvStatus === s
                      ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                      : `${c.text} hover:text-white border border-transparent`
                  }`}
                >
                  <span className="capitalize">{s}</span>
                  <span className={`ml-1.5 text-[10px] ${pvStatus === s ? "text-gold-400/70" : "text-dark-500"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
              <Eye className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">No private viewing requests {pvStatus === "all" ? "" : `with status "${pvStatus}"`}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req: any) => {
                const isOpen = expandedId === req.id;
                const col = pvColors[req.status] || pvColors.requested;
                return (
                  <div
                    key={req.id}
                    className={`bg-gradient-to-r ${col.gradient} border ${col.border} rounded-xl overflow-hidden transition-colors`}
                  >
                    {/* Collapsed row — payout style */}
                    <div className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : req.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${col.gradient}`}>
                          <Phone size={16} className={col.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", pvPills[req.status])}>
                              {req.status}
                            </span>
                            <span className="text-white font-semibold text-sm truncate">{req.name}</span>
                            {req.reply && <span className="text-[10px] text-emerald-400 hidden sm:inline">· Replied</span>}
                          </div>
                          <p className="text-dark-400 text-xs mt-1 truncate">
                            {req.phone || "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-dark-500 text-[10px]">
                            {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(req.id);
                        }}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />
                        )}
                      </span>
                    </div>

                    {isOpen && (
                      <div className="px-4 sm:px-6 pb-4 border-t border-dark-800/30">
                        {/* Message the customer sent — dedicated section */}
                        {req.note ? (
                          <div className="mt-3 bg-sky-500/5 border border-sky-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                              <p className="text-[11px] font-semibold text-sky-400">Customer Message</p>
                            </div>
                            <p className="text-xs text-dark-200 whitespace-pre-wrap">{req.note}</p>
                          </div>
                        ) : (
                          <div className="mt-3 bg-dark-800/30 border border-dark-700/40 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-dark-400" />
                              <p className="text-[11px] font-semibold text-dark-400">Customer Message</p>
                            </div>
                            <p className="text-xs text-dark-500 italic">No message from the customer.</p>
                          </div>
                        )}

                        {req.reply && (
                          <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                              <p className="text-[11px] font-semibold text-emerald-400">Your Reply</p>
                            </div>
                            <p className="text-xs text-dark-300 whitespace-pre-wrap">{req.reply}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-dark-400 mb-1.5">
                            {req.reply ? "Send Another Reply" : "Reply to Request"}
                          </p>
                          <div className="flex gap-2">
                            <textarea
                              value={replyTexts[req.id] || ""}
                              onChange={(e) =>
                                setReplyTexts((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                              placeholder="Type your reply..."
                              rows={2}
                              className="flex-1 px-3 py-2 rounded-xl text-xs bg-dark-950 border border-dark-800 text-white placeholder-dark-500 focus:border-gold-500/40 focus:outline-none resize-none"
                            />
                            <button
                              onClick={() => handleReply(req.id)}
                              disabled={!replyTexts[req.id]?.trim() || replying === req.id}
                              className="px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-semibold hover:bg-gold-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed self-end"
                            >
                              {replying === req.id ? (
                                <span className="animate-pulse">Sending...</span>
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Status — single row, stays last like Orders */}
                        <div className="mt-4 border-t border-dark-800/30 pt-3">
                          <div className="space-y-2">
                            <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold">
                              Request Status
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {PV_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatus(req.id, s)}
                                  disabled={req.status === s}
                                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                                    req.status === s
                                      ? `${pvColors[s].text} bg-white/[0.04] border-white/10 ring-1 ring-gold-500/20`
                                      : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
                                  }`}
                                >
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
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
        </>
      )}
      {ConfirmDialog}
      {PromptDialog}
    </div>
  );
}