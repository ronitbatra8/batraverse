"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import MartNav from "./MartNav";
import MartGrid from "./MartGrid";
import AdsShowcase from "@/components/home/AdsShowcase";
import CategoryCollection from "@/components/products/CategoryCollection";
import RandomPicks from "@/components/products/RandomPicks";

export default function MartPage() {
  const [category, setCategory] = useState("all");
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
        <MartNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategories}
          onSubChange={handleSubChange}
        />
        <AdsShowcase page="mart" hideHeader />
        <RandomPicks source="mart" />
        <CategoryCollection
          source="mart"
          active={category}
          onCategoryChange={setCategory}
        />
        <MartGrid category={category} subCategories={subCategories} searchQuery="" />
      </div>
    </SiteLayout>
  );
}
