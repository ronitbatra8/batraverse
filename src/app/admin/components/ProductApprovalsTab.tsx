/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, PackageCheck, User, Store, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { API, adminHeaders } from "./types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { formatPrice } from "@/lib/utils";

interface PendingProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subCategory: string | null;
  source: string | null;
  price: number;
  originalPrice: number | null;
  description: string | null;
  images: unknown;
  colorOptions: unknown;
  inStock: boolean;
  badge: string | null;
  sellerPrice: number | null;
  createdAt: string;
  seller: { id: string; name: string; email: string; shopName: string | null };
}

interface EditState {
  expanded: boolean;
  price: string;
  originalPrice: string;
  name: string;
  description: string;
  inStock: boolean;
  badge: string;
  rejectOpen: boolean;
  rejectReason: string;
}

function imageOf(p: PendingProduct): string {
  const images = Array.isArray(p.images) ? p.images : [];
  if (images[0]) return String(images[0]);
  const colors = Array.isArray(p.colorOptions) ? p.colorOptions : [];
  for (const c of colors) {
    const cImgs = Array.isArray(c.images) ? c.images : [];
    if (cImgs[0]) return String(cImgs[0]);
  }
  return "";
}

function initialEdit(p: PendingProduct): EditState {
  return {
    expanded: false,
    price: String(p.price ?? p.sellerPrice ?? 0),
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : "",
    name: p.name || "",
    description: p.description || "",
    inStock: p.inStock !== false,
    badge: p.badge || "",
    rejectOpen: false,
    rejectReason: "",
  };
}

export default function ProductApprovalsTab({ adminKey, onCount }: { adminKey: string; onCount?: (n: number) => void }) {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/product-approvals`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setEdits((prev) => {
        const next: Record<string, EditState> = {};
        for (const p of list) next[p.id] = prev[p.id] || initialEdit(p);
        return next;
      });
      onCount?.(list.length);
    } catch {
      console.error("Failed to load product approvals");
    } finally {
      setLoading(false);
    }
  }, [adminKey, onCount]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function setEdit(id: string, patch: Partial<EditState>) {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || initialEdit(products.find((p) => p.id === id)!)), ...patch } }));
  }

  async function handleApprove(p: PendingProduct) {
    const e = edits[p.id];
    const price = Number(e?.price);
    if (price === null || price === undefined || Number.isNaN(price) || price < 0) {
      alert("Enter a valid sell price before approving");
      return;
    }
    setProcessing(p.id);
    try {
      const body: Record<string, unknown> = {
        price,
        name: e?.name || p.name,
        description: e?.description,
        inStock: e?.inStock === false ? false : true,
        badge: e?.badge,
      };
      if (e?.originalPrice && Number(e.originalPrice) >= 0) body.originalPrice = Number(e.originalPrice);
      const res = await fetch(`${API}/api/admin/product-approvals/${p.id}/approve`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to approve product");
        return;
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      onCount?.(Math.max(0, products.length - 1));
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(p: PendingProduct) {
    const e = edits[p.id];
    if (!e?.rejectOpen) {
      setEdit(p.id, { rejectOpen: true });
      return;
    }
    setProcessing(p.id);
    try {
      const res = await fetch(`${API}/api/admin/product-approvals/${p.id}/reject`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ reason: e?.rejectReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to reject product");
        return;
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      onCount?.(Math.max(0, products.length - 1));
    } finally {
      setProcessing(null);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Product Approvals</h2>
          <p className="text-xs text-dark-500 mt-0.5">
            Seller-added products wait here. Set your own sell price (delivery + your margin) and approve to go live.
          </p>
        </div>
        <button onClick={fetchProducts} className="px-3 py-2 rounded-lg text-xs font-medium border border-dark-700/50 text-dark-400 hover:text-white transition-all">
          Refresh
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <PackageCheck className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No products awaiting approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const e = edits[p.id] || initialEdit(p);
            const price = Number(e.price) || 0;
            const cost = p.sellerPrice != null && p.sellerPrice > 0 ? p.sellerPrice : 0;
            const margin = cost > 0 && price >= 0 ? price - cost : null;
            const isExpanded = e.expanded;
            return (
              <div key={p.id} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 cursor-pointer hover:bg-dark-800/20 transition-colors"
                  onClick={() => setEdit(p.id, { expanded: !e.expanded })}
                >
                  <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center overflow-hidden shrink-0">
                    {imageOf(p) ? (
                      <img src={resolveImageUrl(imageOf(p))} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-dark-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Pending
                      </span>
                      {p.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30">
                          {p.badge}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                        {p.source === "mart" ? "Mart" : "Store"}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate mt-1">{p.name}</h3>
                    <p className="text-xs text-dark-500 truncate">
                      {p.brand || "Unknown brand"}
                      {p.category ? ` / ${p.category}` : ""}
                      {p.subCategory ? ` / ${p.subCategory}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-dark-500">Seller price</p>
                    <p className="text-sm font-semibold text-white">{formatPrice(cost)}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-dark-500">Your price</p>
                    <p className="text-sm font-semibold text-gold-400">{formatPrice(price)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-dark-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-dark-400 shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 space-y-4 border-t border-dark-800/30 pt-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-dark-500">
                      <span className="flex items-center gap-1.5">
                        <User size={11} />
                        {p.seller?.name || "Unknown"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Store size={11} />
                        {p.seller?.shopName || p.seller?.email}
                      </span>
                      <span>·</span>
                      <span>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>

                    {margin !== null && (
                      <div className="flex items-center gap-2 text-xs font-medium rounded-xl bg-dark-800/40 border border-dark-700/40 px-4 py-2.5">
                        <span className="text-dark-400">Seller keeps</span>
                        <span className="text-white">{formatPrice(cost)}</span>
                        <span className="text-dark-600">→</span>
                        <span className="text-dark-400">you sell at</span>
                        <span className="text-white">{formatPrice(price)}</span>
                        <span className={`font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          ({margin >= 0 ? "+" : ""}{formatPrice(margin)} delivery &amp; margin)
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">
                          Your Sell Price (₹) *
                        </label>
                        <input
                          type="number" min={0} value={e.price}
                          onChange={(ev) => setEdit(p.id, { price: ev.target.value })}
                          className="w-full bg-dark-800/60 border border-gold-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">
                          M.R.P (₹)
                        </label>
                        <input
                          type="number" min={0} value={e.originalPrice}
                          onChange={(ev) => setEdit(p.id, { originalPrice: ev.target.value })}
                          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50"
                          placeholder="0"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Name</label>
                        <input
                          type="text" value={e.name}
                          onChange={(ev) => setEdit(p.id, { name: ev.target.value })}
                          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Description</label>
                        <textarea
                          rows={2} value={e.description}
                          onChange={(ev) => setEdit(p.id, { description: ev.target.value })}
                          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Badge</label>
                        <input
                          type="text" value={e.badge}
                          onChange={(ev) => setEdit(p.id, { badge: ev.target.value })}
                          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50"
                          placeholder="e.g. New, Sale"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Stock Status</label>
                        <button
                          type="button"
                          onClick={() => setEdit(p.id, { inStock: !e.inStock })}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${e.inStock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}
                        >
                          {e.inStock ? "In Stock" : "Out of Stock"}
                        </button>
                      </div>
                    </div>

                    {e.rejectOpen && (
                      <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 space-y-2">
                        <label className="block text-xs text-red-400 font-medium">Reason for rejection (visible to seller)</label>
                        <textarea
                          rows={2} value={e.rejectReason}
                          onChange={(ev) => setEdit(p.id, { rejectReason: ev.target.value })}
                          placeholder="e.g. Please upload clearer photos / adjust category"
                          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(p)}
                        disabled={processing === p.id}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                      >
                        {processing === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve &amp; Go Live
                      </button>
                      <button
                        onClick={() => handleReject(p)}
                        disabled={processing === p.id}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        {processing === p.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        {e.rejectOpen ? "Confirm Reject" : "Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}