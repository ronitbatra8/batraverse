/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Users, Send, Check, AlertTriangle, Loader2 } from "lucide-react";
import { API, adminHeaders } from "./types";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "all", label: "All", desc: "Everyone" },
  { key: "USER", label: "Customers", desc: "Regular shoppers" },
  { key: "SELLER", label: "Sellers", desc: "Approved sellers" },
  { key: "DELIVERY", label: "Delivery Executive", desc: "Delivery partners" },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];

export default function MailTab({ adminKey }: { adminKey: string }) {
  const [group, setGroup] = useState<GroupKey>("all");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [countsByGroup, setCountsByGroup] = useState<Partial<Record<GroupKey, number>>>({});
  const [recipientsByGroup, setRecipientsByGroup] = useState<Partial<Record<GroupKey, any[]>>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  const loadAllGroups = useCallback(async () => {
    setLoadingList(true);
    try {
      const entries = await Promise.all(
        GROUPS.map(async (g) => {
          const data = await fetch(`${API}/api/admin/mail/recipients?role=${g.key}`, { headers: adminHeaders(adminKey) }).then((r) => r.json());
          return { key: g.key, users: Array.isArray(data.users) ? data.users : [] };
        })
      );
      const counts: Partial<Record<GroupKey, number>> = {};
      const lists: Partial<Record<GroupKey, any[]>> = {};
      for (const e of entries) {
        counts[e.key] = e.users.length;
        lists[e.key] = e.users;
      }
      setCountsByGroup(counts);
      setRecipientsByGroup(lists);
      setRecipients(lists[group] || []);
    } catch {}
    setLoadingList(false);
  }, [adminKey, group]);

  useEffect(() => {
    loadAllGroups();
  }, [loadAllGroups]);

  useEffect(() => {
    setRecipients(recipientsByGroup[group] || []);
    setResult(null);
  }, [group, recipientsByGroup]);

  const handleSend = async () => {
    setError("");
    setResult(null);
    if (subject.trim().length < 2) { setError("Subject must be at least 2 characters"); return; }
    if (message.trim().length < 3) { setError("Message must be at least 3 characters"); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/admin/mail/send`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ role: group, subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to send");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-white">Mail</h2>
        <span className="text-xs text-dark-400">Send a custom mail to a group</span>
      </div>

      {/* Audience sub-nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {GROUPS.map((g) => {
          const count = countsByGroup[g.key];
          return (
            <button
              key={g.key}
              onClick={() => { setGroup(g.key); setResult(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                group === g.key
                  ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                  : "text-dark-400 hover:text-white border border-transparent"
              )}
            >
              {g.label}
              {count !== undefined && (
                <span className={cn("ml-1.5 text-[10px]", group === g.key ? "text-gold-400/70" : "text-dark-500")}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold-400" />
            <h3 className="text-sm font-semibold text-white">Compose</h3>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-950/60 border border-dark-800/50 text-sm text-dark-300">
            <Users className="w-4 h-4 shrink-0 text-dark-400" />
            <span>
              Sending to <span className="text-white font-semibold">{GROUPS.find((g) => g.key === group)?.desc}</span> —{" "}
              <span className="text-gold-400 font-semibold">{loadingList ? "…" : recipients.length}</span> recipient{recipients.length === 1 ? "" : "s"}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Exclusive Private Sale"
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-dark-950 border border-dark-800 text-white placeholder-dark-500 focus:border-gold-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message…"
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-dark-950 border border-dark-800 text-white placeholder-dark-500 focus:border-gold-500/40 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {result && !error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-3.5 h-3.5 shrink-0" /> Sent to {result.sent} of {result.total}{result.failed > 0 ? ` — ${result.failed} failed` : ""}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950",
              sending && "opacity-60 cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : `Send to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {/* Recipients list */}
        <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recipients</h3>
            <span className="text-[10px] text-dark-500 uppercase tracking-wider">Approved accounts only</span>
          </div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-dark-800/30">
            {loadingList && recipients.length === 0 ? (
              <div className="py-12 text-center text-dark-500 text-sm">Loading…</div>
            ) : recipients.length === 0 ? (
              <div className="py-12 text-center text-dark-500 text-sm">No recipients in this group</div>
            ) : (
              recipients.map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-dark-800/60 border border-dark-700/50 text-gold-400 text-xs font-bold">
                    {(u.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.name || "—"}</p>
                    <p className="text-xs text-dark-500 truncate">{u.email}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    u.role === "USER" ? "text-sky-400 border-sky-500/20 bg-sky-500/10"
                    : u.role === "SELLER" ? "text-violet-400 border-violet-500/20 bg-violet-500/10"
                    : u.role === "ADMIN" ? "text-rose-300 border-rose-300/30 bg-rose-300/10"
                    : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                  )}>
                    {u.role === "USER" ? "Customer" : u.role === "SELLER" ? "Seller" : u.role === "ADMIN" ? "Owner" : "Delivery"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}