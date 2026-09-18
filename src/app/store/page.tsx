"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteLayout from "@/components/layout/SiteLayout";
import StoreNav from "./StoreNav";
import StoreGrid from "./StoreGrid";
import AdsShowcase from "@/components/home/AdsShowcase";
import CategoryCollection from "@/components/products/CategoryCollection";
import RandomPicks from "@/components/products/RandomPicks";

function StorePageInner() {
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const initialCat = catParam && catParam !== "all" ? catParam : "all";
  const [category, setCategory] = useState(initialCat);
  const [subCategories, setSubCategories] = useState<string[]>([]);

  const handleSubChange = (id: string) => {
    setSubCategories((prev) => {
      if (id === "all") return [];
      return prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
    });
  };

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <StoreNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategories}
          onSubChange={handleSubChange}
        />
        <AdsShowcase page="store" hideHeader />
        <RandomPicks source="store" />
        <CategoryCollection
          source="store"
          active={category}
          onCategoryChange={setCategory}
        />
        <StoreGrid category={category} subCategories={subCategories} />
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
