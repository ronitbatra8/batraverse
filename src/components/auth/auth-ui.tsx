"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as const;

export function useLight() {
  const { theme } = useTheme();
  return theme === "light";
}

export const inputCls = (light: boolean) =>
  light
    ? "w-full bg-white border border-onyx/15 rounded-xl pl-11 pr-4 py-3.5 text-sm text-onyx placeholder:text-onyx/35 focus:outline-none focus:border-sapphire transition-colors"
    : "w-full bg-dark-800 border border-dark-700 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold transition-colors";

export const labelCls = (light: boolean) =>
  light
    ? "block text-xs text-onyx/50 uppercase tracking-wider mb-2 font-medium"
    : "block text-xs text-dark-400 uppercase tracking-wider mb-2 font-medium";

export const textCls = (light: boolean) => (light ? "text-onyx" : "text-cream");

export const dimTextCls = (light: boolean) => (light ? "text-onyx/70" : "text-cream-dim");

export const subTextCls = (light: boolean) => (light ? "text-onyx/50" : "text-dark-500");

export const linkCls = (light: boolean) =>
  light
    ? "font-medium text-sapphire transition-colors duration-300 hover:text-sapphire-light"
    : "font-medium text-gold transition-colors duration-300 hover:text-gold-light";

export const headingGradCls = (light: boolean) =>
  light ? "text-sapphire-gradient" : "text-gold-gradient";

export function AuthShell({
  children,
  maxW = "max-w-md",
}: {
  children: React.ReactNode;
  maxW?: string;
}) {
  const light = useLight();
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-6 pb-16 pt-8 sm:pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{
          background: light
            ? "radial-gradient(closest-side, rgba(30,58,138,0.06), transparent)"
            : "radial-gradient(closest-side, rgba(212,175,55,0.08), transparent)",
        }}
      />
      <div className={`relative z-10 w-full ${maxW}`}>{children}</div>
    </div>
  );
}

export function AuthHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  const light = useLight();
  return (
    <div className="mb-6 text-center">
      <p className={cn("text-[9px] uppercase tracking-[0.5em]", light ? "text-sapphire" : "text-gold/80")}>{eyebrow}</p>
      <h1
        className={cn(
          "mt-4 font-display text-4xl font-medium tracking-wide sm:text-5xl",
          textCls(light)
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p className={cn("mt-4 text-sm font-light leading-relaxed tracking-wide", dimTextCls(light))}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function AuthCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const light = useLight();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-5 py-8 sm:px-8 sm:py-10",
        light
          ? "border-onyx/10 bg-gradient-to-br from-white via-[#fdfdfb] to-[#f2efe7]"
          : "border-gold/15 bg-gradient-to-br from-[#0e0e11] via-[#0a0a0d] to-[#050507]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: light
            ? "radial-gradient(closest-side, rgba(30,58,138,0.08), transparent)"
            : "radial-gradient(closest-side, rgba(212,175,55,0.1), transparent)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const light = useLight();
  return (
    <div>
      <label className={labelCls(light)}>{label}</label>
      <div className="relative">
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
              light ? "text-onyx/40" : "text-dark-500"
            )}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

export function PasswordField({
  label = "Password",
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  autoFocus = false,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: React.ReactNode;
}) {
  const light = useLight();
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          className={cn(
            "text-xs uppercase tracking-wider font-medium",
            light ? "text-onyx/50" : "text-dark-400"
          )}
        >
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={inputCls(light)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
            light ? "text-onyx/40 hover:text-sapphire" : "text-dark-500 hover:text-gold-light"
          )}
        >
          {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

export function SubmitBtn({
  loading,
  children,
  loadingText,
  onClick,
}: {
  loading: boolean;
  children: React.ReactNode;
  loadingText: string;
  onClick?: () => void;
}) {
  const light = useLight();
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "group mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50",
        light
          ? "bg-sapphire text-white hover:shadow-[0_0_40px_rgba(30,58,138,0.35)]"
          : "bg-gold text-abyss hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
      )}
    >
      {loading ? loadingText : children}
    </button>
  );
}

export function ErrorBanner({ error }: { error: string }) {
  const light = useLight();
  if (!error) return null;
  return (
    <p
      className={cn(
        "mb-5 rounded-xl border px-4 py-3 text-sm",
        light
          ? "border-rose-500/30 bg-rose-500/5 text-rose-700"
          : "border-rose-400/25 bg-rose-400/5 text-rose-300"
      )}
    >
      {error}
    </p>
  );
}

export function AuthFooter({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  const light = useLight();
  return (
    <p className={cn("mt-8 text-center text-sm", subTextCls(light))}>
      {text}{" "}
      <Link href={href} className={linkCls(light)}>
        {linkText}
      </Link>
    </p>
  );
}

export function Spinner() {
  const light = useLight();
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div
        className={cn(
          "h-10 w-10 animate-spin rounded-full border-2",
          light
            ? "border-sapphire/20 border-t-sapphire"
            : "border-gold/20 border-t-gold"
        )}
      />
    </div>
  );
}
