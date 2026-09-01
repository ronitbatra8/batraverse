"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAuth } from "@/lib/authStorage";
import type { Product } from "@/app/store/products";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface WishlistCtx {
  ids: Set<string>;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
  items: Product[];
}

function getWishlistKey(): string {
  try {
    const userId = getAuth("bt-current-user-id") || "guest";
    return `bt-wishlist-${userId}`;
  } catch {
    return "bt-wishlist-guest";
  }
}

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(getWishlistKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(ids: string[]) {
  localStorage.setItem(getWishlistKey(), JSON.stringify(ids));
}

function mapStore(r: any): Product {
  const rawColors = Array.isArray(r.colorOptions) ? r.colorOptions as { name: string; hex: string; images?: string[]; price?: number; originalPrice?: number }[] : [];
  const colors: { name: string; value: string; images?: string[]; price?: number; originalPrice?: number }[] =
    rawColors.length > 0
      ? rawColors.map((c) => ({ name: c.name, value: c.hex, images: Array.isArray(c.images) ? c.images : undefined, price: c.price, originalPrice: c.originalPrice }))
      : [{ name: "Default", value: "#18181b" }];
  const sizeOpts = (r.sizeOptions && typeof r.sizeOptions === "object" && !Array.isArray(r.sizeOptions))
    ? r.sizeOptions as Record<string, { name: string; price?: number }[]>
    : {};
  const firstName = colors[0]?.name || "";
  const firstSizes = sizeOpts[firstName] || Object.values(sizeOpts)[0] || [];
  let price = r.price;
  if ((price === 0 || price == null) && firstSizes[0]?.price) price = firstSizes[0].price;
  if ((price === 0 || price == null) && colors[0]?.price) price = colors[0].price;
  const firstColorImages = colors[0]?.images || [];
  const images = (r.images && r.images.length > 0) ? r.images : firstColorImages;
  return {
    id: `db-${r.id}`,
    name: r.name,
    price,
    originalPrice: r.originalPrice ?? undefined,
    category: r.category || "uncategorized",
    sub: r.subCategory || "all",
    badge: r.badge || undefined,
    gradient: "from-zinc-700 to-zinc-900",
    rating: r.rating || 0,
    reviews: r.reviewCount || 0,
    description: r.description || "",
    features: Array.isArray(r.keyFeatures) ? r.keyFeatures : [],
    colors,
    sizes: Object.values(sizeOpts).flat().map((s: { name: string }) => s.name),
    sku: r.id,
    inStock: r.inStock !== false,
    dbImages: images,
    brand: r.brand || undefined,
    source: "store",
    seller: r.seller || null,
  };
}

function mapMart(r: any): Product {
  return {
    id: `db-${r.id}`,
    name: r.name,
    price: r.price,
    originalPrice: r.originalPrice ?? undefined,
    category: r.category || "uncategorized",
    sub: r.subCategory || "all",
    badge: r.badge || undefined,
    gradient: "from-zinc-700 to-zinc-900",
    rating: r.rating || 0,
    reviews: r.reviewCount || 0,
    unit: "1 unit",
    inStock: r.inStock !== false,
    dbImages: (r.images && r.images.length > 0) ? r.images : ((Array.isArray(r.colorOptions) && (r.colorOptions as { images?: string[] }[])[0]?.images) || []),
    brand: r.brand || "",
    source: r.source === "mediverse" ? "mediverse" : "mart",
    seller: r.seller || null,
    description: r.description || "",
    features: Array.isArray(r.keyFeatures) ? r.keyFeatures : [],
    colors: [{ name: "Default", value: "#18181b" }],
    sku: r.id,
  };
}

const Ctx = createContext<WishlistCtx | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(loadLocal()));

  useEffect(() => {
    saveLocal(Array.from(ids));
  }, [ids]);

  useEffect(() => {
    const handleAccountSwitch = async () => {
      const localIds = loadLocal();
      setIds(new Set(localIds));

      const token = (() => {
        try { return getAuth("bt-token"); } catch { return null; }
      })();
      if (token) {
        try {
          const backendItems = await apiFetch("/wishlist") as { productId: string }[];
          if (Array.isArray(backendItems)) {
            const merged = new Set([...localIds, ...backendItems.map((i) => i.productId)]);
            setIds(merged);
            saveLocal(Array.from(merged));
          }
        } catch {
          // keep localStorage
        }
      }
    };

    handleAccountSwitch();
    window.addEventListener("bt-account-switch", handleAccountSwitch);
    return () => window.removeEventListener("bt-account-switch", handleAccountSwitch);
  }, []);

  const syncBackend = useCallback(async (nextIds: string[]) => {
    const token = (() => {
      try { return getAuth("bt-token"); } catch { return null; }
    })();
    if (!token) return;

    try {
      const backendItems = await apiFetch("/wishlist") as { productId: string }[];
      const backendSet = new Set(backendItems.map((i) => i.productId));
      const localSet = new Set(nextIds);

      for (const id of nextIds) {
        if (!backendSet.has(id)) {
          apiFetch("/wishlist", {
            method: "POST",
            body: JSON.stringify({ productId: id }),
          }).catch(() => {});
        }
      }
      for (const item of backendItems) {
        if (!localSet.has(item.productId)) {
          apiFetch(`/wishlist/${encodeURIComponent(item.productId)}`, {
            method: "DELETE",
          }).catch(() => {});
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      syncBackend(Array.from(next));
      return next;
    });
  }, [syncBackend]);

  const add = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      syncBackend(Array.from(next));
      return next;
    });
  }, [syncBackend]);

  const remove = useCallback((id: string) => {
    setIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      syncBackend(Array.from(next));
      return next;
    });
  }, [syncBackend]);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const [catalog, setCatalog] = useState<Product[]>([]);

  const items = useMemo<Product[]>(() => {
    const resolved: Product[] = [];
    for (const id of ids) {
      const found = catalog.find((p) => p.id === id);
      if (found) resolved.push(found);
    }
    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, catalog]);

  useEffect(() => {
    if (ids.size === 0) { setCatalog([]); return; }
    const sources = [
      { path: "/categories/products/store", map: mapStore },
      { path: "/categories/products/mart", map: mapMart },
      { path: "/categories/products/mediverse", map: mapMart },
    ];
    let cancelled = false;
    (async () => {
      const out: Product[] = [];
      for (const s of sources) {
        try {
          const res = await fetch(`${API_BASE}${s.path}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const r of data) out.push(s.map(r));
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setCatalog(out);
    })();
    return () => { cancelled = true; };
  }, [ids]);

  const count = ids.size;

  const value = useMemo<WishlistCtx>(
    () => ({ ids, toggle, add, remove, has, count, items }),
    [ids, toggle, add, remove, has, count, items]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
