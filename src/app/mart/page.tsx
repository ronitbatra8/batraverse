"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import MartNav from "./MartNav";
import MartGrid from "./MartGrid";
import AdsShowcase from "@/components/home/AdsShowcase";

export default function MartPage() {
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <AdsShowcase page="mart" hideHeader />
        <MartNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategory}
          onSubChange={setSubCategory}
        />
        <MartGrid category={category} subCategory={subCategory} searchQuery="" />
      </div>
    </SiteLayout>
  );
}
