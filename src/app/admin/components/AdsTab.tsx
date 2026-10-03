"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Pencil, Trash2, ExternalLink, ArrowUpDown, ChevronUp, X } from "lucide-react";
import { adminHeaders, API } from "./types";
import { resolveImageUrl } from "@/lib/imageUrl";
import { API_URL } from "@/lib/api";
import { categoryAdPage, subcategoryAdPage } from "@/lib/adPages";
import SectionScopeNav from "./SectionScopeNav";
import { useConfirm } from "@/components/useConfirm";
import { useToast } from "@/components/Toast";

interface SpotlightAd {
  id: string;
  img: string;
  tagline: string;
  line: string;
  href: string;
  page: string;
  duration: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

type MainKey = "home" | "store" | "mart" | "search" | "category" | "subcategory";

const MAIN_TABS: { key: MainKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "store", label: "Store" },
  { key: "mart", label: "Mart" },
  { key: "search", label: "Search" },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Sub category" },
];

const SCOPES = [
  { id: "all", label: "All" },
  { id: "store", label: "Store" },
  { id: "mart", label: "Mart" },
];

type SectionRowLite = {
  id: string;
  categorySlug: string;
  subcategorySlug?: string;
  parentSlug?: string;
  source: string;
  name: string;
};

const EMPTY_FORM = { img: "", tagline: "", line: "", href: "/store", page: "home", duration: 7, active: true, sortOrder: 0 };

export default function AdsTab({ adminKey }: { adminKey: string }) {
  const [ads, setAds] = useState<SpotlightAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Nav 1 — which kind of page
  const [mainTab, setMainTab] = useState<MainKey>("home");
  // Nav 2 / 3 / 4 — scope, category in section, subcategory in that section
  const [scope, setScope] = useState("all");
  const [catPick, setCatPick] = useState("");
  const [subPick, setSubPick] = useState("");

  const [sections, setSections] = useState<SectionRowLite[]>([]);
  const [subSections, setSubSections] = useState<SectionRowLite[]>([]);

  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const loadSections = async () => {
    try {
      const [secRes, subRes] = await Promise.all([
        fetch(`${API}/api/category-sections/admin`, { headers: adminHeaders(adminKey) }),
        fetch(`${API}/api/category-sections/sub/admin`, { headers: adminHeaders(adminKey) }),
      ]);
      const sec = secRes.ok ? await secRes.json() : [];
      const sub = subRes.ok ? await subRes.json() : [];
      setSections(Array.isArray(sec) ? sec : []);
      setSubSections(Array.isArray(sub) ? sub : []);
    } catch {
      // nav falls back to base pages only
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  /* ------------------------- nav options (section only) -------------------- */
  const catOptions = sections.filter((s) => scope === "all" || s.source === scope);
  const subOptions = subSections.filter((s) => s.parentSlug === catPick);

  // Derived defaults: keep the selection valid without needing effects.
  const catValid: string = catOptions.some((s) => s.categorySlug === catPick)
    ? catPick
    : (catOptions[0]?.categorySlug ?? "");
  const subValid: string = subOptions.some((s) => s.subcategorySlug === subPick)
    ? subPick
    : (subOptions[0]?.subcategorySlug ?? "");

  const activePage: string =
    mainTab === "category"
      ? catValid
        ? categoryAdPage(catValid)
        : ""
      : mainTab === "subcategory"
        ? catValid && subValid
          ? subcategoryAdPage(catValid, subValid)
          : ""
        : mainTab;

  const loadAds = async () => {
    setLoading(true);
    // No page resolved yet (empty section) — never fall back to "all ads".
    if (!activePage) {
      setAds([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/spotlight-ads?page=${encodeURIComponent(activePage)}`, {
        headers: adminHeaders(adminKey),
      });
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, activePage]);

  const closeForm = () => {
    setExpandedId(null);
    setIsAdding(false);
  };

  const selectMain = (key: MainKey) => {
    setMainTab(key);
    closeForm();
  };

  const selectCat = (slug: string) => {
    setCatPick(slug);
    setSubPick("");
    closeForm();
  };

  const selectSub = (slug: string) => {
    setSubPick(slug);
    closeForm();
  };

  const openAdd = () => {
    setIsAdding(true);
    setExpandedId(null);
    setForm({ ...EMPTY_FORM, page: activePage, sortOrder: ads.length });
  };

  const openEdit = (ad: SpotlightAd) => {
    setIsAdding(false);
    setExpandedId(ad.id);
    setForm({ img: ad.img, tagline: ad.tagline, line: ad.line, href: ad.href, page: ad.page || "home", duration: ad.duration || 7, active: ad.active, sortOrder: ad.sortOrder });
  };

  const handleSave = async () => {
    if (!form.img || !form.tagline || !form.line) return;
    setSaving(true);
    try {
      const url = expandedId
        ? `${API_URL}/admin/spotlight-ads/${expandedId}`
        : `${API_URL}/admin/spotlight-ads`;
      const res = await fetch(url, {
        method: expandedId ? "PUT" : "POST",
        headers: adminHeaders(adminKey),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await loadAds();
        toast(expandedId ? "Ad updated" : "Ad created", "success");
        closeForm();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || (expandedId ? "Failed to update ad" : "Failed to create ad"), "error");
      }
    } catch {
      toast("Network error — could not save ad. Please try again.", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Delete this ad?"))) return;
    try {
      const res = await fetch(`${API_URL}/admin/spotlight-ads/${id}`, {
        method: "DELETE",
        headers: adminHeaders(adminKey),
      });
      if (res.ok) {
        setAds((prev) => prev.filter((ad) => ad.id !== id));
        if (expandedId === id) closeForm();
        toast("Ad deleted", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to delete ad", "error");
      }
    } catch {
      toast("Network error — could not delete ad.", "error");
    }
  };

  const handleToggle = async (id: string) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    try {
      const res = await fetch(`${API_URL}/admin/spotlight-ads/${id}`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ active: !ad.active }),
      });
      if (res.ok) {
        setAds((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
      }
    } catch {}
  };

  const moveAd = async (id: string, dir: -1 | 1) => {
    const sorted = [...ads].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((a) => a.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[targetIdx];
    try {
      await fetch(`${API_URL}/admin/spotlight-ads/${a.id}`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      });
      await fetch(`${API_URL}/admin/spotlight-ads/${b.id}`, {
        method: "PUT",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      });
      await loadAds();
    } catch {}
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-dark-900/60 border border-dark-700/50 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40 transition-colors";

  const renderForm = (mode: "add" | "edit") => (
    <div className="bg-dark-800/40 border border-gold-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gold-400">{mode === "add" ? "New Ad" : "Edit Ad"}</p>
        <button onClick={closeForm} className="p-1 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all">
          <X size={16} />
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-400 mb-1.5">Image URL</label>
        <input type="text" value={form.img} onChange={(e) => setForm((f) => ({ ...f, img: e.target.value }))} placeholder="https://..." className={inputCls} />
        {form.img && (
          <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-dark-900/60 border border-dark-700/30">
            <img src={resolveImageUrl(form.img)} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-dark-400 mb-1.5">Tagline</label>
          <input type="text" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="The Fall Edit" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-400 mb-1.5">Link URL</label>
          <input type="text" value={form.href} onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))} placeholder="/store" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-400 mb-1.5">Description</label>
        <textarea value={form.line} onChange={(e) => setForm((f) => ({ ...f, line: e.target.value }))} placeholder="Where light meets fabric..." rows={2} className={inputCls + " resize-none"} />
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-28">
          <label className="block text-xs font-medium text-dark-400 mb-1.5">Duration (sec)</label>
          <input type="number" min={1} max={30} value={form.duration} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= 30) setForm((f) => ({ ...f, duration: v })); else if (e.target.value === "") setForm((f) => ({ ...f, duration: 1 })); }} className={inputCls} />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-dark-400 mb-1.5">Sort Order</label>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className={inputCls} />
        </div>
        <button type="button" onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.active ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-dark-500 border-dark-700/50 bg-dark-900/60"}`}>
          {form.active ? "Active" : "Inactive"}
        </button>
        <div className="flex-1" />
        <button onClick={closeForm} className="px-4 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !form.img || !form.tagline || !form.line} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving..." : mode === "add" ? "Create" : "Update"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-white">Brand Spotlight Ads</h2>
        <button onClick={openAdd} disabled={!activePage} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20 text-sm font-medium hover:bg-gold-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus size={16} />
          Add Ad
        </button>
      </div>

      {/* Nav 1 — page kind, then the shared 3-level scope nav (same as Categories tab) */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectMain(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mainTab === tab.key
                  ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                  : "text-dark-400 hover:text-white border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(mainTab === "category" || mainTab === "subcategory") && (
          <SectionScopeNav
            variant="dark"
            scope={scope}
            onScope={setScope}
            scopeOptions={SCOPES}
            categories={catOptions.map((s) => ({ slug: s.categorySlug, name: s.name }))}
            activeCategory={catValid}
            onCategory={selectCat}
            categoryAllLabel="All"
            showSubcategories={mainTab === "subcategory" && catValid !== ""}
            subcategories={subOptions.map((s) => ({ slug: s.subcategorySlug ?? "", name: s.name }))}
            activeSubcategory={subValid}
            onSubcategory={selectSub}
          />
        )}

        <p className="text-[11px] text-dark-500">
          {activePage ? (
            <>
              Editing ads for <span className="text-dark-300 font-medium">{activePage}</span>
              {(mainTab === "category" || mainTab === "subcategory") ? (
                <span className="text-dark-500">
                  {" "}— if this page has no ads it falls back to
                  {mainTab === "subcategory" ? " its parent category, then" : ""} the main page.
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-amber-500/80">
              Nothing in the section yet — add categories in Categories → first.
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      ) : ads.length === 0 && !isAdding ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <Megaphone className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">
            {activePage ? "No spotlight ads on this page" : "Nothing in the section yet"}
          </p>
          {activePage ? (
            <button onClick={openAdd} className="mt-4 px-4 py-2 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20 text-sm font-medium hover:bg-gold-500/20 transition-all">
              Create your first ad
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {isAdding && renderForm("add")}

          {[...ads].sort((a, b) => a.sortOrder - b.sortOrder).map((ad, i) => {
            const isExpanded = expandedId === ad.id;
            return (
              <div key={ad.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl overflow-hidden hover:border-dark-700/50 transition-colors">
                <div className="flex items-stretch gap-4 p-4 cursor-pointer" onClick={() => isExpanded ? closeForm() : openEdit(ad)}>
                  <div className="w-40 h-24 rounded-xl overflow-hidden bg-dark-800/60 shrink-0 border border-dark-700/30">
                    <img src={resolveImageUrl(ad.img)} alt={ad.tagline} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{ad.tagline}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ad.active ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-dark-500 bg-dark-800/60 border-dark-700/50"}`}>
                        {ad.active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-[10px] text-dark-500 font-medium">#{ad.sortOrder}</span>
                      <span className="text-[10px] text-dark-500 font-medium">{ad.duration || 7}s</span>
                    </div>
                    <p className="text-xs text-dark-400 mt-1 truncate">{ad.line}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ExternalLink size={10} className="text-dark-500" />
                      <span className="text-[10px] text-dark-500">{ad.href}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => moveAd(ad.id, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Move up">
                      <ArrowUpDown size={14} className="rotate-180" />
                    </button>
                    <button onClick={() => moveAd(ad.id, 1)} disabled={i === ads.length - 1} className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Move down">
                      <ArrowUpDown size={14} />
                    </button>
                    <button onClick={() => handleToggle(ad.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${ad.active ? "text-amber-400 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20"}`}>
                      {ad.active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => isExpanded ? closeForm() : openEdit(ad)} className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-dark-800/40 transition-all">
                      {isExpanded ? <ChevronUp size={14} /> : <Pencil size={14} />}
                    </button>
                    <button onClick={() => handleDelete(ad.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-dark-700/30 pt-4">
                    {renderForm("edit")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
