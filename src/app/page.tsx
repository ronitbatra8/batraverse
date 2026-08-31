import SiteLayout from "@/components/layout/SiteLayout";
import Hero from "@/components/home/Hero";
import AdsShowcase from "@/components/home/AdsShowcase";
import { type ShelfItem } from "@/components/home/ProductShelf";
import FeaturedShelf from "@/components/home/FeaturedShelf";
import RecentlyViewedShelf from "@/components/home/RecentlyViewedShelf";
import Testimonials from "@/components/home/Testimonials";
import Newsletter from "@/components/home/Newsletter";

const FEATURED: ShelfItem[] = [
  {
    name: "Mirage Chronograph",
    category: "Timepieces",
    price: "₹4,85,000",
    img: "https://images.unsplash.com/photo-1521334884684-d80222895322?w=900&h=1200&fit=crop",
    href: "/products/mirage-chronograph",
  },
  {
    name: "Noir Top-Handle",
    category: "Handbags",
    price: "₹2,40,000",
    img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&h=1200&fit=crop",
    href: "/products/noir-top-handle",
  },
  {
    name: "Autumn Veil Gown",
    category: "Ready-to-Wear",
    price: "₹1,95,000",
    compareAt: "₹2,30,000",
    img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&h=1200&fit=crop",
    href: "/products/autumn-veil-gown",
  },
  {
    name: "Velocity Runner",
    category: "Footwear",
    price: "₹38,500",
    img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=900&h=1200&fit=crop",
    href: "/products/velocity-runner",
  },
];

export default function HomePage() {
  return (
    <SiteLayout>
      <Hero />
      <AdsShowcase />
      {/* Featured — data comes from the owner dashboard "Featured" tab; FEATURED is the static fallback when none are configured. */}
      <FeaturedShelf fallback={FEATURED} />
      <RecentlyViewedShelf />
      <Testimonials />
      <Newsletter />
    </SiteLayout>
  );
}
