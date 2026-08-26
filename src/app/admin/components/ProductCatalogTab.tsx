"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, Trash2, Eye, EyeOff, Package, User, Star, ChevronDown, ChevronUp, Filter, Plus, X } from "lucide-react";
import { API, adminHeaders } from "./types";
import { formatPrice } from "@/lib/utils";
import { useConfirm } from "@/components/useConfirm";

interface SellerProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subCategory: string | null;
  source: string | null;
  price: number;
  originalPrice: number | null;
  description: string | null;
  images: string[];
  inStock: boolean;
  badge: string | null;
  rating: number;
  reviewCount: number;
  sellerId: string | null;
  seller: { id: string; name: string; email: string } | null;
  colorOptions: { name: string; hex: string; images?: string | string[]; price?: number; originalPrice?: number }[] | null;
  sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]> | null;
}

function parseCatalogImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

function getCatalogImage(p: SellerProduct): string {
  if (p.images && p.images.length > 0 && p.images[0]) return p.images[0];
  if (p.colorOptions) {
    for (const c of p.colorOptions) {
      const imgs = parseCatalogImages(c.images);
      if (imgs.length > 0 && imgs[0]) return imgs[0];
    }
  }
  return "";
}

function getCatalogPrice(p: SellerProduct): number {
  if (p.price > 0) return p.price;
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    const firstName = p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0].name : "";
    const firstSizes = p.sizeOptions[firstName] || Object.values(p.sizeOptions)[0] || [];
    const withPrice = firstSizes.find((s) => s.price != null && s.price > 0);
    if (withPrice && withPrice.price != null) return withPrice.price;
  }
  return p.price;
}

function getCatalogOriginalPrice(p: SellerProduct): number | null {
  if (p.originalPrice && p.originalPrice > 0) return p.originalPrice;
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    const firstName = p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0].name : "";
    const firstSizes = p.sizeOptions[firstName] || Object.values(p.sizeOptions)[0] || [];
    const withOP = firstSizes.find((s) => s.originalPrice != null && s.originalPrice > (s.price || 0));
    if (withOP && withOP.originalPrice != null) return withOP.originalPrice;
  }
  return null;
}

function getAllCatalogImages(p: SellerProduct): string[] {
  const top = (p.images || []).filter(Boolean);
  if (top.length > 0) return top;
  if (p.colorOptions) {
    for (const c of p.colorOptions) {
      const imgs = parseCatalogImages(c.images);
      if (imgs.length > 0) return imgs;
    }
  }
  return [];
}

export default function ProductCatalogTab({ adminKey }: { adminKey: string }) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "store" | "mart" | "mediverse">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", brand: "", category: "", subCategory: "", source: "store", price: "", originalPrice: "", description: "", badge: "", inStock: true });
  const [addSaving, setAddSaving] = useState(false);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; slug: string; source: string; subcategories: { id: string; name: string; slug: string }[] }[]>([]);

  const { confirm, prompt, ConfirmDialog, PromptDialog } = useConfirm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        fetch(`${API}/api/admin/products`, { headers: adminHeaders(adminKey) }),
        fetch(`${API}/api/categories/all`, { headers: adminHeaders(adminKey) }),
      ]);
      const prods = await prodsRes.json();
      const cats = await catsRes.json();
      setProducts(Array.isArray(prods) ? prods : []);
      setDbCategories(Array.isArray(cats) ? cats : []);
    } catch {
      console.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleToggleStock(id: string, current: boolean) {
    setActionLoading(id);
    try {
      await fetch(`${API}/api/admin/products/${id}`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ inStock: !current }),
      });
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, inStock: !current } : p));
    } catch {
      console.error("Failed to toggle stock");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Permanently delete this product?"))) return;
    setActionLoading(id);
    try {
      await fetch(`${API}/api/admin/products/${id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      console.error("Failed to delete product");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddProduct() {
    if (!addForm.name || !addForm.price) return;
    setAddSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/products`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({
          name: addForm.name,
          brand: addForm.brand || undefined,
          category: addForm.category || undefined,
          subCategory: addForm.subCategory || undefined,
          source: addForm.source,
          price: parseFloat(addForm.price),
          originalPrice: addForm.originalPrice ? parseFloat(addForm.originalPrice) : undefined,
          description: addForm.description || undefined,
          badge: addForm.badge || undefined,
          inStock: addForm.inStock,
        }),
      });
      const newProduct = await res.json();
      if (newProduct.id) {
        setProducts((prev) => [newProduct, ...prev]);
        setAddForm({ name: "", brand: "", category: "", subCategory: "", source: "store", price: "", originalPrice: "", description: "", badge: "", inStock: true });
        setShowAddForm(false);
      }
    } catch {
      console.error("Failed to add product");
    } finally {
      setAddSaving(false);
    }
  }

  const filtered = products.filter((p) => {
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
    if (stockFilter === "in" && !p.inStock) return false;
    if (stockFilter === "out" && p.inStock) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !(p.brand || "").toLowerCase().includes(q) &&
        !(p.seller?.name || "").toLowerCase().includes(q) &&
        !(p.category || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const stats = {
    total: products.length,
    store: products.filter((p) => p.source === "store").length,
    mart: products.filter((p) => p.source === "mart").length,
    mediverse: products.filter((p) => p.source === "mediverse").length,
    inStock: products.filter((p) => p.inStock).length,
    outOfStock: products.filter((p) => !p.inStock).length,
    totalValue: products.reduce((sum, p) => sum + p.price, 0),
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Product Catalog</h2>
        <div className="flex items-center gap-3">
          <span className="text-dark-500 text-sm">{filtered.length} products</span>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20 transition-all">
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-dark-900/60 border border-gold-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">New Product</h3>
            <button onClick={() => setShowAddForm(false)} className="text-dark-400 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Product name *"
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            <input value={addForm.brand} onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })} placeholder="Brand"
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            <input value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} placeholder="Price *" type="number" step="0.01"
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            <input value={addForm.originalPrice} onChange={(e) => setAddForm({ ...addForm, originalPrice: e.target.value })} placeholder="Original price" type="number" step="0.01"
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            <select value={addForm.source} onChange={(e) => setAddForm({ ...addForm, source: e.target.value, category: "", subCategory: "" })}
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/50">
              <option value="store">Store</option>
              <option value="mart">Mart</option>
              <option value="mediverse">Mediverse</option>
            </select>
            <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value, subCategory: "" })}
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
              <option value="">Select category</option>
              {dbCategories.filter((c) => c.source === addForm.source).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            {addForm.category && dbCategories.find((c) => c.slug === addForm.category && c.source === addForm.source)?.subcategories?.length ? (
              <select value={addForm.subCategory} onChange={(e) => setAddForm({ ...addForm, subCategory: e.target.value })}
                className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
                <option value="">None</option>
                {dbCategories.find((c) => c.slug === addForm.category && c.source === addForm.source)?.subcategories.map((s) => (
                  <option key={s.id} value={s.slug}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input value={addForm.subCategory} onChange={(e) => setAddForm({ ...addForm, subCategory: e.target.value })} placeholder="Subcategory"
                className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            )}
            <input value={addForm.badge} onChange={(e) => setAddForm({ ...addForm, badge: e.target.value })} placeholder="Badge (e.g. NEW)"
              className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
            <label className="flex items-center gap-2 text-sm text-dark-400">
              <input type="checkbox" checked={addForm.inStock} onChange={(e) => setAddForm({ ...addForm, inStock: e.target.checked })}
                className="rounded border-dark-600 bg-dark-800 text-gold-500 focus:ring-gold-500" />
              In Stock
            </label>
          </div>
          <textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} rows={2} placeholder="Description"
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 resize-none" />
          <button onClick={handleAddProduct} disabled={addSaving || !addForm.name || !addForm.price}
            className="px-5 py-2 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold hover:bg-gold-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
            {addSaving && <Loader2 size={13} className="animate-spin" />} Create Product
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Store", value: stats.store, color: "text-sapphire-400" },
          { label: "Mart", value: stats.mart, color: "text-emerald-400" },
          { label: "Mediverse", value: stats.mediverse, color: "text-violet-400" },
          { label: "In Stock", value: stats.inStock, color: "text-emerald-400" },
          { label: "Out of Stock", value: stats.outOfStock, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-dark-800/40 border border-dark-700/50 rounded-xl px-4 py-3">
            <p className="text-[10px] text-dark-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, brands, sellers..."
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-dark-500" />
          {(["all", "store", "mart", "mediverse"] as const).map((s) => (
            <button key={s} onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                sourceFilter === s ? "border-gold-500/30 bg-gold-500/10 text-gold-400" : "border-dark-700/50 text-dark-400 hover:text-white"
              }`}>
              {s === "all" ? "All Sources" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "in", "out"] as const).map((s) => (
            <button key={s} onClick={() => setStockFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                stockFilter === s ? "border-gold-500/30 bg-gold-500/10 text-gold-400" : "border-dark-700/50 text-dark-400 hover:text-white"
              }`}>
              {s === "all" ? "All Stock" : s === "in" ? "In Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto text-dark-600 mb-3" />
          <p className="text-dark-500 text-sm">No products found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-dark-800/40 border border-dark-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-dark-600/70 transition-all" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div className="px-4 py-3 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-dark-700/50 shrink-0 flex items-center justify-center">
                  {getCatalogImage(p) ? (
                    <img src={getImageUrl(getCatalogImage(p))} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Package size={16} className="text-dark-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    {p.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400 font-medium shrink-0">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-dark-500 truncate">
                    {p.brand || "No brand"} &middot; {p.category || "uncategorized"}
                    {p.subCategory ? ` / ${p.subCategory}` : ""}
                    {" "}&middot;{" "}
                    <span className={p.source === "mart" ? "text-emerald-400" : p.source === "mediverse" ? "text-violet-400" : "text-sapphire-400"}>
                      {p.source || "store"}
                    </span>
                  </p>
                </div>

                {/* Seller */}
                <div className="hidden sm:block text-right shrink-0 w-32">
                  <p className="text-[11px] text-dark-400 flex items-center gap-1 justify-end">
                    <User size={10} /> {p.seller?.name || "BATRAVERSE"}
                  </p>
                  <p className="text-[10px] text-dark-600 truncate">{p.seller?.email || "catalog@batraverse.com"}</p>
                </div>

                {/* Rating */}
                <div className="hidden md:flex items-center gap-1 shrink-0 w-20">
                  <Star size={11} className="text-gold-400 fill-gold-400" />
                  <span className="text-[11px] text-dark-400">{p.rating}</span>
                  <span className="text-[10px] text-dark-600">({p.reviewCount})</span>
                </div>

                {/* Price */}
                <div className="text-right shrink-0 w-24">
                  <p className="text-sm font-semibold text-gold-400">{formatPrice(getCatalogPrice(p))}</p>
                  {getCatalogOriginalPrice(p) && <p className="text-[10px] text-dark-500 line-through">{formatPrice(getCatalogOriginalPrice(p)!)}</p>}
                </div>

                {/* Stock badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${p.inStock ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}>
                  {p.inStock ? "In Stock" : "Out"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all">
                    {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => handleToggleStock(p.id, p.inStock)} disabled={actionLoading === p.id}
                    className={`p-1.5 rounded-lg transition-all ${p.inStock ? "text-emerald-400 hover:bg-emerald-500/10" : "text-red-400 hover:bg-red-500/10"} disabled:opacity-50`}>
                    {p.inStock ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={actionLoading === p.id}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === p.id && (
                <div className="px-4 pb-4 pt-2 border-t border-dark-700/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Images */}
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-2">Images ({getAllCatalogImages(p).length})</p>
                      <div className="flex gap-2 flex-wrap">
                        {getAllCatalogImages(p).length > 0 ? getAllCatalogImages(p).map((img, i) => (
                          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-dark-700/50">
                            <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )) : (
                          <p className="text-[11px] text-dark-600">No images</p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider">Details</p>
                      <div className="space-y-1">
                        <p className="text-[11px]"><span className="text-dark-500">ID:</span> <span className="text-dark-300 font-mono">{p.id}</span></p>
                        <p className="text-[11px]"><span className="text-dark-500">Category:</span> <span className="text-dark-300">{p.category || "—"}</span></p>
                        <p className="text-[11px]"><span className="text-dark-500">Subcategory:</span> <span className="text-dark-300">{p.subCategory || "—"}</span></p>
                        <p className="text-[11px]"><span className="text-dark-500">Source:</span> <span className="text-dark-300">{p.source || "store"}</span></p>
                        <p className="text-[11px]"><span className="text-dark-500">Seller ID:</span> <span className="text-dark-300 font-mono">{p.sellerId || "—"}</span></p>
                      </div>
                    </div>

                    {/* Description + seller */}
                    <div className="space-y-3">
                      {p.description && (
                        <div>
                          <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Description</p>
                          <p className="text-[11px] text-dark-300 leading-relaxed">{p.description}</p>
                        </div>
                      )}
                      {p.seller && (
                        <div>
                          <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Seller</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-[9px] font-bold text-dark-400">
                              {p.seller.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[11px] text-white font-medium">{p.seller.name}</p>
                              <p className="text-[10px] text-dark-500">{p.seller.email}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
      {PromptDialog}
    </div>
  );
}

function getImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");
  return `${apiBase}${url}`;
}
