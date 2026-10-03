"use client";

export type ScopeOption = { id: string; label: string };

export type SectionNavCategory = { slug: string; name: string };
export type SectionNavSubcategory = { slug: string; name: string };

type Variant = "gold" | "dark";

type Props = {
  variant?: Variant;

  /* Row 1 — scope (All / Store / Mart) */
  scope: string;
  onScope: (id: string) => void;
  scopeOptions: ScopeOption[];

  /* Row 2 — categories that exist in the section (not the whole system) */
  categories: SectionNavCategory[];
  activeCategory: string;
  onCategory: (slug: string) => void;
  categoryAllLabel?: string;

  /* Row 3 — subcategories that exist in that category's sub-section */
  showSubcategories?: boolean;
  subcategories?: SectionNavSubcategory[];
  activeSubcategory?: string;
  onSubcategory?: (slug: string) => void;
};

/**
 * Three-level scope nav shared by the Categories and Ads dashboard tabs so both
 * are identical in structure:
 *   Scope  -> All / Store / Mart
 *   Category -> only categories present in the curated section
 *   Sub category -> only subcategories present in that category's sub-section
 */
export default function SectionScopeNav({
  variant = "gold",
  scope,
  onScope,
  scopeOptions,
  categories,
  activeCategory,
  onCategory,
  categoryAllLabel = "All",
  showSubcategories = false,
  subcategories = [],
  activeSubcategory = "",
  onSubcategory,
}: Props) {
  const gold = variant === "gold";

  const rowLabel = gold
    ? "text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35"
    : "text-[10px] font-semibold uppercase tracking-[0.2em] text-dark-500";

  const pill = (active: boolean, accent: "gold" | "sapphire") => {
    if (!gold) {
      return `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
          : "text-dark-400 hover:text-white border border-transparent"
      }`;
    }
    const on = accent === "gold" ? "border-gold bg-gold text-black" : "border-sapphire bg-sapphire text-white";
    const off = accent === "gold" ? "border-white/15 text-white/60 hover:border-gold/40" : "border-white/15 text-white/60 hover:border-sapphire/40";
    return `rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] transition-colors ${active ? on : off} hover:text-white`;
  };

  return (
    <div className="space-y-4">
      {/* Row 1 — scope */}
      <div className="space-y-2.5">
        <p className={rowLabel}>Scope</p>
        <div className="flex flex-wrap gap-2">
          {scopeOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onScope(o.id)}
              className={pill(scope === o.id, "gold")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — categories in the section */}
      <div className="space-y-2.5">
        <p className={rowLabel}>Category</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategory("")}
            className={pill(activeCategory === "", "sapphire")}
          >
            {categoryAllLabel}
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => onCategory(c.slug)}
              className={pill(activeCategory === c.slug, "sapphire")}
            >
              {c.name}
            </button>
          ))}
        </div>
        {categories.length === 0 && (
          <p
            className={
              gold
                ? "text-[11px] text-white/35"
                : "text-[11px] text-dark-500"
            }
          >
            No categories in this section for {scopeOptions.find((o) => o.id === scope)?.label ?? scope} yet —
            add them from the main page nav first.
          </p>
        )}
      </div>

      {/* Row 3 — subcategories in that category's sub-section */}
      {showSubcategories && activeCategory !== "" && (
        <div className="space-y-2.5">
          <p className={rowLabel}>Sub category</p>
          <div className="flex flex-wrap gap-2">
            {subcategories.length === 0 ? (
              <span className="py-2 text-xs text-white/30 dark:text-dark-500">
                No subcategories in this section yet
              </span>
            ) : (
              subcategories.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onSubcategory?.(s.slug)}
                  className={pill(activeSubcategory === s.slug, "sapphire")}
                >
                  {s.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}