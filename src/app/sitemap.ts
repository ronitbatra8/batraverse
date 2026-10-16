import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://batraverse.vercel.app").replace(/\/$/, "");
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const revalidate = 3600;

const STATIC_PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
}> = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/store", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

type SitemapPayload = {
  categories?: { slug: string; subcategories?: { slug: string }[] }[];
  products?: { id: string; createdAt?: string }[];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const res = await fetch(`${API_URL}/sitemap`, {
      headers: { "ngrok-skip-browser-warning": "true" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return entries;

    const data = (await res.json()) as SitemapPayload;

    for (const category of data.categories || []) {
      if (!category?.slug) continue;
      entries.push({
        url: `${SITE_URL}/store/category/${category.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
      for (const sub of category.subcategories || []) {
        if (!sub?.slug) continue;
        entries.push({
          url: `${SITE_URL}/store/category/${category.slug}/sub/${sub.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    for (const product of data.products || []) {
      if (!product?.id) continue;
      entries.push({
        url: `${SITE_URL}/store/db-${product.id}`,
        lastModified: product.createdAt ? new Date(product.createdAt) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    /* Backend unreachable (e.g. tunnel down at build) — the static entries
       still ship, and the route revalidates hourly once it recovers. */
  }

  return entries;
}
