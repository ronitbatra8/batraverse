"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useScroll,
} from "framer-motion";
import {
  Eye,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sun,
  User as UserIcon,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Wallet,
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

export default function Navbar() {
  const phase = useBootPhase();
  const boot = useBoot();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout, accounts, currentIndex, switchAccount, removeAccount } = useAuth();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const walletBalance = user?.walletBalance ?? 0;
  const levelKey = getLevelFromBalance(user?.peakWalletBalance ?? walletBalance);
  const levelMeta = LEVELS[levelKey];
  const LevelIcon = levelMeta.icon;
  const dash = roleDashboard(user?.role);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

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
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Lock body scroll while the mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Close the shop dropdown on outside click or Escape */
  useEffect(() => {
    if (!shopOpen) return;
    const onDown = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
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
                ? "mx-3 mt-3 rounded-2xl border border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:mx-6"
                : "mx-3 mt-3 rounded-2xl bg-onyx/70 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:mx-6"
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
                  "hidden items-center gap-2 rounded-full border px-3.5 py-2 transition-all duration-300 sm:inline-flex",
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
                    "max-w-24 truncate text-[10px] font-semibold uppercase tracking-[0.2em]",
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
                className="hidden items-center rounded-full bg-rose-500 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-abyss transition-all duration-300 hover:bg-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.45)] sm:inline-flex"
              >
                Sign In
              </Link>
            )}

            {/* Expandable shop dropdown — cart, wishlist, account */}
            <div ref={shopRef} className="relative z-10 hidden sm:block">
              <button
                type="button"
                onClick={() => setShopOpen((o) => !o)}
                aria-expanded={shopOpen}
                aria-haspopup="true"
                aria-label="Menu options"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center transition-all duration-300 hover:scale-110",
                  lightNav
                    ? "text-onyx hover:text-sapphire hover:drop-shadow-[0_0_10px_rgba(30,58,138,0.45)]"
                    : "text-cream-dim hover:text-gold-light",
                  shopOpen &&
                    (lightNav
                      ? "text-sapphire drop-shadow-[0_0_10px_rgba(30,58,138,0.45)]"
                      : "text-gold-light")
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {shopOpen ? (
                    <motion.span
                      key="x"
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      <X size={18} strokeWidth={1.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      <Menu size={18} strokeWidth={1.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence mode="popLayout">
                {shopOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.35, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.4, filter: "blur(6px)" }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 24,
                      mass: 0.85,
                    }}
                    style={{ transformOrigin: "top right" }}
                    className={cn(
                      "absolute right-0 top-0.5 w-56 overflow-hidden rounded-2xl border p-2 backdrop-blur-2xl",
                      lightNav
                        ? "border-black/10 bg-white/95 shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
                        : "border-gold/15 bg-onyx/95 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
                    )}
                  >
                    {/* soft accent lighting — sapphire in light mode, gold in dark */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
                      style={{
                        background: lightNav
                          ? "radial-gradient(closest-side, rgba(30,58,138,0.16), transparent)"
                          : "radial-gradient(closest-side, rgba(212,175,55,0.25), transparent)",
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full blur-3xl"
                      style={{
                        background: lightNav
                          ? "radial-gradient(closest-side, rgba(30,58,138,0.08), transparent)"
                          : "radial-gradient(closest-side, rgba(212,175,55,0.1), transparent)",
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-px"
                      style={{
                        background: lightNav
                          ? "linear-gradient(90deg, transparent, rgba(30,58,138,0.4), transparent)"
                          : "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)",
                      }}
                    />

                    {/* Close — pinned to the very top */}
                    <button
                      type="button"
                      onClick={() => setShopOpen(false)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-300",
                        lightNav
                          ? "border-rose-500/25 hover:border-rose-500/50 hover:bg-rose-500/5"
                          : "border-rose-400/25 hover:border-rose-400/50 hover:bg-rose-400/5"
                      )}
                    >
                      <span
                        className={cn(
                          "transition-colors duration-300",
                          lightNav ? "text-rose-500 group-hover:text-rose-600" : "text-rose-300/80 group-hover:text-rose-200"
                        )}
                      >
                        <X size={15} strokeWidth={1.5} />
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-[0.28em]",
                          lightNav ? "text-rose-600/90" : "text-rose-200/90"
                        )}
                      >
                        Close
                      </span>
                    </button>

                    <div
                      className={cn("mx-3.5 my-1.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                    />

                    {/* Scrollable list */}
                    <div className="max-h-80 overflow-y-auto">
                      <ShopRow
                        icon={<ShoppingBag size={15} strokeWidth={1.5} />}
                        label="Cart"
                        count={totalItems}
                        light={lightNav}
                        onClick={() => {
                          setShopOpen(false);
                          router.push("/cart");
                        }}
                      />
                      <div
                        className={cn("mx-3.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                      />
                      <ShopRow
                        icon={<Heart size={15} strokeWidth={1.5} />}
                        label="Wishlist"
                        count={wishlistCount}
                        light={lightNav}
                        onClick={() => {
                          setShopOpen(false);
                          router.push("/wishlist");
                        }}
                      />
                      {dash && (
                        <>
                          <div
                            className={cn("mx-3.5 my-1.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                          />
                          <ShopRow
                            icon={<LayoutDashboard size={15} strokeWidth={1.5} />}
                            label={dash.label}
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push(dash.href);
                            }}
                          />
                        </>
                      )}
                      {user && (
                        <>
                          <div
                            className={cn("mx-3.5 my-1.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                          />
                          <ShopRow
                            icon={<UserIcon size={15} strokeWidth={1.5} />}
                            label="My Account"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/account");
                            }}
                          />
                          <ShopRow
                            icon={<Wallet size={15} strokeWidth={1.5} />}
                            label={`Wallet · ₹${(user?.walletBalance ?? 0).toFixed(0)}`}
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/wallet");
                            }}
                          />
                          <ShopRow
                            icon={<Package size={15} strokeWidth={1.5} />}
                            label="My Orders"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/orders");
                            }}
                          />
                          <ShopRow
                            icon={<MessageSquare size={15} strokeWidth={1.5} />}
                            label="My Queries"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/queries");
                            }}
                          />
                          <ShopRow
                            icon={<Eye size={15} strokeWidth={1.5} />}
                            label="Private Viewing"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/private-viewing");
                            }}
                          />
                          <div
                            className={cn("mx-3.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                          />
                          <ShopRow
                            icon={<LogOut size={15} strokeWidth={1.5} />}
                            label="Sign Out"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              logout();
                              router.push("/");
                            }}
                          />
                          {accounts.length > 1 && (
                            <>
                              <div
                                className={cn("mx-3.5 my-1.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                              />
                              <div className="px-3.5 pt-2 pb-1">
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-[0.3em]",
                                    lightNav ? "text-onyx/40" : "text-cream-dim/40"
                                  )}
                                >
                                  Accounts
                                </span>
                              </div>
                              {accounts.map((acc, i) => (
                                <div key={acc.user.id} className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShopOpen(false);
                                      switchAccount(i);
                                    }}
                                    className={cn(
                                      "group flex flex-1 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors duration-300",
                                      i === currentIndex
                                        ? lightNav
                                          ? "bg-sapphire/10"
                                          : "bg-gold/10"
                                        : lightNav
                                          ? "hover:bg-black/5"
                                          : "hover:bg-white/5"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                                        i === currentIndex
                                          ? lightNav
                                            ? "bg-sapphire text-white"
                                            : "bg-gold text-abyss"
                                          : lightNav
                                            ? "bg-dark-200 text-dark-600"
                                            : "bg-white/10 text-cream-dim"
                                      )}
                                    >
                                      {acc.user.name?.charAt(0)?.toUpperCase() || "?"}
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                      <span
                                        className={cn(
                                          "text-[10px] font-medium uppercase tracking-[0.2em] truncate",
                                          i === currentIndex
                                            ? lightNav
                                              ? "text-sapphire"
                                              : "text-gold-light"
                                            : lightNav
                                              ? "text-onyx"
                                              : "text-cream"
                                        )}
                                      >
                                        {acc.user.name?.split(" ")[0] || "Account"}
                                      </span>
                                      {acc.user.cardNumber && (
                                        <span
                                          className={cn(
                                            "text-[8px] tracking-[0.15em] truncate",
                                            lightNav ? "text-onyx/40" : "text-cream-dim/40"
                                          )}
                                        >
                                          {acc.user.cardNumber}
                                        </span>
                                      )}
                                    </span>
                                    {i === currentIndex && (
                                      <Check size={14} strokeWidth={2} className={cn("ml-auto shrink-0", lightNav ? "text-sapphire" : "text-gold-light")} />
                                    )}
                                  </button>
                                  {i !== currentIndex && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        removeAccount(i);
                                      }}
                                      className={cn(
                                        "mr-1 flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-300",
                                        lightNav
                                          ? "text-onyx/30 hover:text-rose-500 hover:bg-rose-500/10"
                                          : "text-cream-dim/30 hover:text-rose-300 hover:bg-rose-300/10"
                                      )}
                                      title="Remove account"
                                    >
                                      <X size={12} strokeWidth={1.5} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                          <div
                            className={cn("mx-3.5 my-1.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                          />
                          <ShopRow
                            icon={<UserPlus size={15} strokeWidth={1.5} />}
                            label="Add Account"
                            light={lightNav}
                            onClick={() => {
                              setShopOpen(false);
                              router.push("/login?add=1");
                            }}
                          />
                        </>
                      )}
                      <div
                        className={cn("mx-3.5 h-px", lightNav ? "bg-black/10" : "bg-white/5")}
                      />
                      <ShopRow
                        icon={
                          theme === "light" ? (
                            <Moon size={15} strokeWidth={1.5} />
                          ) : (
                            <Sun size={15} strokeWidth={1.5} />
                          )
                        }
                        label={theme === "light" ? "Dark Mode" : "Light Mode"}
                        light={lightNav}
                        onClick={() => {
                          setShopOpen(false);
                          toggle();
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <IconBtn
              label="Menu"
              className="lg:hidden"
              lightNav={lightNav}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} strokeWidth={1.5} />
            </IconBtn>
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

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            className={cn(
              "fixed inset-0 z-[90] flex flex-col backdrop-blur-2xl lg:hidden",
              lightNav ? "bg-white/95" : "bg-abyss/95"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="flex items-center justify-between px-5 pt-6 sm:px-10">
              <span
                className={cn(
                  "font-display text-base font-light tracking-[0.3em]",
                  lightNav ? "text-onyx" : "text-cream"
                )}
              >
                BATRA <span className={cn("font-medium", lightNav ? "text-sapphire" : "text-gold-light")}>VERSE</span>
              </span>
              <IconBtn label="Close" onClick={() => setMenuOpen(false)} lightNav={lightNav}>
                <X size={20} strokeWidth={1.5} />
              </IconBtn>
            </div>

            <nav className="flex flex-1 flex-col items-center justify-center gap-8">
              {NAV_LINKS.map((l, i) => (
                <MotionLink
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "font-display text-3xl font-light tracking-[0.25em] transition-colors",
                    lightNav ? "text-onyx hover:text-sapphire" : "text-cream hover:text-gold-light"
                  )}
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1 + i * 0.07,
                    ease: EASE,
                  }}
                >
                  {l.label}
                </MotionLink>
              ))}

              <div className="flex flex-col items-center gap-5">
                {user ? (
                  <>
                    {dash && (
                      <MotionLink
                        href={dash.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "font-display text-2xl font-light tracking-[0.25em] transition-colors",
                          lightNav ? "text-sapphire hover:text-sapphire-light" : "text-gold-light hover:text-gold"
                        )}
                        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.7, delay: 0.1 + NAV_LINKS.length * 0.07, ease: EASE }}
                      >
                        {dash.label}
                      </MotionLink>
                    )}
                    <MotionLink
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "font-display text-2xl font-light tracking-[0.25em] transition-colors",
                        lightNav ? "text-sapphire hover:text-sapphire-light" : "text-gold-light hover:text-gold"
                      )}
                      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.1 + NAV_LINKS.length * 0.07, ease: EASE }}
                    >
                      My Account
                    </MotionLink>
                    <MotionLink
                      href="/wallet"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "font-display text-2xl font-light tracking-[0.25em] transition-colors",
                        lightNav ? "text-sapphire hover:text-sapphire-light" : "text-gold-light hover:text-gold"
                      )}
                      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.1 + NAV_LINKS.length * 0.07 + 0.07, ease: EASE }}
                    >
                      Wallet
                    </MotionLink>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        router.push("/");
                      }}
                      className={cn(
                        "font-display text-2xl font-light tracking-[0.25em] transition-colors",
                        lightNav ? "text-onyx/70 hover:text-rose-500" : "text-cream-dim hover:text-rose-300"
                      )}
                    >
                      Sign Out
                    </button>
                    {accounts.length > 1 && (
                      <div className="flex flex-col items-center gap-3 mt-2">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-[0.3em]",
                            lightNav ? "text-onyx/40" : "text-cream-dim/40"
                          )}
                        >
                          Switch Account
                        </span>
                        {accounts.map((acc, i) => (
                          <button
                            key={acc.user.id}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              switchAccount(i);
                            }}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-5 py-2 transition-all duration-300",
                              i === currentIndex
                                ? lightNav
                                  ? "bg-sapphire/15 text-sapphire"
                                  : "bg-gold/15 text-gold-light"
                                : lightNav
                                  ? "text-onyx/70 hover:text-sapphire hover:bg-black/5"
                                  : "text-cream-dim hover:text-gold-light hover:bg-white/5"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                                i === currentIndex
                                  ? lightNav
                                    ? "bg-sapphire text-white"
                                    : "bg-gold text-abyss"
                                  : lightNav
                                    ? "bg-dark-200 text-dark-600"
                                    : "bg-white/10 text-cream-dim"
                              )}
                            >
                              {acc.user.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                            <span className="flex flex-col text-left">
                              <span className="text-sm tracking-wider">{acc.user.name?.split(" ")[0]}</span>
                              {acc.user.cardNumber && (
                                <span className={cn("text-[9px] tracking-wider", lightNav ? "text-onyx/40" : "text-cream-dim/40")}>
                                  {acc.user.cardNumber}
                                </span>
                              )}
                            </span>
                            {i === currentIndex && (
                              <Check size={14} strokeWidth={2} className={cn("ml-2 shrink-0", lightNav ? "text-sapphire" : "text-gold-light")} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <MotionLink
                      href="/login?add=1"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "text-lg font-light tracking-[0.25em] transition-colors mt-2",
                        lightNav ? "text-onyx/50 hover:text-sapphire" : "text-cream-dim/50 hover:text-gold-light"
                      )}
                    >
                      Add Account
                    </MotionLink>
                  </>
                ) : (
                  <MotionLink
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-full px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-abyss transition-all duration-500",
                      lightNav
                        ? "bg-sapphire hover:shadow-[0_0_40px_rgba(30,58,138,0.45)]"
                        : "bg-gold hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
                    )}
                    initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.7, delay: 0.1 + NAV_LINKS.length * 0.07, ease: EASE }}
                  >
                    Sign In
                  </MotionLink>
                )}
              </div>
            </nav>

            <p
              className={cn(
                "pb-10 text-center text-[9px] uppercase tracking-[0.5em]",
                lightNav ? "text-onyx/40" : "text-cream-dim/50"
              )}
            >
              Batra Verse · MMXXVI
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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

function ShopRow({
  icon,
  label,
  count,
  light = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  light?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-300",
        light ? "hover:bg-black/5" : "hover:bg-white/5"
      )}
    >
      <span
        className={cn(
          "transition-colors duration-300",
          light ? "text-onyx/60 group-hover:text-sapphire" : "text-cream-dim group-hover:text-gold-light"
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium uppercase tracking-[0.28em]",
          light ? "text-onyx" : "text-cream"
        )}
      >
        {label}
      </span>
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[9px] font-semibold",
            light
              ? "border-sapphire/25 bg-sapphire/10 text-sapphire"
              : "border-gold/20 bg-gold/10 text-gold-light"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
