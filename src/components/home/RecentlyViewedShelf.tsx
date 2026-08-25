"use client";

import { useState, useEffect } from "react";
import ProductShelf from "./ProductShelf";
import { getRecentlyViewed } from "@/lib/recentlyViewed";

export default function RecentlyViewedShelf() {
  const [items, setItems] = useState<ReturnType<typeof getRecentlyViewed>>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <ProductShelf
      eyebrow="Welcome Back"
      title="Recently"
      accent="Viewed"
      items={items}
    />
  );
}
