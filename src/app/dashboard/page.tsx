"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutDashboard, Store, Truck, Crown, Globe } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { AuthShell, AuthHeading, AuthCard, Spinner, useLight, headingGradCls } from "@/components/auth/auth-ui";
import { roleDashboard, type RoleKey } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Partial<Record<RoleKey, typeof Crown>> = {
  ADMIN: Crown,
  SELLER: Store,
  DELIVERY: Truck,
};

export default function DashboardHubPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const light = useLight();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roleDashboard(user.role)) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  if (loading) return <Spinner />;
  if (!user) return null;

  const dash = roleDashboard(user.role);
  if (!dash) return null;

  const DashIcon = ROLE_ICONS[user.role as RoleKey] ?? LayoutDashboard;

  return (
    <AuthShell maxW="max-w-2xl">
      <AuthHeading
        eyebrow="Signed in"
        title={
          <>
            Welcome, <span className={headingGradCls(light)}>{user.name?.split(" ")[0] || "there"}</span>
          </>
        }
        subtitle="Where would you like to go?"
      />

      <AuthCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/"
            className={cn(
              "group flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5",
              light
                ? "border-onyx/15 bg-white hover:border-sapphire/40 hover:shadow-[0_16px_40px_rgba(30,58,138,0.10)]"
                : "border-white/10 bg-white/[0.03] hover:border-gold/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold-light"
              )}
            >
              <Globe size={20} strokeWidth={1.5} />
            </span>
            <span
              className={cn(
                "mt-4 text-[11px] font-semibold uppercase tracking-[0.25em]",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Main Site
            </span>
            <span
              className={cn(
                "mt-1.5 text-xs leading-relaxed",
                light ? "text-onyx/60" : "text-cream-dim"
              )}
            >
              Browse the marketplace and shop as usual.
            </span>
            <span
              className={cn(
                "mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]",
                light ? "text-sapphire" : "text-gold-light"
              )}
            >
              Continue shopping
              <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href={dash.href}
            className={cn(
              "group flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5",
              light
                ? "border-onyx/15 bg-white hover:border-sapphire/40 hover:shadow-[0_16px_40px_rgba(30,58,138,0.10)]"
                : "border-white/10 bg-white/[0.03] hover:border-gold/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                light ? "bg-sapphire/10 text-sapphire" : "bg-gold/10 text-gold-light"
              )}
            >
              <DashIcon size={20} strokeWidth={1.5} />
            </span>
            <span
              className={cn(
                "mt-4 text-[11px] font-semibold uppercase tracking-[0.25em]",
                light ? "text-onyx" : "text-cream"
              )}
            >
              {dash.label}
            </span>
            <span
              className={cn(
                "mt-1.5 text-xs leading-relaxed",
                light ? "text-onyx/60" : "text-cream-dim"
              )}
            >
              {dash.desc}
            </span>
            <span
              className={cn(
                "mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]",
                light ? "text-sapphire" : "text-gold-light"
              )}
            >
              Open dashboard
              <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
