import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://batraverse.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; frequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1.0, frequency: "daily" },
    { path: "/store", priority: 0.9, frequency: "daily" },
    { path: "/mart", priority: 0.9, frequency: "daily" },
    { path: "/products", priority: 0.8, frequency: "daily" },
    { path: "/cards", priority: 0.7, frequency: "weekly" },
    { path: "/wallet", priority: 0.6, frequency: "weekly" },
    { path: "/wishlist", priority: 0.5, frequency: "weekly" },
    { path: "/cart", priority: 0.5, frequency: "weekly" },
    { path: "/account", priority: 0.5, frequency: "weekly" },
    { path: "/orders", priority: 0.5, frequency: "weekly" },
    { path: "/search", priority: 0.5, frequency: "weekly" },
    { path: "/about", priority: 0.4, frequency: "monthly" },
    { path: "/contact", priority: 0.4, frequency: "monthly" },
    { path: "/delivery", priority: 0.4, frequency: "monthly" },
    { path: "/private-viewing", priority: 0.4, frequency: "monthly" },
    { path: "/login", priority: 0.3, frequency: "yearly" },
    { path: "/register", priority: 0.3, frequency: "yearly" },
    { path: "/forgot-password", priority: 0.3, frequency: "yearly" },
    { path: "/terms", priority: 0.3, frequency: "yearly" },
    { path: "/privacy", priority: 0.3, frequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.frequency,
    priority: r.priority,
  }));
}