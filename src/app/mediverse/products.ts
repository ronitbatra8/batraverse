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

export const MEDIVERSE_PRODUCTS: MediverseProduct[] = [
  { id: "mv1", name: "Vitamin D3 60K IU", brand: "HealthKart", price: 8.99, category: "wellness", sub: "vitamins", gradient: "bg-gradient-to-br from-yellow-400 to-amber-500", rating: 4.7, reviews: 1234, unit: "60 tablets", inStock: true },
  { id: "mv2", name: "Omega-3 Fish Oil", brand: "Nature Made", price: 12.49, originalPrice: 14.99, category: "wellness", sub: "supplements", gradient: "bg-gradient-to-br from-blue-400 to-cyan-500", rating: 4.6, reviews: 876, unit: "120 softgels", badge: "17% OFF", inStock: true },
  { id: "mv3", name: "Probiotic 50 Billion", brand: "Garden of Life", price: 24.99, category: "wellness", sub: "probiotics", gradient: "bg-gradient-to-br from-green-400 to-emerald-500", rating: 4.8, reviews: 567, unit: "30 capsules", inStock: true },
  { id: "mv4", name: "Whey Protein Isolate", brand: "Optimum Nutrition", price: 34.99, category: "fitness", sub: "protein", gradient: "bg-gradient-to-br from-red-500 to-orange-500", rating: 4.7, reviews: 2345, unit: "2 lb", badge: "BESTSELLER", inStock: true },
  { id: "mv5", name: "BCAA Amino Powder", brand: "MuscleBlaze", price: 18.99, category: "fitness", sub: "amino", gradient: "bg-gradient-to-br from-purple-500 to-pink-500", rating: 4.5, reviews: 654, unit: "300 g", inStock: true },
  { id: "mv6", name: "Creatine Monohydrate", brand: "Myprotein", price: 14.99, category: "fitness", sub: "performance", gradient: "bg-gradient-to-br from-gray-600 to-gray-800", rating: 4.6, reviews: 1890, unit: "500 g", inStock: true },
  { id: "mv7", name: "Digital Thermometer", brand: "Omron", price: 9.99, category: "healthcare", sub: "diagnostics", gradient: "bg-gradient-to-br from-cyan-400 to-blue-500", rating: 4.4, reviews: 3456, unit: "1 piece", inStock: true },
  { id: "mv8", name: "Blood Pressure Monitor", brand: "Omron", price: 49.99, originalPrice: 59.99, category: "healthcare", sub: "diagnostics", gradient: "bg-gradient-to-br from-blue-500 to-indigo-600", rating: 4.7, reviews: 876, unit: "1 unit", badge: "17% OFF", inStock: true },
  { id: "mv9", name: "Pulse Oximeter", brand: "Beurer", price: 29.99, category: "healthcare", sub: "monitoring", gradient: "bg-gradient-to-br from-teal-400 to-cyan-500", rating: 4.5, reviews: 543, unit: "1 unit", inStock: true },
  { id: "mv10", name: "Multivitamin Gummies", brand: "Goli", price: 19.99, category: "nutrition", sub: "vitamins", gradient: "bg-gradient-to-br from-pink-400 to-rose-500", rating: 4.6, reviews: 3456, unit: "60 gummies", inStock: true },
  { id: "mv11", name: "Plant Protein Powder", brand: "Oats & Pea", price: 28.99, category: "nutrition", sub: "protein", gradient: "bg-gradient-to-br from-green-500 to-lime-500", rating: 4.4, reviews: 234, unit: "1 kg", inStock: true },
  { id: "mv12", name: "Collagen Peptides", brand: "Vital Proteins", price: 22.99, category: "nutrition", sub: "collagen", gradient: "bg-gradient-to-br from-amber-300 to-orange-400", rating: 4.7, reviews: 1567, unit: "284 g", inStock: true },
  { id: "mv13", name: "Matte Sunscreen SPF 50", brand: "La Roche-Posay", price: 16.99, category: "beauty", sub: "skincare", gradient: "bg-gradient-to-br from-yellow-300 to-orange-300", rating: 4.8, reviews: 2345, unit: "50 ml", inStock: true },
  { id: "mv14", name: "Vitamin C Serum", brand: "SkinCeuticals", price: 42.99, category: "beauty", sub: "skincare", gradient: "bg-gradient-to-br from-orange-400 to-yellow-400", rating: 4.9, reviews: 876, unit: "30 ml", badge: "PREMIUM", inStock: true },
  { id: "mv15", name: "Retinol Night Cream", brand: "Neutrogena", price: 14.99, category: "beauty", sub: "skincare", gradient: "bg-gradient-to-br from-purple-400 to-indigo-500", rating: 4.5, reviews: 1234, unit: "50 g", inStock: true },
  { id: "mv16", name: "Melatonin 5mg", brand: "Nature's Way", price: 7.99, category: "sleep", sub: "supplements", gradient: "bg-gradient-to-br from-indigo-400 to-purple-600", rating: 4.4, reviews: 3456, unit: "60 tablets", inStock: true },
  { id: "mv17", name: "Weighted Blanket", brand: "Gravity", price: 49.99, originalPrice: 69.99, category: "sleep", sub: "blankets", gradient: "bg-gradient-to-br from-slate-400 to-slate-600", rating: 4.6, reviews: 543, unit: "15 lbs", badge: "29% OFF", inStock: true },
  { id: "mv18", name: "White Noise Machine", brand: "Hatch", price: 39.99, category: "sleep", sub: "machines", gradient: "bg-gradient-to-br from-gray-300 to-gray-500", rating: 4.7, reviews: 876, unit: "1 unit", inStock: true },
];
