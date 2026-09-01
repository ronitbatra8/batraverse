export interface MediverseProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  category: string;
  sub: string;
  badge?: string;
  gradient: string;
  rating: number;
  reviews: number;
  unit: string;
  inStock: boolean;
  dbImages?: string[];
  seller?: { name: string; shopName?: string | null; email?: string } | null;
}

// Real products are fetched from the backend API. This static list is kept empty
// so Mediverse only ever surfaces database products.
export const MEDIVERSE_PRODUCTS: MediverseProduct[] = [];
