"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteLayout from "@/components/layout/SiteLayout";
import StoreGrid from "./StoreGrid";
import AdsShowcase from "@/components/home/AdsShowcase";
import CategoryCollection from "@/components/products/CategoryCollection";
import RandomPicks from "@/components/products/RandomPicks";

function StorePageInner() {
  // Category navigation now lives in the Collections section (top of page),
  // which links through to the dedicated category pages. Deep links such as
  // /store?cat=fashion still resolve the grid filter.
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const category = catParam && catParam !== "all" ? catParam : "all";

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <CategoryCollection source="store" navigate />
        <RandomPicks source="store" />
        <AdsShowcase page="store" hideHeader />
        <div id="products-anchor" />
        <StoreGrid category={category} subCategories={[]} />
      </div>
    </SiteLayout>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <StorePageInner />
    </Suspense>
  );
}