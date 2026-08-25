"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import MediverseNav from "./MediverseNav";
import MediverseGrid from "./MediverseGrid";
import AdsShowcase from "@/components/home/AdsShowcase";

export default function MediversePage() {
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <AdsShowcase page="mediverse" hideHeader />
        <MediverseNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategory}
          onSubChange={setSubCategory}
        />
        <MediverseGrid category={category} subCategory={subCategory} />
      </div>
    </SiteLayout>
  );
}
