"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  BadgePercent,
  Eye,
  FileText,
  Heart,
  HelpCircle,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useToast } from "@/components/Toast";
import Brand from "@/components/brand/Brand";
import { cn } from "@/lib/utils";

const SHOP_LINKS = [
  { label: "Store", href: "/store", icon: LayoutGrid },
  { label: "Mart", href: "/mart", icon: ShoppingBag },
  { label: "Search", href: "/search", icon: Sparkles },
  { label: "Products", href: "/products", icon: BadgePercent },
] as const;

const COMPANY_LINKS = [
  { label: "About Us", href: "/about", icon: Store },
  { label: "Contact", href: "/contact", icon: Mail },
  { label: "Terms & Services", href: "/terms", icon: FileText },
  { label: "Privacy Policy", href: "/privacy", icon: ShieldCheck },
] as const;

const SUPPORT_LINKS = [
  { label: "My Orders", href: "/orders", icon: Receipt },
  { label: "Private Viewing", href: "/private-viewing", icon: Eye },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "My Account", href: "/account", icon: User },
] as const;

type FooterLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const BOTTOM_LINKS = [
  { label: "Terms", href: "/terms", icon: FileText },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck },
  { label: "Help", href: "/queries", icon: HelpCircle },
] as const;

const SOCIALS = [
  {
    label: "Instagram",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: "X",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 4l16 16" />
        <path d="M20 4L4 20" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
] as const;

export default function Footer() {
  const { theme } = useTheme();
  const light = theme === "light";
  const { toast } = useToast();

  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--footer-height",
        `${entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight}px`
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <footer
      ref={rootRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-0 border-t",
        light ? "border-black/10 bg-white" : "border-white/10 bg-abyss"
      )}
    >
      {/* MOBILE: New simplified layout (below sm) */}
      <div className="sm:hidden">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Logo centered */}
          <div className="flex justify-center">
            <Link href="/" aria-label="Batraverse — home">
              <Brand boot={false} light={light} size="lg" mobileWordmark />
            </Link>
          </div>

          {/* Divider */}
          <div className={cn("mx-auto mt-8 h-px max-w-xl", light ? "bg-black/10" : "bg-white/10")} />

          {/* Two columns */}
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-8">
            <FooterColumn title="Shop" links={SHOP_LINKS} light={light} />
            <FooterColumn title="Company" links={COMPANY_LINKS} light={light} />
          </div>

          {/* Divider */}
          <div className={cn("mx-auto mt-8 h-px max-w-xl", light ? "bg-black/10" : "bg-white/10")} />

          {/* Social icons */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {SOCIALS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                onClick={() => toast(`${s.label} is not live yet — but we'll be there soon.`, "info")}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 hover:scale-105",
                  light
                    ? "border-onyx/15 text-onyx/70 hover:border-sapphire hover:text-sapphire"
                    : "border-white/15 text-cream-dim hover:border-gold hover:text-gold-light"
                )}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={cn("mx-auto mt-8 h-px max-w-xl", light ? "bg-black/10" : "bg-white/10")} />

          {/* Bottom bar */}
          <div className="mt-6 flex flex-col items-center justify-between gap-4">
            <p
              className={cn(
                "text-xs tracking-wider transition-colors duration-500",
                light ? "font-semibold text-onyx/85" : "text-cream-dim/70"
              )}
            >
              © {new Date().getFullYear()} Batra Verse. All rights reserved.
            </p>
            <div
              className={cn(
                "flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] transition-colors duration-500",
                light ? "font-semibold text-onyx/85" : "text-cream-dim/70"
              )}
            >
              {BOTTOM_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.label}
                    href={l.href}
                    className={cn(
                      "group relative inline-flex items-center gap-1.5 transition-colors",
                      light ? "hover:text-sapphire" : "hover:text-gold-light"
                    )}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {l.label}
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-px w-0 transition-all duration-700 group-hover:w-full",
                        light ? "bg-sapphire" : "bg-gold"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP: Original layout (sm+) */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-7xl px-8 py-16">
          {/* Top grid */}
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Brand block */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" aria-label="Batraverse — home" className="inline-block">
                <Brand boot={false} light={light} size="lg" />
              </Link>
              <p
                className={cn(
                  "mt-5 max-w-sm text-sm leading-relaxed transition-colors duration-500",
                  light ? "font-medium text-onyx/85" : "text-cream-dim"
                )}
              >
                A curated marketplace for the world&apos;s finest goods —
                exceptional quality, verified sellers, and a buying experience
                worthy of the products themselves.
              </p>
              <div
                className={cn(
                  "mt-6 space-y-2.5 text-sm transition-colors duration-500",
                  light ? "font-medium text-onyx/85" : "text-cream-dim"
                )}
              >
                <p className="flex items-center gap-3">
                  <MapPin
                    size={15}
                    className={cn("shrink-0", light ? "text-sapphire" : "text-gold")}
                  />
                  Alwar, Rajasthan, India
                </p>
                <p className="flex items-center gap-3">
                  <Mail
                    size={15}
                    className={cn("shrink-0", light ? "text-sapphire" : "text-gold")}
                  />
                  <a
                    href="mailto:ronit.batra.08@gmail.com"
                    className={cn(
                      "group relative transition-colors",
                      light ? "hover:text-sapphire" : "hover:text-gold-light"
                    )}
                  >
                    ronit.batra.08@gmail.com
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-px w-0 transition-all duration-700 group-hover:w-full",
                        light ? "bg-sapphire" : "bg-gold"
                      )}
                    />
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <Phone
                    size={15}
                    className={cn("shrink-0", light ? "text-sapphire" : "text-gold")}
                  />
                  +91 93513 96757
                </p>
              </div>

              {/* Socials */}
              <div className="mt-7 flex items-center gap-3">
                {SOCIALS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    aria-label={s.label}
                    onClick={() => toast(`${s.label} is not live yet — but we'll be there soon.`, "info")}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 hover:scale-105",
                      light
                        ? "border-onyx/15 text-onyx/70 hover:border-sapphire hover:text-sapphire"
                        : "border-white/15 text-cream-dim hover:border-gold hover:text-gold-light"
                    )}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Link columns */}
            <FooterColumn title="Shop" links={SHOP_LINKS} light={light} />
            <FooterColumn title="Company" links={COMPANY_LINKS} light={light} />
            <FooterColumn title="Support" links={SUPPORT_LINKS} light={light} />
          </div>

          {/* Bottom bar */}
          <div
            className={cn(
              "mt-14 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row",
              light ? "border-black/10" : "border-white/5"
            )}
          >
            <p
              className={cn(
                "text-xs tracking-wider transition-colors duration-500",
                light ? "font-semibold text-onyx/85" : "text-cream-dim/70"
              )}
            >
              © {new Date().getFullYear()} Batra Verse. All rights reserved.
            </p>
            <div
              className={cn(
                "flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] transition-colors duration-500",
                light ? "font-semibold text-onyx/85" : "text-cream-dim/70"
              )}
            >
              {BOTTOM_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.label}
                    href={l.href}
                    className={cn(
                      "group relative inline-flex items-center gap-1.5 transition-colors",
                      light ? "hover:text-sapphire" : "hover:text-gold-light"
                    )}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {l.label}
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-px w-0 transition-all duration-700 group-hover:w-full",
                        light ? "bg-sapphire" : "bg-gold"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  light,
}: {
  title: string;
  links: readonly FooterLink[];
  light: boolean;
}) {
  return (
    <div>
      <h3
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.3em]",
          light ? "text-sapphire" : "text-gold-light"
        )}
      >
        {title}
      </h3>
      <ul className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.label}>
              <Link
                href={link.href}
                className={cn(
                  "group relative inline-flex items-center gap-2.5 text-sm transition-colors duration-300",
                  light
                    ? "font-semibold text-onyx/85 hover:text-sapphire"
                    : "text-cream-dim hover:text-gold-light"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-all duration-300 group-hover:translate-x-0.5",
                    light ? "text-sapphire/80" : "text-gold/80"
                  )}
                >
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                {link.label}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-px w-0 transition-all duration-700 group-hover:w-full",
                    light ? "bg-sapphire" : "bg-gold"
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
