"use client";

import Link from "next/link";
import { useLight } from "@/components/auth/auth-ui";
import SiteLayout from "@/components/layout/SiteLayout";
import { cn } from "@/lib/utils";
import { ShieldCheck, ArrowRight } from "lucide-react";
import TrustMarquee from "@/components/TrustMarquee";

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly: name, email, phone number, shipping address, payment details, and communication with support. We also automatically collect device information, IP address, browser type, pages visited, and interaction data through cookies and similar technologies.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to: process and fulfill orders, communicate about purchases and account activity, personalize your experience, detect and prevent fraud, comply with legal obligations, and improve our platform and services. We may send promotional communications with your consent, which you can opt out of at any time.",
  },
  {
    title: "3. Information Sharing",
    body: "We share your information with: sellers (to fulfill your orders — they receive your name, shipping address, and order details), payment processors (to handle transactions securely), logistics partners (to deliver your orders), and legal authorities when required by law. We do not sell your personal information to third parties.",
  },
  {
    title: "4. Data Security",
    body: "We implement industry-standard security measures including SSL encryption, PCI-DSS compliant payment processing, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security of your data.",
  },
  {
    title: "5. Cookies & Tracking",
    body: "We use essential cookies to maintain your session and preferences, analytics cookies to understand site usage, and marketing cookies to provide relevant advertisements. You can manage cookie preferences through your browser settings. Disabling essential cookies may impair site functionality.",
  },
  {
    title: "6. Data Retention",
    body: "We retain your personal information for as long as your account is active or as needed to provide services. Order data is retained for 3 years for legal and accounting purposes. Account data can be deleted upon request, subject to legal retention requirements.",
  },
  {
    title: "7. Your Rights",
    body: "You have the right to: access your personal data, correct inaccurate data, request deletion of your data, opt out of marketing communications, and export your data in a portable format. To exercise these rights, contact our support team at privacy@batraverse.com.",
  },
  {
    title: "8. Children's Privacy",
    body: "BatraVerse is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.",
  },
  {
    title: "9. Third-Party Links",
    body: "The Site may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.",
  },
  {
    title: "10. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. Material changes will be notified via email or prominent notice on the Site. Your continued use after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "11. Contact Us",
    body: "For questions or concerns about this Privacy Policy, reach us at privacy@batraverse.com or visit our Contact page. Our Data Protection Officer can be contacted at dpo@batraverse.com.",
  },
];

export default function PrivacyPage() {
  const light = useLight();

  return (
    <SiteLayout>
      <section
        className={cn(
          "relative flex min-h-[50vh] flex-col overflow-hidden",
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
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.6em] text-gold/70">
            Your Data
          </p>
          <h1
            className={cn(
              "font-display text-4xl font-medium tracking-wide sm:text-5xl md:text-6xl",
              "text-gold-gradient"
            )}
          >
            Privacy Policy
          </h1>
          <div className="mx-auto my-6 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <p className="mx-auto max-w-md text-sm leading-relaxed text-cream-dim/60">
            How we collect, use, and protect your personal information.
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-cream-dim/40">
            Last updated: August 2026
          </p>
        </div>
        <TrustMarquee />
      </section>

      <section className={cn("py-20 sm:py-28", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto max-w-3xl px-6">
          <p
            className={cn(
              "mb-12 text-sm leading-relaxed",
              light ? "text-onyx/70" : "text-cream-dim/70"
            )}
          >
            At BatraVerse, your privacy is fundamental to us. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information
            when you use our platform.
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
                "group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.3em] transition-all duration-500 sm:gap-3 sm:px-8 sm:py-4 sm:text-[11px]",
                light
                  ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                  : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
              )}
            >
              <ShieldCheck size={14} strokeWidth={1.75} />
              Privacy Questions? Contact Us
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
