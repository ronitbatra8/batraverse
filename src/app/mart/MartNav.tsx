"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

const DEFAULT_MART_CATEGORIES = [{ id: "all", label: "All" }];

const DEFAULT_SUB_CATEGORIES: Record<string, { id: string; label: string }[]> = {};

interface MartNavProps {
  active: string;
  onCategoryChange: (id: string) => void;
  subActive: string[];
  onSubChange: (id: string) => void;
}

export default function MartNav({
  active,
  onCategoryChange,
  subActive,
  onSubChange,
}: MartNavProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [martCategories, setMartCategories] = useState(DEFAULT_MART_CATEGORIES);
  const [subCategories, setSubCategories] = useState(DEFAULT_SUB_CATEGORIES);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/categories`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data?.mart && Array.isArray(data.mart) && data.mart.length > 0) {
        const cats = [{ id: "all", label: "All" }, ...data.mart.map((c: { slug: string; name: string; subcategories: { slug: string; name: string }[] }) => ({
          id: c.slug,
          label: c.name,
        }))];
        setMartCategories(cats);
        const subs: Record<string, { id: string; label: string }[]> = {};
        for (const c of data.mart) {
          subs[c.slug] = [{ id: "all", label: `All ${c.name}` }, ...c.subcategories.map((s: { slug: string; name: string }) => ({
            id: s.slug,
            label: s.name,
          }))];
        }
        setSubCategories(subs);
      }
    } catch {
      // keep defaults
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const hasSub = subCategories[active];
  const [navHidden, setNavHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < 10) return;
      if (diff > 0 && y > 120) setNavHidden(true);
      else setNavHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCategory = (id: string) => {
    onCategoryChange(id);
    onSubChange("all");
    scrollToNav();
  };

  const navAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToNav = () => {
    const el = navAnchorRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      <div ref={navAnchorRef} aria-hidden />
      <div className={cn(        "sticky z-30 border-b backdrop-blur-xl transition-all duration-500 max-sm:duration-300",
        light
          ? "border-dark-200/50 bg-white/70"
          : "border-white/10 bg-abyss/70",
        navHidden && (hasSub ? "max-sm:-translate-y-[calc(100%+84px)]" : "max-sm:-translate-y-[calc(100%+5px)]"))} style={{ top: "84px" }}>
      <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-3 px-5 sm:px-10">
        <div className="flex items-center gap-2.5 overflow-x-auto py-3 [&::-webkit-scrollbar]:hidden">
          {martCategories.map((cat) => {
            const isActive = cat.id === "all" ? active === "all" : active === cat.id;
            return (
              <button key={cat.id} type="button" onClick={() => handleCategory(cat.id)} aria-pressed={isActive}
                className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] transition-all duration-300",
                  isActive
                    ? light ? "border-sapphire bg-sapphire text-white" : "border-gold bg-gold text-abyss"
                    : light ? "border-dark-300 text-dark-500 hover:border-sapphire/40 hover:text-sapphire" : "border-white/10 text-cream-dim hover:border-gold/30 hover:text-cream"
                )}>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasSub && (
        <div className={cn("border-t transition-colors duration-500", light ? "border-dark-100" : "border-white/5")}>
          <div className="mx-auto flex w-full max-w-[100rem] items-center gap-2 overflow-x-auto px-5 py-2.5 sm:px-10 [&::-webkit-scrollbar]:hidden">
            {hasSub.map((sub) => {
              const isActive = sub.id === "all" ? subActive.length === 0 : subActive.includes(sub.id);
              return (
                <button key={sub.id} type="button" onClick={() => { onSubChange(sub.id); scrollToNav(); }}
                  className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.24em] transition-all duration-300",
                    isActive
                      ? light ? "border-sapphire/40 bg-sapphire/10 text-sapphire" : "border-gold/40 bg-gold/10 text-gold-light"
                      : light ? "border-dark-200 text-dark-400 hover:border-sapphire/30 hover:text-sapphire" : "border-white/5 text-cream-dim/60 hover:border-gold/20 hover:text-cream-dim"
                  )}>
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
