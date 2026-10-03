"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Resolves the main category (and optional subcategory) from the category
 * system and guards against unknown slugs. The category system stays read-only
 * here — this page only renders whatever exists.
 */
export default function CategoryLanding({
  source,
  category,
  subcategory,
  children,
}: {
  source: "store" | "mart";
  category: string;
  subcategory?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();
        const list = Array.isArray(data?.[source]) ? data[source] : [];
        const match = list.find((c: { slug: string }) => c.slug === category);
        if (cancelled) return;
        if (!match) {
          setStatus("missing");
          return;
        }
        if (subcategory) {
          const ok = Array.isArray(match.subcategories)
            ? match.subcategories.some((s: { slug: string }) => s.slug === subcategory)
            : false;
          if (!ok) {
            setStatus("missing");
            return;
          }
        }
        setName(match.name);
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, category, subcategory]);

  useEffect(() => {
    if (status !== "missing") return;
    const t = setTimeout(() => router.replace(`/${source}`), 1200);
    return () => clearTimeout(t);
  }, [status, router, source]);

  if (status === "missing") {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-2xl font-semibold text-cream">Page unavailable</p>
        <p className="text-sm text-cream-dim/70">Taking you back…</p>
      </div>
    );
  }

  if (status === "loading") {
    return <div className="min-h-[50vh]" aria-busy="true" />;
  }

  return (
    <>
      <h1 className="sr-only">{name}</h1>
      {children}
    </>
  );
}