const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export function resolveImageUrl(src?: string | null): string {
  if (!src) return "";
  if (src.startsWith("//")) return src;
  if (src.startsWith(API_BASE)) return src.slice(API_BASE.length);
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src;
}