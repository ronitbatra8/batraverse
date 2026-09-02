"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import StoreNav from "./StoreNav";
import StoreGrid from "./StoreGrid";
import AdsShowcase from "@/components/home/AdsShowcase";

export default function StorePage() {
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
        <AdsShowcase page="store" hideHeader />
        <StoreNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategories}
          onSubChange={handleSubChange}
        />
        <StoreGrid category={category} subCategories={subCategories} />
      </div>
    </SiteLayout>
  );
}
