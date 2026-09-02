"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/app/store/products";
import { apiFetch } from "@/lib/api";
import { getAuth } from "@/lib/authStorage";

export interface CartItem {
  product: Product;
  color: string;
  colorHex: string;
  colorImage?: string;
  colorPrice?: number;
  size?: string;
  qty: number;
  source?: string;
}

interface CartCtx {
  items: CartItem[];
  addItem: (product: Product, opts: { color: string; colorHex: string; colorImage?: string; colorPrice?: number; size?: string; qty: number; source?: string }) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
  deliveryMode: "standard" | "express" | "regular";
  setDeliveryMode: (mode: "standard" | "express" | "regular") => void;
  totalItems: number;
  subtotal: number;
}

function itemKey(color: string, size?: string) {
  return `${color}::${size ?? ""}`;
}

function fullItemKey(productId: string, color: string, size?: string) {
  return `${productId}::${color}::${size ?? ""}`;
}

function getCartKey(): string {
  try {
    const userId = getAuth("bt-current-user-id") || "guest";
    return `bt-cart-${userId}`;
  } catch {
    return "bt-cart-guest";
  }
}

function loadLocal(): SlimCartItem[] {
  try {
    const raw = localStorage.getItem(getCartKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(items: CartItem[]) {
  const slim = items.map((i) => ({
    pid: i.product.id,
    name: i.product.name,
    price: i.product.price,
    gradient: i.product.gradient,
    category: i.product.category,
    color: i.color,
    colorHex: i.colorHex,
    colorImage: i.colorImage || null,
    colorPrice: i.colorPrice || null,
    size: i.size,
    qty: i.qty,
    source: i.source || "store",
  }));
  localStorage.setItem(getCartKey(), JSON.stringify(slim));
}

interface SlimCartItem {
  pid: string;
  name: string;
  price: number;
  gradient: string;
  category: string;
  color: string;
  colorHex: string;
  colorImage?: string | null;
  colorPrice?: number | null;
  size?: string;
  qty: number;
  source: string;
}

interface BackendCartItem {
  productId: string;
  name?: string;
  price?: number;
  color?: string;
  colorHex?: string;
  image?: string;
  size?: string;
  qty?: number;
  source?: string;
}

function hydrateLocal(slim: SlimCartItem[]): CartItem[] {
  return slim
    .filter((s) => s && s.pid)
    .map((s) => ({
      product: {
        id: s.pid,
        name: s.name || "Unknown",
        price: s.price || 0,
        gradient: s.gradient || "",
        category: s.category || "",
      } as Product,
      color: s.color || "",
      colorHex: s.colorHex || "#0a0a0a",
      colorImage: s.colorImage || undefined,
      colorPrice: s.colorPrice || undefined,
      size: s.size,
      qty: s.qty || 1,
      source: s.source || (s.pid?.startsWith("m") ? "mart" : "store"),
    }));
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => hydrateLocal(loadLocal()));
  const [deliveryMode, setDeliveryMode] = useState<"standard" | "express" | "regular">("standard");
  const userRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
    saveLocal(items);
  }, [items]);

  const getToken = useCallback(() => {
    try {
      return getAuth("bt-token");
    } catch {
      return null;
    }
  }, []);

  const syncToBackend = useCallback(async (cartItems: CartItem[]) => {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch("/cart/sync", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            price: i.product.price,
            color: i.color,
            colorHex: i.colorHex,
            image: i.colorImage,
            size: i.size,
            qty: i.qty,
            source: i.source || "store",
          })),
        }),
      });
    } catch {
      // silently fail — localStorage still has the data
    }
  }, [getToken]);

  useEffect(() => {
    const handleAccountSwitch = async () => {
      const currentUserId = (() => {
        try { return getAuth("bt-current-user-id"); } catch { return null; }
      })();
      userRef.current = currentUserId;

      const localItems = loadLocal();
      setItems(hydrateLocal(localItems));

      const token = getToken();
      if (token && currentUserId) {
        try {
          const backendItems = (await apiFetch("/cart")) as BackendCartItem[];
          if (Array.isArray(backendItems)) {
            // Backend is the source of truth so deletions on any device stick.
            // Enrich each backend item with local product display data (image, gradient, category).
            const localByKey = new Map(
              hydrateLocal(localItems).map((i) => [fullItemKey(i.product.id, i.color, i.size), i])
            );
            const hydrated: CartItem[] = backendItems.map((b) => {
              const key = fullItemKey(b.productId, b.color || "", b.size || undefined);
              const local = localByKey.get(key);
              return {
                product: {
                  id: b.productId,
                  name: b.name || local?.product.name || "Unknown",
                  price: b.price || local?.product.price || 0,
                  gradient: local?.product.gradient || "",
                  category: local?.product.category || "",
                } as Product,
                color: b.color || "",
                colorHex: b.colorHex || "#0a0a0a",
                colorImage: b.image || local?.colorImage,
                colorPrice: b.price || local?.colorPrice,
                size: b.size || undefined,
                qty: b.qty || 1,
                source: b.source || local?.source || "store",
              };
            });
            itemsRef.current = hydrated;
            setItems(hydrated);
            saveLocal(hydrated);
          }
        } catch {
          // keep localStorage items
        }
      }
    };

    handleAccountSwitch();

    window.addEventListener("bt-account-switch", handleAccountSwitch);
    return () => {
      window.removeEventListener("bt-account-switch", handleAccountSwitch);
    };
  }, [getToken, syncToBackend]);

  const applyAndSync = useCallback(async (next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
    saveLocal(next);
    if (getToken()) await syncToBackend(next);
  }, [getToken, syncToBackend]);

  const addItem = useCallback(
    (product: Product, opts: { color: string; colorHex: string; colorImage?: string; colorPrice?: number; size?: string; qty: number; source?: string }) => {
      const key = itemKey(opts.color, opts.size);
      const prev = itemsRef.current;
      const existing = prev.find(
        (i) => itemKey(i.color, i.size) === key && i.product.id === product.id
      );
      const next = existing
        ? prev.map((i) =>
            itemKey(i.color, i.size) === key && i.product.id === product.id
              ? { ...i, qty: Math.min(10, i.qty + opts.qty) }
              : i
          )
        : [...prev, { product, color: opts.color, colorHex: opts.colorHex, colorImage: opts.colorImage, colorPrice: opts.colorPrice, size: opts.size, qty: opts.qty, source: opts.source || "store" }];
      applyAndSync(next);
    },
    [applyAndSync]
  );

  const removeItem = useCallback((key: string) => {
    const next = itemsRef.current.filter((i) => fullItemKey(i.product.id, i.color, i.size) !== key);
    applyAndSync(next);
  }, [applyAndSync]);

  const updateQty = useCallback((key: string, qty: number) => {
    const next = itemsRef.current
      .map((i) =>
        fullItemKey(i.product.id, i.color, i.size) === key
          ? { ...i, qty: Math.max(1, Math.min(10, qty)) }
          : i
      )
      .filter((i) => i.qty > 0);
    applyAndSync(next);
  }, [applyAndSync]);

  const clear = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    saveLocal([]);
    const token = getToken();
    if (token) {
      apiFetch("/cart", { method: "DELETE" }).catch(() => {});
    }
  }, [getToken]);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.colorPrice ?? i.product.price) * i.qty, 0), [items]);

  const value = useMemo<CartCtx>(
    () => ({ items, addItem, removeItem, updateQty, clear, deliveryMode, setDeliveryMode, totalItems, subtotal }),
    [items, addItem, removeItem, updateQty, clear, deliveryMode, setDeliveryMode, totalItems, subtotal]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
