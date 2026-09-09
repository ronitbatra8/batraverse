"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, ClipboardList, User, Megaphone, Tags } from "lucide-react";
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

interface AdRequest {
  id: string;
  sellerId: string;
  sellerName: string;
  img: string;
  tagline: string;
  line: string;
  href: string;
  page: string;
  duration: number;
  status: string;
  note: string;
  createdAt: string;
}

type View =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | { kind: "category"; type?: "new_category" | "new_subcategory" }
  | { kind: "ads"; page?: "store" | "mart" | "home" };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Reject",
  rejected: "Reject",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  denied: "text-red-400 bg-red-500/10 border-red-500/20",
  rejected: "text-red-400 bg-red-500/10 border-red-500/20",
};

const PRIMARY: { key: View; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Reject" },
  { key: { kind: "category" }, label: "Category" },
  { key: { kind: "ads" }, label: "Ads" },
];

const CAT_TYPES: { label: string; value: "new_category" | "new_subcategory" | undefined }[] = [
  { label: "Category", value: undefined },
  { label: "Subcategory", value: "new_subcategory" },
  { label: "New Category", value: "new_category" },
];

const AD_PAGES: { label: string; value: "store" | "mart" | "home" | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Store", value: "store" },
  { label: "Mart", value: "mart" },
  { label: "Home", value: "home" },
];

export default function SellerRequestsTab({ adminKey }: { adminKey: string }) {
  const [categories, setCategories] = useState<CategoryRequest[]>([]);
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("all");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, adRes] = await Promise.all([
        fetch(`${API}/api/admin/category-requests`, { headers: adminHeaders(adminKey) }),
        fetch(`${API}/api/admin/ad-requests`, { headers: adminHeaders(adminKey) }),
      ]);
      const [cats, adsData] = await Promise.all([catRes.json(), adRes.json()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setAds(Array.isArray(adsData) ? adsData : []);
    } catch {
      console.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleCategoryProcess(id: string, action: "approve" | "deny") {
    setProcessing(`cat:${id}`);
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

  async function handleAdApprove(id: string) {
    setProcessing(`ad:${id}`);
    try {
      const res = await fetch(`${API}/api/admin/ad-requests/${id}/approve`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to approve ad");
        return;
      }
      fetchRequests();
    } finally {
      setProcessing(null);
    }
  }

  async function handleAdReject(id: string) {
    setProcessing(`ad:${id}`);
    try {
      const res = await fetch(`${API}/api/admin/ad-requests/${id}/reject`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ note: notes[id] || "" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to reject ad");
        return;
      }
      setRejectOpenId(null);
      setNotes((prev) => { const next = { ...prev }; delete next[id]; return next; });
      fetchRequests();
    } finally {
      setProcessing(null);
    }
  }

  const matches = (r: CategoryRequest | AdRequest): boolean => {
    const kind = "type" in r ? "category" : "ads";
    const status = r.status;
    if (view === "all") return true;
    if (view === "pending") return status === "pending";
    if (view === "approved") return status === "approved";
    if (view === "rejected") return kind === "category" ? status === "denied" : status === "rejected";
    if (typeof view === "object") {
      if (view.kind === "category" && kind === "category") {
        if (view.type && (r as CategoryRequest).type !== view.type) return false;
        return true;
      }
      if (view.kind === "ads" && kind === "ads") {
        if (view.page && (r as AdRequest).page !== view.page) return false;
        return true;
      }
      return false;
    }
    return false;
  };

  const byDate = (a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const filteredCategories = categories.filter((r) => matches(r)).sort(byDate);
  const filteredAds = ads.filter((r) => matches(r)).sort(byDate);
  const total = filteredCategories.length + filteredAds.length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">Seller Requests</h2>

      {/* Primary sub-nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {PRIMARY.map((tab) => {
          const active = JSON.stringify(view) === JSON.stringify(tab.key);
          return (
            <button key={JSON.stringify(tab.key)} onClick={() => setView(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active ? "bg-gold-500/15 text-gold-400 border border-gold-500/20" : "text-dark-400 hover:text-white border border-transparent"
              }`}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Secondary sub-nav: Category / Subcategory */}
      {typeof view === "object" && view.kind === "category" && (
        <div className="flex flex-wrap gap-1 p-1 bg-dark-900/40 border border-dark-800/40 rounded-lg w-fit">
          {CAT_TYPES.map((opt) => (
            <button key={opt.label} onClick={() => setView({ kind: "category", type: opt.value })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view.type === opt.value ? "bg-gold-500/15 text-gold-400" : "text-dark-400 hover:text-white"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Secondary sub-nav: Store / Mart / Home */}
      {typeof view === "object" && view.kind === "ads" && (
        <div className="flex flex-wrap gap-1 p-1 bg-dark-900/40 border border-dark-800/40 rounded-lg w-fit">
          {AD_PAGES.map((opt) => (
            <button key={opt.label} onClick={() => setView({ kind: "ads", page: opt.value })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view.page === opt.value ? "bg-gold-500/15 text-gold-400" : "text-dark-400 hover:text-white"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ClipboardList className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No requests here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((r) => (
              <div key={r.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${STATUS_STYLES[r.status] || ""}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                        <Tags size={9} />
                        {r.type === "new_category" ? "New Category" : "New Subcategory"}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                        {r.source}
                      </span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      {r.categoryName}
                      {r.subCategoryName && <span className="text-dark-400"> / {r.subCategoryName}</span>}
                    </p>
                    {r.reason && <p className="text-dark-400 text-xs mt-1">Reason: {r.reason}</p>}
                    <div className="flex items-center gap-2 mt-2 text-dark-500 text-xs">
                      <User size={11} />
                      <span>{r.seller?.name || "Unknown"}</span>
                      <span>·</span>
                      <span>{r.seller?.shopName || r.seller?.email}</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleCategoryProcess(r.id, "approve")} disabled={processing === `cat:${r.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                        {processing === `cat:${r.id}` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Approve
                      </button>
                      <button onClick={() => handleCategoryProcess(r.id, "deny")} disabled={processing === `cat:${r.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50">
                        {processing === `cat:${r.id}` ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {filteredAds.map((r) => (
              <div key={r.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${STATUS_STYLES[r.status] || ""}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                        <Megaphone size={9} />
                        Ad
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">
                        {r.page === "store" ? "Store" : r.page === "mart" ? "Mart" : "Home"}
                      </span>
                    </div>
                    {r.tagline && <p className="text-white text-sm font-medium">{r.tagline}</p>}
                    {r.line && <p className="text-dark-400 text-xs mt-0.5">{r.line}</p>}
                    {r.href && <p className="text-dark-500 text-xs mt-0.5 truncate">Link: {r.href}</p>}
                    <div className="flex items-center gap-2 mt-2 text-dark-500 text-xs">
                      <User size={11} />
                      <span>{r.sellerName || "Unknown"}</span>
                      <span>·</span>
                      <span>{r.duration} days</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    {r.status === "rejected" && r.note && <p className="text-red-400/90 text-xs mt-1">Note: {r.note}</p>}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAdApprove(r.id)} disabled={processing === `ad:${r.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                          {processing === `ad:${r.id}` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Approve
                        </button>
                        {rejectOpenId === r.id ? (
                          <button onClick={() => handleAdReject(r.id)} disabled={processing === `ad:${r.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/25 transition-all disabled:opacity-50">
                            {processing === `ad:${r.id}` ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                            Confirm Reject
                          </button>
                        ) : (
                          <button onClick={() => setRejectOpenId(rejectOpenId === r.id ? null : r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all">
                            <X size={11} />
                            Reject
                          </button>
                        )}
                      </div>
                      {rejectOpenId === r.id && (
                        <input
                          value={notes[r.id] ?? r.note ?? ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Note visible to seller (optional)"
                          className="w-64 bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/40"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}