import { Crown, Gem, Shield, ShieldCheck, Sparkles, Star, GemIcon, type LucideIcon } from "lucide-react";

export interface LevelMeta {
  name: string;
  icon: LucideIcon | null;
  grad: string;
  border: string;
  text: string;
  chip: string;
  badge: string;
  discount: number;
  freeDeliveries: number;
}

export const LEVELS: Record<string, LevelMeta> = {
  owner: {
    name: "OWNER",
    icon: GemIcon,
    grad: "from-rose-300/30 via-amber-200/15 to-rose-400/25",
    border: "border-l-rose-300",
    text: "text-rose-200",
    chip: "bg-rose-300/10 border border-rose-300/30 text-rose-200",
    badge: "bg-rose-300/15 border border-rose-300/30 text-rose-200",
    discount: 15,
    freeDeliveries: 15,
  },
  none: {
    name: "MEMBER",
    icon: null,
    grad: "from-gray-500/20 via-gray-600/10 to-gray-700/25",
    border: "border-l-gray-400",
    text: "text-gray-300",
    chip: "bg-gray-500/10 border border-gray-400/30 text-gray-300",
    badge: "bg-gray-500/15 border border-gray-400/30 text-gray-300",
    discount: 0,
    freeDeliveries: 0,
  },
  bronze: {
    name: "BRONZE",
    icon: Shield,
    grad: "from-amber-600/25 via-amber-700/15 to-amber-800/30",
    border: "border-l-amber-500",
    text: "text-amber-300",
    chip: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    badge: "bg-amber-500/15 border border-amber-500/30 text-amber-300",
    discount: 0,
    freeDeliveries: 1,
  },
  silver: {
    name: "SILVER",
    icon: ShieldCheck,
    grad: "from-slate-300/25 via-slate-400/15 to-slate-500/30",
    border: "border-l-slate-300/70",
    text: "text-slate-200",
    chip: "bg-slate-200/10 border border-slate-300/30 text-slate-200",
    badge: "bg-slate-300/15 border border-slate-300/30 text-slate-200",
    discount: 0,
    freeDeliveries: 2,
  },
  gold: {
    name: "GOLD",
    icon: Crown,
    grad: "from-gold-500/25 via-gold-400/15 to-gold-600/30",
    border: "border-l-gold-400",
    text: "text-gold-300",
    chip: "bg-gold-500/10 border border-gold-400/30 text-gold-300",
    badge: "bg-gold-500/15 border border-gold-400/30 text-gold-300",
    discount: 0,
    freeDeliveries: 5,
  },
  platinum: {
    name: "PLATINUM",
    icon: Sparkles,
    grad: "from-white/25 via-gray-100/15 to-gray-300/30",
    border: "border-l-gray-100",
    text: "text-gray-100",
    chip: "bg-white/10 border border-white/30 text-white",
    badge: "bg-white/15 border border-white/30 text-white",
    discount: 5,
    freeDeliveries: 7,
  },
  diamond: {
    name: "DIAMOND",
    icon: Gem,
    grad: "from-sky-300/25 via-cyan-300/15 to-sky-500/30",
    border: "border-l-sky-300",
    text: "text-sky-200",
    chip: "bg-sky-400/10 border border-sky-300/30 text-sky-200",
    badge: "bg-sky-300/15 border border-sky-300/30 text-sky-200",
    discount: 10,
    freeDeliveries: 10,
  },
  black: {
    name: "BLACK",
    icon: Star,
    grad: "from-black via-dark-900 to-black",
    border: "border-l-white/70",
    text: "text-white",
    chip: "bg-white/10 border border-white/25 text-white",
    badge: "bg-white/15 border border-white/30 text-white",
    discount: 15,
    freeDeliveries: 15,
  },
} as const;

export type LevelKey = keyof typeof LEVELS;

export const LEVEL_ORDER: LevelKey[] = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black", "owner"];

export const LEVEL_PREFIX: Record<string, string> = {
  none: "BV",
  bronze: "BZ",
  silver: "SV",
  gold: "GL",
  platinum: "PL",
  diamond: "DM",
  black: "BK",
  owner: "OW",
};

export function getUserLevel(orderCount: number): LevelKey {
  return "none";
}

export function getLevelFromBalance(balance: number): LevelKey {
  if (balance >= 30000) return "black";
  if (balance >= 15000) return "diamond";
  if (balance >= 5000) return "platinum";
  if (balance >= 1500) return "gold";
  if (balance >= 500) return "silver";
  if (balance >= 100) return "bronze";
  return "none";
}

/* An explicitly assigned card level is authoritative; otherwise the level is
   derived from the peak lifetime wallet balance. Mirrors the server rule. */
export function getEffectiveLevel(opts: {
  cardLevel?: string | null;
  peakWalletBalance?: number;
  walletBalance?: number;
}): LevelKey {
  const cl = opts?.cardLevel;
  if (cl && cl in LEVELS) return cl as LevelKey;
  return getLevelFromBalance(opts?.peakWalletBalance ?? opts?.walletBalance ?? 0);
}

export function getBalanceForNextLevel(currentLevel: LevelKey): number | null {
  const next: Record<string, number> = { none: 100, bronze: 500, silver: 1500, gold: 5000, platinum: 15000, diamond: 30000 };
  return next[currentLevel] ?? null;
}

export const LEVEL_BALANCE_THRESHOLD: Record<string, number> = {
  none: 0, bronze: 100, silver: 500, gold: 1500, platinum: 5000, diamond: 15000, black: 30000,
};

export function getLevelIndex(level: LevelKey): number {
  return LEVEL_ORDER.indexOf(level);
}

export function getDiscountPercent(level: LevelKey): number {
  return LEVELS[level]?.discount ?? 0;
}

export function getFreeDeliveries(level: LevelKey): number {
  return LEVELS[level]?.freeDeliveries ?? 0;
}
