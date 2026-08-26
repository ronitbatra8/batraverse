"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Search } from "lucide-react";
import { API, adminHeaders } from "./types";
import { formatPrice } from "@/lib/utils";
import { useConfirm } from "@/components/useConfirm";

interface Category {
  id: string;
  name: string;
  slug: string;
  source: string;
  active: boolean;
  sortOrder: number;
  subcategories: { id: string; name: string; slug: string; active: boolean; sortOrder: number }[];
}

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
  seller: { id: string; name: string; email: string; shopName?: string | null } | null;
  colorOptions: { name: string; hex: string; images?: string | string[]; price?: number; originalPrice?: number }[] | null;
  sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]> | null;
}

function parseAdminImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

function getEffectiveAdminImage(p: SellerProduct): string {
  if (p.images && p.images.length > 0 && p.images[0]) return p.images[0];
  if (p.colorOptions) {
    for (const c of p.colorOptions) {
      const imgs = parseAdminImages(c.images);
      if (imgs.length > 0 && imgs[0]) return imgs[0];
    }
  }
  return "";
}

function getEffectiveAdminPrice(p: SellerProduct): number {
  if (p.price > 0) return p.price;
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    const firstName = p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0].name : "";
    const firstSizes = p.sizeOptions[firstName] || Object.values(p.sizeOptions)[0] || [];
    const withPrice = firstSizes.find((s) => s.price != null && s.price > 0);
    if (withPrice && withPrice.price != null) return withPrice.price;
  }
  return p.price;
}

function getEffectiveAdminOriginalPrice(p: SellerProduct): number | null {
  if (p.originalPrice && p.originalPrice > 0) return p.originalPrice;
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    const firstName = p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0].name : "";
    const firstSizes = p.sizeOptions[firstName] || Object.values(p.sizeOptions)[0] || [];
    const withOP = firstSizes.find((s) => s.originalPrice != null && s.originalPrice > (s.price || 0));
    if (withOP && withOP.originalPrice != null) return withOP.originalPrice;
  }
  return null;
}

export default function ProductsTab({ adminKey }: { adminKey: string }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeSub, setActiveSub] = useState<"categories" | "seller-products" | "store" | "mart" | "mediverse">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [showInStock, setShowInStock] = useState(true);

  const [newCatName, setNewCatName] = useState("");
  const [newCatSource, setNewCatSource] = useState<"store" | "mart" | "mediverse">("store");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addingSub, setAddingSub] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        fetch(`${API}/api/categories/all`, { headers: adminHeaders(adminKey) }).then((r) => r.json()),
        fetch(`${API}/api/admin/products`, { headers: adminHeaders(adminKey) }).then((r) => r.json()),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSellerProducts(Array.isArray(prods) ? prods : []);
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ name: newCatName.trim(), source: newCatSource }),
      });
      if (res.ok) { setNewCatName(""); fetchData(); }
    } finally { setAddingCat(false); }
  }

  async function handleAddSubcategory(catId: string) {
    if (!newSubCatName.trim()) return;
    setAddingSub(catId);
    try {
      const res = await fetch(`${API}/api/categories/${catId}/subcategories`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ name: newSubCatName.trim() }),
      });
      if (res.ok) { setNewSubCatName(""); fetchData(); }
    } finally { setAddingSub(null); }
  }

  async function handleDeleteCategory(id: string) {
    if (!(await confirm("Delete this category and all its subcategories?", { variant: "danger", confirmLabel: "Delete" }))) return;
    await fetch(`${API}/api/categories/${id}`, { method: "DELETE", headers: adminHeaders(adminKey) });
    fetchData();
  }

  async function handleDeleteSubcategory(subId: string) {
    if (!(await confirm("Delete this subcategory?", { variant: "danger", confirmLabel: "Delete" }))) return;
    await fetch(`${API}/api/categories/subcategories/${subId}`, { method: "DELETE", headers: adminHeaders(adminKey) });
    fetchData();
  }

  async function handleToggleActive(id: string, active: boolean) {
    await fetch(`${API}/api/categories/${id}`, {
      method: "PUT",
      headers: adminHeaders(adminKey),
      body: JSON.stringify({ active: !active }),
    });
    fetchData();
  }

  async function handleToggleSubActive(subId: string, active: boolean) {
    await fetch(`${API}/api/categories/subcategories/${subId}`, {
      method: "PUT",
      headers: adminHeaders(adminKey),
      body: JSON.stringify({ active: !active }),
    });
    fetchData();
  }

  async function handleRenameCategory(id: string) {
    if (!editCatName.trim()) return;
    await fetch(`${API}/api/categories/${id}`, {
      method: "PUT",
      headers: adminHeaders(adminKey),
      body: JSON.stringify({ name: editCatName.trim() }),
    });
    setEditingCat(null);
    fetchData();
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  const storeCats = categories.filter((c) => c.source === "store");
  const martCats = categories.filter((c) => c.source === "mart");
  const mediverseCats = categories.filter((c) => c.source === "mediverse");

  const filteredProducts = sellerProducts.filter((p) => {
    if (!showInStock && p.inStock) return false;
    if (productFilter) {
      const q = productFilter.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.brand || "").toLowerCase().includes(q) && !(p.seller?.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function renderCategoryList(cats: Category[]) {
    return (
      <div className="space-y-3">
        {cats.length === 0 && <p className="text-dark-500 text-sm">No categories yet</p>}
        {cats.map((cat) => (
          <div key={cat.id} className="bg-dark-800/40 border border-dark-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="text-dark-400 hover:text-white">
                {expandedCat === cat.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <div className="flex-1 min-w-0">
                {editingCat?.id === cat.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                      className="bg-dark-900/60 border border-dark-700/50 rounded-lg px-2 py-1 text-white text-sm w-40" autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(cat.id); if (e.key === "Escape") setEditingCat(null); }} />
                    <button onClick={() => handleRenameCategory(cat.id)} className="text-xs text-gold-400">Save</button>
                    <button onClick={() => setEditingCat(null)} className="text-xs text-dark-400">Cancel</button>
                  </div>
                ) : (
                  <span className={`text-sm font-medium ${cat.active ? "text-white" : "text-dark-500 line-through"}`}>{cat.name}</span>
                )}
              </div>
              <span className="text-[10px] text-dark-500 font-mono">{cat.subcategories.length} subs</span>
              <button onClick={() => { setEditingCat(cat); setEditCatName(cat.name); }} className="text-dark-400 hover:text-gold-400"><Pencil size={12} /></button>
              <button onClick={() => handleToggleActive(cat.id, cat.active)} className={`text-xs px-2 py-0.5 rounded-full border ${cat.active ? "text-emerald-400 border-emerald-500/30" : "text-dark-500 border-dark-700"}`}>
                {cat.active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => handleDeleteCategory(cat.id)} className="text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
            </div>

            {expandedCat === cat.id && (
              <div className="px-4 pb-4 pt-1 border-t border-dark-700/30 space-y-2">
                {cat.subcategories.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 pl-6 py-1.5">
                    <span className={`text-sm flex-1 ${sub.active ? "text-dark-200" : "text-dark-600 line-through"}`}>{sub.name}</span>
                    <button onClick={() => handleToggleSubActive(sub.id, sub.active)} className={`text-[10px] px-2 py-0.5 rounded-full border ${sub.active ? "text-emerald-400 border-emerald-500/30" : "text-dark-500 border-dark-700"}`}>
                      {sub.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-dark-500 hover:text-red-400"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pl-6 pt-2">
                  <input value={addingSub === cat.id ? newSubCatName : ""} onChange={(e) => { setNewSubCatName(e.target.value); setAddingSub(cat.id); }}
                    placeholder="New subcategory" className="bg-dark-900/60 border border-dark-700/50 rounded-lg px-3 py-1.5 text-white text-xs w-40 placeholder:text-dark-600" />
                  <button onClick={() => handleAddSubcategory(cat.id)} disabled={!newSubCatName.trim() || addingSub !== cat.id}
                    className="text-xs text-gold-400 hover:text-gold-300 disabled:text-dark-600 disabled:cursor-not-allowed">+ Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Products & Categories</h2>

      <div className="flex gap-2 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {([["categories", "Categories"], ["seller-products", "Seller Products"], ["store", "Store"], ["mart", "Mart"], ["mediverse", "Mediverse"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveSub(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSub === key ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-dark-400 hover:text-dark-200 border border-transparent"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeSub === "seller-products" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input value={productFilter} onChange={(e) => setProductFilter(e.target.value)} placeholder="Search products or sellers..."
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-dark-500" />
            </div>
            <button onClick={() => setShowInStock(!showInStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border ${showInStock ? "border-emerald-500/30 text-emerald-400" : "border-dark-700 text-dark-500"}`}>
              {showInStock ? <Eye size={14} /> : <EyeOff size={14} />}
              {showInStock ? "In Stock" : "Out of Stock"}
            </button>
            <span className="text-dark-500 text-sm">{filteredProducts.length} products</span>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="text-dark-500 text-sm py-8 text-center">No seller products found</p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-dark-800/40 border border-dark-700/50 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-dark-700/50 flex items-center justify-center text-dark-400 text-xs font-bold shrink-0 overflow-hidden">
                    {getEffectiveAdminImage(p) ? (
                      <img src={getEffectiveAdminImage(p)} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      p.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-[11px] text-dark-500 truncate">
                      {p.brand || "No brand"} &middot; {p.category || "uncategorized"}{p.subCategory ? ` / ${p.subCategory}` : ""} &middot; {p.source || "store"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gold-400">{formatPrice(getEffectiveAdminPrice(p))}</p>
                    {getEffectiveAdminOriginalPrice(p) && <p className="text-[10px] text-dark-500 line-through">{formatPrice(getEffectiveAdminOriginalPrice(p)!)}</p>}
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <p className="text-[11px] text-dark-400">{p.seller?.name || "Unknown"}</p>
                    <p className="text-[10px] text-dark-600">{p.reviewCount} reviews</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${p.inStock ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}>
                    {p.inStock ? "In Stock" : "Out"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeSub === "store" || activeSub === "mart" || activeSub === "mediverse" || activeSub === "categories") && (
        <>
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Add New Category</h3>
            <div className="flex items-center gap-3">
              <select value={newCatSource} onChange={(e) => setNewCatSource(e.target.value as "store" | "mart" | "mediverse")}
                className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm">
                <option value="store">Store</option>
                <option value="mart">Mart</option>
                <option value="mediverse">Mediverse</option>
              </select>
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name"
                className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm w-48 placeholder:text-dark-500"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
              <button onClick={handleAddCategory} disabled={!newCatName.trim() || addingCat}
                className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-lg text-sm font-semibold transition-all">
                {addingCat ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </div>
          </div>

          {activeSub === "store" && renderCategoryList(storeCats)}
          {activeSub === "mart" && renderCategoryList(martCats)}
          {activeSub === "mediverse" && renderCategoryList(mediverseCats)}
          {activeSub === "categories" && renderCategoryList(categories)}
        </>
      )}
      {ConfirmDialog}
    </div>
  );
}

