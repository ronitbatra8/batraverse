"use client";

import { useCallback, useEffect, useState } from "react";
import { API, adminHeaders } from "./types";
import { useToast } from "@/components/Toast";
import SectionEditor, { type NotAddedItem, type SectionRow } from "./SectionEditor";
import SectionScopeNav from "./SectionScopeNav";

type Source = "store" | "mart";

type SectionItem = {
  id: string;
  categorySlug: string;
  subcategorySlug?: string;
  parentSlug?: string;
  source: string;
  name: string;
  image: string | null;
  sortOrder: number;
};

type SystemSub = { slug: string; name: string };

type SystemCategory = {
  slug: string;
  name: string;
  source: string;
  subcategories?: SystemSub[];
};

type MainTab = Source | "category";

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "store", label: "Store" },
  { id: "mart", label: "Mart" },
  { id: "category", label: "Category" },
];

const DRILL_SCOPES: { id: Source; label: string }[] = [
  { id: "store", label: "Store" },
  { id: "mart", label: "Mart" },
];

export default function CategoriesTab({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();

  // Nav 1 — Store / Mart manage the main section; "Category" drills down
  const [mainTab, setMainTab] = useState<MainTab>("store");
  // Scope inside the "Category" drill-down (Store / Mart)
  const [drillScope, setDrillScope] = useState<Source>("store");
  // Which category's subcategory section is being managed ("all" = main pages)
  const [categoryPick, setCategoryPick] = useState<string>("all");

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subSections, setSubSections] = useState<SectionItem[]>([]);
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // The main category section follows the main tab; the drill-down has its own scope.
  const inDrill = mainTab === "category";
  const filter: Source = inDrill ? drillScope : (mainTab as Source);

  const load = useCallback(async () => {
    try {
      const [secRes, subRes, catRes] = await Promise.all([
        fetch(`${API}/api/category-sections/admin`, { headers: adminHeaders(adminKey) }),
        fetch(`${API}/api/category-sections/sub/admin`, { headers: adminHeaders(adminKey) }),
        fetch(`${API}/api/categories/all`, { headers: adminHeaders(adminKey) }),
      ]);
      const sec = secRes.ok ? await secRes.json() : [];
      const sub = subRes.ok ? await subRes.json() : [];
      const cats = catRes.ok ? await catRes.json() : [];
      setSections(Array.isArray(sec) ? sec : []);
      setSubSections(Array.isArray(sub) ? sub : []);
      setSystemCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast("Failed to load section", "error");
    } finally {
      setLoading(false);
    }
  }, [adminKey, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: adminHeaders(adminKey),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  };

  const put = async (path: string, body: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method: "PUT",
      headers: adminHeaders(adminKey),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  };

  const del = async (path: string) => {
    const res = await fetch(`${API}${path}`, { method: "DELETE", headers: adminHeaders(adminKey) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
  };

  /* ---------------- Drill-down options: categories that have pages --------- */
  const nav2Options = sections.filter((s) => s.source === filter);

  // Derived (not stored): if the scope changes so the chosen category leaves it,
  // fall back to "all" (main pages) without needing an effect.
  const pickValid: boolean =
    categoryPick === "all" || nav2Options.some((s) => s.categorySlug === categoryPick);
  const activePick: string = pickValid ? categoryPick : "all";

  const subMode = inDrill;
  const activeCategory = systemCategories.find((c) => c.slug === activePick) || null;
  // "all" aggregates every category's subcategory section instead of showing
  // the main category section.
  const allSubs = activePick === "all";

  /* ------------------------------ derived lists --------------------------- */
  const catRows: SectionRow[] = sections
    .filter((s) => s.source === filter)
    .map((s) => ({
      id: s.id,
      name: s.name,
      image: s.image,
      sortOrder: s.sortOrder,
      badge: s.source,
    }));

  const catAdded = new Set(sections.map((s) => s.categorySlug));
  const catNotAdded: NotAddedItem[] = systemCategories
    .filter((c) => !catAdded.has(c.slug) && c.source === filter)
    .map((c) => ({ key: c.slug, label: c.name }));

  const catNameOf = (slug: string) => systemCategories.find((c) => c.slug === slug)?.name ?? slug;

  const subRows: SectionRow[] = subSections
    .filter((s) => (allSubs ? s.source === filter : s.parentSlug === activePick))
    .map((s) => ({
      id: s.id,
      name: s.name,
      image: s.image,
      sortOrder: s.sortOrder,
      badge: allSubs ? catNameOf(s.parentSlug ?? "") : undefined,
    }));

  // In the aggregated view a subcategory counts as added under its own parent.
  const subAdded = new Set(
    subSections
      .filter((s) => (allSubs ? s.source === filter : s.parentSlug === activePick))
      .map((s) => `${s.parentSlug}/${s.subcategorySlug}`)
  );

  const subCandidates: NotAddedItem[] = allSubs
    ? systemCategories
        .filter((c) => c.source === filter)
        .flatMap((c) =>
          (c.subcategories ?? []).map((s) => ({ key: s.slug, label: s.name, badge: c.name, parent: c.slug }))
        )
    : (activeCategory?.subcategories ?? []).map((s) => ({ key: s.slug, label: s.name }));

  const subNotAdded: NotAddedItem[] = subCandidates.filter((s) =>
    allSubs ? !subAdded.has(`${s.parent}/${s.key}`) : !subAdded.has(`${activePick}/${s.key}`)
  );

  /* ------------------------------- handlers ------------------------------- */
  const createCategory = async (name: string, image: string) => {
    try {
      await post("/api/category-sections/with-category", {
        name,
        source: filter === "mart" ? "mart" : "store",
        image: image || null,
      });
      toast(`${name} created and added to section`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    }
  };

  const addExistingCategory = async (slug: string, label: string, image: string) => {
    try {
      await post("/api/category-sections", { categorySlug: slug, image: image || null, name: label });
      toast(`${label} added to section`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    }
  };

  const createSubcategory = async (name: string, image: string) => {
    if (allSubs) return;
    try {
      await post("/api/category-sections/sub/with-subcategory", {
        parentSlug: activePick,
        name,
        image: image || null,
      });
      toast(`${name} created and added to section`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    }
  };

  const addExistingSubcategory = async (
    slug: string,
    label: string,
    image: string,
    parent?: string
  ) => {
    const parentSlug = parent || activePick;
    if (parentSlug === "all") return;
    try {
      await post("/api/category-sections/sub", {
        parentSlug,
        subcategorySlug: slug,
        image: image || null,
        name: label,
      });
      toast(`${label} added to section`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    }
  };

  const swapOrder = async (list: { id: string; sortOrder: number }[], row: SectionRow, dir: -1 | 1) => {
    const idx = list.findIndex((s) => s.id === row.id);
    const other = list[idx + dir];
    if (!other) return;
    try {
      await Promise.all([
        put(`/api${subMode ? "/category-sections/sub" : "/category-sections"}/${row.id}`, {
          sortOrder: other.sortOrder,
        }),
        put(`/api${subMode ? "/category-sections/sub" : "/category-sections"}/${other.id}`, {
          sortOrder: row.sortOrder,
        }),
      ]);
      await load();
    } catch {
      toast("Could not reorder", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* Nav 1 — Store / Mart manage the main section; Category drills down */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">Page</p>
        <div className="flex flex-wrap gap-2">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMainTab(t.id)}
              className={`rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] transition-colors ${
                mainTab === t.id
                  ? "border-gold bg-gold text-black"
                  : "border-white/15 text-white/60 hover:border-gold/40 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drill-down: Store / Mart, then All (main pages) + the categories in section */}
      {inDrill && (
        <SectionScopeNav
          variant="gold"
          scope={drillScope}
          onScope={(id) => {
            setDrillScope(id as Source);
            setCategoryPick("all");
          }}
          scopeOptions={DRILL_SCOPES}
          categories={nav2Options.map((s) => ({ slug: s.categorySlug, name: s.name }))}
          activeCategory={activePick === "all" ? "" : activePick}
          onCategory={(slug) => setCategoryPick(slug || "all")}
          categoryAllLabel="All"
        />
      )}

      {subMode ? (
        <SectionEditor
          adminKey={adminKey}
          rows={subRows}
          notAdded={subNotAdded}
          loading={loading}
          showSourceBadge={allSubs}
          heading={
            allSubs
              ? "All subcategories in section"
              : `Subcategories of ${activeCategory?.name ?? activePick}`
          }
          notAddedHeading="Not in section"
          addHeading="Add subcategory"
          addHint="Creates a new subcategory in the category system and puts it straight into this section."
          createDisabled={allSubs}
          createDisabledHint="Pick a category above to add a subcategory to it."
          createLabel="Add to section"
          namePlaceholder="Subcategory name"
          emptyHint="No subcategories in this section yet. Add some from the right."
          onCreate={createSubcategory}
          onAddExisting={addExistingSubcategory}
          onEditImage={async (id, image) => {
            try {
              await put(`/api/category-sections/sub/${id}`, { image: image || null });
              toast("Image updated", "success");
              await load();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Something went wrong", "error");
            }
          }}
          onRemove={async (row) => {
            if (!confirm(`Remove "${row.name}" from this section?\n\nThe subcategory itself stays in Products → Categories.`)) return;
            try {
              await del(`/api/category-sections/sub/${row.id}`);
              toast(`${row.name} removed from section`, "success");
              await load();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Something went wrong", "error");
            }
          }}
          onReorder={(row, dir) => swapOrder(subRows, row, dir)}
        />
      ) : (
        <SectionEditor
          adminKey={adminKey}
          rows={catRows}
          notAdded={catNotAdded}
          loading={loading}
          showSourceBadge={false}
          heading="In the section"
          notAddedHeading="Not in section"
          addHeading="Add category"
          addHint="Creates a new category in the system and puts it straight into the section."
          createLabel="Add to section"
          namePlaceholder="Category name"
          emptyHint="Nothing in the section yet. Add categories from the right."
          onCreate={createCategory}
          onAddExisting={addExistingCategory}
          onEditImage={async (id, image) => {
            try {
              await put(`/api/category-sections/${id}`, { image: image || null });
              toast("Image updated", "success");
              await load();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Something went wrong", "error");
            }
          }}
          onRemove={async (row) => {
            if (!confirm(`Remove "${row.name}" from the section?\n\nThe category itself stays in Products → Categories.`)) return;
            try {
              await del(`/api/category-sections/${row.id}`);
              toast(`${row.name} removed from section`, "success");
              await load();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Something went wrong", "error");
            }
          }}
          onReorder={(row, dir) => swapOrder(catRows, row, dir)}
        />
      )}
    </div>
  );
}