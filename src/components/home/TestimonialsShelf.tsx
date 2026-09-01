"use client";

import { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/imageUrl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Testimonial = {
  id: string;
  source: string;
  quote: string;
  name: string;
  role?: string | null;
  avatar?: string | null;
  rating?: number | null;
  productName?: string | null;
};

function Stars({ value, light }: { value?: number | null; light: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= value
              ? light ? "fill-gold text-gold" : "fill-gold text-gold"
              : light ? "fill-dark-200 text-dark-200" : "fill-white/10 text-white/10"
          }
        />
      ))}
    </div>
  );
}

export default function TestimonialsShelf() {
  const { theme } = useTheme();
  const light = theme === "light";
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/testimonials`, {
      cache: "no-store",
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      id="testimonials"
      className={cn(
        "mx-auto w-full max-w-[100rem] px-5 sm:px-10 py-16 sm:py-24",
        light ? "bg-white" : "bg-abyss"
      )}
    >
      <div className="text-center mb-12">
        <p className={cn("text-[10px] font-semibold uppercase tracking-[0.35em]", light ? "text-sapphire" : "text-gold-400")}>Word on the Street</p>
        <h2 className={cn("mt-3 text-3xl sm:text-4xl font-display font-bold", light ? "text-dark-900" : "text-cream")}>What Customers Say</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 9).map((t) => (
          <figure
            key={t.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition-all duration-500",
              light ? "border-dark-200/60 bg-white hover:border-sapphire/30" : "border-white/10 bg-graphite hover:border-gold/20"
            )}
          >
            <Quote size={28} className={cn("mb-4", light ? "text-sapphire/20" : "text-gold-400/20")} />
            <blockquote className={cn("text-sm leading-relaxed flex-1", light ? "text-dark-700" : "text-cream-dim")}>
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className={cn("w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center border", light ? "border-dark-200" : "border-white/10")}>
                {t.avatar ? (
                  <img src={resolveImageUrl(t.avatar)} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={cn("w-full h-full flex items-center justify-center text-sm font-bold", light ? "bg-sapphire text-white" : "bg-gold text-abyss")}>
                    {(t.name || "A").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold truncate", light ? "text-dark-900" : "text-cream")}>{t.name}</p>
                {(t.role || t.productName) && (
                  <p className={cn("text-[10px] uppercase tracking-wider truncate", light ? "text-dark-400" : "text-cream-dim/60")}>
                    {[t.role, t.productName ? `on ${t.productName}` : null].filter(Boolean).join(" · ")}
                  </p>
                )}
                <Stars value={t.rating} light={light} />
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
