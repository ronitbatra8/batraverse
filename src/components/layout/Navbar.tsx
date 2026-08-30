"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls, useMotionValueEvent, useScroll } from "framer-motion";
import {
  Home,
  Menu,
  Search,
  ShoppingCart,
  Stethoscope,
  Store,
  X,
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

const listParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};
const listItem = {
  hidden: { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" },
  show: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: 0.7, ease: EASE },
  },
  exit: { opacity: 0, transition: { duration: 0.25, ease: EASE } },
};

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

/* Sidebar: close on outside click, Escape, or route change */
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
            <button
              type="button"
              onClick={() => setSliderOpen((o) => !o)}
              aria-expanded={sliderOpen}
              aria-haspopup="dialog"
              aria-label={sliderOpen ? "Close menu" : "Open menu"}
              className={cn(
                "inline-flex h-10 w-[92px] items-center justify-center rounded-full border transition-colors duration-300",
                lightNav
                  ? "border-black/15 text-onyx hover:border-sapphire/60 hover:text-sapphire"
                  : "border-white/15 text-cream hover:border-gold/60 hover:text-gold-light",
                sliderOpen
                  ? lightNav
                    ? "border-sapphire/60 bg-sapphire/5 text-sapphire"
                    : "border-gold/60 bg-gold/5 text-gold-light"
                  : "bg-transparent"
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-normal uppercase tracking-[0.3em] transition-colors duration-200 sm:text-[10px] sm:tracking-[0.35em]",
                  sliderOpen && (lightNav ? "text-sapphire" : "text-gold-light")
                )}
              >
                {sliderOpen ? "Close" : "Menu"}
              </span>
              <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center">
                <Menu
                  size={14}
                  strokeWidth={1.25}
                  className={cn(
                    "absolute inset-0 transition-all duration-200 ease-out",
                    sliderOpen && "rotate-90 scale-50 opacity-0"
                  )}
                />
                <X
                  size={14}
                  strokeWidth={1.25}
                  className={cn(
                    "absolute inset-0 transition-all duration-200 ease-out",
                    !sliderOpen && "-rotate-90 scale-50 opacity-0"
                  )}
                />
              </span>
            </button>

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

      {/* Sliding sidebar — full height, paints below the navbar so the MENU/CLOSE wordplate stays visible */}
      <AnimatePresence>
        {sliderOpen && (
          <>
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => setSliderOpen(false)}
              className="fixed inset-0 z-20 bg-black/25"
            />
            <motion.aside
              ref={sliderPanelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ willChange: "transform" }}
              className={cn(
                "fixed inset-y-0 right-0 z-30 flex w-[340px] max-w-[90vw] flex-col border-l backdrop-blur-2xl",
                lightNav
                  ? "border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),-24px_0_60px_rgba(0,0,0,0.12)]"
                  : "border-gold/15 bg-onyx/55 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),-24px_0_60px_rgba(0,0,0,0.4)]"
              )}
            >
              <motion.nav
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={listParent}
                className="flex-1 overflow-y-auto overscroll-contain px-6 pb-10 pt-[84px]"
              >
                <SlideRow
                  label="Cart"
                  hint={totalItems > 0 ? `${totalItems}` : undefined}
                  lightNav={lightNav}
                  onClick={() => { setSliderOpen(false); router.push("/cart"); }}
                />
                <SlideRow
                  label="Wishlist"
                  hint={wishlistCount > 0 ? `${wishlistCount}` : undefined}
                  lightNav={lightNav}
                  onClick={() => { setSliderOpen(false); router.push("/wishlist"); }}
                />

                <SlideDivider lightNav={lightNav} />

                {user ? (
                  <>
                    <SlideRow label="My Account" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/account"); }} />
                    <SlideRow label="Wallet" hint={`₹${(user?.walletBalance ?? 0).toFixed(0)}`} lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/wallet"); }} />
                    <SlideRow label="My Orders" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/orders"); }} />
                    <SlideRow label="My Queries" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/queries"); }} />
                    <SlideRow label="Private Viewing" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/private-viewing"); }} />
                  </>
                ) : (
                  <>
                    <SlideRow label="Sign In" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/login"); }} />
                    <SlideRow label="Explore as Guest" lightNav={lightNav} onClick={() => { setSliderOpen(false); enterAsGuest(); router.push("/"); }} />
                  </>
                )}

                <SlideDivider lightNav={lightNav} />

                {user && (
                  <SlideRow label="Add Account" lightNav={lightNav} onClick={() => { setSliderOpen(false); router.push("/login?add=1"); }} />
                )}
                <SlideRow
                  label={theme === "light" ? "Dark Mode" : "Light Mode"}
                  lightNav={lightNav}
                  onClick={() => setSliderOpen(false)}
                  onAction={toggle}
                />
                {user && (
                  <SlideRow
                    label="Sign Out"
                    danger
                    lightNav={lightNav}
                    onClick={() => { setSliderOpen(false); logout(); router.push("/"); }}
                  />
                )}
              </motion.nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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

function SlideDivider({ lightNav = false }: { lightNav?: boolean }) {
  return (
    <motion.div
      variants={listItem}
      className={cn(
        "mx-0 my-5 h-px bg-gradient-to-r",
        lightNav
          ? "from-black/25 via-black/10 to-transparent"
          : "from-cream/25 via-cream/10 to-transparent"
      )}
    />
  );
}

function SlideRow({
  label,
  hint,
  danger = false,
  lightNav = false,
  onClick,
  onAction,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  lightNav?: boolean;
  onClick?: () => void;
  onAction?: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={listItem}
      onClick={() => {
        onClick?.();
        onAction?.();
      }}
      className="relative flex w-full items-baseline justify-between gap-6 py-3.5 text-left"
    >
      <span
        className={cn(
          "truncate font-display text-[14px] font-light uppercase leading-tight tracking-[0.16em] transition-colors duration-300",
          danger
            ? lightNav
              ? "text-rose-600 group-hover:text-rose-500"
              : "text-rose-400 group-hover:text-rose-300"
            : lightNav
              ? "text-onyx/90 group-hover:text-sapphire"
              : "text-cream group-hover:text-gold-light"
        )}
      >
        {label}
      </span>
      {hint && (
        <span
          className={cn(
            "shrink-0 text-[9px] font-medium uppercase tracking-[0.3em]",
            lightNav ? "text-onyx/40" : "text-cream-dim/50"
          )}
        >
          {hint}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100",
          lightNav ? "bg-sapphire/60" : "bg-gold/60"
        )}
      />
    </motion.button>
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
