/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Eye, Phone, Trash2, Send, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { adminHeaders } from "./types";
import { API_URL } from "@/lib/api";
import { useConfirm } from "@/components/useConfirm";

const PV_STATUSES = ["requested", "confirmed", "completed", "cancelled"];

const pvStatusColors: Record<string, string> = {
  requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  confirmed: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function PrivateViewingTab({
  privateViewing,
  adminKey,
  setPrivateViewing,
}: {
  privateViewing: any;
  adminKey: string;
  setPrivateViewing: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  if (!privateViewing) return null;

  const pending = privateViewing.requests.filter((r: any) => r.status === "requested").length;

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
      <h2 className="text-2xl font-serif text-white">Private Viewing</h2>

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

      {privateViewing.requests.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <Eye className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No private viewing requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {privateViewing.requests.map((req: any) => {
            const isOpen = expandedId === req.id;
            return (
              <div
                key={req.id}
                className={`bg-dark-900/60 border rounded-2xl overflow-hidden transition-colors ${
                  !req.read
                    ? "border-gold-500/30 bg-gold-500/[0.02]"
                    : "border-dark-800/50"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : req.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-dark-800/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-gold-500/20 bg-gold-500/10">
                    <Phone className="w-4 h-4 text-gold-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{req.name}</p>
                      {!req.read && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border text-gold-400 bg-gold-500/10 border-gold-500/20">
                          New
                        </span>
                      )}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          pvStatusColors[req.status] || "text-dark-500 bg-dark-800/60 border-dark-700/50"
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.reply && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                          Replied
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5">
                      {req.phone}
                      {req.note ? <span className="text-dark-500"> · {req.note}</span> : null}
                    </p>
                    <p className="text-[10px] text-dark-500 mt-0.5">
                      Requested {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatus(req.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-900 border border-dark-800 text-dark-300 focus:border-gold-500/40 focus:outline-none transition-colors"
                    >
                      {PV_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-dark-900 text-dark-300">
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(req.id);
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-dark-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-4 border-t border-dark-800/30">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
