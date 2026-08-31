"use client";

import { getAuth } from "@/lib/authStorage";

export type Tab = "overview" | "orders" | "users" | "messages" | "security" | "analytics" | "newsletter" | "delivery" | "sellers" | "privateviewing" | "cards" | "violations" | "categories" | "productcatalog" | "sellerrequests" | "ads" | "wallet" | "featured";
export type UserDetailTab = "overview" | "orders" | "addresses" | "reviews" | "wishlist" | "messages" | "security";

export const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace("/api", "");

export const statusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  confirmed: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  packed: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  out_for_delivery: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
  return_requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  returned: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
};

export const msgStatusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "in-progress": "text-sky-400 bg-sky-500/10 border-sky-500/20",
  replied: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  resolved: "text-gold-400 bg-gold-500/10 border-gold-500/20",
};

export function adminHeaders(key?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (key) headers["x-admin-key"] = key;
  const token = getAuth("bt-token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
