/**
 * Spotlight ad page keys.
 *
 * Base pages use their plain name. Category/subcategory pages use a namespaced
 * key so every page owns its own ads:
 *   category:<categorySlug>
 *   subcategory:<parentCategorySlug>:<subcategorySlug>
 *
 * Each page also declares a fallback chain. When a page has no ads of its own
 * the next key in the chain is used, ending at that source's main page
 * (store/mart). A fallback is only consulted when the page has zero ads.
 */
export const AD_PAGE_HOME = "home";
export const AD_PAGE_STORE = "store";
export const AD_PAGE_MART = "mart";
export const AD_PAGE_SEARCH = "search";

export function categoryAdPage(category: string): string {
  return `category:${category}`;
}

export function subcategoryAdPage(parent: string, subcategory: string): string {
  return `subcategory:${parent}:${subcategory}`;
}

/** Ad page + fallback chain for a dedicated category page. */
export function categoryAdChain(
  source: "store" | "mart",
  category: string
): { page: string; fallbacks: string[] } {
  return { page: categoryAdPage(category), fallbacks: [source] };
}

/** Ad page + fallback chain for a dedicated subcategory page. */
export function subcategoryAdChain(
  source: "store" | "mart",
  category: string,
  subcategory: string
): { page: string; fallbacks: string[] } {
  return {
    page: subcategoryAdPage(category, subcategory),
    fallbacks: [categoryAdPage(category), source],
  };
}