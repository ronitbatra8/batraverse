"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import { Store, ShoppingCart, Upload, Loader2, X, Plus, Trash2, Palette, Eye, EyeOff, Save, Check } from "lucide-react";
import { API, adminHeaders } from "./types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import { getAuth } from "@/lib/authStorage";
import { useToast } from "@/components/Toast";

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  source: string;
  subcategories: { id: string; name: string; slug: string }[];
}

interface FormColor {
  name: string;
  hex: string;
  colors: string[];
  images: string[];
  specifications: { key: string; value: string }[];
  keyFeatures: string[];
  price?: number;
  originalPrice?: number;
}

interface FormSpec {
  key: string;
  value: string;
}

interface FormState {
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  source: string;
  price: number;
  originalPrice: number;
  description: string;
  images: string[];
  inStock: boolean;
  badge: string;
  specifications: FormSpec[];
  keyFeatures: string[];
  colorOptions: FormColor[];
  sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]>;
}

const EMPTY: FormState = {
  name: "",
  brand: "",
  category: "",
  subCategory: "",
  source: "store",
  price: 0,
  originalPrice: 0,
  description: "",
  images: [],
  inStock: true,
  badge: "",
  specifications: [],
  keyFeatures: [],
  colorOptions: [],
  sizeOptions: {},
};

const SIZE_PRESETS: Record<string, string[]> = {
  fashion: ["XS", "S", "M", "L", "XL", "XXL"],
  footwear: ["6", "7", "8", "9", "10", "11", "12"],
  accessories: ["Free Size"],
  watches: ["Small", "Medium", "Large"],
};

async function adminUpload(key: string, fd: FormData): Promise<{ urls: string[] }> {
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
  if (key) headers["x-admin-key"] = key;
  const token = getAuth("bt-token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}/api/admin/upload`, { method: "POST", headers, body: fd });
  let data: any;
  try { data = await res.json(); } catch { throw new Error("Server returned an invalid response"); }
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

export default function AdminAddProductForm({
  adminKey,
  dbCategories,
  onCreated,
  onClose,
}: {
  adminKey: string;
  dbCategories: DbCategory[];
  onCreated: (product: any) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [colorUploading, setColorUploading] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [colorUrlDrafts, setColorUrlDrafts] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = dbCategories.filter((c) => c.source === form.source);
  const selectedCat = categories.find((c) => c.slug === form.category);
  const subcategories = selectedCat?.subcategories || [];
  const hasColors = form.colorOptions.length > 0;
  const hasSizes = Object.values(form.sizeOptions).some((arr) => arr && arr.length > 0);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function handleSourceChange(source: string) {
    setForm((f) => ({ ...f, source, category: "", subCategory: "" }));
  }

  function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;
    set({ images: [...form.images, url] });
    setUrlInput("");
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const file of Array.from(files)) fd.append("images", file);
      const result = await adminUpload(adminKey, fd);
      set({ images: [...form.images, ...result.urls] });
      toast(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }

  function removeImage(index: number) {
    set({ images: form.images.filter((_, i) => i !== index) });
  }

  function updateColors(u: FormColor[]) {
    setForm((f) => ({ ...f, colorOptions: u }));
  }

  async function handleColorImageUpload(i: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setColorUploading(i);
    try {
      const fd = new FormData();
      for (const file of Array.from(files)) fd.append("images", file);
      const result = await adminUpload(adminKey, fd);
      const u = [...form.colorOptions];
      u[i] = { ...u[i], images: [...(u[i].images || []), ...result.urls] };
      updateColors(u);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setColorUploading(null);
    }
  }

  function handleColorUrlAdd(i: number) {
    const val = (colorUrlDrafts[i] || "").trim();
    if (!val) return;
    const u = [...form.colorOptions];
    u[i] = { ...u[i], images: [...(u[i].images || []), val] };
    updateColors(u);
    setColorUrlDrafts((d) => ({ ...d, [i]: "" }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("Product name is required", "error"); return; }
    if (!form.source) { toast("Please choose Store or Mart", "error"); return; }
    if (form.images.length === 0 && !form.colorOptions.some((c) => (c.images || []).length > 0)) {
      toast("At least one product image is required", "error");
      return;
    }
    if (!hasColors && form.price <= 0) { toast("Price is required", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, images: form.images };
      const res = await fetch(`${API}/api/admin/products`, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");
      toast("Product created", "success");
      onCreated(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create product", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-dark-900/60 border border-gold-500/20 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-xs sm:text-sm">
          <X size={14} /> Cancel
        </button>
        <div className="h-4 w-px bg-dark-700/50 hidden sm:block" />
        <h2 className="text-base sm:text-lg font-semibold text-white">Add New Product</h2>
        <span className="text-[11px] text-gold-400/80 ml-auto">Live on storefront immediately</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Product Name</label>
              <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 sm:px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                placeholder="Enter product name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Sell On</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleSourceChange("store")}
                    className={cn("flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all",
                      form.source === "store" ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200")}>
                    <Store size={16} /> Store
                  </button>
                  <button type="button" onClick={() => handleSourceChange("mart")}
                    className={cn("flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all",
                      form.source === "mart" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200")}>
                    <ShoppingCart size={16} /> Mart
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Brand</label>
                <input type="text" value={form.brand} onChange={(e) => set({ brand: e.target.value })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="Brand name" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => set({ category: e.target.value, subCategory: "" })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}
                </select>
              </div>
              {form.category && subcategories.length > 0 && (
                <div>
                  <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Subcategory</label>
                  <select value={form.subCategory} onChange={(e) => set({ subCategory: e.target.value })}
                    className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
                    <option value="">None</option>
                    {subcategories.map((s) => (<option key={s.id} value={s.slug}>{s.name}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 resize-none"
                placeholder="Product description..." />
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-3 block">Product Images</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                className={cn("border-2 border-dashed rounded-xl p-4 sm:p-5 text-center transition-all cursor-pointer",
                  dragOver ? "border-gold-500/50 bg-gold-500/5" : "border-dark-700/50 bg-dark-800/30 hover:border-dark-600")}
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={20} className="text-gold-400 animate-spin" />
                    <p className="text-xs text-dark-400">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload size={20} className="text-dark-500" />
                    <p className="text-xs text-dark-300 font-medium">Upload from device</p>
                    <p className="text-[10px] text-dark-500">Drag & drop or click</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
                  className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="Paste image URL..." />
                <button type="button" onClick={handleAddUrl} disabled={!urlInput.trim()}
                  className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 rounded-xl text-xs text-dark-300 hover:text-white hover:border-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Add URL
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)} />
            {form.images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {form.images.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-dark-700/50 bg-dark-800 group/img">
                    <img src={resolveImageUrl(url)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color Variants */}
          {form.source === "store" && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Color Variants</label>
                <button type="button" onClick={() => updateColors([...form.colorOptions, { name: "", hex: "#000000", colors: [], images: [], specifications: [], keyFeatures: [] }])}
                  className="px-3 py-2 bg-gold-500 text-dark-950 rounded-xl text-xs font-semibold hover:bg-gold-400 transition-all flex items-center gap-1.5">
                  <Plus size={14} /> Add Color
                </button>
              </div>
              {form.colorOptions.length === 0 && <p className="text-sm text-dark-500 italic">No color variants yet. Add colors for multi-variant products.</p>}

              <div className="space-y-5">
                {form.colorOptions.map((color, i) => {
                  const colorName = color.name || `Color ${i + 1}`;
                  const colorSizes = form.sizeOptions[colorName] || [];
                  const hasColorSizes = colorSizes.length > 0;
                  const isMultiple = form.colorOptions.length > 1;
                  const presets = SIZE_PRESETS[form.category] || [];
                  const existingNames = colorSizes.map((s) => s.name);

                  return (
                    <div key={i} className={cn("rounded-2xl border border-dark-700/50 bg-dark-800/30 p-4 sm:p-5 space-y-3 sm:space-y-4", isMultiple && i > 0 && "border-t-2 border-t-dark-600/30")}>

                      <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative shrink-0">
                          <input type="color" value={color.hex}
                            onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], hex: e.target.value }; updateColors(u); }}
                            className="w-12 h-12 rounded-xl border border-dark-700/50 bg-transparent cursor-pointer" />
                          {(color.colors?.length || 0) > 1 && (
                            <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
                              <div className="w-full h-full rounded-xl" style={{ background: `linear-gradient(135deg, ${color.colors[0]} 50%, ${color.colors[1]} 50%)` }} />
                            </div>
                          )}
                        </div>
                        <input type="text" value={color.name}
                          onChange={(e) => { const u = [...form.colorOptions]; const oldName = u[i].name; const newName = e.target.value; u[i] = { ...u[i], name: newName }; const so = { ...form.sizeOptions }; const oldKey = oldName || `Color ${i + 1}`; const newKey = newName || `Color ${i + 1}`; if (oldKey !== newKey && Array.isArray(so[oldKey]) && so[oldKey].length > 0) { so[newKey] = Array.isArray(so[newKey]) ? [...so[newKey], ...so[oldKey]] : so[oldKey]; delete so[oldKey]; } setForm((f) => ({ ...f, colorOptions: u, sizeOptions: so })); }}
                          className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                          placeholder="Color name (e.g. Midnight Black)" />
                        <button type="button" onClick={() => { const deletedName = form.colorOptions[i]?.name; const deletedKey = deletedName || `Color ${i + 1}`; const so = { ...form.sizeOptions }; delete so[deletedKey]; if (deletedName && deletedKey !== deletedName) delete so[deletedName]; setForm((f) => ({ ...f, colorOptions: f.colorOptions.filter((_, j) => j !== i), sizeOptions: so })); }}
                          className="px-3 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                          <Trash2 size={14} />
                        </button>
                        <button type="button"
                          onClick={() => { const u = [...form.colorOptions]; const current = u[i].colors && u[i].colors.length > 0 ? u[i].colors : [u[i].hex]; u[i] = { ...u[i], colors: [...current, "#808080"] }; updateColors(u); }}
                          className="px-3 py-3 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl hover:text-white hover:border-gold-500/30 transition-all shrink-0">
                          <Palette size={14} />
                        </button>
                      </div>

                      {(color.colors?.length || 0) > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-dark-500">Palette:</span>
                          {(color.colors || []).map((hex, ci) => (
                            <div key={ci} className="relative group/swatch">
                              <input type="color" value={hex}
                                onChange={(e) => { const u = [...form.colorOptions]; const cols = [...(u[i].colors || [])]; cols[ci] = e.target.value; u[i] = { ...u[i], colors: cols }; updateColors(u); }}
                                className="w-8 h-8 rounded-lg border border-dark-700/50 bg-transparent cursor-pointer" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], colors: (u[i].colors || []).filter((_, j) => j !== ci) }; updateColors(u); }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                                <X size={8} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-2 block">Color Images</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input type="text" value={colorUrlDrafts[i] || ""} onChange={(e) => setColorUrlDrafts((d) => ({ ...d, [i]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleColorUrlAdd(i); } }}
                                className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Image URL or upload below..." />
                              <button type="button" onClick={() => handleColorUrlAdd(i)} disabled={!(colorUrlDrafts[i] || "").trim()}
                                className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 rounded-xl text-xs text-dark-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                                Add URL
                              </button>
                            </div>
                            <input type="file" accept="image/*" multiple className="hidden" id={`admin-color-img-${i}`}
                              onChange={async (e) => { await handleColorImageUpload(i, e.target.files); e.target.value = ""; }} />
                            <label htmlFor={`admin-color-img-${i}`}
                              className="border-2 border-dashed border-dark-700/50 bg-dark-800/30 hover:border-dark-600 rounded-xl p-4 text-center cursor-pointer transition-all">
                              <div className="flex flex-col items-center gap-1.5">
                                {colorUploading === i ? <Loader2 size={20} className="text-gold-400 animate-spin" /> : <Upload size={20} className="text-dark-500" />}
                                <p className="text-xs text-dark-300 font-medium">{colorUploading === i ? "Uploading..." : "Upload from device"}</p>
                              </div>
                            </label>
                          </div>
                          <div className="flex gap-2 flex-wrap content-start">
                            {(color.images || []).map((img, ii) => (
                              <div key={ii} className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-dark-700/50 bg-dark-800 group/ci">
                                <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], images: (u[i].images || []).filter((_, j) => j !== ii) }; updateColors(u); }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover/ci:opacity-100 transition-opacity flex items-center justify-center">
                                  <X size={14} className="text-white" />
                                </button>
                              </div>
                            ))}
                            {(color.images || []).length === 0 && <p className="text-[11px] text-dark-600">No images</p>}
                          </div>
                        </div>
                      </div>

                      {!hasColorSizes && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Price (₹)</label>
                            <input type="number" value={color.price || ""}
                              onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], price: e.target.value ? Number(e.target.value) : undefined }; updateColors(u); }}
                              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              placeholder="Selling price" min="0" />
                          </div>
                          <div>
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Original Price (₹)</label>
                            <input type="number" value={color.originalPrice || ""}
                              onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], originalPrice: e.target.value ? Number(e.target.value) : undefined }; updateColors(u); }}
                              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              placeholder="M.R.P" min="0" />
                          </div>
                        </div>
                      )}

                      <div>
                        {presets.length > 0 && (
                          <div className="mb-3">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-2 block">Quick Add Sizes</label>
                            <div className="flex flex-wrap gap-2">
                              {presets.map((ps) => {
                                const exists = existingNames.includes(ps);
                                return (
                                  <button key={ps} type="button" disabled={exists}
                                    onClick={() => { if (!exists) setForm((f) => ({ ...f, sizeOptions: { ...f.sizeOptions, [colorName]: [...(f.sizeOptions[colorName] || []), { name: ps }] } })); }}
                                    className={cn("rounded-xl px-4 py-2 text-xs font-semibold transition-all", exists ? "bg-dark-800/40 text-dark-600 cursor-not-allowed" : "bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20")}>
                                    {exists ? `${ps} ✓` : ps}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {colorSizes.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold block">Added Sizes</label>
                            {colorSizes.map((sz, si) => (
                              <div key={si} className="flex flex-wrap gap-2">
                                <span className="text-sm text-white font-medium bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 min-w-[60px] text-center shrink-0">{sz.name}</span>
                                <input type="number" value={sz.price ?? ""}
                                  onChange={(e) => { const updated = { ...form.sizeOptions }; const sizes = [...(updated[colorName] || [])]; sizes[si] = { ...sizes[si], price: e.target.value ? Number(e.target.value) : undefined }; updated[colorName] = sizes; setForm((f) => ({ ...f, sizeOptions: updated })); }}
                                  className="w-full sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                  placeholder="Price ₹" min={0} />
                                <input type="number" value={sz.originalPrice ?? ""}
                                  onChange={(e) => { const updated = { ...form.sizeOptions }; const sizes = [...(updated[colorName] || [])]; sizes[si] = { ...sizes[si], originalPrice: e.target.value ? Number(e.target.value) : undefined }; updated[colorName] = sizes; setForm((f) => ({ ...f, sizeOptions: updated })); }}
                                  className="w-full sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                  placeholder="M.R.P ₹" min={0} />
                                <button type="button" onClick={() => { const updated = { ...form.sizeOptions }; updated[colorName] = (updated[colorName] || []).filter((_, j) => j !== si); setForm((f) => ({ ...f, sizeOptions: updated })); }}
                                  className="px-3 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" id={`admin-size-input-${i}`}
                            className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                            placeholder="Custom size name..."
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val && !existingNames.includes(val)) { setForm((f) => ({ ...f, sizeOptions: { ...f.sizeOptions, [colorName]: [...(f.sizeOptions[colorName] || []), { name: val }] } })); (e.target as HTMLInputElement).value = ""; } } }} />
                          <button type="button"
                            onClick={() => { const input = document.getElementById(`admin-size-input-${i}`) as HTMLInputElement; if (!input) return; const val = input.value.trim(); if (val && !existingNames.includes(val)) { setForm((f) => ({ ...f, sizeOptions: { ...f.sizeOptions, [colorName]: [...(f.sizeOptions[colorName] || []), { name: val }] } })); input.value = ""; } }}
                            className="px-4 py-3 bg-gold-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-all shrink-0 self-start flex items-center gap-1.5">
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
                            <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], specifications: [...(u[i].specifications || []), { key: "", value: "" }] }; updateColors(u); }}
                              className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl text-xs font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1.5">
                              <Plus size={14} /> Add
                            </button>
                          </div>
                          {(color.specifications || []).map((spec, si) => (
                            <div key={si} className="flex flex-wrap gap-2 items-center mb-2">
                              <input type="text" value={spec.key}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], key: e.target.value }; u[i] = { ...u[i], specifications: specs }; updateColors(u); }}
                                className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Specification name" />
                              <input type="text" value={spec.value}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], value: e.target.value }; u[i] = { ...u[i], specifications: specs }; updateColors(u); }}
                                className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Value" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], specifications: (u[i].specifications || []).filter((_, j) => j !== si) }; updateColors(u); }}
                                className="px-2.5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
                            <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], keyFeatures: [...(u[i].keyFeatures || []), ""] }; updateColors(u); }}
                              className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl text-xs font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1.5">
                              <Plus size={14} /> Add
                            </button>
                          </div>
                          {(color.keyFeatures || []).map((feat, fi) => (
                            <div key={fi} className="flex flex-wrap gap-2 items-center mb-2">
                              <span className="text-dark-500 text-sm w-5 text-center shrink-0">{fi + 1}</span>
                              <input type="text" value={feat}
                                onChange={(e) => { const u = [...form.colorOptions]; const feats = [...(u[i].keyFeatures || [])]; feats[fi] = e.target.value; u[i] = { ...u[i], keyFeatures: feats }; updateColors(u); }}
                                className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Feature" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], keyFeatures: (u[i].keyFeatures || []).filter((_, j) => j !== fi) }; updateColors(u); }}
                                className="px-2.5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product-level Specifications & Features */}
          {form.source === "store" && !hasColors && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
                    <button type="button" onClick={() => set({ specifications: [...form.specifications, { key: "", value: "" }] })}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                  {form.specifications.length === 0 && <p className="text-[11px] text-dark-600 italic">No specifications</p>}
                  {form.specifications.map((spec, i) => (
                    <div key={i} className="flex flex-wrap gap-2 mb-2">
                      <input type="text" value={spec.key} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], key: e.target.value }; set({ specifications: u }); }}
                        className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Key" />
                      <input type="text" value={spec.value} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], value: e.target.value }; set({ specifications: u }); }}
                        className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Value" />
                      <button type="button" onClick={() => set({ specifications: form.specifications.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
                    <button type="button" onClick={() => set({ keyFeatures: [...form.keyFeatures, ""] })}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                  {form.keyFeatures.length === 0 && <p className="text-[11px] text-dark-600 italic">No features</p>}
                  {form.keyFeatures.map((feat, i) => (
                    <div key={i} className="flex flex-wrap gap-2 mb-2">
                      <span className="text-dark-500 text-xs mt-1.5 shrink-0">{i + 1}.</span>
                      <input type="text" value={feat} onChange={(e) => { const u = [...form.keyFeatures]; u[i] = e.target.value; set({ keyFeatures: u }); }}
                        className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Feature" />
                      <button type="button" onClick={() => set({ keyFeatures: form.keyFeatures.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {!hasSizes && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold block">Price</label>
              <div>
                <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1 block">Selling Price (₹)</label>
                <input type="number" value={form.price || ""} onChange={(e) => set({ price: Number(e.target.value) })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1 block">M.R.P (₹)</label>
                <input type="number" value={form.originalPrice || ""} onChange={(e) => set({ originalPrice: Number(e.target.value) })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="0" min="0" />
              </div>
              {hasColors && <p className="text-[9px] text-dark-600 italic">Fallback when a color has no price set</p>}
            </div>
          )}

          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Badge</label>
              <input type="text" value={form.badge} onChange={(e) => set({ badge: e.target.value })}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                placeholder="e.g. New, Sale" />
            </div>
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Stock Status</label>
              <button type="button" onClick={() => set({ inStock: !form.inStock })}
                className={cn("w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                  form.inStock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
                {form.inStock ? <Eye size={14} /> : <EyeOff size={14} />}
                {form.inStock ? "In Stock" : "Out of Stock"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={onClose} className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-xl text-sm font-medium transition-all">
          Cancel
        </button>
        <button onClick={handleSave}
          disabled={saving || !form.name.trim() || (!hasColors && form.price <= 0) || !form.source || uploading || colorUploading !== null}
          className="px-8 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Create Product"}
        </button>
      </div>
    </div>
  );
}