export interface MartProduct {
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

export const MART_PRODUCTS: MartProduct[] = [
  { id: "m1", name: "Banana (1 dozen)", brand: "Fresh Farm", price: 1.99, category: "fruits", sub: "fruits", gradient: "bg-gradient-to-br from-yellow-400 to-green-500", rating: 4.5, reviews: 312, unit: "1 dozen", inStock: true },
  { id: "m2", name: "Apple - Shimla (1kg)", brand: "Hill Fresh", price: 3.49, originalPrice: 4.29, category: "fruits", sub: "fruits", gradient: "bg-gradient-to-br from-red-400 to-red-600", rating: 4.3, reviews: 218, unit: "1 kg", inStock: true },
  { id: "m3", name: "Orange - Nagpur (1kg)", brand: "Fresh Farm", price: 2.99, category: "fruits", sub: "fruits", gradient: "bg-gradient-to-br from-orange-400 to-orange-600", rating: 4.4, reviews: 189, unit: "1 kg", inStock: true },
  { id: "m4", name: "Onion (1kg)", brand: "Fresh Farm", price: 1.49, category: "fruits", sub: "veggies", gradient: "bg-gradient-to-br from-purple-400 to-red-400", rating: 4.2, reviews: 267, unit: "1 kg", inStock: true },
  { id: "m5", name: "Tomato (1kg)", brand: "Fresh Farm", price: 1.79, category: "fruits", sub: "veggies", gradient: "bg-gradient-to-br from-red-400 to-rose-500", rating: 4.3, reviews: 201, unit: "1 kg", inStock: true },
  { id: "m6", name: "Potato (1kg)", brand: "Fresh Farm", price: 1.29, category: "fruits", sub: "veggies", gradient: "bg-gradient-to-br from-yellow-600 to-amber-700", rating: 4.1, reviews: 345, unit: "1 kg", inStock: true },

  { id: "m7", name: "Amul Butter (100g)", brand: "Amul", price: 2.49, category: "dairy", sub: "butter", gradient: "bg-gradient-to-br from-yellow-200 to-yellow-400", rating: 4.6, reviews: 521, unit: "100 g", inStock: true },
  { id: "m8", name: "Amul Gold Milk (500ml)", brand: "Amul", price: 1.29, category: "dairy", sub: "milk", gradient: "bg-gradient-to-br from-blue-100 to-white", rating: 4.5, reviews: 834, unit: "500 ml", inStock: true },
  { id: "m9", name: "Paneer (200g)", brand: "Amul", price: 3.99, originalPrice: 4.49, category: "dairy", sub: "paneer", gradient: "bg-gradient-to-br from-white to-cream", rating: 4.4, reviews: 412, unit: "200 g", badge: "11% OFF", inStock: true },
  { id: "m10", name: "Brown Bread (400g)", brand: "Britannia", price: 1.49, category: "dairy", sub: "bread", gradient: "bg-gradient-to-br from-amber-600 to-amber-800", rating: 4.3, reviews: 623, unit: "400 g", inStock: true },
  { id: "m11", name: "Curd (400g)", brand: "Amul", price: 0.99, category: "dairy", sub: "curd", gradient: "bg-gradient-to-br from-white to-blue-50", rating: 4.5, reviews: 389, unit: "400 g", inStock: true },
  { id: "m12", name: "Cheese Slices (200g)", brand: "Amul", price: 4.49, category: "dairy", sub: "cheese", gradient: "bg-gradient-to-br from-yellow-300 to-yellow-500", rating: 4.6, reviews: 298, unit: "200 g", inStock: true },

  { id: "m13", name: "Lays Classic Salted (52g)", brand: "Lays", price: 0.99, category: "snacks", sub: "chips", gradient: "bg-gradient-to-br from-yellow-400 to-red-400", rating: 4.3, reviews: 1203, unit: "52 g", inStock: true },
  { id: "m14", name: "Kurkure Masala (90g)", brand: "Kurkure", price: 1.49, category: "snacks", sub: "chips", gradient: "bg-gradient-to-br from-orange-500 to-red-500", rating: 4.4, reviews: 876, unit: "90 g", inStock: true },
  { id: "m15", name: "Oreo Biscuits (120g)", brand: "Britannia", price: 1.29, category: "snacks", sub: "biscuits", gradient: "bg-gradient-to-br from-blue-900 to-zinc-900", rating: 4.5, reviews: 1456, unit: "120 g", inStock: true },
  { id: "m16", name: "Dark Fantasy (75g)", brand: "Sunfeast", price: 2.49, category: "snacks", sub: "biscuits", gradient: "bg-gradient-to-br from-amber-800 to-zinc-900", rating: 4.6, reviews: 654, unit: "75 g", badge: "BESTSELLER", inStock: true },
  { id: "m17", name: "Namkeen Mixture (200g)", brand: "Haldiram", price: 2.99, category: "snacks", sub: "namkeen", gradient: "bg-gradient-to-br from-amber-400 to-orange-600", rating: 4.4, reviews: 432, unit: "200 g", inStock: true },
  { id: "m18", name: "Cashews (100g)", brand: "Tata Sampann", price: 4.99, originalPrice: 5.99, category: "snacks", sub: "dryfruits", gradient: "bg-gradient-to-br from-amber-300 to-amber-600", rating: 4.7, reviews: 321, unit: "100 g", badge: "17% OFF", inStock: true },

  { id: "m19", name: "Coca-Cola (300ml)", brand: "Coca-Cola", price: 0.79, category: "beverages", sub: "cold", gradient: "bg-gradient-to-br from-red-600 to-red-800", rating: 4.4, reviews: 2341, unit: "300 ml", inStock: true },
  { id: "m20", name: "Minute Maid (1L)", brand: "Minute Maid", price: 1.99, category: "beverages", sub: "juice", gradient: "bg-gradient-to-br from-orange-400 to-amber-500", rating: 4.3, reviews: 876, unit: "1 L", inStock: true },
  { id: "m21", name: "Sting Energy (250ml)", brand: "PepsiCo", price: 0.69, category: "beverages", sub: "cold", gradient: "bg-gradient-to-br from-pink-500 to-red-500", rating: 4.2, reviews: 543, unit: "250 ml", inStock: true },
  { id: "m22", name: "Bisleri Water (1L)", brand: "Bisleri", price: 0.39, category: "beverages", sub: "water", gradient: "bg-gradient-to-br from-cyan-300 to-blue-400", rating: 4.1, reviews: 4532, unit: "1 L", inStock: true },
  { id: "m23", name: "Brooke Bond Red Label (250g)", brand: "HUL", price: 3.29, category: "beverages", sub: "tea", gradient: "bg-gradient-to-br from-red-700 to-amber-900", rating: 4.5, reviews: 1023, unit: "250 g", inStock: true },
  { id: "m24", name: "Nescafe Classic (50g)", brand: "Nestle", price: 4.49, category: "beverages", sub: "coffee", gradient: "bg-gradient-to-br from-amber-800 to-red-900", rating: 4.6, reviews: 876, unit: "50 g", inStock: true },

  { id: "m25", name: "Maggi Noodles (70g)", brand: "Nestle", price: 0.59, category: "instant", sub: "noodles", gradient: "bg-gradient-to-br from-yellow-400 to-red-500", rating: 4.7, reviews: 5432, unit: "70 g", badge: "#1", inStock: true },
  { id: "m26", name: "Yippee Noodles (60g)", brand: "ITC", price: 0.55, category: "instant", sub: "noodles", gradient: "bg-gradient-to-br from-orange-400 to-red-400", rating: 4.4, reviews: 2345, unit: "60 g", inStock: true },
  { id: "m27", name: "Poha Mix (200g)", brand: "MTR", price: 2.49, category: "instant", sub: "ready", gradient: "bg-gradient-to-br from-amber-300 to-yellow-500", rating: 4.2, reviews: 345, unit: "200 g", inStock: true },
  { id: "m28", name: "Ready-to-Eat Rajma (300g)", brand: "MTR", price: 3.49, originalPrice: 4.29, category: "instant", sub: "ready", gradient: "bg-gradient-to-br from-red-500 to-amber-600", rating: 4.3, reviews: 234, unit: "300 g", badge: "19% OFF", inStock: true },
  { id: "m29", name: "Saffola Oats (1kg)", brand: "Saffola", price: 3.99, category: "instant", sub: "cereals", gradient: "bg-gradient-to-br from-green-400 to-lime-500", rating: 4.4, reviews: 567, unit: "1 kg", inStock: true },
  { id: "m30", name: "Corn Flakes (500g)", brand: "Kellogg's", price: 4.29, category: "instant", sub: "cereals", gradient: "bg-gradient-to-br from-yellow-300 to-amber-400", rating: 4.3, reviews: 432, unit: "500 g", inStock: true },

  { id: "m31", name: "Colgate MaxFresh (150g)", brand: "Colgate", price: 2.99, category: "personal", sub: "oral", gradient: "bg-gradient-to-br from-red-500 to-blue-500", rating: 4.5, reviews: 1234, unit: "150 g", inStock: true },
  { id: "m32", name: "Head & Shoulders (180ml)", brand: "P&G", price: 3.49, category: "personal", sub: "hair", gradient: "bg-gradient-to-br from-blue-400 to-blue-600", rating: 4.4, reviews: 876, unit: "180 ml", inStock: true },
  { id: "m33", name: "Dettol Soap (75g x 4)", brand: "Dettol", price: 3.99, originalPrice: 4.99, category: "personal", sub: "bath", gradient: "bg-gradient-to-br from-green-500 to-emerald-600", rating: 4.6, reviews: 1567, unit: "300 g", badge: "20% OFF", inStock: true },
  { id: "m34", name: "Vim Dishwash (500ml)", brand: "HUL", price: 1.49, category: "personal", sub: "cleaning", gradient: "bg-gradient-to-br from-yellow-300 to-green-400", rating: 4.3, reviews: 654, unit: "500 ml", inStock: true },
  { id: "m35", name: "Nivea Body Lotion (200ml)", brand: "Nivea", price: 4.49, category: "personal", sub: "skincare", gradient: "bg-gradient-to-br from-blue-300 to-blue-500", rating: 4.5, reviews: 543, unit: "200 ml", inStock: true },
  { id: "m36", name: "Wild Stone Deo (150ml)", brand: "Wild Stone", price: 3.29, category: "personal", sub: "fragrance", gradient: "bg-gradient-to-br from-zinc-700 to-zinc-900", rating: 4.2, reviews: 432, unit: "150 ml", inStock: true },

  { id: "m37", name: "Surf Excel (500g)", brand: "HUL", price: 3.99, category: "cleaning", sub: "laundry", gradient: "bg-gradient-to-br from-blue-500 to-cyan-400", rating: 4.5, reviews: 1023, unit: "500 g", inStock: true },
  { id: "m38", name: "Harpic Power Plus (500ml)", brand: "RB", price: 2.49, category: "cleaning", sub: "bathroom", gradient: "bg-gradient-to-br from-blue-600 to-blue-800", rating: 4.3, reviews: 654, unit: "500 ml", inStock: true },
  { id: "m39", name: "Lizol Floor Cleaner (500ml)", brand: "RB", price: 2.99, category: "cleaning", sub: "floor", gradient: "bg-gradient-to-br from-purple-400 to-pink-400", rating: 4.4, reviews: 543, unit: "500 ml", inStock: true },
  { id: "m40", name: "Good Day Biscuits (75g)", brand: "Britannia", price: 1.29, category: "bakery", sub: "cookies", gradient: "bg-gradient-to-br from-amber-400 to-yellow-500", rating: 4.3, reviews: 1234, unit: "75 g", inStock: true },
  { id: "m41", name: "Marie Gold (250g)", brand: "Britannia", price: 1.49, category: "bakery", sub: "cookies", gradient: "bg-gradient-to-br from-amber-600 to-orange-500", rating: 4.4, reviews: 2345, unit: "250 g", inStock: true },
  { id: "m42", name: "Bread (400g)", brand: "Modern", price: 0.99, category: "bakery", sub: "bread", gradient: "bg-gradient-to-br from-amber-200 to-amber-400", rating: 4.2, reviews: 3456, unit: "400 g", inStock: true },
];

export function getMartProduct(id: string): MartProduct | undefined {
  return MART_PRODUCTS.find((p) => p.id === id);
}
