import SiteLayout from "@/components/layout/SiteLayout";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export default async function ProductDetailPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  return (
    <SiteLayout>
      <PagePlaceholder
        path={`/products/${slug}`}
        title="Product Detail"
        description="Full product page with gallery, pricing, reviews, and add-to-cart. This page is under construction."
      />
    </SiteLayout>
  );
}
