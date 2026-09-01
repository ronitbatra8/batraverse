/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, Plus, X, ChevronUp, ChevronDown, Search, Quote, Trash2, Pencil, Check, Save, MessageSquareQuote } from "lucide-react";
import { API, adminHeaders } from "./types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { useToast } from "@/components/Toast";

type Testimonial = {
  id: string;
  source: string;
  reviewId?: string | null;
  quote: string;
  name: string;
  role?: string | null;
  avatar?: string | null;
  rating?: number | null;
  productName?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  user: { id: string; name: string };
  product: { id: string; name: string };
};

function Stars({ value }: { value?: number | null }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11} className={i <= (value || 0) ? "fill-gold text-gold" : "text-dark-600"} />
      ))}
    </span>
  );
}

export default function TestimonialsTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Testimonial>>({});

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Testimonial>>({});
  const [savingAdd, setSavingAdd] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewsSearch, setReviewsSearch] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/testimonials`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast("Failed to load testimonials", "error");
    } finally {
      setLoading(false);
    }
  }, [adminKey, toast]);

  useEffect(() => { load(); }, [load]);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API}/api/admin/reviews`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
      setReviewsLoaded(true);
    } catch {
      toast("Failed to load reviews", "error");
    } finally {
      setLoadingReviews(false);
    }
  }, [adminKey, toast]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persistOrder(next);
  };

  const persistOrder = async (ordered: Testimonial[]) => {
    setSavingOrder(true);
    try {
      await Promise.all(
        ordered.map((t, i) =>
          fetch(`${API}/api/admin/testimonials/${t.id}`, {
            method: "PUT",
            headers: adminHeaders(adminKey),
            body: JSON.stringify({ sortOrder: i + 1 }),
          })
        )
      );
      toast("Order saved", "success");
    } catch {
      toast("Failed to save order", "error");
      load();
    } finally {
      setSavingOrder(false);
    }
  };

  const toggle = async (t: Testimonial) => {
    try {
      const res = await fetch(`${API}/api/admin/testimonials/${t.id}/toggle`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) throw new Error("toggle failed");
      const updated = await res.json();
      setItems((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      toast(`${updated.active ? "Shown" : "Hidden"} on home page`, "success");
    } catch {
      toast("Failed to update visibility", "error");
    }
  };

  const remove = async (t: Testimonial) => {
    try {
      const res = await fetch(`${API}/api/admin/testimonials/${t.id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      if (!res.ok) throw new Error("delete failed");
      setItems((prev) => prev.filter((x) => x.id !== t.id));
      toast("Testimonial deleted", "success");
    } catch {
      toast("Failed to delete testimonial", "error");
    }
  };

  const startEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setEditForm({ quote: t.quote, name: t.name, role: t.role || "", productName: t.productName || "", rating: t.rating || 5 });
  };

  const saveEdit = async (t: Testimonial) => {
    try {
      const res = await fetch(`${API}/api/admin/testimonials/${t.id}`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({
          quote: editForm.quote,
          name: editForm.name,
          role: editForm.role || null,
          productName: editForm.productName || null,
          rating: editForm.rating,
        }),
      });
      if (!res.ok) throw new Error("update failed");
      const updated = await res.json();
      setItems((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      setEditingId(null);
      toast("Testimonial updated", "success");
    } catch {
      toast("Failed to update testimonial", "error");
    }
  };

  const addCustom = async () => {
    if (!addForm.quote?.trim() || !addForm.name?.trim()) {
      toast("Quote and name are required", "error");
      return;
    }
    setSavingAdd(true);
    try {
      const res = await fetch(`${API}/api/admin/testimonials`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({
          quote: addForm.quote.trim(),
          name: addForm.name.trim(),
          role: addForm.role?.trim() || null,
          avatar: addForm.avatar?.trim() || null,
          rating: addForm.rating,
          productName: addForm.productName?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create failed");
      setItems((prev) => [...prev, data]);
      setAddForm({});
      setShowAdd(false);
      toast("Testimonial added", "success");
    } catch (e: any) {
      toast(e.message || "Failed to add testimonial", "error");
    } finally {
      setSavingAdd(false);
    }
  };

  const featureReview = async (r: Review) => {
    setFeaturingId(r.id);
    try {
      const res = await fetch(`${API}/api/admin/testimonials/feature-review`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ reviewId: r.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "feature failed");
      setItems((prev) => [...prev, data]);
      toast("Review featured as testimonial", "success");
    } catch (e: any) {
      toast(e.message || "Failed to feature review", "error");
    } finally {
      setFeaturingId(null);
    }
  };

  const featuredKeys = useMemo(() => new Set(items.filter((t) => t.source === "review" && t.reviewId).map((t) => t.reviewId)), [items]);
  const q = reviewsSearch.trim().toLowerCase();
  const filteredReviews = useMemo(
    () => reviews.filter(
      (r) =>
        !featuredKeys.has(r.id) &&
        (q === "" || (r.user?.name || "").toLowerCase().includes(q) || (r.product?.name || "").toLowerCase().includes(q) || (r.comment || "").toLowerCase().includes(q))
    ),
    [reviews, featuredKeys, q]
  );

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>;

  const inputCls = "w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white flex items-center gap-3"><Quote className="text-gold-400" /> Testimonials</h2>
          <p className="text-dark-400 text-xs mt-1">Manage what appears in the home page&apos;s &quot;What Customers Say&quot; shelf. Add your own quotes or feature verified reviews.</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 transition-all"
        >
          <Plus size={15} /> {showAdd ? "Close Form" : "Add Custom"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Manage testimonials */}
        <div className="bg-dark-900/60 border border-gold-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><Quote size={15} className="text-gold-400" /> Home Shelf ({items.length})</h3>
            <span className="text-[10px] px-2 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">{savingOrder ? "Saving…" : "Arrows reorder + save"}</span>
          </div>
          <div className="divide-y divide-dark-800/30 max-h-[560px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-16 text-center"><Quote size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No testimonials yet</p><p className="text-dark-600 text-xs mt-1">Add a custom one or feature a review.</p></div>
            ) : (
              items.map((t, i) => (
                <div key={t.id} className="px-6 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-800 shrink-0 flex items-center justify-center border border-white/5">
                      {t.avatar ? (
                        <img src={resolveImageUrl(t.avatar)} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-gold-400">{(t.name || "A").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-semibold truncate">{t.name}</p>
                        <Stars value={t.rating} />
                        {t.source === "review" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wide">Review</span>
                        )}
                      </div>
                      <p className="text-[10px] text-dark-500 truncate">{t.role || "Customer"}{t.productName ? ` · on ${t.productName}` : ""}</p>
                    </div>
                    <button
                      onClick={() => toggle(t)}
                      title={t.active ? "Click to hide" : "Click to show"}
                      className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${t.active ? "bg-emerald-500/80" : "bg-dark-700"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${t.active ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>

                  {editingId === t.id ? (
                    <div className="mt-3 space-y-2 pl-0">
                      <textarea
                        value={editForm.quote || ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, quote: e.target.value }))}
                        placeholder="Quote"
                        rows={2}
                        className={inputCls}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className={inputCls} />
                        <input value={editForm.role || ""} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} placeholder="Role (e.g. Regular Customer)" className={inputCls} />
                        <input value={editForm.productName || ""} onChange={(e) => setEditForm((f) => ({ ...f, productName: e.target.value }))} placeholder="Product name" className={inputCls} />
                        <select value={editForm.rating ?? 5} onChange={(e) => setEditForm((f) => ({ ...f, rating: Number(e.target.value) }))} className={inputCls}>
                          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(t)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"><Check size={13} /> Save</button>
                        <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-800 border border-dark-700 text-dark-400 hover:text-white transition-colors"><X size={13} /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-dark-400 line-clamp-2">“{t.quote}”</p>
                  )}

                  <div className="mt-3 flex items-center gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-gold-400 disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-gold-400 disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                    <span className="flex-1" />
                    <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-gold-400 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {showAdd && (
            <div className="bg-dark-900/60 border border-gold-500/20 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-800/50">
                <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><Plus size={15} className="text-gold-400" /> Add Custom Testimonial</h3>
              </div>
              <div className="px-6 py-4 space-y-2.5">
                <textarea
                  value={addForm.quote || ""}
                  onChange={(e) => setAddForm((f) => ({ ...f, quote: e.target.value }))}
                  placeholder="What they said…"
                  rows={3}
                  className={inputCls}
                />
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input value={addForm.name || ""} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name *" className={inputCls} />
                  <input value={addForm.role || ""} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))} placeholder="Role (e.g. Verified Buyer)" className={inputCls} />
                  <input value={addForm.productName || ""} onChange={(e) => setAddForm((f) => ({ ...f, productName: e.target.value }))} placeholder="Product name" className={inputCls} />
                  <input value={addForm.avatar || ""} onChange={(e) => setAddForm((f) => ({ ...f, avatar: e.target.value }))} placeholder="Avatar image URL (optional)" className={inputCls} />
                </div>
                <select value={addForm.rating ?? 5} onChange={(e) => setAddForm((f) => ({ ...f, rating: Number(e.target.value) }))} className={inputCls}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
                </select>
                <button
                  onClick={addCustom}
                  disabled={savingAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 transition-all disabled:opacity-50"
                >
                  <Save size={14} /> {savingAdd ? "Adding…" : "Add to Home Shelf"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-800/50">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><MessageSquareQuote size={15} className="text-gold-400" /> Feature a Review</h3>
              {!reviewsLoaded && (
                <button
                  onClick={loadReviews}
                  disabled={loadingReviews}
                  className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50"
                >
                  <Star size={13} /> {loadingReviews ? "Loading…" : "Load Customer Reviews"}
                </button>
              )}
            </div>
            {reviewsLoaded && (
              <>
                <div className="px-6 py-3 border-b border-dark-800/50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                      value={reviewsSearch}
                      onChange={(e) => setReviewsSearch(e.target.value)}
                      placeholder="Search reviews…"
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40"
                    />
                  </div>
                </div>
                <div className="divide-y divide-dark-800/30 max-h-[380px] overflow-y-auto">
                  {filteredReviews.length === 0 ? (
                    <div className="py-12 text-center"><MessageSquareQuote size={28} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No reviews to feature</p></div>
                  ) : (
                    filteredReviews.map((r) => (
                      <div key={r.id} className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium truncate">{r.user?.name || "Customer"}</p>
                          <Stars value={r.rating} />
                          <span className="flex-1" />
                          <button
                            onClick={() => featureReview(r)}
                            disabled={featuringId === r.id}
                            className="shrink-0 p-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 disabled:opacity-50 transition-colors"
                            title="Feature this review"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <p className="text-[10px] text-dark-500 mt-0.5">on {r.product?.name || "a product"}</p>
                        <p className="text-xs text-dark-400 mt-1 line-clamp-2">“{r.comment || "Great experience with this product."}”</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            {!reviewsLoaded && (
              <div className="py-10 px-6 text-center text-dark-500 text-xs">Load reviews to feature real customer feedback as testimonials.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}