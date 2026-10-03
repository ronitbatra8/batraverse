"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import StoreGrid from "@/app/store/StoreGrid";
import MartGrid from "@/app/mart/MartGrid";

/**
 * Feeds the correct product grid for the source. `subcategory` (from the route)
 * wins over the ?sub= query param.
 */
export default function CategoryProductsGrid({
  source,
  category,
  subcategory,
  adSlot,
}: {
  source: "store" | "mart";
  category: string;
  subcategory?: string;
  /** Rendered inside the grid instead of above it. */
  adSlot?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const sub = subcategory || searchParams.get("sub") || "";
  const subCategories = sub ? [sub] : [];

  return source === "store" ? (
    <StoreGrid category={category} subCategories={subCategories} adSlot={adSlot} />
  ) : (
    <MartGrid
      category={category}
      subCategories={subCategories}
      searchQuery=""
      adSlot={adSlot}
    />
  );
}