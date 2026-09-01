const SLIM = new Map<string, unknown>();
const FULL = new Map<string, { product: unknown; related: unknown[] }>();
const WARMED = new Set<string>();

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");

export function seedSlimProduct<T>(id: string, product: T): void {
  SLIM.set(id, product);
}

export function getSlimProduct<T>(id: string): T | undefined {
  return SLIM.get(id) as T | undefined;
}

export function seedFullProduct(rawId: string, product: unknown, related: unknown[]): void {
  FULL.set(rawId, { product, related });
}

export function getFullProduct(rawId: string): { product: unknown; related: unknown[] } | undefined {
  return FULL.get(rawId);
}

export function warmProduct(id: string): void {
  const rawId = id.replace(/^db-/, "");
  if (WARMED.has(rawId) || FULL.has(rawId)) return;
  WARMED.add(rawId);
  fetch(`${API_BASE}/api/products/${rawId}?related=true`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && data.product) seedFullProduct(rawId, data.product, data.related || []);
    })
    .catch(() => {
      /* ignore */
    });
}