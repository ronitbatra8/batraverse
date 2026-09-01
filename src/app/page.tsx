import SiteLayout from "@/components/layout/SiteLayout";
import Hero from "@/components/home/Hero";
import AdsShowcase from "@/components/home/AdsShowcase";
import FeaturedShelf from "@/components/home/FeaturedShelf";
import RecentlyViewedShelf from "@/components/home/RecentlyViewedShelf";
import Newsletter from "@/components/home/Newsletter";

export default function HomePage() {
  return (
    <SiteLayout>
      <Hero />
      <AdsShowcase />
      {/* Featured — data comes from the owner dashboard "Featured" tab; hidden until real products are configured. */}
      <FeaturedShelf />
      <RecentlyViewedShelf />
      <Newsletter />
    </SiteLayout>
  );
}
