/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Check, X, PackageCheck, User, Store, ChevronDown, ChevronUp, ImageIcon, Plus, Trash2, Eye, EyeOff, Palette } from "lucide-react";
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
  status: string;
  rejectReason: string | null;
  price: number;
  originalPrice: number | null;
  description: string | null;
  images: unknown;
  colorOptions: unknown;
  sizeOptions: unknown;
  specifications: unknown;
  keyFeatures: unknown;
  inStock: boolean;
  badge: string | null;
  sellerPrice: number | null;
  createdAt: string;
  approvalType?: string;
  baseProduct?: { id: string; name: string } | null;
  seller: { id: string; name: string; email: string; shopName: string | null };
}

interface ColorOption {
  name: string;
  hex: string;
  colors: string[];
  images: string[];
  specifications: { key: string; value: string }[];
  keyFeatures: string[];
  price?: number;
  originalPrice?: number;
}

interface SizeOption {
  name: string;
  price?: number;
  originalPrice?: number;
}

interface EditState {
  expanded: boolean;
  price: string;
  originalPrice: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  description: string;
  images: string[];
  inStock: boolean;
  badge: string;
  specifications: { key: string; value: string }[];
  keyFeatures: string[];
  colorOptions: ColorOption[];
  sizeOptions: Record<string, SizeOption[]>;
  rejectOpen: boolean;
  rejectReason: string;
}

function imageOf(p: PendingProduct): string {
  const images = Array.isArray(p.images) ? p.images : [];
  if (images[0]) return String(images[0]);
  const colors = Array.isArray(p.colorOptions) ? p.colorOptions : [];
  for (const c of colors) {
    const cImgs = c && Array.isArray(c.images) ? c.images : [];
    if (cImgs[0]) return String(cImgs[0]);
  }
  return "";
}

function effectivePriceOf(p: PendingProduct): number {
  let price = p.price || 0;
  if (price <= 0 && p.sizeOptions && typeof p.sizeOptions === "object") {
    const first = Object.values(p.sizeOptions)[0] || [];
    if (Array.isArray(first) && first[0] && first[0].price != null && first[0].price > 0) price = first[0].price;
  }
  if (price <= 0 && Array.isArray(p.colorOptions)) {
    for (const c of p.colorOptions) {
      if (c && c.price != null && c.price > 0) { price = c.price; break; }
    }
  }
  return price;
}

function parseApprovalSpecs(raw: unknown): { key: string; value: string }[] {
  if (Array.isArray(raw)) {
    return raw.filter((s) => s && typeof s.key === "string").map((s) => ({ key: String(s.key), value: s.value != null ? String(s.value) : "" }));
  }
  return [];
}

function parseApprovalFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((f) => String(f));
  return [];
}

function parseApprovalColors(raw: unknown): ColorOption[] {
  if (Array.isArray(raw)) {
    return raw.map((c: any) => ({
      name: c && typeof c.name === "string" ? c.name : "",
      hex: c && typeof c.hex === "string" ? c.hex : "#888888",
      colors: c && Array.isArray(c.colors) ? c.colors.map(String) : [],
      images: c && Array.isArray(c.images) ? c.images.map(String) : [],
      specifications: parseApprovalSpecs(c && c.specifications),
      keyFeatures: parseApprovalFeatures(c && c.keyFeatures),
      price: c && typeof c.price === "number" ? c.price : undefined,
      originalPrice: c && typeof c.originalPrice === "number" ? c.originalPrice : undefined,
    })).filter((c) => c.name || c.hex);
  }
  return [];
}

function parseApprovalSizes(raw: unknown): Record<string, SizeOption[]> {
  const out: Record<string, SizeOption[]> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [colorName, sizes] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(sizes)) {
        out[colorName] = sizes.map((s: any) => ({
          name: s && typeof s.name === "string" ? s.name : "",
          price: s && typeof s.price === "number" ? s.price : undefined,
          originalPrice: s && typeof s.originalPrice === "number" ? s.originalPrice : undefined,
        })).filter((s) => s.name);
      }
    }
  }
  return out;
}

function initialEdit(p: PendingProduct): EditState {
  return {
    expanded: false,
    price: String(p.price ?? p.sellerPrice ?? 0),
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : "",
    name: p.name || "",
    brand: p.brand || "",
    category: p.category || "",
    subCategory: p.subCategory || "",
    description: p.description || "",
    images: Array.isArray(p.images) ? p.images.map(String) : [],
    inStock: p.inStock !== false,
    badge: p.badge || "",
    specifications: parseApprovalSpecs(p.specifications),
    keyFeatures: parseApprovalFeatures(p.keyFeatures),
    colorOptions: parseApprovalColors(p.colorOptions),
    sizeOptions: parseApprovalSizes(p.sizeOptions),
    rejectOpen: false,
    rejectReason: "",
  };
}

const inputCls = "w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50";

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  source: string;
  subcategories: { id: string; name: string; slug: string }[];
}

function CategorySelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between bg-dark-800/60 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500/50 cursor-pointer transition-colors ${
          open ? "border-gold-500/50" : "border-dark-700/50"
        } ${selected ? "text-white" : "text-dark-500"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-dark-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-dark-700/50 bg-dark-900 shadow-xl shadow-black/40 p-1">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-dark-500 hover:bg-dark-800/60 hover:text-dark-200"
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                o.value === value
                  ? "bg-gold-500/10 text-gold-400"
                  : "text-dark-200 hover:bg-dark-800/60 hover:text-white"
              }`}
            >
              <span className="truncate">{o.label}</span>
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-dark-500">No categories available</div>
          )}
        </div>
      )}
    </div>
  );
}

interface ApprovalEditorProps {
  p: PendingProduct;
  e: EditState;
  setEdit: (id: string, patch: Partial<EditState>) => void;
  dbCategories: DbCategory[];
}

function ApprovalEditor({ p, e, setEdit, dbCategories }: ApprovalEditorProps) {
  const id = p.id;
  const hasColors = e.colorOptions.length > 0;
  const source = p.source || "store";
  const categories = dbCategories.filter((c) => c.source === source);
  const selectedCategory = categories.find((c) => c.slug === e.category);
  const subcategories = selectedCategory?.subcategories || [];

  function updateColor(i: number, patch: Partial<ColorOption>) {
    const colorOptions = [...e.colorOptions];
    colorOptions[i] = { ...colorOptions[i], ...patch };
    setEdit(id, { colorOptions });
  }

  function updateGlobalSpec(i: number, patch: Partial<{ key: string; value: string }>) {
    const specifications = [...e.specifications];
    specifications[i] = { ...specifications[i], ...patch };
    setEdit(id, { specifications });
  }

  function updateSize(colorName: string, i: number, patch: Partial<SizeOption>) {
    const sizeOptions = { ...e.sizeOptions };
    const sizes = [...(sizeOptions[colorName] || [])];
    sizes[i] = { ...sizes[i], ...patch };
    sizeOptions[colorName] = sizes;
    setEdit(id, { sizeOptions });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: product details */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Name</label>
            <input type="text" value={e.name} onChange={(ev) => setEdit(id, { name: ev.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Brand</label>
            <input type="text" value={e.brand} onChange={(ev) => setEdit(id, { brand: ev.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Badge</label>
            <input type="text" value={e.badge} onChange={(ev) => setEdit(id, { badge: ev.target.value })} className={inputCls} placeholder="e.g. New, Sale" />
          </div>
          <div>
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Category</label>
            <CategorySelect
              value={e.category}
              onChange={(v) => setEdit(id, { category: v, subCategory: "" })}
              placeholder="Select category"
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
            />
          </div>
          {e.category && (
            <div>
              <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Subcategory</label>
              <CategorySelect
                value={e.subCategory}
                onChange={(v) => setEdit(id, { subCategory: v })}
                placeholder="None"
                options={subcategories.map((s) => ({ value: s.slug, label: s.name }))}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Description</label>
            <textarea rows={2} value={e.description} onChange={(ev) => setEdit(id, { description: ev.target.value })} className={inputCls + " resize-none"} />
          </div>
          <div>
            <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Stock Status</label>
            <button
              type="button"
              onClick={() => setEdit(id, { inStock: !e.inStock })}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${e.inStock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}
            >
              {e.inStock ? <Eye size={14} /> : <EyeOff size={14} />}
              {e.inStock ? "In Stock" : "Out of Stock"}
            </button>
          </div>
        </div>

        {/* Product images — seller-submitted, editable here */}
        <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Product Images</label>
            {e.images.length < 10 && (
              <button type="button" onClick={() => {
                const url = prompt("Paste image URL");
                if (url && url.trim()) setEdit(id, { images: [...e.images, url.trim()] });
              }}
                className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Plus size={10} /> Add URL
              </button>
            )}
          </div>
          {e.images.length === 0 && <p className="text-[11px] text-dark-600 italic">No images</p>}
          {e.images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {e.images.map((img, ii) => (
                <div key={ii} className="relative aspect-square rounded-lg overflow-hidden border border-dark-700/50 bg-dark-800 group/ci">
                  <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                  {ii === 0 && <span className="absolute top-1 left-1 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-gold-500/90 text-dark-950">Cover</span>}
                  <button type="button" onClick={() => setEdit(id, { images: e.images.filter((_, j) => j !== ii) })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/ci:opacity-100 transition-opacity flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!hasColors && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Sell Price (₹)</label>
              <input type="number" min={0} value={e.price} onChange={(ev) => setEdit(id, { price: ev.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">M.R.P (₹)</label>
              <input type="number" min={0} value={e.originalPrice} onChange={(ev) => setEdit(id, { originalPrice: ev.target.value })} className={inputCls} placeholder="0" />
            </div>
          </div>
        )}

        {/* Global specifications & features */}
        <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
              <button type="button" onClick={() => setEdit(id, { specifications: [...e.specifications, { key: "", value: "" }] })}
                className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Plus size={10} /> Add
              </button>
            </div>
            {e.specifications.length === 0 && <p className="text-[11px] text-dark-600 italic">No specifications</p>}
            {e.specifications.map((spec, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2">
                <input type="text" value={spec.key} onChange={(ev) => updateGlobalSpec(i, { key: ev.target.value })}
                  className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Key" />
                <input type="text" value={spec.value} onChange={(ev) => updateGlobalSpec(i, { value: ev.target.value })}
                  className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Value" />
                <button type="button" onClick={() => setEdit(id, { specifications: e.specifications.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
              <button type="button" onClick={() => setEdit(id, { keyFeatures: [...e.keyFeatures, ""] })}
                className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Plus size={10} /> Add
              </button>
            </div>
            {e.keyFeatures.length === 0 && <p className="text-[11px] text-dark-600 italic">No features</p>}
            {e.keyFeatures.map((feat, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2">
                <span className="text-dark-500 text-xs mt-1.5 shrink-0">{i + 1}.</span>
                <input type="text" value={feat} onChange={(ev) => { const keyFeatures = [...e.keyFeatures]; keyFeatures[i] = ev.target.value; setEdit(id, { keyFeatures }); }}
                  className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Feature" />
                <button type="button" onClick={() => setEdit(id, { keyFeatures: e.keyFeatures.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: colors / sizes / variant prices */}
      <div className="space-y-4">
        {hasColors && (
          <div className="rounded-xl bg-dark-800/30 border border-dark-700/40 p-4 space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Color Variants</label>
              <button type="button" onClick={() => setEdit(id, { colorOptions: [...e.colorOptions, { name: "", hex: "#888888", colors: [], images: [], specifications: [], keyFeatures: [] }] })}
                className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Plus size={10} /> Add Color
              </button>
            </div>

            {e.colorOptions.map((color, i) => {
              const colorName = color.name || `Color ${i + 1}`;
              const sizes = e.sizeOptions[colorName] || [];
              const hasSizes = sizes.length > 0;
              return (
                <div key={i} className="rounded-xl border border-dark-700/50 bg-dark-900/40 p-4 space-y-3">
                  <div className="flex flex-wrap gap-2.5 items-center">
                    <label className="relative w-11 h-11 rounded-xl border border-dark-700/50 bg-dark-800 flex items-center justify-center cursor-pointer overflow-hidden shrink-0">
                      <input type="color" value={color.hex} onChange={(ev) => updateColor(i, { hex: ev.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Palette size={16} className="text-dark-400" />
                    </label>
                    <input type="text" value={color.name}
                      onChange={(ev) => {
                        const oldName = color.name;
                        const newName = ev.target.value;
                        const oldKey = oldName || `Color ${i + 1}`;
                        const newKey = newName || `Color ${i + 1}`;
                        const sizeOptions = { ...e.sizeOptions };
                        if (oldKey !== newKey && Array.isArray(sizeOptions[oldKey]) && sizeOptions[oldKey].length > 0) {
                          sizeOptions[newKey] = Array.isArray(sizeOptions[newKey]) ? [...sizeOptions[newKey], ...sizeOptions[oldKey]] : sizeOptions[oldKey];
                          delete sizeOptions[oldKey];
                        } else if (oldKey !== newKey) {
                          delete sizeOptions[oldKey];
                        }
                        updateColor(i, { name: newName });
                        if (oldKey !== newKey) setEdit(id, { sizeOptions });
                      }}
                      className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                      placeholder="Color name (e.g. Midnight Black)" />
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {(color.colors || []).map((hex, ci) => (
                        <div key={ci} className="relative w-8 h-8 rounded-lg overflow-hidden border border-dark-600 shrink-0">
                          <input type="color" value={hex}
                            onChange={(ev) => { const colors = [...color.colors]; colors[ci] = ev.target.value; updateColor(i, { colors }); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <span className="absolute inset-0" style={{ background: hex }} />
                        </div>
                      ))}
                      <button type="button" onClick={() => updateColor(i, { colors: [...color.colors, "#808080"] })}
                        className="w-8 h-8 rounded-lg bg-dark-800/60 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 flex items-center justify-center transition-all shrink-0">
                        <Palette size={14} />
                      </button>
                    </div>
                    <button type="button" onClick={() => {
                      const colorOptions = e.colorOptions.filter((_, j) => j !== i);
                      const sizeOptions = { ...e.sizeOptions };
                      delete sizeOptions[colorName];
                      setEdit(id, { colorOptions, sizeOptions });
                    }}
                      className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {color.images && color.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {color.images.map((img, ii) => (
                        <div key={ii} className="relative w-14 h-14 rounded-lg overflow-hidden border border-dark-700/50 bg-dark-800 group/ci">
                          <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                          <button type="button" onClick={() => updateColor(i, { images: color.images.filter((_, j) => j !== ii) })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/ci:opacity-100 transition-opacity flex items-center justify-center">
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasSizes && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">Sell Price (₹)</label>
                        <input type="number" min={0} value={color.price ?? ""}
                          onChange={(ev) => updateColor(i, { price: ev.target.value ? Number(ev.target.value) : undefined })}
                          className={inputCls} placeholder="Selling price" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1">M.R.P (₹)</label>
                        <input type="number" min={0} value={color.originalPrice ?? ""}
                          onChange={(ev) => updateColor(i, { originalPrice: ev.target.value ? Number(ev.target.value) : undefined })}
                          className={inputCls} placeholder="M.R.P" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
                        <button type="button" onClick={() => updateColor(i, { specifications: [...color.specifications, { key: "", value: "" }] })}
                          className="px-2 py-1 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-lg text-[10px] font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1">
                          <Plus size={10} /> Add
                        </button>
                      </div>
                      {color.specifications.map((spec, si) => (
                        <div key={si} className="flex flex-wrap gap-2 items-center mb-2">
                          <input type="text" value={spec.key}
                            onChange={(ev) => { const specifications = [...color.specifications]; specifications[si] = { ...specifications[si], key: ev.target.value }; updateColor(i, { specifications }); }}
                            className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Specification name" />
                          <input type="text" value={spec.value}
                            onChange={(ev) => { const specifications = [...color.specifications]; specifications[si] = { ...specifications[si], value: ev.target.value }; updateColor(i, { specifications }); }}
                            className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Value" />
                          <button type="button" onClick={() => updateColor(i, { specifications: color.specifications.filter((_, j) => j !== si) })}
                            className="px-2 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
                        <button type="button" onClick={() => updateColor(i, { keyFeatures: [...color.keyFeatures, ""] })}
                          className="px-2 py-1 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-lg text-[10px] font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1">
                          <Plus size={10} /> Add
                        </button>
                      </div>
                      {color.keyFeatures.map((feat, fi) => (
                        <div key={fi} className="flex flex-wrap gap-2 items-center mb-2">
                          <span className="text-dark-500 text-xs w-4 text-center shrink-0">{fi + 1}</span>
                          <input type="text" value={feat}
                            onChange={(ev) => { const keyFeatures = [...color.keyFeatures]; keyFeatures[fi] = ev.target.value; updateColor(i, { keyFeatures }); }}
                            className="flex-1 min-w-0 basis-40 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Feature" />
                          <button type="button" onClick={() => updateColor(i, { keyFeatures: color.keyFeatures.filter((_, j) => j !== fi) })}
                            className="px-2 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  {p.source !== "mart" && hasColors && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold">Sizes</label>
                        <button type="button" onClick={() => setEdit(id, { sizeOptions: { ...e.sizeOptions, [colorName]: [...sizes, { name: "" }] } })}
                          className="px-2 py-1 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-lg text-[10px] font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1">
                          <Plus size={10} /> Add
                        </button>
                      </div>
                      {hasSizes && (
                        <div className="space-y-2">
                          {sizes.map((sz, si) => (
                            <div key={si} className="flex flex-wrap gap-2 items-center">
                              <input type="text" value={sz.name}
                                onChange={(ev) => updateSize(colorName, si, { name: ev.target.value })}
                                className="w-20 sm:w-24 shrink-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-2 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Size" />
                              <input type="number" min={0} value={sz.price ?? ""}
                                onChange={(ev) => updateSize(colorName, si, { price: ev.target.value ? Number(ev.target.value) : undefined })}
                                className="flex-1 min-w-0 sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Price ₹" />
                              <input type="number" min={0} value={sz.originalPrice ?? ""}
                                onChange={(ev) => updateSize(colorName, si, { originalPrice: ev.target.value ? Number(ev.target.value) : undefined })}
                                className="flex-1 min-w-0 sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="M.R.P ₹" />
                              <button type="button" onClick={() => setEdit(id, { sizeOptions: { ...e.sizeOptions, [colorName]: sizes.filter((_, j) => j !== si) } })}
                                className="px-2.5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductApprovalsTab({ adminKey, onCount }: { adminKey: string; onCount?: (n: number) => void }) {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all" | "approved">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "add" | "update">("all");
  const [visibleCount, setVisibleCount] = useState(50);
  const visibleProducts = products.slice(0, visibleCount);

  const TYPE_TABS: { key: typeof typeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "add", label: "Add" },
    { key: "update", label: "Update" },
  ];

  const STATUS_TABS: { key: typeof statusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
  ];

  useEffect(() => {
    fetch(`${API}/api/categories/all`, { headers: adminHeaders(adminKey) })
      .then((r) => r.json())
      .then((data) => setDbCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [adminKey]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/product-approvals?status=${statusFilter}&type=${typeFilter}`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setEdits((prev) => {
        const next: Record<string, EditState> = {};
        for (const p of list) next[p.id] = prev[p.id] || initialEdit(p);
        return next;
      });
      const pendingCount = statusFilter === "all" ? list.filter((p) => p.status === "pending").length : (statusFilter === "pending" ? list.length : 0);
      if (statusFilter === "pending" || statusFilter === "all") onCount?.(pendingCount);
    } catch {
      console.error("Failed to load product approvals");
    } finally {
      setLoading(false);
    }
  }, [adminKey, onCount, statusFilter, typeFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function setEdit(id: string, patch: Partial<EditState>) {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || initialEdit(products.find((p) => p.id === id)!)), ...patch } }));
  }

  async function handleApprove(p: PendingProduct) {
    const e = edits[p.id] || initialEdit(p);
    const price = Number(e.price);
    if (price === null || price === undefined || Number.isNaN(price) || price < 0) {
      alert("Enter a valid sell price before approving");
      return;
    }
    setProcessing(p.id);
    try {
      const body: Record<string, unknown> = {
        price,
        name: e.name || p.name,
        brand: e.brand || null,
        category: e.category || null,
        subCategory: e.subCategory || null,
        description: e.description || null,
        images: e.images.filter((img) => img && img.trim()),
        inStock: e.inStock,
        badge: e.badge || null,
        specifications: e.specifications.filter((s) => s.key.trim() || s.value.trim()),
        keyFeatures: e.keyFeatures.map((f) => f.trim()).filter(Boolean),
        colorOptions: e.colorOptions.map((c) => ({
          ...c,
          name: c.name.trim(),
          hex: c.hex || "#888888",
          colors: (c.colors || []).filter(Boolean),
          images: (c.images || []).filter(Boolean),
          specifications: c.specifications.filter((s) => s.key.trim() || s.value.trim()),
          keyFeatures: c.keyFeatures.map((f) => f.trim()).filter(Boolean),
          price: c.price != null ? Number(c.price) : undefined,
          originalPrice: c.originalPrice != null ? Number(c.originalPrice) : undefined,
        })),
        sizeOptions: Object.fromEntries(
          Object.entries(e.sizeOptions)
            .map(([colorName, sizes]) => [colorName, sizes.filter((s) => s.name.trim()).map((s) => ({
              name: s.name.trim(),
              price: s.price != null ? Number(s.price) : undefined,
              originalPrice: s.originalPrice != null ? Number(s.originalPrice) : undefined,
            }))])
            .filter(([, sizes]) => (sizes as SizeOption[]).length > 0)
        ),
        sellerPrice: p.sellerPrice,
      };
      if (e.originalPrice && Number(e.originalPrice) >= 0) body.originalPrice = Number(e.originalPrice);
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

  const statusChip = (status: string) => {
    if (status === "pending") return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Pending</span>;
    if (status === "approved") return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Approved</span>;
    return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Rejected</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Product Approvals</h2>
          <p className="text-xs text-dark-500 mt-0.5">
            Review every detail the seller entered, adjust any price, and approve to go live.
          </p>
        </div>
        <button onClick={fetchProducts} className="px-3 py-2 rounded-lg text-xs font-medium border border-dark-700/50 text-dark-400 hover:text-white transition-all">
          Refresh
        </button>
      </div>

      {/* Type filter: add vs update requests */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTypeFilter(t.key); setVisibleCount(50); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              typeFilter === t.key
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                : "text-dark-400 hover:text-white border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-nav status filter */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key); setVisibleCount(50); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === t.key
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                : "text-dark-400 hover:text-white border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <PackageCheck className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No products {statusFilter === "pending" ? "awaiting approval" : statusFilter === "all" ? "found" : statusFilter}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProducts.map((p) => {
            const e = edits[p.id] || initialEdit(p);
            const price = Number(e.price) || 0;
            const cost = p.sellerPrice != null && p.sellerPrice > 0 ? p.sellerPrice : 0;
            const margin = cost > 0 && price >= 0 ? price - cost : null;
            const isExpanded = e.expanded;
            const readOnly = p.status !== "pending";

            if (readOnly) {
              return (
                <div key={p.id} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-x-clip">
                  <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5">
                    <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center overflow-hidden shrink-0">
                      {imageOf(p) ? (
                        <img src={resolveImageUrl(imageOf(p))} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={18} className="text-dark-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        {statusChip(p.status || "pending")}
                        {p.approvalType === "update" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">Update</span>
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
                        {p.approvalType === "update" && p.baseProduct && (
                          <p className="text-[10px] text-sky-400/80 mt-0.5 truncate">Updated: {p.baseProduct.name}</p>
                        )}
                      </div>
                    <div className="shrink-0 text-right text-xs">
                      <div className="text-dark-500 mb-1 flex items-center gap-1.5 justify-end">
                        <User size={11} />
                        <span className="truncate max-w-[140px]">{p.seller?.name || "Unknown"}</span>
                      </div>
                      {p.status === "approved" ? (
                        <span className="text-emerald-400 font-semibold">{formatPrice(effectivePriceOf(p))}</span>
                      ) : p.status === "rejected" && p.rejectReason ? (
                        <span className="text-red-400/90">{p.rejectReason}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-x-clip">
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
                      {p.approvalType === "update" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">Update</span>
                      )}
                      {e.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30">
                          {e.badge}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">
                        {p.source === "mart" ? "Mart" : "Store"}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate mt-1">{e.name}</h3>
                    <p className="text-xs text-dark-500 truncate">
                      {e.brand || "Unknown brand"}
                      {e.category ? ` / ${e.category}` : ""}
                      {e.subCategory ? ` / ${e.subCategory}` : ""}
                    </p>
                    {p.approvalType === "update" && p.baseProduct && (
                      <p className="text-[10px] text-sky-400/80 mt-0.5 truncate">Updating: {p.baseProduct.name}</p>
                    )}
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
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium rounded-xl bg-dark-800/40 border border-dark-700/40 px-4 py-2.5">
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

                    <ApprovalEditor p={p} e={e} setEdit={setEdit} dbCategories={dbCategories} />

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
                        {p.approvalType === "update" ? "Approve Update" : "Approve &amp; Go Live"}
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

          {products.length > visibleProducts.length && (
            <button
              onClick={() => setVisibleCount((v) => v + 50)}
              className="w-full py-3 rounded-xl border border-dark-700/50 bg-dark-900/40 text-sm text-dark-300 hover:text-white hover:border-gold-500/30 transition-all"
            >
              Show more ({products.length - visibleProducts.length} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
