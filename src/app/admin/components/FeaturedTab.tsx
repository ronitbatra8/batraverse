/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Star, Plus, X, ChevronUp, ChevronDown, Save, Search, Package, ShoppingBag, Sparkles } from "lucide-react";
import { API, adminHeaders } from "./types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type SellerProduct = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  subCategory?: string;
  source?: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  colorOptions?: { name?: string; images?: string | string[]; price?: number; originalPrice?: number }[];
  sizeOptions?: Record<string, { price?: number; originalPrice?: number }[]>;
  inStock?: boolean;
};

type FeaturedCard = {
  productId: string;
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  missing?: boolean;
};

function prodImage(p: SellerProduct): string {
  if (p.images && p.images.length > 0 && p.images[0]) return p.images[0];
  if (p.colorOptions) {
    for (const c of p.colorOptions) {
      const imgs = Array.isArray(c.images) ? c.images : typeof c.images === "string" ? [c.images] : [];
      if (imgs.length > 0 && imgs[0]) return imgs[0];
    }
  }
  return "";
}

function prodPrice(p: SellerProduct): number {
  if (p.price && p.price > 0) return p.price;
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    const firstName = (p.colorOptions && p.colorOptions.length > 0 && p.colorOptions[0].name) || "";
    const firstSizes = (firstName && p.sizeOptions[firstName]) || Object.values(p.sizeOptions)[0] || [];
    const s = firstSizes.find((x: any) => x && x.price != null && x.price > 0);
    if (s && s.price != null) return s.price;
  }
  return p.price || 0;
}

function prodOriginalPrice(p: SellerProduct): number | null {
  if (p.originalPrice && p.originalPrice > 0) return p.originalPrice;
  return null;
}export default function FeaturedTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, feat] = await Promise.all([
        fetch(`${API}/api/admin/products`, { headers: adminHeaders(adminKey) }).then((r) => r.json()),
        fetch(`${API}/api/admin/featured`, { headers: adminHeaders(adminKey) }).then((r) => r.json()),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      const fOrder = Array.isArray(feat) ? feat.map((c: FeaturedCard) => c.productId).filter(Boolean) : [];
      setFeatured(fOrder);
    } catch {
      toast("Failed to load Featured data", "error");
    } finally {
      setLoading(false);
    }
  }, [adminKey, toast]);

  useEffect(() => { load(); }, [load]);

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const selected = useMemo(
    () => featured.map((id) => prodById.get(id)).filter((p): p is SellerProduct => Boolean(p)),
    [featured, prodById]
  );

  const available = useMemo(() => {
    const sel = new Set(featured);
    const q = search.trim().toLowerCase();
    return products.filter((p) => !sel.has(p.id) && (q === "" || (p.name || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q)));
  }, [products, featured, search]);

  const add = (id: string) => setFeatured((prev) => [...prev, id]);
  const remove = (id: string) => setFeatured((prev) => prev.filter((x) => x !== id));
  const move = (index: number, dir: -1 | 1) => {
    setFeatured((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/featured`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ productIds: featured }),
      });
      const data = await res.json();
      if (res.ok) toast(`Featured updated (${featured.length} products)`, "success");
      else toast(data?.error || "Failed to save Featured", "error");
    } catch {
      toast("Failed to save Featured", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white flex items-center gap-3"><Sparkles className="text-gold-400" /> Featured</h2>
          <p className="text-dark-400 text-xs mt-1">Choose which products appear in the home page&apos;s &quot;Featured&quot; shelf. Order them as you want them shown.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 transition-all disabled:opacity-50"
        >
          <Save size={15} /> {saving ? "Saving…" : "Save Featured"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Selected / featured (reorderable) */}
        <div className="bg-dark-900/60 border border-gold-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><Star size={15} className="text-gold-400" /> Featured on Home ({selected.length})</h3>
            <span className="text-[10px] px-2 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">Drag-free · use arrows</span>
          </div>
          <div className="divide-y divide-dark-800/30 max-h-[520px] overflow-y-auto">
            {selected.length === 0 ? (
              <div className="py-16 text-center"><Package size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No featured products yet</p><p className="text-dark-600 text-xs mt-1">Add products from the right column.</p></div>
            ) : (
              selected.map((p, i) => (
                <div key={p.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-800 shrink-0">
                    {prodImage(p) ? <img src={resolveImageUrl(prodImage(p))} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-dark-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-dark-500">{p.brand || "BATRAVERSE"}{p.category ? ` · ${p.category}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gold-400 font-semibold">{formatPrice(prodPrice(p))}</p>
                    {prodOriginalPrice(p) && <p className="text-[10px] line-through text-dark-500">{formatPrice(prodOriginalPrice(p)!)}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-gold-400 disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-gold-400 disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                    <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available products */}
        <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800/50">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><ShoppingBag size={15} className="text-gold-400" /> All Products</h3>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40"
              />
            </div>
          </div>
          <div className="divide-y divide-dark-800/30 max-h-[520px] overflow-y-auto">
            {available.length === 0 ? (
              <div className="py-16 text-center"><Package size={32} className="text-dark-700 mx-auto mb-3" /><p className="text-dark-500 text-sm">No available products</p></div>
            ) : (
              available.map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-800 shrink-0">
                    {prodImage(p) ? <img src={resolveImageUrl(prodImage(p))} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-dark-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-dark-500">{p.brand || "BATRAVERSE"}{p.category ? ` · ${p.category}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-sm text-white font-semibold">{formatPrice(prodPrice(p))}</p>
                  </div>
                  <button onClick={() => add(p.id)} className="shrink-0 p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"><Plus size={14} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
