"use client";

import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import StoreNav from "./StoreNav";
import StoreGrid from "./StoreGrid";
import AdsShowcase from "@/components/home/AdsShowcase";

export default function StorePage() {
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <AdsShowcase page="store" hideHeader />
        <StoreNav
          active={category}
          onCategoryChange={setCategory}
          subActive={subCategory}
          onSubChange={setSubCategory}
        />
        <StoreGrid category={category} subCategory={subCategory} />
      </div>
    </SiteLayout>
  );
}
