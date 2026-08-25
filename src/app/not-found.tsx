import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-32">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <p className="font-display text-7xl font-semibold text-gold-gradient">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-cream">
          Page Not Found
        </h1>
        <p className="mt-4 text-cream-dim">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
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
