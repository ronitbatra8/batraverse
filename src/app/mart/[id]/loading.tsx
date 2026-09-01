"use client";

import SiteLayout from "@/components/layout/SiteLayout";
import ProductDetailSkeleton from "@/components/ui/ProductDetailSkeleton";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function Loading() {
  const { theme } = useTheme();
  const light = theme === "light";
  return (
    <SiteLayout>
      <ProductDetailSkeleton light={light} />
    </SiteLayout>
  );
}