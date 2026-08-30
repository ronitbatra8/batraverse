"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import {
  Check,
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
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { LEVELS, getLevelFromBalance } from "@/lib/levels";
import { roleDashboard } from "@/lib/roles";

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
  const { user, logout, accounts, currentIndex, switchAccount, removeAccount, enterAsGuest } = useAuth();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const walletBalance = user?.walletBalance ?? 0;
  const levelKey = getLevelFromBalance(user?.peakWalletBalance ?? walletBalance);
  const levelMeta = LEVELS[levelKey];
  const LevelIcon = levelMeta.icon;
  const dash = roleDashboard(user?.role);

  const [scrolled, setScrolled] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const lastScrollY = useRef(0);

  /* Light mode: the nav chrome turns dark-and-sapphire immediately — it sits
     over the light hero at the top too — and grows a frosted white pill only
     once scrolled */
  const lightNav = theme === "light";

  /* On the home page, when transparent (not scrolled), only the text colors
     (logo "BATRA" + nav tab labels) become white — everything else stays
     light-mode styled. */
  const heroWhite = pathname === "/" && !scrolled && lightNav;

  const shopRef = useRef<HTMLDivElement>(null);

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

  /* Close the shop dropdown on outside click or Escape */
  useEffect(() => {
    if (!shopOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (t instanceof Element && t.closest("[data-bv-menu]")) return;
      if (shopRef.current && !shopRef.current.contains(t)) {
        setShopOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShopOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shopOpen]);

  /* Lock body scroll while the full-bleed menu is open */
  useEffect(() => {
    if (!shopOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shopOpen]);

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

            {/* Menu — Rolls-Royce style wordplate trigger */}
            <div ref={shopRef} className="relative z-10">
              <button
                type="button"
                onClick={() => setShopOpen((o) => !o)}
                aria-expanded={shopOpen}
                aria-haspopup="true"
                aria-label={shopOpen ? "Close menu" : "Open menu"}
                className={cn(
                  "inline-flex h-10 items-center gap-2.5 rounded-full border px-4 transition-all duration-300 hover:scale-[1.03]",
                  lightNav
                    ? "border-black/15 text-onyx hover:border-sapphire/60 hover:text-sapphire"
                    : "border-white/15 text-cream hover:border-gold/60 hover:text-gold-light",
                  shopOpen
                    ? lightNav
                      ? "border-sapphire/60 bg-sapphire/5 text-sapphire"
                      : "border-gold/60 bg-gold/5 text-gold-light"
                    : "bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "text-[9px] font-normal uppercase tracking-[0.3em] transition-colors duration-200 sm:text-[10px] sm:tracking-[0.35em]",
                    shopOpen && (lightNav ? "text-sapphire" : "text-gold-light")
                  )}
                >
                  {shopOpen ? "Close" : "Menu"}
                </span>
                <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center">
                  <Menu
                    size={14}
                    strokeWidth={1.25}
                    className={cn(
                      "absolute inset-0 transition-all duration-200 ease-out",
                      shopOpen && "rotate-90 scale-50 opacity-0"
                    )}
                  />
                  <X
                    size={14}
                    strokeWidth={1.25}
                    className={cn(
                      "absolute inset-0 transition-all duration-200 ease-out",
                      !shopOpen && "-rotate-90 scale-50 opacity-0"
                    )}
                  />
                </span>
              </button>
            </div>
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

      {/* Rolls-Royce style full-bleed menu overlay */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            data-bv-menu
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={cn(
              "fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto overscroll-contain",
              lightNav ? "bg-white/[0.98]" : "bg-abyss/[0.98]"
            )}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-4 sm:px-14 sm:pt-8">
              {/* quiet system band */}
              <div className={cn("mb-2 flex items-baseline justify-between border-b pb-3 sm:pb-4", lightNav ? "border-black/10" : "border-white/10")}>
                <span className={cn("text-[9px] font-normal uppercase tracking-[0.5em]", lightNav ? "text-onyx/40" : "text-cream-dim/40")}>
                  Navigation
                </span>
                <span className={cn("font-display text-[10px] uppercase tracking-[0.3em]", lightNav ? "text-onyx/50" : "text-cream-dim/50")}>
                  Batraverse
                </span>
              </div>

              <MenuSection label="Shop" light={lightNav}>
                <MenuItem
                  label="Cart"
                  hint={totalItems > 0 ? `${totalItems}` : undefined}
                  light={lightNav}
                  onClick={() => {
                    setShopOpen(false);
                    router.push("/cart");
                  }}
                />
                <MenuItem
                  label="Wishlist"
                  hint={wishlistCount > 0 ? `${wishlistCount}` : undefined}
                  light={lightNav}
                  onClick={() => {
                    setShopOpen(false);
                    router.push("/wishlist");
                  }}
                />
                {dash && (
                  <MenuItem
                    label={dash.label}
                    light={lightNav}
                    onClick={() => {
                      setShopOpen(false);
                      router.push(dash.href);
                    }}
                  />
                )}
              </MenuSection>

              {user ? (
                <MenuSection label="Account" light={lightNav}>
                  <MenuItem label="My Account" light={lightNav} onClick={() => { setShopOpen(false); router.push("/account"); }} />
                  <MenuItem label="Wallet" hint={`₹${(user?.walletBalance ?? 0).toFixed(0)}`} light={lightNav} onClick={() => { setShopOpen(false); router.push("/wallet"); }} />
                  <MenuItem label="My Orders" light={lightNav} onClick={() => { setShopOpen(false); router.push("/orders"); }} />
                  <MenuItem label="My Queries" light={lightNav} onClick={() => { setShopOpen(false); router.push("/queries"); }} />
                  <MenuItem label="Private Viewing" light={lightNav} onClick={() => { setShopOpen(false); router.push("/private-viewing"); }} />
                </MenuSection>
              ) : (
                <MenuSection label="Account" light={lightNav}>
                  <MenuItem label="Sign In" light={lightNav} onClick={() => { setShopOpen(false); router.push("/login"); }} />
                  <MenuItem label="Explore as Guest" light={lightNav} onClick={() => { setShopOpen(false); enterAsGuest(); router.push("/"); }} />
                </MenuSection>
              )}

              {user && accounts.length > 1 && (
                <MenuSection label="Accounts" light={lightNav}>
                  {accounts.map((acc, i) => (
                    <MenuItem
                      key={acc.user.id}
                      label={acc.user.name?.split(" ")[0] || "Account"}
                      hint={i === currentIndex ? "Active" : acc.user.cardNumber || undefined}
                      active={i === currentIndex}
                      light={lightNav}
                      onRemove={i !== currentIndex ? () => removeAccount(i) : undefined}
                      onClick={() => {
                        setShopOpen(false);
                        switchAccount(i);
                      }}
                    />
                  ))}
                </MenuSection>
              )}

              <MenuSection label="System" light={lightNav}>
                {user && (
                  <MenuItem label="Add Account" light={lightNav} onClick={() => { setShopOpen(false); router.push("/login?add=1"); }} />
                )}
                <MenuItem
                  label={theme === "light" ? "Dark Mode" : "Light Mode"}
                  light={lightNav}
                  onClick={() => {
                    setShopOpen(false);
                    toggle();
                  }}
                />
                {user && (
                  <MenuItem
                    label="Sign Out"
                    danger
                    light={lightNav}
                    onClick={() => {
                      setShopOpen(false);
                      logout();
                      router.push("/");
                    }}
                  />
                )}
              </MenuSection>
            </div>
          </motion.div>
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

function MenuSection({
  label,
  light = false,
  children,
}: {
  label: string;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-10 sm:pt-16">
      <h2
        className={cn(
          "mb-3 text-[9px] font-normal uppercase tracking-[0.5em] sm:mb-5",
          light ? "text-onyx/40" : "text-cream-dim/40"
        )}
      >
        {label}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function MenuItem({
  label,
  hint,
  light = false,
  danger = false,
  active = false,
  onRemove,
  onClick,
}: {
  label: string;
  hint?: string;
  light?: boolean;
  danger?: boolean;
  active?: boolean;
  onRemove?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative border-b py-5 sm:py-6",
        light ? "border-black/10" : "border-white/10"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex min-w-0 flex-1 items-center gap-5">
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate font-display text-[22px] font-light uppercase leading-tight tracking-[0.12em] transition-colors duration-300 sm:text-[26px] sm:tracking-[0.14em]",
                active
                  ? light
                    ? "text-sapphire"
                    : "text-gold-light"
                  : danger
                    ? light
                      ? "text-rose-600 group-hover:text-rose-500"
                      : "text-rose-400 group-hover:text-rose-300"
                    : light
                      ? "text-onyx/90 group-hover:text-sapphire"
                      : "text-cream group-hover:text-gold-light"
              )}
            >
              {label}
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-1.5 h-px w-24 max-w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100",
                light ? "bg-sapphire" : "bg-gold"
              )}
            />
          </span>
          {hint && (
            <span
              className={cn(
                "shrink-0 text-[9px] font-medium uppercase tracking-[0.3em]",
                light ? "text-onyx/40" : "text-cream-dim/50"
              )}
            >
              {hint}
            </span>
          )}
        </span>
        {active && (
          <Check size={16} strokeWidth={1.5} className={cn("shrink-0", light ? "text-sapphire" : "text-gold-light")} />
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove account"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
              light
                ? "border-black/10 text-onyx/40 hover:border-rose-500/50 hover:text-rose-500"
                : "border-white/10 text-cream-dim/40 hover:border-rose-400/50 hover:text-rose-300"
            )}
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        )}
      </button>
    </div>
  );
}
