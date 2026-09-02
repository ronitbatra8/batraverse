"use client";

import { useEffect, useState } from "react";
import ProductShelf, { type ShelfItem } from "./ProductShelf";
import { getRecentItems, type RecentItem } from "@/lib/recentlyViewed";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Source = "store" | "mart";

interface DbProduct {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  originalPrice?: number | null;
  price?: number | null;
  images?: string[] | null;
  colorOptions?: unknown;
}

function parseSource(href: string): Source | null {
  if (href.startsWith("/store/")) return "store";
  if (href.startsWith("/mart/")) return "mart";
  return null;
}

function keyFromHref(href: string): string {
  const segments = href.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function resolveRecent(
  item: RecentItem,
  valid: Map<Source, Set<string>>,
  byKey: Map<Source, Map<string, DbProduct>>
): ShelfItem | null {
  if (!item.href) return null;
  const source = parseSource(item.href);
  if (!source) return null;
  const key = keyFromHref(item.href);
  if (!key) return null;
  const set = valid.get(source);
  if (!set || !set.has(key)) return null;

  const product = byKey.get(source)?.get(key);
  const price = product?.price ?? 0;

  let img = item.img || "";
  if (product) {
    const rawImgs = Array.isArray(product.images) ? product.images : [];
    if (rawImgs.length === 0 && product.colorOptions && Array.isArray(product.colorOptions)) {
      const first = (product.colorOptions as { images?: string[] }[])[0];
      if (first && Array.isArray(first.images) && first.images.length > 0) {
        img = first.images[0];
      }
    } else if (rawImgs[0]) {
      img = rawImgs[0];
    }
  }

  return {
    name: product?.name || item.name,
    category: product?.category || item.category || "uncategorized",
    price: `₹${price.toLocaleString("en-IN")}`,
    compareAt: product?.originalPrice && product.originalPrice > 0 ? `₹${product.originalPrice.toLocaleString("en-IN")}` : undefined,
    img,
    href: item.href,
  };
}

export default function RecentlyViewedShelf() {
  const [items, setItems] = useState<ShelfItem[]>([]);

  useEffect(() => {
    (async () => {
      const recent = getRecentItems();
      if (recent.length === 0) return;

      const sources: Source[] = ["store", "mart"];
      const valid = new Map<Source, Set<string>>();
      const byKey = new Map<Source, Map<string, DbProduct>>();

      for (const src of sources) {
        const set = new Set<string>();
        const map = new Map<string, DbProduct>();
        try {
          const res = await fetch(`${API_BASE}/categories/products/${src}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          const data = await res.json();
          const arr: DbProduct[] = Array.isArray(data) ? data : [];
          for (const p of arr) {
            const key = `db-${p.id}`;
            set.add(key);
            if (!map.has(key)) map.set(key, p);
          }
        } catch {
          /* ignore */
        }
        valid.set(src, set);
        byKey.set(src, map);
      }

      const seen = new Set<string>();
      const resolved = recent
        .filter((i) => i.href && !seen.has(i.href) && (seen.add(i.href), true))
        .map((i) => resolveRecent(i, valid, byKey))
        .filter((x): x is ShelfItem => x !== null);

      setItems(resolved);
    })();
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <ProductShelf
      eyebrow="Welcome Back"
      title="Recently"
      accent="Viewed"
      items={items}
    />
  );
}
