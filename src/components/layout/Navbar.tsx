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
  ShoppingCart,
  Stethoscope,
  Store,
  Sun,
  User,
  UserPlus,
  Wallet,
  X,
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
  const [sliderOpen, setSliderOpen] = useState(false);
  const lastScrollY = useRef(0);
  const sliderPanelRef = useRef<HTMLDivElement>(null);

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

  /* Sliding sidebar: close on outside click, Escape, or route change */
  useEffect(() => {
    if (!sliderOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sliderPanelRef.current && !sliderPanelRef.current.contains(e.target as Node)) {
        setSliderOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSliderOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sliderOpen]);

  /* Lock body scroll while the sidebar is open */
  useEffect(() => {
    if (!sliderOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sliderOpen]);

  useEffect(() => {
    setSliderOpen(false);
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
            <IconBtn
              label="Search"
              lightNav={lightNav}
              onClick={() => router.push("/search")}
            >
              <Search size={17} strokeWidth={1.5} />
            </IconBtn>

            {/* Sliding sidebar — the external links */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSliderOpen((o) => !o)}
                aria-expanded={sliderOpen}
                aria-haspopup="dialog"
                aria-label="External links"
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105",
                  lightNav
                    ? "border-black/10 text-onyx hover:border-sapphire/40 hover:bg-sapphire/5 hover:text-sapphire hover:drop-shadow-[0_0_12px_rgba(30,58,138,0.35)]"
                    : "border-white/10 text-cream-dim hover:border-gold/40 hover:bg-gold/5 hover:text-gold-light hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]",
                  sliderOpen &&
                    (lightNav
                      ? "border-sapphire/40 bg-sapphire/5 text-sapphire"
                      : "border-gold/40 bg-gold/5 text-gold-light")
                )}
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span
                    className={cn(
                      "absolute h-3.5 w-3.5 rounded-full border border-current opacity-40 transition-transform duration-300",
                      sliderOpen && "rotate-90"
                    )}
                  />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </span>
              </button>

              <AnimatePresence>
                {sliderOpen && (
                  <>
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => setSliderOpen(false)}
                      className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
                    />
                    <motion.aside
                      ref={sliderPanelRef}
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ duration: 0.45, ease: EASE }}
                      style={{ willChange: "transform" }}
                      className={cn(
                        "fixed inset-y-0 right-0 z-50 flex w-[300px] max-w-[88vw] flex-col rounded-l-[28px] border-l backdrop-blur-2xl",
                        lightNav
                          ? "border-white/70 bg-white/90 shadow-[-24px_0_60px_rgba(0,0,0,0.18)]"
                          : "border-gold/20 bg-onyx/95 shadow-[-24px_0_60px_rgba(0,0,0,0.6)]"
                      )}
                    >
                      {/* quiet header */}
                      <div
                        className={cn(
                          "flex items-center justify-between border-b px-6 py-5",
                          lightNav ? "border-black/10" : "border-white/10"
                        )}
                      >
                        <div>
                          <p
                            className={cn(
                              "text-[8px] uppercase tracking-[0.45em]",
                              lightNav ? "text-onyx/40" : "text-cream-dim/40"
                            )}
                          >
                            Batraverse
                          </p>
                          <p
                            className={cn(
                              "font-display text-[13px] uppercase tracking-[0.28em]",
                              lightNav ? "text-onyx" : "text-cream"
                            )}
                          >
                            Navigation
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSliderOpen(false)}
                          aria-label="Close navigation"
                          className={cn(
                            "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105",
                            lightNav
                              ? "border-black/10 text-onyx hover:border-sapphire/40 hover:text-sapphire"
                              : "border-white/10 text-cream-dim hover:border-gold/40 hover:text-gold-light"
                          )}
                        >
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* links */}
                      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
                        <SlideSection label="Shop" delay={0.16} lightNav={lightNav}>
                          <SlideRow
                            label="Cart"
                            icon={ShoppingCart}
                            hint={totalItems > 0 ? `${totalItems}` : undefined}
                            lightNav={lightNav}
                            onClick={() => { setSliderOpen(false); router.push("/cart"); }}
                          />
                          <SlideRow
                            label="Wishlist"
                            icon={Heart}
                            hint={wishlistCount > 0 ? `${wishlistCount}` : undefined}
                            lightNav={lightNav}
                            onClick={() => { setSliderOpen(false); router.push("/wishlist"); }}
                          />
                        </SlideSection>

                        <SlideDivider lightNav={lightNav} delay={0.26} />

                        {user ? (
                          <SlideSection label="Account" delay={0.32} lightNav={lightNav}>
                            <SlideRow label="My Account" icon={User} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/account"); }} />
                            <SlideRow label="Wallet" icon={Wallet} hint={`₹${(user?.walletBalance ?? 0).toFixed(0)}`} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/wallet"); }} />
                            <SlideRow label="My Orders" icon={Package} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/orders"); }} />
                            <SlideRow label="My Queries" icon={MessageSquare} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/queries"); }} />
                            <SlideRow label="Private Viewing" icon={Eye} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/private-viewing"); }} />
                          </SlideSection>
                        ) : (
                          <SlideSection label="Account" delay={0.32} lightNav={lightNav}>
                            <SlideRow label="Sign In" icon={LogIn} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/login"); }} />
                            <SlideRow label="Explore as Guest" icon={Ghost} lightNav={lightNav} onClick={() => { setSliderOpen(false); enterAsGuest(); router.push("/"); }} />
                          </SlideSection>
                        )}

                        <SlideDivider lightNav={lightNav} delay={0.42} />

                        <SlideSection label="System" delay={0.48} lightNav={lightNav}>
                          {user && (
                            <SlideRow label="Add Account" icon={UserPlus} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/login?add=1"); }} />
                          )}
                          <SlideRow
                            label={theme === "light" ? "Dark Mode" : "Light Mode"}
                            icon={theme === "light" ? Moon : Sun}
                            lightNav={lightNav}
                            onClick={() => setSliderOpen(false)}
                            onAction={toggle}
                          />
                          {user && (
                            <SlideRow
                              label="Sign Out"
                              icon={LogOut}
                              danger
                              lightNav={lightNav}
                              onClick={() => { setSliderOpen(false); logout(); router.push("/"); }}
                            />
                          )}
                        </SlideSection>
                      </div>
                    </motion.aside>
                  </>
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

function SlideDivider({
  lightNav = false,
  delay = 0,
}: {
  lightNav?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      className={cn("mx-3 my-1 border-t", lightNav ? "border-black/10" : "border-white/10")}
    />
  );
}

function SlideSection({
  label,
  delay = 0,
  lightNav = false,
  children,
}: {
  label: string;
  delay?: number;
  lightNav?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      <p
        className={cn(
          "px-3.5 pb-1 pt-3 text-[8px] font-medium uppercase tracking-[0.4em]",
          lightNav ? "text-onyx/35" : "text-cream-dim/35"
        )}
      >
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </motion.div>
  );
}

function SlideRow({
  label,
  icon: Icon,
  hint,
  danger = false,
  lightNav = false,
  onClick,
  onAction,
}: {
  label: string;
  icon: LucideIcon;
  hint?: string;
  danger?: boolean;
  lightNav?: boolean;
  onClick?: () => void;
  onAction?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onAction?.();
      }}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200",
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
        size={16}
        strokeWidth={1.5}
        className="shrink-0 opacity-60 transition-opacity duration-200 group-hover:opacity-100"
      />
      <span className="flex-1 truncate text-[11px] font-medium uppercase tracking-[0.22em]">
        {label}
      </span>
      {hint && (
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium uppercase tracking-[0.2em]",
            lightNav ? "text-onyx/40" : "text-cream-dim/40"
          )}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

function IconBtn({
  children,
  label,
  className = "",
  lightNav = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  lightNav?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center transition-all duration-300 hover:scale-110 ${lightNav ? "text-onyx hover:text-sapphire hover:drop-shadow-[0_0_10px_rgba(30,58,138,0.45)]" : "text-cream-dim hover:text-gold-light"} ${className}`}
    >
      {children}
    </button>
  );
}
