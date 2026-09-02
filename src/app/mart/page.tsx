"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import MartNav from "./MartNav";
import MartGrid from "./MartGrid";
import AdsShowcase from "@/components/home/AdsShowcase";

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
        <AdsShowcase page="mart" hideHeader />
        <MartNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategories}
          onSubChange={handleSubChange}
        />
        <MartGrid category={category} subCategories={subCategories} searchQuery="" />
      </div>
    </SiteLayout>
  );
}
