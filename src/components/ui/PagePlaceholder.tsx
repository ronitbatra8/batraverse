import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

/** Template placeholder shown on pages that are not designed yet.
    Each page will be replaced with its real design one at a time. */
export default function PagePlaceholder({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-32">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 bg-onyx">
          <Construction size={24} className="text-gold" strokeWidth={1.5} />
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gold/5 blur-xl" />
        </div>

        <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.4em] text-gold">
          {path}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-cream sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 leading-relaxed text-cream-dim">{description}</p>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-light transition-all duration-300 hover:border-gold hover:bg-gold/20"
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Back to Home
        </Link>
      </div>
    </section>
  );
}
