"use client";

import { useEffect, useState } from "react";
import { useLight } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

interface Stats {
  storeProducts: number;
  martProducts: number;
  storeCategories: number;
  martCategories: number;
  subcategories: number;
}

const EMPTY: Stats = {
  storeProducts: 0,
  martProducts: 0,
  storeCategories: 0,
  martCategories: 0,
  subcategories: 0,
};

function AboutStats() {
  const light = useLight();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const base = `${API_BASE}/api`;
        const headers = { "ngrok-skip-browser-warning": "true" };

        const [catsRes, storeRes, martRes] = await Promise.all([
          fetch(`${base}/categories`, { headers }),
          fetch(`${base}/categories/products/store`, { headers }),
          fetch(`${base}/categories/products/mart`, { headers }),
        ]);

        if (!catsRes.ok || !storeRes.ok || !martRes.ok) {
          if (!cancelled) setStats(EMPTY);
          return;
        }

        const cats = await catsRes.json();
        const storeList = await storeRes.json();
        const martList = await martRes.json();

        const storeProducts = Array.isArray(storeList) ? storeList.length : 0;
        const martProducts = Array.isArray(martList) ? martList.length : 0;
        const storeCategories = Array.isArray(cats.store) ? cats.store.length : 0;
        const martCategories = Array.isArray(cats.mart) ? cats.mart.length : 0;
        const subcategories = Array.isArray(cats.all)
          ? cats.all.reduce(
              (acc: number, c: { subcategories?: unknown[] }) =>
                acc + (Array.isArray(c.subcategories) ? c.subcategories.length : 0),
              0
            )
          : 0;

        if (!cancelled) setStats({ storeProducts, martProducts, storeCategories, martCategories, subcategories });
      } catch {
        if (!cancelled) setStats(EMPTY);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles = stats
    ? [
        { value: (stats.storeProducts + stats.martProducts).toLocaleString("en-IN"), label: "Products Live" },
        { value: (stats.storeCategories + stats.martCategories).toLocaleString("en-IN"), label: "Curated Categories" },
        { value: stats.subcategories.toLocaleString("en-IN"), label: "Subcategories" },
        { value: stats.storeCategories.toLocaleString("en-IN"), label: "Store Collections" },
      ]
    : [
        { value: "—", label: "Products Live" },
        { value: "—", label: "Curated Categories" },
        { value: "—", label: "Subcategories" },
        { value: "—", label: "Store Collections" },
      ];

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 sm:gap-12 lg:grid-cols-4">
      {tiles.map((s) => (
        <div key={s.label} className="text-center">
          <p
            className={cn(
              "font-display text-4xl font-medium tracking-wide sm:text-5xl",
              light ? "" : "text-gold-gradient"
            )}
          >
            {s.value}
          </p>
          <p
            className={cn(
              "mt-3 text-xs font-medium uppercase tracking-[0.3em]",
              light ? "text-white/70" : "text-cream-dim"
            )}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default AboutStats;