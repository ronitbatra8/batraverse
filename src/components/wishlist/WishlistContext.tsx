"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAuth } from "@/lib/authStorage";
import { getProduct } from "@/app/store/products";
import { MART_PRODUCTS } from "@/app/mart/products";
import type { Product } from "@/app/store/products";

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

  const items = useMemo(() => {
    const result: Product[] = [];
    for (const id of ids) {
      const staticProduct = getProduct(id);
      if (staticProduct) {
        result.push(staticProduct);
        continue;
      }
      const martProduct = MART_PRODUCTS.find((p) => p.id === id);
      if (martProduct) {
        result.push({
          ...martProduct,
          originalPrice: martProduct.originalPrice,
          sub: martProduct.sub || "",
          badge: martProduct.badge,
          colors: [],
          specs: [],
          features: [],
          description: "",
          sku: id,
          brand: martProduct.brand,
          unit: martProduct.unit,
          dbImages: (martProduct as unknown as { dbImages?: string[] }).dbImages,
        } as Product);
        continue;
      }
    }
    return result;
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
