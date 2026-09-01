"use client";

import { useState, useEffect } from "react";
import ProductShelf, { type ShelfItem } from "./ProductShelf";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type FeaturedCard = {
  productId: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  originalPrice?: number;
  image: string;
  href: string;
  inStock?: boolean;
};

function inr(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "";
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function FeaturedShelf() {
  const [items, setItems] = useState<ShelfItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/featured`, {
      cache: "no-store",
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setItems(
            data
              .filter((c: FeaturedCard) => c && c.image)
              .map((c: FeaturedCard) => ({
                name: c.name || "Untitled",
                category: c.category || "uncategorized",
                price: inr(c.price) || "—",
                compareAt: c.originalPrice && c.originalPrice > 0 ? inr(c.originalPrice) : undefined,
                img: c.image,
                href: c.href,
              }))
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (items.length === 0) return null;

  return (
    <ProductShelf
      eyebrow="Curated for You"
      title="Featured"
      accent="This Season"
      badge="Curated"
      items={items}
    />
  );
}
