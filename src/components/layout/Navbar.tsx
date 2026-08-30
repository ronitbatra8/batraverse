"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls, useMotionValueEvent, useScroll } from "framer-motion";
import {
  Eye,
  Ghost,
  Heart,
  Home,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Store,
  Sun,
  User,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Brand from "@/components/brand/Brand";
import { useBoot, useBootPhase } from "@/components/boot/BootContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { LEVELS, getLevelFromBalance } from "@/lib/levels";

const EASE = [0.16, 1, 0.3, 1] as const;

const MotionLink = motion.create(Link);

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store" },
  { label: "Mart", href: "/mart" },
  { label: "Mediverse", href: "/mediverse" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

const BOTTOM_TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Store", href: "/store", icon: Store },
  { label: "Mart", href: "/mart", icon: ShoppingCart },
  { label: "Mediverse", href: "/mediverse", icon: Stethoscope },
] as const;

export default function Navbar() {
  const phase = useBootPhase();
  const boot = useBoot();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout, enterAsGuest } = useAuth();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const walletBalance = user?.walletBalance ?? 0;
  const levelKey = getLevelFromBalance(user?.peakWalletBalance ?? walletBalance);
  const levelMeta = LEVELS[levelKey];
  const LevelIcon = levelMeta.icon;

  const [scrolled, setScrolled] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const lastScrollY = useRef(0);
  const optionsRef = useRef<HTMLDivElement>(null);

  /* Light mode: the nav chrome turns dark-and-sapphire immediately — it sits
     over the light hero at the top too — and grows a frosted white pill only
     once scrolled */
  const lightNav = theme === "light";

  /* On the home page, when transparent (not scrolled), only the text colors
     (logo "BATRA" + nav tab labels) become white — everything else stays
     light-mode styled. */
  const heroWhite = pathname === "/" && !scrolled && lightNav;

  /* The single brand element. During the boot it drops from above the screen
     to the centre (the BV card inside does its own quiet squash — the text
     never squashes), then on morph it flies back home to the navbar — the
     MAISON DARK flight. On refresh it just slides in from the top, no bounce. */
  const brandRef = useRef<HTMLDivElement>(null);
  const brandControls = useAnimationControls();
  const { scrollYProgress, scrollY } = useScroll();

  /* Derive scrolled from the existing useScroll motion value — no extra listener */
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolled(v > 0.01);
  });

  /* Hide/show bottom tab bar on scroll direction */
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = lastScrollY.current;
    const diff = y - prev;
    if (Math.abs(diff) < 10) return;
    if (diff > 0 && y > 80) setTabHidden(true);
    else setTabHidden(false);
    lastScrollY.current = y;
  });

  /* Options flyout: close on outside click, Escape, or route change */
  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOptionsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [optionsOpen]);

  useEffect(() => {
    setOptionsOpen(false);
  }, [pathname]);

  /* Drop the brand in during the boot (e-commerce); slide it in on refresh. */
  useLayoutEffect(() => {
    if (boot === "play") {
      if (phase !== "boot") return;
      const el = brandRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scale = Math.min(
        3.2,
        (window.innerWidth * 0.8 - 48) / Math.max(rect.width, 1)
      );
      const cx = window.innerWidth / 2 - (rect.left + rect.width / 2);
      const cy = window.innerHeight / 2 - (rect.top + rect.height / 2);
      const vh = window.innerHeight;

      /* Park the lockup above the viewport at boot size, fully visible, then
         drop to the centre with a gentle vertical settle. The BV card inside
         performs its own quiet squash (see Brand.tsx); the lockup itself only
         translates and rotates so the text never bounces. */
      brandControls.set({
        x: cx,
        y: -vh * 0.45,
        scale,
        scaleX: 1,
        scaleY: 1,
        rotate: -10,
        opacity: 1,
      });
      brandControls.start({
        y: cy,
        rotate: 0,
        transition: {
          duration: 0.8,
          delay: 0.15,
          ease: EASE,
        },
      });
    } else if (boot === "skip") {
      /* Clean drop from the top — no bounce */
      brandControls.set({
        x: 0,
        y: -22,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        opacity: 1,
      });
      brandControls.start({
        y: 0,
        transition: { duration: 0.6, ease: EASE },
      });
    }
  }, [boot, phase, brandControls]);

  /* Fly the brand home to the navbar on morph — the MAISON DARK flight */
  useEffect(() => {
    if (phase !== "morph") return;
    brandControls.start({
      x: 0,
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      transition: { duration: 0.9, ease: EASE },
    });
  }, [phase, brandControls]);

  return (
    <>
      <motion.header
        className={cn(
          "fixed inset-x-0 top-0 z-40",
          phase === "boot" && "pointer-events-none"
        )}
      >
        <nav
          className={cn(
            "relative flex h-16 items-center justify-between px-5 transition-[margin,padding,border-radius,box-shadow,background-color] duration-500 sm:px-10",
            scrolled
              ? lightNav
                ? "mt-3 border border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur-2xl"
                : "mt-3 border border-gold/15 bg-onyx/70 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
              : "bg-transparent"
          )}
        >
          {/* Brand — the single lockup that travels drop -> centre -> navbar */}
          <motion.div
            ref={brandRef}
            data-nav-brand
            animate={brandControls}
            className="flex items-center"
            style={{ opacity: 0 }}
          >
            <Link
              href="/"
              aria-label="Batraverse — home"
              className="block"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/";
              }}
            >
              <Brand key={boot} boot={boot === "play"} light={lightNav} heroWhite={heroWhite} />
            </Link>
          </motion.div>

          {/* Centre links */}
          <motion.ul
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex"
            initial={boot !== "skip" ? { opacity: 0 } : false}
            animate={{ opacity: phase !== "boot" ? 1 : 0 }}
            transition={{ duration: 0.7, delay: phase !== "boot" ? 0.35 : 0 }}
          >
            {NAV_LINKS.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <NavLink
                    label={l.label}
                    href={l.href}
                    active={active}
                    lightNav={lightNav}
                    heroWhite={heroWhite}
                  />
                </li>
              );
            })}
          </motion.ul>

          {/* Actions */}
          <motion.div
            className="flex items-center gap-1 sm:gap-3"
            initial={boot !== "skip" ? { opacity: 0 } : false}
            animate={{ opacity: phase !== "boot" ? 1 : 0 }}
            transition={{ duration: 0.7, delay: phase !== "boot" ? 0.45 : 0 }}
          >
            {/* Single options icon — the entire external nav */}
            <div ref={optionsRef} className="relative">
              <button
                type="button"
                onClick={() => setOptionsOpen((o) => !o)}
                aria-expanded={optionsOpen}
                aria-haspopup="menu"
                aria-label="Options"
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105",
                  lightNav
                    ? "border-black/10 text-onyx hover:border-sapphire/40 hover:bg-sapphire/5 hover:text-sapphire hover:drop-shadow-[0_0_12px_rgba(30,58,138,0.35)]"
                    : "border-white/10 text-cream-dim hover:border-gold/40 hover:bg-gold/5 hover:text-gold-light hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]",
                  optionsOpen &&
                    (lightNav
                      ? "border-sapphire/40 bg-sapphire/5 text-sapphire"
                      : "border-gold/40 bg-gold/5 text-gold-light")
                )}
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span
                    className={cn(
                      "absolute h-3.5 w-3.5 rounded-full border border-current opacity-40 transition-transform duration-300",
                      optionsOpen && "rotate-90"
                    )}
                  />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </span>
              </button>

              <AnimatePresence>
                {optionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.99 }}
                    transition={{ duration: 0.16, ease: EASE }}
                    style={{ willChange: "transform, opacity" }}
                    className={cn(
                      "absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-[20px] border backdrop-blur-2xl",
                      lightNav
                        ? "border-white/70 bg-white/85 shadow-[0_24px_60px_rgba(0,0,0,0.16)]"
                        : "border-gold/20 bg-onyx/90 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                    )}
                  >
                    <div className="max-h-[72vh] overflow-y-auto overscroll-contain p-2">
                      {/* quiet band */}
                      <div
                        className={cn(
                          "mb-1 flex items-baseline justify-between border-b px-3 pb-2.5 pt-1",
                          lightNav ? "border-black/10" : "border-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[8px] uppercase tracking-[0.4em]",
                            lightNav ? "text-onyx/40" : "text-cream-dim/40"
                          )}
                        >
                          Navigation
                        </span>
                        <span
                          className={cn(
                            "font-display text-[9px] uppercase tracking-[0.3em]",
                            lightNav ? "text-onyx/50" : "text-cream-dim/50"
                          )}
                        >
                          Batraverse
                        </span>
                      </div>

                      <FlyoutSection label="Shop" lightNav={lightNav}>
                        <FlyoutRow label="Search" icon={Search} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/search"); }} />
                        <FlyoutRow label="Cart" icon={ShoppingBag} hint={totalItems > 0 ? `${totalItems}` : undefined} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/cart"); }} />
                        <FlyoutRow label="Wishlist" icon={Heart} hint={wishlistCount > 0 ? `${wishlistCount}` : undefined} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/wishlist"); }} />
                      </FlyoutSection>

                      <div className={cn("mx-3 my-1 border-t", lightNav ? "border-black/10" : "border-white/10")} />

                      {user ? (
                        <FlyoutSection label="Account" lightNav={lightNav}>
                          <FlyoutRow label="My Account" icon={User} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/account"); }} />
                          <FlyoutRow label="Wallet" icon={Wallet} hint={`₹${(user?.walletBalance ?? 0).toFixed(0)}`} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/wallet"); }} />
                          <FlyoutRow label="My Orders" icon={Package} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/orders"); }} />
                          <FlyoutRow label="My Queries" icon={MessageSquare} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/queries"); }} />
                          <FlyoutRow label="Private Viewing" icon={Eye} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/private-viewing"); }} />
                        </FlyoutSection>
                      ) : (
                        <FlyoutSection label="Account" lightNav={lightNav}>
                          <FlyoutRow label="Sign In" icon={LogIn} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/login"); }} />
                          <FlyoutRow label="Explore as Guest" icon={Ghost} lightNav={lightNav} onClick={() => { setOptionsOpen(false); enterAsGuest(); router.push("/"); }} />
                        </FlyoutSection>
                      )}

                      <div className={cn("mx-3 my-1 border-t", lightNav ? "border-black/10" : "border-white/10")} />

                      <FlyoutSection label="System" lightNav={lightNav}>
                        {user && (
                          <FlyoutRow label="Add Account" icon={UserPlus} lightNav={lightNav} onClick={() => { setOptionsOpen(false); router.push("/login?add=1"); }} />
                        )}
                        <FlyoutRow
                          label={theme === "light" ? "Dark Mode" : "Light Mode"}
                          icon={theme === "light" ? Moon : Sun}
                          lightNav={lightNav}
                          onClick={() => { setOptionsOpen(false); toggle(); }}
                        />
                        {user && (
                          <FlyoutRow
                            label="Sign Out"
                            icon={LogOut}
                            danger
                            lightNav={lightNav}
                            onClick={() => { setOptionsOpen(false); logout(); router.push("/"); }}
                          />
                        )}
                      </FlyoutSection>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() => router.push("/account")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all duration-300 sm:px-3.5 sm:py-2",
                  lightNav
                    ? "border-sapphire/25 bg-sapphire/10 hover:border-sapphire/45 hover:bg-sapphire/15"
                    : "border-gold/25 bg-gold/10 hover:border-gold/45 hover:bg-gold/15"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-abyss",
                    lightNav ? "bg-sapphire" : "bg-gold"
                  )}
                >
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span
                  className={cn(
                    "hidden max-w-24 truncate text-[10px] font-semibold uppercase tracking-[0.2em] sm:inline-block",
                    lightNav ? "text-sapphire" : "text-gold-light"
                  )}
                >
                  {user.name?.split(" ")[0] || "Account"}
                </span>
                {levelMeta.name && LevelIcon && (
                  <span
                    className={cn(
                      "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.16em] xl:inline-flex",
                      lightNav
                        ? "border-sapphire/30 bg-sapphire/10 text-sapphire"
                        : levelMeta.chip
                    )}
                  >
                    <LevelIcon size={9} />
                    {levelMeta.name}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/login"
                className="items-center rounded-full bg-rose-500 px-3.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-abyss transition-all duration-300 hover:bg-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.45)] sm:inline-flex sm:px-5 sm:py-2 sm:text-[10px]"
              >
                Sign In
              </Link>
            )}
          </motion.div>

          {/* Scroll progress */}
          <motion.div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-full",
              lightNav
                ? "bg-gradient-to-r from-sapphire/30 via-sapphire to-sapphire-light"
                : "bg-gradient-to-r from-gold/30 via-gold to-gold-light"
            )}
            style={{ scaleX: scrollYProgress }}
          />
        </nav>
      </motion.header>

      {/* Mobile bottom tab bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-none border-t border-x-0 border-b-0 backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] lg:hidden",
          lightNav
            ? "border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_-12px_40px_rgba(0,0,0,0.10)]"
            : "border-gold/15 bg-onyx/70 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),0_-12px_40px_rgba(0,0,0,0.5)]",
          tabHidden && "translate-y-full"
        )}
      >
        <nav className="flex items-center justify-evenly px-4 py-4">
          {BOTTOM_TABS.map((t) => {
            const Icon = t.icon;
            const active =
              t.href === "/"
                ? pathname === "/"
                : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-0.5 transition-colors duration-300",
                  active
                    ? lightNav
                      ? "text-sapphire"
                      : "text-gold-light"
                    : lightNav
                      ? "text-onyx/60 hover:text-onyx"
                      : "text-cream-dim/60 hover:text-cream"
                )}
              >
                <Icon size={17} strokeWidth={1.5} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">
                  {t.label}
                </span>
                <span
                  className={cn(
                    "absolute -top-1 left-1/2 h-[2px] -translate-x-1/2 rounded-full transition-all duration-500",
                    lightNav ? "bg-sapphire" : "bg-gold-light",
                    active ? "w-full" : "w-0"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/* ---------- Pieces ---------- */

function NavLink({
  label,
  href,
  active,
  lightNav = false,
  heroWhite = false,
}: {
  label: string;
  href: string;
  active: boolean;
  lightNav?: boolean;
  heroWhite?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative py-2 text-[11px] uppercase tracking-[0.3em] transition-colors duration-300",
        lightNav ? "font-semibold" : "font-medium",
        heroWhite
          ? active
            ? "text-white"
            : "text-white/80 hover:text-white"
          : active
            ? lightNav
              ? "text-sapphire drop-shadow-[0_0_10px_rgba(30,58,138,0.45)]"
              : "text-gold-light"
            : lightNav
              ? "text-onyx hover:text-sapphire hover:drop-shadow-[0_0_10px_rgba(30,58,138,0.45)]"
              : "text-cream-dim hover:text-cream"
      )}
    >
      {label}
      <span
        className={cn(
          "absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-500",
          lightNav ? "bg-sapphire" : "bg-gold",
          active ? "w-full" : "w-0 group-hover:w-full"
        )}
      />
    </Link>
  );
}

function FlyoutSection({
  label,
  lightNav = false,
  children,
}: {
  label: string;
  lightNav?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-1">
      <p
        className={cn(
          "px-3 pb-1 pt-2 text-[8px] font-medium uppercase tracking-[0.35em]",
          lightNav ? "text-onyx/35" : "text-cream-dim/35"
        )}
      >
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FlyoutRow({
  label,
  icon: Icon,
  hint,
  danger = false,
  lightNav = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  hint?: string;
  danger?: boolean;
  lightNav?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200",
        danger
          ? lightNav
            ? "text-rose-600 hover:bg-rose-500/5 hover:text-rose-500"
            : "text-rose-400 hover:bg-rose-400/5 hover:text-rose-300"
          : lightNav
            ? "text-onyx hover:bg-sapphire/5 hover:text-sapphire"
            : "text-cream hover:bg-gold/5 hover:text-gold-light"
      )}
    >
      <Icon
        size={15}
        strokeWidth={1.5}
        className="shrink-0 opacity-60 transition-opacity duration-200 group-hover:opacity-100"
      />
      <span className="flex-1 truncate text-[10px] font-medium uppercase tracking-[0.18em]">
        {label}
      </span>
      {hint && (
        <span
          className={cn(
            "shrink-0 text-[9px] font-medium uppercase tracking-[0.2em]",
            lightNav ? "text-onyx/40" : "text-cream-dim/40"
          )}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
