import SiteLayout from "@/components/layout/SiteLayout";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export default function ProductsPage() {
  return (
    <SiteLayout>
      <PagePlaceholder
        path="/products"
        title="All Products"
        description="Browse the full catalog with filters, search, and sorting. This page is under construction — designed next."
      />
    </SiteLayout>
  );
}
