/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Newspaper, UserCheck, UserX, Trash2 } from "lucide-react";
import { adminHeaders } from "./types";
import { API_URL } from "@/lib/api";
import { useConfirm } from "@/components/useConfirm";

export default function NewsletterTab({
  newsletter,
  adminKey,
  setNewsletter,
}: {
  newsletter: any;
  adminKey: string;
  setNewsletter: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { confirm, prompt, ConfirmDialog, PromptDialog } = useConfirm();

  if (!newsletter) return null;

  const unsubscribed = newsletter.total - newsletter.active;

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

  async function handleDelete(id: string) {
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Newsletter</h2>

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
                    onClick={() => handleDelete(sub.id)}
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
      {ConfirmDialog}
      {PromptDialog}
    </div>
  );
}
