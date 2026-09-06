import SiteLayout from "@/components/layout/SiteLayout";
import Hero from "@/components/home/Hero";
import AdsShowcase from "@/components/home/AdsShowcase";
import FeaturedShelf from "@/components/home/FeaturedShelf";
import RecentlyViewedShelf from "@/components/home/RecentlyViewedShelf";
import TestimonialsShelf from "@/components/home/TestimonialsShelf";
import Newsletter from "@/components/home/Newsletter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://batraverse.vercel.app";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "BATRAVERSE",
            alternateName: "BATRAVERSE — Shop Everything",
            url: `${SITE_URL}/`,
          }),
        }}
      />
      <SiteLayout>
        <Hero />
        <AdsShowcase />
        {/* Featured — data comes from the owner dashboard "Featured" tab; hidden until real products are configured. */}
        <FeaturedShelf />
        <RecentlyViewedShelf />
        <TestimonialsShelf />
        <Newsletter />
      </SiteLayout>
    </>
  );
}
