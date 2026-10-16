import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://batraverse.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; frequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1.0, frequency: "daily" },
    { path: "/store", priority: 0.9, frequency: "daily" },
    { path: "/products", priority: 0.8, frequency: "daily" },
    { path: "/about", priority: 0.4, frequency: "monthly" },
    { path: "/contact", priority: 0.4, frequency: "monthly" },
    { path: "/delivery", priority: 0.4, frequency: "monthly" },
    { path: "/terms", priority: 0.3, frequency: "yearly" },
    { path: "/privacy", priority: 0.3, frequency: "yearly" },
  ];

  const staticRoutes = routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.frequency,
    priority: r.priority,
  }));

  return staticRoutes;
}
