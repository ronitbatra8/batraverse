export interface ColorVariant {
  name: string;
  value: string;
  colors?: string[];
  images?: string[];
  specifications?: { label: string; value: string }[];
  keyFeatures?: string[];
  price?: number;
  originalPrice?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  sub: string;
  badge?: string;
  gradient: string;
  rating: number;
  reviews: number;
  description: string;
  features: string[];
  colors: ColorVariant[];
  sizes?: string[];
  sizeOptions?: Record<string, { name: string; price?: number; originalPrice?: number }[]>;
  specs?: { label: string; value: string }[];
  sku: string;
  inStock: boolean;
  dbImages?: string[];
  brand?: string;
  unit?: string;
  source?: "store" | "mart";
  seller?: { name: string; shopName?: string | null; email?: string } | null;
}

// Real products are fetched from the backend API. This static list is kept empty
// so the storefront only ever surfaces database products.
export const PRODUCTS: Product[] = [];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((pr) => pr.id === id);
}

export function getRelated(product: Product, limit = 4): Product[] {
  return PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, limit);
}
