"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { API, adminHeaders } from "./types";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/useConfirm";

interface Category {
  id: string;
  name: string;
  slug: string;
  source: string;
  active: boolean;
  sortOrder: number;
  gstPct?: number | null;
  subcategories: { id: string; name: string; slug: string; active: boolean; sortOrder: number; gstPct?: number | null }[];
}

export default function ProductsTab({ adminKey }: { adminKey: string }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeSub, setActiveSub] = useState<"all" | "store" | "mart">("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [newCatSource, setNewCatSource] = useState<"store" | "mart">("store");
  const [newCatGst, setNewCatGst] = useState("18");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [newSubGst, setNewSubGst] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addingSub, setAddingSub] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatGst, setEditCatGst] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await fetch(`${API}/api/categories/all`, { headers: adminHeaders(adminKey) }).then((r) => r.json());
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      console.error("Failed to fetch categories");
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
        body: JSON.stringify({ name: newCatName.trim(), source: newCatSource, gstPct: newCatGst === "" ? 18 : Number(newCatGst) }),
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
        body: JSON.stringify({ name: newSubCatName.trim(), gstPct: newSubGst === "" ? null : Number(newSubGst) }),
      });
      if (res.ok) { setNewSubCatName(""); setNewSubGst(""); fetchData(); }
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
    const gstVal = editCatGst === "" ? null : Number(editCatGst);
    await fetch(`${API}/api/categories/${id}`, {
      method: "PUT",
      headers: adminHeaders(adminKey),
      body: JSON.stringify({ name: editCatName.trim(), ...(gstVal !== null ? { gstPct: gstVal } : {}) }),
    });
    setEditingCat(null);
    fetchData();
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>;

  const storeCats = categories.filter((c) => c.source === "store");
  const martCats = categories.filter((c) => c.source === "mart");

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
                    <input value={editCatGst} onChange={(e) => setEditCatGst(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="GST %" title="GST %"
                      className="bg-dark-900/60 border border-dark-700/50 rounded-lg px-2 py-1 text-white text-sm w-20 placeholder:text-dark-600"
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(cat.id); if (e.key === "Escape") setEditingCat(null); }} />
                    <button onClick={() => handleRenameCategory(cat.id)} className="text-xs text-gold-400">Save</button>
                    <button onClick={() => setEditingCat(null)} className="text-xs text-dark-400">Cancel</button>
                  </div>
                ) : (
                  <span className={cn("flex items-center gap-2", cat.active ? "text-white" : "text-dark-500 line-through")}>
                    {cat.name}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-gold-500/30 text-gold-400 font-semibold">{cat.gstPct != null ? `${cat.gstPct}% GST` : "18% GST"}</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-dark-500 font-mono">{cat.subcategories.length} subs</span>
              <button onClick={() => { setEditingCat(cat); setEditCatName(cat.name); setEditCatGst(cat.gstPct != null ? String(cat.gstPct) : ""); }} className="text-dark-400 hover:text-gold-400"><Pencil size={12} /></button>
              <button onClick={() => handleToggleActive(cat.id, cat.active)} className={`text-xs px-2 py-0.5 rounded-full border ${cat.active ? "text-emerald-400 border-emerald-500/30" : "text-dark-500 border-dark-700"}`}>
                {cat.active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => handleDeleteCategory(cat.id)} className="text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
            </div>

            {expandedCat === cat.id && (
              <div className="px-4 pb-4 pt-1 border-t border-dark-700/30 space-y-2">
                {cat.subcategories.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 pl-6 py-1.5">
                    <span className={cn("text-sm flex-1", sub.active ? "text-dark-200" : "text-dark-600 line-through")}>
                      {sub.name}
                      {sub.gstPct != null && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full border border-gold-500/30 text-gold-400 font-semibold">{sub.gstPct}% GST</span>}
                    </span>
                    <button onClick={() => handleToggleSubActive(sub.id, sub.active)} className={`text-[10px] px-2 py-0.5 rounded-full border ${sub.active ? "text-emerald-400 border-emerald-500/30" : "text-dark-500 border-dark-700"}`}>
                      {sub.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-dark-500 hover:text-red-400"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pl-6 pt-2">
                  <input value={addingSub === cat.id ? newSubCatName : ""} onChange={(e) => { setNewSubCatName(e.target.value); setAddingSub(cat.id); }}
                    placeholder="New subcategory" className="bg-dark-900/60 border border-dark-700/50 rounded-lg px-3 py-1.5 text-white text-xs w-40 placeholder:text-dark-600" />
                  <input value={addingSub === cat.id ? newSubGst : ""} onChange={(e) => { setNewSubGst(e.target.value.replace(/[^0-9.]/g, "")); setAddingSub(cat.id); }}
                    placeholder="GST %" title="GST % (leave empty to inherit category)"
                    className="bg-dark-900/60 border border-dark-700/50 rounded-lg px-3 py-1.5 text-white text-xs w-20 placeholder:text-dark-600" />
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
      <div className="flex gap-2 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {([["all", "All"], ["store", "Store"], ["mart", "Mart"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveSub(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSub === key ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-dark-400 hover:text-dark-200 border border-transparent"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Add New Category</h3>
        <div className="flex items-center gap-3">
          <select value={newCatSource} onChange={(e) => setNewCatSource(e.target.value as "store" | "mart")}
            className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm">
            <option value="store">Store</option>
            <option value="mart">Mart</option>
          </select>
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name"
            className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm w-48 placeholder:text-dark-500"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
          <input value={newCatGst} onChange={(e) => setNewCatGst(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="GST %"
            title="GST %" className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm w-20 placeholder:text-dark-500"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
          <button onClick={handleAddCategory} disabled={!newCatName.trim() || addingCat}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-lg text-sm font-semibold transition-all">
            {addingCat ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </div>
      </div>

      {activeSub === "all" && renderCategoryList(categories)}
      {activeSub === "store" && renderCategoryList(storeCats)}
      {activeSub === "mart" && renderCategoryList(martCats)}
      {ConfirmDialog}
    </div>
  );
}