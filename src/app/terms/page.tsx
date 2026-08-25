"use client";

import Link from "next/link";
import { useLight } from "@/components/auth/auth-ui";
import SiteLayout from "@/components/layout/SiteLayout";
import { cn } from "@/lib/utils";
import { FileText, ArrowRight } from "lucide-react";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using the BatraVerse platform (\"Site\"), you agree to be bound by these Terms of Services. If you do not agree, please do not use the Site. We reserve the right to modify these terms at any time, and continued use constitutes acceptance of any changes.",
  },
  {
    title: "2. Account Registration",
    body: "You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. BatraVerse reserves the right to suspend or terminate accounts that violate these terms.",
  },
  {
    title: "3. Products & Pricing",
    body: "All product descriptions, images, and specifications are provided by sellers and may contain inaccuracies. Prices are in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise. BatraVerse reserves the right to correct pricing errors and to cancel orders placed at incorrect prices.",
  },
  {
    title: "4. Orders & Payments",
    body: "Placing an order constitutes an offer to purchase. Acceptance occurs only upon order confirmation. We accept payments via Cash on Delivery (COD), UPI on Delivery, and Online Payment through our secure payment gateway. All online transactions are encrypted and processed through PCI-DSS compliant systems.",
  },
  {
    title: "5. Shipping & Delivery",
    body: "Standard delivery is ₹49 flat, free on orders above ₹1,500. Express delivery (mart items only) incurs an additional ₹49 fee. Delivery timelines are estimates and may vary based on location and product availability. Risk of loss and title pass to you upon delivery.",
  },
  {
    title: "6. Returns & Refunds",
    body: "You may request a return within 2 hours of delivery for eligible store products. Returns are subject to inspection and approval. Refunds are processed to the original payment method within 5–7 business days. COD refunds are processed via bank transfer. Certain items (perishables, personal care, custom orders) are non-returnable.",
  },
  {
    title: "7. Seller Obligations",
    body: "Sellers on BatraVerse are independent third parties responsible for product quality, accuracy of listings, and fulfillment. BatraVerse acts as a marketplace facilitator and is not a party to transactions between buyers and sellers. Sellers must comply with all applicable laws and BatraVerse's seller policies.",
  },
  {
    title: "8. Intellectual Property",
    body: "All content on this Site — including logos, designs, text, graphics, and software — is the property of BatraVerse or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.",
  },
  {
    title: "9. Prohibited Conduct",
    body: "You agree not to: (a) use the Site for unlawful purposes; (b) attempt to gain unauthorized access to any part of the Site; (c) interfere with or disrupt the Site's functionality; (d) post fraudulent, misleading, or harmful content; (e) use automated systems to access the Site without written permission.",
  },
  {
    title: "10. Limitation of Liability",
    body: "BatraVerse shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Site. Our total liability shall not exceed the amount paid by you for the specific transaction giving rise to the claim.",
  },
  {
    title: "11. Governing Law",
    body: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.",
  },
  {
    title: "12. Contact",
    body: "For questions about these Terms, contact us at support@batraverse.com or visit our Contact page.",
  },
];

export default function TermsPage() {
  const light = useLight();

  return (
    <SiteLayout>
      <section
        className={cn(
          "relative flex min-h-[50vh] items-center justify-center overflow-hidden",
          "bg-abyss text-cream"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.07), transparent 70%)",
          }}
        />
        <div className="relative z-10 px-6 text-center">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.6em] text-gold/70">
            Legal
          </p>
          <h1
            className={cn(
              "font-display text-4xl font-medium tracking-wide sm:text-5xl md:text-6xl",
              "text-gold-gradient"
            )}
          >
            Terms & Services
          </h1>
          <div className="mx-auto my-6 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <p className="mx-auto max-w-md text-sm leading-relaxed text-cream-dim/60">
            Please read these terms carefully before using the BatraVerse platform.
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-cream-dim/40">
            Last updated: August 2026
          </p>
        </div>
      </section>

      <section className={cn("py-20 sm:py-28", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto max-w-3xl px-6">
          <p
            className={cn(
              "mb-12 text-sm leading-relaxed",
              light ? "text-onyx/70" : "text-cream-dim/70"
            )}
          >
            Welcome to BatraVerse. These Terms of Services (&quot;Terms&quot;) govern your access to and use of
            the BatraVerse website, mobile applications, and related services (collectively, the &quot;Site&quot;).
            By using the Site, you agree to these Terms.
          </p>

          <div className="space-y-10">
            {sections.map((s) => (
              <div key={s.title}>
                <h3
                  className={cn(
                    "font-display text-lg font-medium tracking-wide sm:text-xl",
                    light ? "text-onyx" : "text-cream"
                  )}
                >
                  {s.title}
                </h3>
                <div
                  className={cn(
                    "my-3 h-px w-12",
                    light
                      ? "bg-gradient-to-r from-sapphire/40 to-transparent"
                      : "bg-gradient-to-r from-gold/40 to-transparent"
                  )}
                />
                <p
                  className={cn(
                    "text-sm leading-relaxed sm:text-base",
                    light ? "text-onyx/65" : "text-cream-dim/65"
                  )}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/contact"
              className={cn(
                "group inline-flex items-center gap-3 rounded-full px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                light
                  ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                  : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
              )}
            >
              <FileText size={14} strokeWidth={1.75} />
              Questions? Contact Us
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="transition-transform duration-500 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
