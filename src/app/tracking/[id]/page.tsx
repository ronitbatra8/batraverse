import SiteLayout from "@/components/layout/SiteLayout";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export default async function TrackingPage(props: PageProps<"/tracking/[id]">) {
  const { id } = await props.params;
  return (
    <SiteLayout>
      <PagePlaceholder
        path={`/tracking/${id}`}
        title="Track Order"
        description="Live order status and delivery updates. This page is under construction."
      />
    </SiteLayout>
  );
}
