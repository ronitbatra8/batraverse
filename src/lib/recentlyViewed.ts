import type { ShelfItem } from "@/components/home/ProductShelf";

const STORAGE_KEY = "bt-recently-viewed";
const MAX_ITEMS = 8;

export interface RecentItem {
  id: string;
  name: string;
  category: string;
  price: string;
  compareAt?: string;
  img: string;
  href: string;
}

export function trackRecentlyViewed(item: RecentItem) {
  if (typeof window === "undefined") return;
  if (!item.href || !item.id) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter((i) => i.href !== item.href);
    filtered.unshift(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}

export function getRecentlyViewed(): ShelfItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const seen = new Set<string>();
    return items
      .filter((i) => {
        if (!i.href || !i.img || seen.has(i.href)) return false;
        seen.add(i.href);
        return true;
      })
      .map((i) => ({
        name: i.name,
        category: i.category,
        price: i.price,
        compareAt: i.compareAt,
        img: i.img,
        href: i.href,
      }));
  } catch {
    return [];
  }
}
