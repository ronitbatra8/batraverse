"use client";

import Link from "next/link";
import { useLight } from "@/components/auth/auth-ui";
import SiteLayout from "@/components/layout/SiteLayout";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Gem,
  Leaf,
  Crown,
  ArrowRight,
  Quote,
} from "lucide-react";
import AboutAnimation from "@/components/AboutAnimation";
import TrustMarquee from "@/components/TrustMarquee";

const values = [
  {
    icon: Gem,
    title: "Craftsmanship",
    description:
      "Every piece is meticulously handcrafted by master artisans who carry generations of expertise. We honour time-honoured techniques while pushing the boundaries of precision.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    description:
      "Where tradition meets the digital age, we pioneer new materials, processes, and experiences that redefine what luxury means for the modern connoisseur.",
  },
  {
    icon: Leaf,
    title: "Sustainability",
    description:
      "True luxury is enduring. We source responsibly, produce consciously, and design for permanence — creating pieces that transcend seasons and trends.",
  },
  {
    icon: Crown,
    title: "Exclusivity",
    description:
      "Each creation is deliberately limited. We believe scarcity cultivates desire, and that the extraordinary should never be ordinary.",
  },
];

const press = ["Vogue India", "GQ India", "Architectural Digest", "Forbes India", "Harper's Bazaar"];

export default function AboutPage() {
  const light = useLight();

  return (
    <SiteLayout>
      <section
        className={cn(
          "relative flex min-h-[85vh] flex-col overflow-hidden",
          "bg-abyss text-cream"
        )}
      >
        <AboutAnimation />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.6em] text-gold/70">
            Est. 2024
          </p>
          <h1
            className={cn(
              "font-display text-4xl font-medium tracking-wide sm:text-6xl md:text-8xl lg:text-9xl",
              "text-gold-gradient"
            )}
          >
            BATRAVERSE
          </h1>
          <div className="mx-auto my-8 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <p className="mx-auto max-w-xl font-display text-xl font-light italic tracking-wide text-cream-dim sm:text-2xl">
            Redefining luxury for a new era
          </p>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-cream-dim/60">
            Where heritage meets the digital age, and every detail is an
            invitation to experience the extraordinary.
          </p>
        </div>
        <TrustMarquee />
      </section>

      <section className={cn("py-24 sm:py-32", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:gap-20 lg:items-center">
          <div className="relative overflow-hidden rounded-sm aspect-[4/5]">
            <img
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=1500&fit=crop"
              alt="Luxury lifestyle"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: light
                  ? "linear-gradient(180deg, transparent 60%, rgba(30,58,138,0.12) 100%)"
                  : "linear-gradient(180deg, transparent 60%, rgba(10,10,10,0.5) 100%)",
              }}
            />
          </div>
          <div>
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Our Story
            </p>
            <h2
              className={cn(
                "font-display text-3xl font-medium tracking-wide sm:text-4xl lg:text-5xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Heritage Meets
              <span
                className={cn(
                  "block mt-1",
                  light ? "text-sapphire" : "text-gold"
                )}
              >
                The Digital Age
              </span>
            </h2>
            <div
              className={cn(
                "my-8 h-px w-16",
                light
                  ? "bg-gradient-to-r from-sapphire/50 to-transparent"
                  : "bg-gradient-to-r from-gold/50 to-transparent"
              )}
            />
            <div className="space-y-5">
              <p
                className={cn(
                  "text-sm leading-relaxed sm:text-base",
                  light ? "text-onyx/70" : "text-cream-dim"
                )}
              >
                Born from a vision to bridge centuries of Indian artisanal
                mastery with the pulse of contemporary global luxury,
                BatraVerse is more than a brand — it is a universe of curated
                excellence.
              </p>
              <p
                className={cn(
                  "text-sm leading-relaxed sm:text-base",
                  light ? "text-onyx/70" : "text-cream-dim"
                )}
              >
                Founded by Ronit Batra, the house draws upon deep roots in
                craftsmanship and trade, weaving them into a digital-first
                experience that speaks to the modern discerning collector. Every
                material is sourced with intention, every stitch placed with
                reverence.
              </p>
              <p
                className={cn(
                  "text-sm leading-relaxed sm:text-base",
                  light ? "text-onyx/70" : "text-cream-dim"
                )}
              >
                From the ateliers of Jaipur to the streets of Mumbai, from
                private collections to global runways — BatraVerse exists at the
                intersection of timeless artistry and boundless possibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "py-24 sm:py-32",
          light
            ? "bg-gradient-to-b from-[#f4f1eb] to-white"
            : "bg-gradient-to-b from-[#111111] to-abyss"
        )}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Philosophy
            </p>
            <h2
              className={cn(
                "font-display text-3xl font-medium tracking-wide sm:text-4xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Mission &amp; Values
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className={cn(
                  "group relative rounded-2xl p-8 transition-all duration-500",
                  light
                    ? "bg-white border border-onyx/5 hover:border-sapphire/20 hover:shadow-[0_8px_40px_rgba(30,58,138,0.08)]"
                    : "bg-[#0e0e11] border border-gold/8 hover:border-gold/25 hover:shadow-[0_8px_40px_rgba(212,175,55,0.06)]"
                )}
              >
                <div
                  className={cn(
                    "mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-500",
                    light
                      ? "bg-sapphire/8 text-sapphire group-hover:bg-sapphire group-hover:text-white"
                      : "bg-gold/10 text-gold group-hover:bg-gold group-hover:text-abyss"
                  )}
                >
                  <v.icon size={22} strokeWidth={1.5} />
                </div>
                <h3
                  className={cn(
                    "mb-3 font-display text-lg font-medium tracking-wide",
                    light ? "text-onyx" : "text-cream"
                  )}
                >
                  {v.title}
                </h3>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    light ? "text-onyx/60" : "text-cream-dim/70"
                  )}
                >
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "py-20 sm:py-28",
          light
            ? "bg-gradient-to-r from-sapphire to-sapphire-deep text-white"
            : "bg-gradient-to-r from-[#1a1608] to-abyss text-cream"
        )}
      >
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <p
              className={cn(
                "mb-6 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-white/60" : "text-gold/70"
              )}
            >
              What We Are
            </p>
            <p
              className={cn(
                "font-display text-2xl font-light italic leading-relaxed tracking-wide sm:text-3xl md:text-4xl",
                light ? "text-white" : "text-cream"
              )}
            >
              BatraVerse is a marketplace — not a label. Store and Mart in one
              place, launched in 2024 from Bengaluru, where every listing is real
              and every order is tracked to your door.
            </p>
          </div>
        </div>
      </section>

      <section className={cn("py-24 sm:py-32", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Quote
            size={40}
            strokeWidth={1}
            className={cn(
              "mx-auto mb-8 opacity-30",
              light ? "text-sapphire" : "text-gold"
            )}
          />
          <blockquote
            className={cn(
              "font-display text-2xl font-light italic leading-relaxed tracking-wide sm:text-3xl md:text-4xl",
              light ? "text-onyx/85" : "text-cream/90"
            )}
          >
            &ldquo;I didn&rsquo;t want to build a brand. I wanted to build a
            universe — one where every object tells a story of where it came
            from, who shaped it, and why it matters.&rdquo;
          </blockquote>
          <div
            className={cn(
              "mx-auto my-10 h-px w-16",
              light
                ? "bg-gradient-to-r from-transparent via-sapphire/40 to-transparent"
                : "bg-gradient-to-r from-transparent via-gold/40 to-transparent"
            )}
          />
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.35em]",
              light ? "text-sapphire" : "text-gold"
            )}
          >
            Ronit Batra
          </p>
          <p
            className={cn(
              "mt-2 text-xs uppercase tracking-[0.25em]",
              light ? "text-onyx/40" : "text-cream-dim/50"
            )}
          >
            Founder &amp; Creative Director
          </p>
        </div>
      </section>

      <section
        className={cn(
          "py-20 sm:py-28",
          light
            ? "bg-gradient-to-b from-[#f4f1eb] to-white"
            : "bg-gradient-to-b from-[#111111] to-abyss"
        )}
      >
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p
            className={cn(
              "mb-10 text-[10px] font-semibold uppercase tracking-[0.5em]",
              light ? "text-onyx/40" : "text-cream-dim/40"
            )}
          >
            As Featured In
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {press.map((name) => (
              <span
                key={name}
                className={cn(
                  "font-display text-lg font-medium italic tracking-wide transition-opacity hover:opacity-100 sm:text-xl",
                  light
                    ? "text-onyx/25 hover:text-onyx/60"
                    : "text-cream/15 hover:text-cream/40"
                )}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "py-24 sm:py-32",
          light ? "bg-white" : "bg-[#111111]"
        )}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2
            className={cn(
              "font-display text-3xl font-medium tracking-wide sm:text-4xl",
              light ? "text-onyx" : "text-cream"
            )}
          >
            Discover the Collection
          </h2>
          <p
            className={cn(
              "mx-auto mt-5 max-w-md text-sm leading-relaxed",
              light ? "text-onyx/60" : "text-cream-dim/60"
            )}
          >
            Explore our curated universe of luxury — timepieces, fashion,
            accessories, and beyond.
          </p>
          <Link
            href="/store"
            className={cn(
              "group mt-10 inline-flex items-center gap-3 rounded-full px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
              light
                ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
            )}
          >
            Explore Now
            <ArrowRight
              size={16}
              strokeWidth={2}
              className="transition-transform duration-500 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
