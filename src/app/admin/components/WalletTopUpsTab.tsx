"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { CheckCircle, XCircle, Clock, Loader2, Wallet, Search, RefreshCw } from "lucide-react";

interface TopUpRequest {
  id: string;
  amount: number;
  transactionId: string;
  upiId: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
  user: { id: string; name: string; email: string; phone: string };
}

export default function WalletTopUpsTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const fetchTopUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiFetch(`/wallet/admin/all${params}`);
      setTopUps(data?.topUps || []);
    } catch {
      setTopUps([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchTopUps(); }, [fetchTopUps]);

  const handleApprove = async (id: string, adminNote?: string) => {
    setProcessingId(id);
    try {
      await apiFetch(`/wallet/admin/approve/${id}`, {
        method: "POST",
        body: JSON.stringify({ adminNote: adminNote || undefined }),
      });
      toast("Top-up approved and wallet credited!", "success");
      fetchTopUps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to approve", "error");
    }
    setProcessingId(null);
    setNoteModal(null);
    setNote("");
  };

  const handleReject = async (id: string, adminNote?: string) => {
    setProcessingId(id);
    try {
      await apiFetch(`/wallet/admin/reject/${id}`, {
        method: "POST",
        body: JSON.stringify({ adminNote: adminNote || undefined }),
      });
      toast("Top-up rejected.", "success");
      fetchTopUps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to reject", "error");
    }
    setProcessingId(null);
    setNoteModal(null);
    setNote("");
  };

  const filtered = topUps.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.user.name.toLowerCase().includes(q) || t.user.email.toLowerCase().includes(q) || t.transactionId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-gold-400" />
          <h2 className="text-white text-lg font-semibold">Wallet Top-Up Requests</h2>
        </div>
        <button onClick={fetchTopUps} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-dark-500 hover:text-white hover:border-white/20 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              filter === f ? "bg-gold-500/20 text-gold-400 border-gold-500/30" : "bg-dark-800 text-dark-500 border-dark-700 hover:text-white"
            }`}>
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, txn..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-dark-700 bg-dark-800 text-white text-xs w-48 focus:outline-none focus:border-gold-500/50" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-12">No top-up requests found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:border-dark-600/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{formatPrice(t.amount)}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      t.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      t.status === "REJECTED" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                      "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }`}>{t.status}</span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-dark-500">User: </span><span className="text-white">{t.user.name}</span></div>
                    <div><span className="text-dark-500">Email: </span><span className="text-white">{t.user.email}</span></div>
                    <div><span className="text-dark-500">Txn ID: </span><span className="text-gold-400 font-mono">{t.transactionId}</span></div>
                    <div><span className="text-dark-500">UPI: </span><span className="text-white">{t.upiId || "—"}</span></div>
                  </div>
                  <div className="mt-1 text-[10px] text-dark-500">
                    {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {t.adminNote && <div className="mt-1 text-[10px] text-amber-400 italic">Note: {t.adminNote}</div>}
                </div>

                {t.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleApprove(t.id)} disabled={processingId === t.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                      {processingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                    </button>
                    <button onClick={() => setNoteModal({ id: t.id, action: "reject" })} disabled={processingId === t.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">{noteModal.action === "approve" ? "Approve Top-Up" : "Reject Top-Up"}</h3>
            <p className="text-dark-500 text-xs mb-4">Add an optional note for this action.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..."
              className="w-full rounded-xl border border-dark-700 bg-dark-900 text-white text-sm p-3 h-20 focus:outline-none focus:border-gold-500/50 resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNoteModal(null)} className="px-4 py-2 rounded-lg border border-dark-700 text-dark-500 text-xs hover:text-white transition-colors">Cancel</button>
              <button onClick={() => noteModal.action === "approve" ? handleApprove(noteModal.id, note) : handleReject(noteModal.id, note)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${noteModal.action === "approve" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30" : "bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"}`}>
                {noteModal.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
