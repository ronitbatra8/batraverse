import { Suspense } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import CategoryCollection from "@/components/products/CategoryCollection";
import CategoryLanding from "@/components/products/CategoryLanding";
import CategoryProductsGrid from "@/components/products/CategoryProductsGrid";
import AdsShowcase from "@/components/home/AdsShowcase";
import { categoryAdChain } from "@/lib/adPages";

export default async function MartCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  return (
    <SiteLayout>
      <Suspense fallback={null}>
        <CategoryLanding source="mart" category={category}>
          <CategoryCollection
            source="mart"
            parentSlug={category}
            navigate
            title="Subcategories"
            subtitle="Browse by subcategory"
          />
          <div id="products-anchor" />
          <CategoryProductsGrid
            source="mart"
            category={category}
            adSlot={
              <AdsShowcase
                page={categoryAdChain("mart", category).page}
                fallbacks={categoryAdChain("mart", category).fallbacks}
                inline
              />
            }
          />
        </CategoryLanding>
      </Suspense>
    </SiteLayout>
  );
}