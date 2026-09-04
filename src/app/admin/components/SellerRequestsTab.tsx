"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, ClipboardList, User } from "lucide-react";
import { API, adminHeaders } from "./types";

interface CategoryRequest {
  id: string;
  sellerId: string;
  type: string;
  source: string;
  categoryName: string;
  subCategoryName: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
  seller: { name: string; email: string; shopName: string | null };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  denied: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function SellerRequestsTab({ adminKey }: { adminKey: string }) {
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/category-requests`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      console.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleProcess(id: string, action: "approve" | "deny") {
    setProcessing(id);
    try {
      const res = await fetch(`${API}/api/admin/category-requests/${id}/process`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to process request");
        return;
      }
      fetchRequests();
    } finally {
      setProcessing(null);
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">Seller Requests</h2>

      <div className="flex gap-2">
        {["pending", "approved", "denied", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === f ? "bg-gold-500/10 text-gold-400 border-gold-500/20" : "text-dark-400 border-dark-700/50 hover:text-dark-200"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ClipboardList className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${STATUS_STYLES[req.status] || ""}`}>
                      {req.status}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                      {req.type === "new_category" ? "New Category" : "New Subcategory"}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                      {req.source}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {req.categoryName}
                    {req.subCategoryName && <span className="text-dark-400"> / {req.subCategoryName}</span>}
                  </p>
                  {req.reason && <p className="text-dark-400 text-xs mt-1">Reason: {req.reason}</p>}
                  <div className="flex items-center gap-2 mt-2 text-dark-500 text-xs">
                    <User size={11} />
                    <span>{req.seller?.name || "Unknown"}</span>
                    <span>·</span>
                    <span>{req.seller?.shopName || req.seller?.email}</span>
                    <span>·</span>
                    <span>{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                {req.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleProcess(req.id, "approve")} disabled={processing === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                      {processing === req.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Approve
                    </button>
                    <button onClick={() => handleProcess(req.id, "deny")} disabled={processing === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50">
                      {processing === req.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
