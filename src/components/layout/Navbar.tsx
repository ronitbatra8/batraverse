"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls, useMotionValueEvent, useScroll } from "framer-motion";
import {
  Home,
  Search,
  ShoppingCart,
  Stethoscope,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Brand from "@/components/brand/Brand";
import { useBoot, useBootPhase } from "@/components/boot/BootContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { LEVELS, getLevelFromBalance } from "@/lib/levels";
import { roleDashboard } from "@/lib/roles";
import menuStackIconData from "@/animations/menu-stack-icon.json";

const EASE = [0.16, 1, 0.3, 1] as const;
const RR_EASE = [0.19, 1, 0.22, 1] as const;

const MotionLink = motion.create(Link);

type NavRow =
  | { kind: "divider"; key: string }
  | {
      kind: "row";
      key: string;
      label: string;
      hint?: string;
      danger?: boolean;
      onClick: () => void;
      onAction?: () => void;
    };

type MenuIconAnim = {
  destroy: () => void;
  addEventListener: (event: "complete", cb: () => void) => void;
  goToAndStop: (frame: number, isFrame?: boolean) => void;
  playSegments: (segments: [number, number], forceFlag?: boolean) => void;
};

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
  const dash = user ? roleDashboard(user.role) : null;

  /* The sidebar is a single ordered list. Delays are computed at render time
     so the cascade can run bottom-up (bottom row first), like Rolls-Royce's
     GSAP menu reveal. */
  const navRows: NavRow[] = [
    { kind: "row", key: "cart", label: "Cart", hint: totalItems > 0 ? `${totalItems}` : undefined, onClick: () => { setSliderOpen(false); router.push("/cart"); } },
    { kind: "row", key: "wishlist", label: "Wishlist", hint: wishlistCount > 0 ? `${wishlistCount}` : undefined, onClick: () => { setSliderOpen(false); router.push("/wishlist"); } },
    { kind: "divider", key: "d1" },
  ];
  if (user) {
    navRows.push({ kind: "row", key: "account", label: "My Account", onClick: () => { setSliderOpen(false); router.push("/account"); } });
    if (dash) {
      navRows.push({ kind: "row", key: "dashboard", label: "Dashboard", onClick: () => { setSliderOpen(false); router.push(dash.href); } });
    }
    navRows.push(
      { kind: "row", key: "cards", label: "My Cards", onClick: () => { setSliderOpen(false); router.push("/cards"); } },
      { kind: "row", key: "wallet", label: "Wallet", hint: `₹${(user.walletBalance ?? 0).toFixed(0)}`, onClick: () => { setSliderOpen(false); router.push("/wallet"); } },
      { kind: "row", key: "orders", label: "My Orders", onClick: () => { setSliderOpen(false); router.push("/orders"); } },
      { kind: "row", key: "queries", label: "My Queries", onClick: () => { setSliderOpen(false); router.push("/queries"); } },
      { kind: "row", key: "private", label: "Private Viewing", onClick: () => { setSliderOpen(false); router.push("/private-viewing"); } },
    );
  } else {
    navRows.push(
      { kind: "row", key: "signin", label: "Sign In", onClick: () => { setSliderOpen(false); router.push("/login"); } },
      { kind: "row", key: "guest", label: "Explore as Guest", onClick: () => { setSliderOpen(false); enterAsGuest(); router.push("/"); } },
    );
  }
  navRows.push({ kind: "divider", key: "d2" });
  navRows.push({ kind: "row", key: "theme", label: theme === "light" ? "Dark Mode" : "Light Mode", onClick: () => setSliderOpen(false), onAction: toggle });
  if (user) {
    navRows.push({ kind: "row", key: "signout", label: "Sign Out", danger: true, onClick: () => { setSliderOpen(false); logout(); router.push("/"); } });
  }

  /* Close: rows wipe out right (0.9s, top-to-bottom). Panel & scrim start sliding
     away in parallel once only the last two rows are still wiping. */
  const earlyExitRowDelay = Math.max(navRows.length - 2, 0) * 0.1;

  const walletBalance = user?.walletBalance ?? 0;
  const levelKey = getLevelFromBalance(user?.peakWalletBalance ?? walletBalance);
  const levelMeta = LEVELS[levelKey];
  const LevelIcon = levelMeta.icon;

  const [scrolled, setScrolled] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [sliderOpen, setSliderOpen] = useState(false);
  const lastScrollY = useRef(0);
  const sliderPanelRef = useRef<HTMLDivElement>(null);
  const sliderTriggerRef = useRef<HTMLButtonElement>(null);
  const menuIconRef = useRef<HTMLSpanElement>(null);
  const menuLottieRef = useRef<MenuIconAnim | null>(null);
  const menuHoverActive = useRef(false);
  const menuWasOpen = useRef(sliderOpen);

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
      const target = e.target as Node;
      /* Clicking the MENU/CLOSE wordplate must toggle, not double-fire the
         outside-click close -> reopen */
      if (sliderTriggerRef.current && sliderTriggerRef.current.contains(target)) return;
      if (sliderPanelRef.current && !sliderPanelRef.current.contains(target)) {
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

  /* RR menu icon — RR's exact 16×16 "menu-burger-icon w/ hover" Lottie,
     extracted from RR's clientlib-components bundle. Like RR, the fill colours
     are patched (RR swaps to white/black) and segments are played:
       rest  → frame 0                        (hamburger)
       hover → play [0,30]   once             (the lines flick off/back = "shine")
       open  → play [30,60]                   (morph to the X)
       close → play [60,30]                   (morph back to the hamburger) */
  useEffect(() => {
    let cancelled = false;
    let anim: MenuIconAnim | null = null;
    void (async () => {
      const lottie = (await import("lottie-web")).default;
      if (cancelled || !menuIconRef.current) return;
      const data = JSON.parse(JSON.stringify(menuStackIconData)) as {
        layers: Array<{ shapes: Array<{ it: Array<{ c: { k: number[] } }> }> }>;
      };
      const patches = [
        { layer: 0, it: 4 },
        { layer: 1, it: 1 },
        { layer: 2, it: 1 },
        { layer: 3, it: 4 },
        { layer: 4, it: 1 },
        { layer: 5, it: 1 },
      ];
      const fill = lightNav
        ? sliderOpen
          ? [0.118, 0.227, 0.541, 1] // sapphire
          : [0.043, 0.043, 0.055, 1] // onyx
        : [0.941, 0.851, 0.549, 1]; // gold-light
      for (const p of patches) {
        data.layers[p.layer].shapes[0].it[p.it].c.k = fill;
      }
      anim = lottie.loadAnimation({
        container: menuIconRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: data,
      });
      anim.addEventListener("complete", () => {
        menuHoverActive.current = false;
      });
      if (sliderOpen) {
        anim.goToAndStop(30, true);
        anim.playSegments([30, 60], true);
      } else if (menuWasOpen.current) {
        anim.goToAndStop(60, true);
        anim.playSegments([60, 30], true);
      } else {
        anim.goToAndStop(0, true);
      }
      menuWasOpen.current = sliderOpen;
      menuLottieRef.current = anim;
    })();
    return () => {
      cancelled = true;
      menuLottieRef.current = null;
      if (anim) anim.destroy();
    };
  }, [lightNav, sliderOpen]);

  /* RR hover micro-interaction: play the icon's intro (frames 0→30) once — the
     built-in "shine" where each line flickers left/right before settling. */
  const handleMenuHover = () => {
    if (sliderOpen) return;
    const anim = menuLottieRef.current;
    if (!anim || menuHoverActive.current) return;
    menuHoverActive.current = true;
    anim.goToAndStop(0, true);
    anim.playSegments([0, 30], true);
  };

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
          "fixed inset-x-0 top-0 z-[56]",
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
            className={cn("flex items-center", sliderOpen && "max-lg:invisible")}
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
            className={cn(
              "flex items-center gap-2 sm:gap-4",
              sliderOpen && "pointer-events-none [&>*:not([data-menu-trigger])]:opacity-0"
            )}
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
                className={cn(
                  "items-center rounded-full bg-rose-500 px-3.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-abyss transition-all duration-300 hover:bg-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.45)] sm:inline-flex sm:px-5 sm:py-2 sm:text-[10px]"
                )}
              >
                Sign In
              </Link>
            )}

            {/* Sliding sidebar — the external links (RR-style wordplate: icon + MENU/CLOSE) */}
            <button
              ref={sliderTriggerRef}
              data-menu-trigger
              type="button"
              onClick={() => setSliderOpen((o) => !o)}
              aria-expanded={sliderOpen}
              aria-haspopup="dialog"
              aria-label={sliderOpen ? "Close menu" : "Open menu"}
              onMouseEnter={handleMenuHover}
              className={cn(
                "ml-2 inline-flex h-6 items-center text-[11px] font-medium uppercase tracking-[0.25em] transition-[opacity,color] duration-300 hover:opacity-70 sm:ml-4 sm:text-[12px]",
                lightNav
                  ? sliderOpen
                    ? "text-sapphire"
                    : "text-onyx hover:text-sapphire"
                  : sliderOpen
                    ? "text-gold-light"
                    : "text-cream hover:text-gold-light"
              )}
            >
              {/* RR-style wordplate: icon + MENU/CLOSE.
                 The icon is RR's own "menu-burger-icon w/ hover" Lottie (16×16):
                 hovering plays its shine (frames 0→30), opening morphs it to ✕. */}
              <span className="rr-menu-icon" aria-hidden ref={menuIconRef} />
              {/* Constant-width wordplate (phantom "Close" reserves the width like RR) */}
              <span className="relative inline-flex items-center">
                <span aria-hidden className="invisible whitespace-nowrap">
                  Close
                </span>
                <span
                  className={cn(
                    "absolute left-0 top-0 whitespace-nowrap transition-opacity duration-300",
                    sliderOpen ? "opacity-0" : "opacity-100"
                  )}
                >
                  Menu
                </span>
                <span
                  className={cn(
                    "absolute left-0 top-0 whitespace-nowrap transition-opacity duration-300",
                    sliderOpen ? "opacity-100" : "opacity-0"
                  )}
                >
                  Close
                </span>
              </span>
            </button>
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

      {/* Sliding sidebar — full height, paints above the navbar/header; on mobile
          it also covers the bottom tab bar (panel z-55 over scrim z-54 over both) */}
      <AnimatePresence>
        {sliderOpen && (
          <>
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5, delay: earlyExitRowDelay } }}
              transition={{ duration: 0.5 }}
              onClick={() => setSliderOpen(false)}
              className="fixed inset-0 z-[54] bg-black/25"
            />
            <motion.aside
              ref={sliderPanelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { duration: 0.7, ease: EASE } }}
              exit={{
                x: "100%",
                transition: { duration: 0.7, ease: EASE, delay: earlyExitRowDelay },
              }}
              style={{ willChange: "transform" }}
              className={cn(
                "fixed inset-y-0 right-0 z-[55] flex w-[440px] max-w-[92vw] flex-col border-l backdrop-blur-2xl",
                lightNav
                  ? "border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),-24px_0_60px_rgba(0,0,0,0.12)]"
                  : "border-gold/15 bg-onyx/55 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),-24px_0_60px_rgba(0,0,0,0.4)]"
              )}
            >
              <motion.nav className="flex-1 overflow-y-auto overscroll-contain px-10 pb-12 pt-[96px]">
                {navRows.map((row, i) => {
                  const delay = (navRows.length - 1 - i) * 0.1;
                  const exitDelay = i * 0.1;
                  if (row.kind === "divider") {
                    return <SlideDivider key={row.key} lightNav={lightNav} delay={delay} exitDelay={exitDelay} />;
                  }
                  return (
                    <SlideRow
                      key={row.key}
                      label={row.label}
                      hint={row.hint}
                      danger={row.danger}
                      lightNav={lightNav}
                      delay={delay}
                      exitDelay={exitDelay}
                      onClick={row.onClick}
                      onAction={row.onAction}
                    />
                  );
                })}
              </motion.nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom tab bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-none border-t border-x-0 border-b-0 backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] lg:hidden",
          sliderOpen && "hidden",
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
  exitDelay = 0,
}: {
  lightNav?: boolean;
  delay?: number;
  exitDelay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{
        opacity: 1,
        x: "0%",
        transition: { duration: 0.9, ease: RR_EASE, delay },
      }}
      exit={{
        opacity: 0,
        x: "100%",
        transition: { duration: 0.9, ease: RR_EASE, delay: exitDelay },
      }}
      className={cn(
        "my-6 h-px bg-gradient-to-r",
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
  delay = 0,
  exitDelay = 0,
  onClick,
  onAction,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  lightNav?: boolean;
  delay?: number;
  exitDelay?: number;
  onClick?: () => void;
  onAction?: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: "100%" }}
      animate={{
        opacity: 1,
        x: "0%",
        transition: { duration: 0.9, ease: RR_EASE, delay },
      }}
      exit={{
        opacity: 0,
        x: "100%",
        transition: { duration: 0.9, ease: RR_EASE, delay: exitDelay },
      }}
      style={{ willChange: "opacity, transform" }}
      onClick={() => {
        onClick?.();
        onAction?.();
      }}
      className="group relative flex w-full items-baseline justify-between gap-6 py-4 text-left"
    >
      <span
        className={cn(
          "truncate font-display text-[15px] font-light uppercase leading-tight tracking-[0.18em] transition-colors duration-300 sm:text-[16px]",
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
