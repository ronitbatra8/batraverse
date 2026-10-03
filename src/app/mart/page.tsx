"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteLayout from "@/components/layout/SiteLayout";
import MartGrid from "./MartGrid";
import AdsShowcase from "@/components/home/AdsShowcase";
import CategoryCollection from "@/components/products/CategoryCollection";
import RandomPicks from "@/components/products/RandomPicks";

function MartPageInner() {
  // Category navigation now lives in the Collections section (top of page),
  // which links through to the dedicated category pages.
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const category = catParam && catParam !== "all" ? catParam : "all";

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <CategoryCollection source="mart" navigate />
        <RandomPicks source="mart" />
        <AdsShowcase page="mart" hideHeader />
        <div id="products-anchor" />
        <MartGrid category={category} subCategories={[]} searchQuery="" />
      </div>
    </SiteLayout>
  );
}

export default function MartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MartPageInner />
    </Suspense>
  );
}