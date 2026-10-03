import { Suspense } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AdsShowcase from "@/components/home/AdsShowcase";
import { subcategoryAdChain } from "@/lib/adPages";
import CategoryCollection from "@/components/products/CategoryCollection";
import CategoryLanding from "@/components/products/CategoryLanding";
import CategoryProductsGrid from "@/components/products/CategoryProductsGrid";

export default async function MartSubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category, subcategory } = await params;

  return (
    <SiteLayout>
      <Suspense fallback={null}>
        <CategoryLanding source="mart" category={category} subcategory={subcategory}>
          <CategoryCollection
            source="mart"
            active={category}
            exclude={category}
            navigate
            title="Collections"
            subtitle="Shop by category"
          />
          <div id="products-anchor" />
          <CategoryProductsGrid
            source="mart"
            category={category}
            subcategory={subcategory}
            adSlot={
              <AdsShowcase
                page={subcategoryAdChain("mart", category, subcategory).page}
                fallbacks={subcategoryAdChain("mart", category, subcategory).fallbacks}
                inline
              />
            }
          />
        </CategoryLanding>
      </Suspense>
    </SiteLayout>
  );
}