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
  seller?: { name: string; shopName?: string | null; email?: string } | null;
}

const C = {
  watches: [
    { name: "Black", value: "#18181b" },
    { name: "Silver", value: "#a1a1aa" },
    { name: "Gold", value: "#d4af37" },
  ],
  fashion: [
    { name: "Black", value: "#18181b" },
    { name: "White", value: "#f5f5f5" },
    { name: "Navy", value: "#1e3a5f" },
  ],
  accessories: [
    { name: "Black", value: "#18181b" },
    { name: "Brown", value: "#78350f" },
    { name: "Tan", value: "#d6b48a" },
  ],
  footwear: [
    { name: "Black", value: "#18181b" },
    { name: "White", value: "#f5f5f5" },
    { name: "Grey", value: "#71717a" },
  ],
  tech: [
    { name: "Black", value: "#18181b" },
    { name: "Silver", value: "#a1a1aa" },
    { name: "Midnight", value: "#1e1b4b" },
  ],
  lifestyle: [
    { name: "Black", value: "#18181b" },
    { name: "Ivory", value: "#faf8f2" },
    { name: "Amber", value: "#92400e" },
  ],
  limited: [
    { name: "Noir", value: "#09090b" },
    { name: "Gold", value: "#d4af37" },
  ],
};

const FASHION_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const FOOTWEAR_SIZES = ["7", "8", "9", "10", "11", "12", "13"];

export const PRODUCTS: Product[] = [
  // ── Watches ──
  { id: "w1", name: "Chrono X Pro", price: 499, category: "watches", sub: "smart", badge: "New", gradient: "from-zinc-800 to-zinc-950", rating: 4.8, reviews: 342, description: "Advanced smartwatch with titanium case, AMOLED display, and 14-day battery life. Built for performance with GPS, heart-rate tracking, and 100m water resistance.", features: ["AMOLED 1.4\" Display", "Titanium Case", "14-Day Battery", "GPS + GLONASS", "100m Water Resistant", "SpO2 Monitor"], colors: C.watches, sku: "BV-WT-CHRONO", inStock: true },
  { id: "w2", name: "Pulse Ultra", price: 329, category: "watches", sub: "smart", gradient: "from-slate-700 to-slate-900", rating: 4.6, reviews: 218, description: "Lightweight fitness-focused smartwatch with always-on display, advanced sleep tracking, and seamless notification sync.", features: ["Always-On LCD", "7-Day Battery", "Sleep Tracking", "50m Water Resistant", "100+ Watch Faces"], colors: C.watches, sku: "BV-WT-PULSE", inStock: true },
  { id: "w3", name: "Heritage 1962", price: 1299, originalPrice: 1599, category: "watches", sub: "analog", gradient: "from-amber-800 to-amber-950", rating: 4.9, reviews: 87, description: "Swiss-made automatic movement housed in a 40mm rose gold case. Sapphire crystal, exhibition caseback, and hand-stitched leather strap.", features: ["Swiss Automatic", "40mm Rose Gold Case", "Sapphire Crystal", "Exhibition Caseback", "72h Power Reserve"], colors: C.watches, sku: "BV-WT-HERITAGE", inStock: true },
  { id: "w4", name: "Nordic Minimal", price: 649, category: "watches", sub: "analog", gradient: "from-stone-700 to-stone-900", rating: 4.7, reviews: 156, description: "Scandinavian-inspired dress watch with clean dial, slim 38mm case, and mesh bracelet. Elegant simplicity for every occasion.", features: ["Japanese Quartz", "38mm Stainless Steel", "Mesh Bracelet", "30m Water Resistant", "Ultra-Slim 7mm Profile"], colors: C.watches, sku: "BV-WT-NORDIC", inStock: true },
  { id: "w5", name: "Royal Oak Noir", price: 4999, category: "watches", sub: "luxury", badge: "Exclusive", gradient: "from-yellow-800 to-yellow-950", rating: 5.0, reviews: 23, description: "Limited edition luxury timepiece with integrated bracelet design, ceramic bezel, and in-house tourbillon movement.", features: ["In-House Tourbillon", "Ceramic Bezel", "Integrated Bracelet", "100m Water Resistant", "Limited to 200 Pieces"], colors: C.limited, sku: "BV-WT-ROYAL", inStock: true },
  { id: "w6", name: "Celestial Tourbillon", price: 8750, category: "watches", sub: "luxury", gradient: "from-indigo-800 to-indigo-950", rating: 4.9, reviews: 11, description: "Grand complication featuring a flying tourbillon, moonphase display, and meteorite dial. The pinnacle of haute horlogerie.", features: ["Flying Tourbillon", "Moonphase Display", "Meteorite Dial", "42h Power Reserve", "Alligator Strap"], colors: C.limited, sku: "BV-WT-CELESTIAL", inStock: true },
  { id: "w7", name: "Apex Diver 300", price: 899, category: "watches", sub: "sport", gradient: "from-cyan-700 to-cyan-950", rating: 4.7, reviews: 445, description: "Professional dive watch with 300m water resistance, unidirectional ceramic bezel, and super-luminova indices.", features: ["300m Water Resistant", "Ceramic Bezel Insert", "Super-Luminova", "Helium Escape Valve", "Rubber Strap"], colors: C.watches, sku: "BV-WT-APEX", inStock: true },
  { id: "w8", name: "Sprint Carbon", price: 599, category: "watches", sub: "sport", badge: "Hot", gradient: "from-red-700 to-red-950", rating: 4.5, reviews: 312, description: "Racing-inspired chronograph with carbon fiber dial, tachymeter bezel, and date window. Lightweight at just 68g.", features: ["Carbon Fiber Dial", "Chronograph", "Tachymeter Bezel", "68g Weight", "100m Water Resistant"], colors: C.watches, sku: "BV-WT-SPRINT", inStock: true },
  { id: "w9", name: "Aviator GMT", price: 1199, category: "watches", sub: "pilot", gradient: "from-emerald-700 to-emerald-950", rating: 4.8, reviews: 98, description: "Dual-timezone pilot watch with bi-directional bezel, legible dial, and anti-magnetic inner case.", features: ["GMT Complication", "Anti-Magnetic Case", "Pilot Crown", "Dual-Time Bezel", "NATO Strap"], colors: C.watches, sku: "BV-WT-AVIATOR", inStock: true },
  { id: "w10", name: "Navigator Titanium", price: 1499, category: "watches", sub: "pilot", gradient: "from-sky-700 to-sky-950", rating: 4.9, reviews: 64, description: "Full titanium construction with world timer function, slide rule bezel, and AR-coated sapphire. Built for aviators.", features: ["World Timer", "Slide Rule Bezel", "Grade 5 Titanium", "AR-Coated Sapphire", "120g Weight"], colors: C.watches, sku: "BV-WT-NAVIGATOR", inStock: true },

  // ── Fashion ──
  { id: "f1", name: "BV Matchday Pro", price: 189, category: "fashion", sub: "jerseys", badge: "New", gradient: "from-red-600 to-red-800", rating: 4.7, reviews: 523, description: "Performance match jersey with moisture-wicking fabric, mesh ventilation panels, and embroidered team crest.", features: ["Dri-FIT Technology", "Mesh Ventilation", "Embroidered Crest", "Regular Fit", "100% Recycled Polyester"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-MATCHDAY", inStock: true },
  { id: "f2", name: "Classic XI Jersey", price: 149, category: "fashion", sub: "jerseys", gradient: "from-blue-600 to-blue-800", rating: 4.5, reviews: 389, description: "Retro-inspired jersey with contrast collar, woven label details, and soft cotton-blend fabric for everyday wear.", features: ["Cotton Blend", "Contrast Rib Collar", "Woven Labels", "Relaxed Fit", "Side Vent Hem"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-CLASSIC", inStock: true },
  { id: "f3", name: "Stealth Bomber", price: 449, originalPrice: 599, category: "fashion", sub: "jackets", badge: "Limited", gradient: "from-zinc-700 to-zinc-900", rating: 4.9, reviews: 167, description: "Premium bomber jacket with quilted satin lining, rib-knit cuffs, and water-resistant shell. Military-grade construction.", features: ["Water-Resistant Shell", "Quilted Satin Lining", "Rib-Knit Trim", "Interior Pocket", "YKK Zippers"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-BOMBER", inStock: true },
  { id: "f4", name: "Arctic Shell", price: 379, category: "fashion", sub: "jackets", gradient: "from-gray-500 to-gray-700", rating: 4.6, reviews: 234, description: "3-layer waterproof shell jacket with taped seams, adjustable hood, and underarm vents. Engineered for extreme weather.", features: ["3-Layer Waterproof", "Taped Seams", "Adjustable Hood", "Underarm Vents", "Packable"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-ARCTIC", inStock: true },
  { id: "f5", name: "Essential Tee", price: 59, category: "fashion", sub: "tshirts", gradient: "from-neutral-500 to-neutral-700", rating: 4.4, reviews: 1204, description: "Premium heavyweight cotton tee with pre-shrunk construction and screen-printed logo. Everyday essential.", features: ["220gsm Cotton", "Pre-Shrunk", "Screen-Printed Logo", "Regular Fit", "Reinforced Collar"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-ESSENTIAL", inStock: true },
  { id: "f6", name: "Logo Oversized Tee", price: 79, category: "fashion", sub: "tshirts", gradient: "from-stone-600 to-stone-800", rating: 4.5, reviews: 876, description: "Relaxed oversized silhouette with dropped shoulders, thick cotton jersey, and tonal embroidered logo.", features: ["280gsm Cotton", "Oversized Fit", "Dropped Shoulders", "Embroidered Logo", "Extended Length"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-OVERSIZE", inStock: true },
  { id: "f7", name: "Midnight Hoodie", price: 169, category: "fashion", sub: "hoodies", gradient: "from-slate-700 to-slate-900", rating: 4.8, reviews: 654, description: "Heavyweight French terry hoodie with kangaroo pocket, ribbed cuffs, and metal eyelet drawstrings.", features: ["400gsm French Terry", "Kangaroo Pocket", "Metal Eyelets", "Brushed Interior", "Relaxed Fit"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-MIDNIGHT", inStock: true },
  { id: "f8", name: "Tech Fleece Hood", price: 199, category: "fashion", sub: "hoodies", badge: "Best Seller", gradient: "from-violet-700 to-violet-900", rating: 4.7, reviews: 432, description: "Innovative tech fleece with bonded seams, zip-through design, and secure zip pockets. Lightweight warmth.", features: ["Tech Fleece Bonded", "Zip-Through Design", "Secure Zip Pockets", "Bonded Seams", "Articulated Sleeves"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-TECHFLEECE", inStock: true },
  { id: "f9", name: "Tactical Cargo", price: 139, category: "fashion", sub: "bottoms", gradient: "from-green-700 to-green-900", rating: 4.5, reviews: 567, description: "Rugged cargo pants with reinforced knee panels, 6-pocket design, and adjustable ankle cuffs.", features: ["Ripstop Fabric", "Reinforced Knees", "6-Pocket Design", "Adjustable Cuffs", "Regular Taper Fit"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-CARGO", inStock: true },
  { id: "f10", name: "Relaxed Chino", price: 109, category: "fashion", sub: "bottoms", gradient: "from-amber-600 to-amber-800", rating: 4.6, reviews: 398, description: "Classic chino with stretch cotton twill, mid-rise waist, and clean finish. Versatile for any occasion.", features: ["Stretch Cotton Twill", "Mid-Rise", "Button Closure", "Welt Back Pockets", "Relaxed Straight Fit"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-CHINO", inStock: true },
  { id: "f11", name: "Windbreaker Pro", price: 259, category: "fashion", sub: "outerwear", gradient: "from-teal-600 to-teal-800", rating: 4.7, reviews: 213, description: "Packable windbreaker with DWR coating, mesh lining, and adjustable hem. Perfect layer for unpredictable weather.", features: ["DWR Coating", "Mesh Lined", "Packable Design", "Adjustable Hem", "Zip Pockets"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-WIND", inStock: true },
  { id: "f12", name: "Field Parka", price: 349, category: "fashion", sub: "outerwear", badge: "Season", gradient: "from-emerald-700 to-emerald-900", rating: 4.8, reviews: 156, description: "Insulated parka with 700-fill down, storm flap, and removable faux-fur hood. Rated to -20°C.", features: ["700-Fill Down", "Removable Hood", "Storm Flap", "Rated to -20°C", "Internal Pocket System"], colors: C.fashion, sizes: FASHION_SIZES, sku: "BV-FS-PARKA", inStock: true },

  // ── Accessories ──
  { id: "a1", name: "Vault Backpack", price: 249, category: "accessories", sub: "bags", badge: "New", gradient: "from-zinc-700 to-zinc-900", rating: 4.8, reviews: 445, description: "Tech-ready backpack with padded laptop sleeve, hidden anti-theft pocket, and waterproof shell. 28L capacity.", features: ["28L Capacity", "Padded Laptop Sleeve", "Anti-Theft Pocket", "Waterproof Shell", "Ergonomic Straps"], colors: C.accessories, sku: "BV-AC-VAULT", inStock: true },
  { id: "a2", name: "Stealth Messenger", price: 199, category: "accessories", sub: "bags", gradient: "from-stone-600 to-stone-800", rating: 4.6, reviews: 234, description: "Minimal messenger bag with magnetic flap closure, padded laptop compartment, and quick-access phone pocket.", features: ["Magnetic Flap", "Padded Laptop Compartment", "Quick-Access Pocket", "Waxed Canvas", "Adjustable Strap"], colors: C.accessories, sku: "BV-AC-MESSENGER", inStock: true },
  { id: "a3", name: "Carbon Belt", price: 89, category: "accessories", sub: "belts", gradient: "from-neutral-700 to-neutral-900", rating: 4.5, reviews: 678, description: "Sleek reversible belt with carbon fiber buckle and genuine leather strap. Reversible black/brown.", features: ["Carbon Fiber Buckle", "Reversible Strap", "Genuine Leather", "Automatic Clasp", "35mm Width"], colors: C.accessories, sku: "BV-AC-CARBON", inStock: true },
  { id: "a4", name: "Genuine Leather Belt", price: 119, category: "accessories", sub: "belts", gradient: "from-amber-700 to-amber-900", rating: 4.7, reviews: 445, description: "Full-grain leather belt with brushed steel buckle and hand-stitched edges. Built to last a lifetime.", features: ["Full-Grain Leather", "Brushed Steel Buckle", "Hand-Stitched", "30mm Width", "Lifetime Warranty"], colors: C.accessories, sku: "BV-AC-LEATHER", inStock: true },
  { id: "a5", name: "Tactical Cap", price: 49, category: "accessories", sub: "hats", gradient: "from-gray-600 to-gray-800", rating: 4.4, reviews: 912, description: "Low-profile tactical cap with moisture-wicking sweatband, structured crown, and adjustable snapback.", features: ["Structured Crown", "Moisture-Wicking Band", "Snapback Closure", "Tonal Embroidery", "Pre-Curved Brim"], colors: C.accessories, sku: "BV-AC-CAP", inStock: true },
  { id: "a6", name: "Heritage Bucket", price: 59, category: "accessories", sub: "hats", gradient: "from-slate-600 to-slate-800", rating: 4.3, reviews: 567, description: "Classic bucket hat in heavy cotton twill with embroidered logo and adjustable drawcord.", features: ["Heavy Cotton Twill", "Embroidered Logo", "Drawcord Adjustment", "UPF 50+", "Packable"], colors: C.accessories, sku: "BV-AC-BUCKET", inStock: true },
  { id: "a7", name: "Polarized Noir", price: 179, category: "accessories", sub: "sunglasses", badge: "Popular", gradient: "from-zinc-700 to-zinc-950", rating: 4.8, reviews: 834, description: "Polarized acetate sunglasses with titanium core frames, anti-scratch coating, and UV400 protection.", features: ["Polarized Lenses", "Titanium Core", "UV400 Protection", "Anti-Scratch", "Acetate Frame"], colors: C.accessories, sku: "BV-AC-POLAR", inStock: true },
  { id: "a8", name: "Aviator Titanium", price: 229, category: "accessories", sub: "sunglasses", gradient: "from-amber-700 to-amber-950", rating: 4.9, reviews: 445, description: "Ultra-lightweight titanium aviator with gradient lenses, adjustable nose pads, and spring hinges.", features: ["Titanium Frame", "Gradient Lenses", "Spring Hinges", "Adjustable Nose Pads", "18g Weight"], colors: C.accessories, sku: "BV-AC-AVIATOR", inStock: true },
  { id: "a9", name: "RFID Bifold", price: 79, category: "accessories", sub: "wallets", gradient: "from-stone-700 to-stone-900", rating: 4.5, reviews: 1203, description: "Slim bifold wallet with RFID blocking, 8 card slots, and full-grain leather construction.", features: ["RFID Blocking", "8 Card Slots", "Full-Grain Leather", "Bill Compartment", "Slim Profile"], colors: C.accessories, sku: "BV-AC-BIFOLD", inStock: true },
  { id: "a10", name: "Slim Card Holder", price: 59, category: "accessories", sub: "wallets", gradient: "from-neutral-600 to-neutral-800", rating: 4.6, reviews: 876, description: "Minimalist card holder with 4 slots, center compartment, and embossed logo. Ultra-slim at 6mm.", features: ["4 Card Slots", "Center Compartment", "6mm Thickness", "Embossed Logo", "RFID Protected"], colors: C.accessories, sku: "BV-AC-CARDHOLDER", inStock: true },
  { id: "a11", name: "Chain Link Bracelet", price: 149, category: "accessories", sub: "jewelry", badge: "New", gradient: "from-yellow-700 to-yellow-900", rating: 4.7, reviews: 234, description: "316L stainless steel chain link bracelet with magnetic clasp and polished/matte dual finish.", features: ["316L Steel", "Magnetic Clasp", "Dual Finish", "21cm Length", "Hypoallergenic"], colors: C.limited, sku: "BV-AC-BRACELET", inStock: true },
  { id: "a12", name: "Signet Ring Noir", price: 199, category: "accessories", sub: "jewelry", gradient: "from-zinc-700 to-zinc-950", rating: 4.8, reviews: 156, description: "Matte black stainless steel signet ring with laser-etched crest and comfort-fit interior.", features: ["Matte Black PVD", "Laser-Etched Crest", "Comfort Fit", "316L Steel", "Anti-Scratch Coating"], colors: C.limited, sku: "BV-AC-RING", inStock: true },

  // ── Footwear ──
  { id: "ft1", name: "Phantom Runner", price: 189, category: "footwear", sub: "sneakers", badge: "New", gradient: "from-zinc-700 to-zinc-900", rating: 4.8, reviews: 1234, description: "Performance running shoe with responsive foam midsole, breathable knit upper, and carbon fiber plate.", features: ["Carbon Fiber Plate", "Responsive Foam", "Engineered Knit", "Ortholite Sockliner", "10mm Drop"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-PHANTOM", inStock: true },
  { id: "ft2", name: "Air Strike Low", price: 159, category: "footwear", sub: "sneakers", gradient: "from-gray-600 to-gray-800", rating: 4.6, reviews: 876, description: "Court-inspired sneaker with leather and suede upper, air-cushioned sole, and vulcanized rubber outsole.", features: ["Air Cushion Unit", "Leather + Suede", "Vulcanized Outsole", "Ortholite Insole", "Classic Court Silhouette"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-AIRSTRIKE", inStock: true },
  { id: "ft3", name: "Urban Tactical Boot", price: 279, category: "footwear", sub: "boots", badge: "Best Seller", gradient: "from-amber-800 to-amber-950", rating: 4.9, reviews: 567, description: "Rugged tactical boot with full-grain waterproof leather, Vibram outsole, and composite safety toe.", features: ["Vibram Outsole", "Waterproof Leather", "Composite Toe", "Gore-Tex Lining", "8\" Height"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-TACTICAL", inStock: true },
  { id: "ft4", name: "Heritage Chelsea", price: 329, category: "footwear", sub: "boots", gradient: "from-stone-700 to-stone-950", rating: 4.8, reviews: 345, description: "Chelsea boot in full-grain leather with elastic side panels, pull tabs, and Goodyear welted sole.", features: ["Goodyear Welt", "Full-Grain Leather", "Elastic Side Panels", "Leather Sole", "Hand-Finished"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-CHELSEA", inStock: true },
  { id: "ft5", name: "Oxford Prestige", price: 399, originalPrice: 499, category: "footwear", sub: "formal", gradient: "from-neutral-800 to-neutral-950", rating: 4.7, reviews: 123, description: "Cap-toe Oxford in premium calfskin with blake-stitched sole, leather lining, and hand-burnished finish.", features: ["Calfskin Leather", "Blake Stitch", "Hand-Burnished", "Leather Lining", "Leather Sole"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-OXFORD", inStock: true },
  { id: "ft6", name: "Derby Classic", price: 289, category: "footwear", sub: "formal", gradient: "from-zinc-700 to-zinc-900", rating: 4.6, reviews: 234, description: "Open-laced derby shoe in smooth leather with cushioned insole and rubber-studded sole for all-day comfort.", features: ["Open-Lace Design", "Smooth Leather", "Cushioned Insole", "Rubber-Studded Sole", "Wide Fit Available"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-DERBY", inStock: true },
  { id: "ft7", name: "Sport Slide Pro", price: 69, category: "footwear", sub: "sandals", gradient: "from-slate-600 to-slate-800", rating: 4.3, reviews: 678, description: "Athletic slide with contoured footbed, quick-dry straps, and non-marking rubber outsole.", features: ["Contoured Footbed", "Quick-Dry Straps", "Non-Marking Sole", "EVA Midsole", "Textured Grip"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-SLIDE", inStock: true },
  { id: "ft8", name: "Cork Luxury Sandal", price: 129, category: "footwear", sub: "sandals", gradient: "from-amber-700 to-amber-900", rating: 4.5, reviews: 345, description: "Premium sandal with natural cork footbed, suede lining, and adjustable triple-strap design.", features: ["Natural Cork Footbed", "Suede Lined", "Triple-Strap", "Arch Support", "Rubber Outsole"], colors: C.footwear, sizes: FOOTWEAR_SIZES, sku: "BV-FT-CORK", inStock: true },

  // ── Tech ──
  { id: "t1", name: "Studio Pods Max", price: 349, category: "tech", sub: "audio", badge: "New", gradient: "from-zinc-700 to-zinc-900", rating: 4.9, reviews: 2341, description: "Over-ear headphones with adaptive ANC, spatial audio, and 40h battery. Premium titanium drivers.", features: ["Adaptive ANC", "Spatial Audio", "40h Battery", "Titanium Drivers", "Multi-Device Connect"], colors: C.tech, sku: "BV-TCH-PODSMAX", inStock: true },
  { id: "t2", name: "Bass Cannon Pro", price: 199, category: "tech", sub: "audio", gradient: "from-red-700 to-red-900", rating: 4.7, reviews: 1567, description: "True wireless earbuds with deep bass drivers, IPX5 rating, and 32h total battery with case.", features: ["Deep Bass Drivers", "IPX5 Rating", "32h Total Battery", "Wireless Charging", "Touch Controls"], colors: C.tech, sku: "BV-TCH-BASSCANNON", inStock: true },
  { id: "t3", name: "Volt Ultra", price: 999, category: "tech", sub: "phones", badge: "Flagship", gradient: "from-blue-700 to-blue-950", rating: 4.8, reviews: 4567, description: "Flagship smartphone with 6.7\" LTPO AMOLED, 200MP camera system, 5000mAh battery, and titanium frame.", features: ["6.7\" LTPO AMOLED", "200MP Camera System", "5000mAh Battery", "Titanium Frame", "120W Fast Charge"], colors: C.tech, sku: "BV-TCH-VOLTULTRA", inStock: true },
  { id: "t4", name: "Volt Lite", price: 599, category: "tech", sub: "phones", gradient: "from-indigo-600 to-indigo-800", rating: 4.6, reviews: 2345, description: "Mid-range powerhouse with 6.4\" AMOLED, 108MP camera, and 4800mAh battery. Premium experience, accessible price.", features: ["6.4\" AMOLED", "108MP Camera", "4800mAh Battery", "67W Fast Charge", "IP68 Rated"], colors: C.tech, sku: "BV-TCH-VOLTLITE", inStock: true },
  { id: "t5", name: "Slate Tab Pro", price: 799, category: "tech", sub: "tablets", gradient: "from-slate-700 to-slate-950", rating: 4.7, reviews: 876, description: "12.4\" AMOLED tablet with S Pen support, desktop mode, and 10,000mAh battery. Your portable studio.", features: ["12.4\" AMOLED", "S Pen Included", "Desktop Mode", "10,000mAh Battery", "DeX Support"], colors: C.tech, sku: "BV-TCH-SLATE", inStock: true },
  { id: "t6", name: "Slate Mini", price: 449, category: "tech", sub: "tablets", gradient: "from-gray-600 to-gray-800", rating: 4.5, reviews: 567, description: "Compact 10.5\" tablet with stereo speakers, microSD expansion, and 8,200mAh battery. Entertainment on the go.", features: ["10.5\" LCD", "Stereo Speakers", "MicroSD Slot", "8,200mAh Battery", "15W Charge"], colors: C.tech, sku: "BV-TCH-SLATEMINI", inStock: true },
  { id: "t7", name: "Pulse Band Ultra", price: 249, category: "tech", sub: "wearables", badge: "New", gradient: "from-emerald-700 to-emerald-900", rating: 4.8, reviews: 1234, description: "Advanced fitness band with AMOLED display, 14-day battery, and comprehensive health tracking.", features: ["AMOLED Display", "14-Day Battery", "SpO2 + ECG", "5ATM Water Resistant", "100+ Workout Modes"], colors: C.tech, sku: "BV-TCH-PULSEBAND", inStock: true },
  { id: "t8", name: "Ring Tracker", price: 179, category: "tech", sub: "wearables", gradient: "from-violet-700 to-violet-900", rating: 4.6, reviews: 677, description: "Smart ring with sleep tracking, heart rate monitoring, and temperature sensing. Lightweight titanium.", features: ["Titanium Build", "Sleep Tracking", "Heart Rate", "Temperature Sensor", "7-Day Battery"], colors: C.tech, sku: "BV-TCH-RING", inStock: true },
  { id: "t9", name: "GaN Charger 120W", price: 69, category: "tech", sub: "accessories", gradient: "from-zinc-700 to-zinc-900", rating: 4.5, reviews: 2345, description: "Compact GaN charger with 120W total output, 3 USB-C + 1 USB-A port, and universal voltage.", features: ["120W Total Output", "3x USB-C + 1x USB-A", "GaN Technology", "Universal Voltage", "Foldable Prongs"], colors: C.tech, sku: "BV-TCH-GAN120", inStock: true },
  { id: "t10", name: "MagSafe Stand", price: 49, category: "tech", sub: "accessories", gradient: "from-neutral-600 to-neutral-800", rating: 4.4, reviews: 1567, description: "MagSafe-compatible wireless charging stand with 15W fast charge, adjustable angle, and anti-slip base.", features: ["15W Fast Charge", "MagSafe Compatible", "Adjustable Angle", "Anti-Slip Base", "LED Indicator"], colors: C.tech, sku: "BV-TCH-MAGSAFE", inStock: true },

  // ── Lifestyle ──
  { id: "l1", name: "Noir Eau de Parfum", price: 129, category: "lifestyle", sub: "fragrances", badge: "Signature", gradient: "from-zinc-800 to-zinc-950", rating: 4.9, reviews: 876, description: "Signature fragrance with notes of black oud, vanilla, and smoky leather. Long-lasting 12h sillage.", features: ["100ml Bottle", "12h Sillage", "Black Oud Base", "Hand-Finished Glass", "Magnetic Cap"], colors: C.lifestyle, sku: "BV-LF-NOIR", inStock: true },
  { id: "l2", name: "Oud Royale", price: 199, category: "lifestyle", sub: "fragrances", gradient: "from-amber-800 to-amber-950", rating: 4.8, reviews: 543, description: "Opulent oud-based fragrance with saffron, rose, and amber. A regal scent for the distinguished.", features: ["100ml Bottle", "Pure Oud Extract", "Saffron + Rose Notes", "Gold-Plated Cap", "Limited Batch"], colors: C.lifestyle, sku: "BV-LF-OUD", inStock: true },
  { id: "l3", name: "Concrete Candle Set", price: 89, category: "lifestyle", sub: "home", gradient: "from-stone-600 to-stone-800", rating: 4.6, reviews: 1234, description: "Set of 3 hand-poured soy candles in concrete vessels. Sandalwood, cedar, and petrichor scents.", features: ["3x Soy Candles", "Concrete Vessels", "Sandalwood / Cedar / Petrichor", "60h Burn Time", "Reusable Vessels"], colors: C.lifestyle, sku: "BV-LF-CANDLE", inStock: true },
  { id: "l4", name: "Ceramic Diffuser", price: 119, category: "lifestyle", sub: "home", gradient: "from-neutral-600 to-neutral-800", rating: 4.7, reviews: 678, description: "Hand-thrown ceramic diffuser with reed set and 200ml essential oil blend. Effortless fragrance.", features: ["Hand-Thrown Ceramic", "200ml Oil Included", "Natural Reed Sticks", "Matte Black Finish", "Covered 60m²"], colors: C.lifestyle, sku: "BV-LF-DIFFUSER", inStock: true },
  { id: "l5", name: "Recovery Kit Pro", price: 149, category: "lifestyle", sub: "wellness", badge: "New", gradient: "from-emerald-700 to-emerald-900", rating: 4.7, reviews: 345, description: "Complete recovery set with massage gun, foam roller, and resistance bands. Essential for active lifestyles.", features: ["Massage Gun", "Foam Roller", "3x Resistance Bands", "Carry Bag", "USB-C Charging"], colors: C.lifestyle, sku: "BV-LF-RECOVERY", inStock: true },
  { id: "l6", name: "Meditation Set", price: 79, category: "lifestyle", sub: "wellness", gradient: "from-indigo-700 to-indigo-900", rating: 4.5, reviews: 567, description: "Curated meditation kit with singing bowl, incense set, and guided journal. Find your inner calm.", features: ["Handmade Singing Bowl", "Bamboo Incense Set", "Guided Journal", "Cedar Storage Box", "Meditation Cushion"], colors: C.lifestyle, sku: "BV-LF-MEDITATION", inStock: true },
  { id: "l7", name: "Matte Black Journal", price: 39, category: "lifestyle", sub: "stationery", gradient: "from-zinc-700 to-zinc-900", rating: 4.4, reviews: 2345, description: "Premium hardcover journal with 192gsm dot-grid pages, lay-flat binding, and ribbon bookmark.", features: ["192gsm Paper", "Dot Grid", "Lay-Flat Binding", "Ribbon Bookmark", "200 Pages"], colors: C.lifestyle, sku: "BV-LF-JOURNAL", inStock: true },
  { id: "l8", name: "Titanium Pen Set", price: 89, category: "lifestyle", sub: "stationery", gradient: "from-gray-600 to-gray-800", rating: 4.8, reviews: 876, description: "Set of ballpoint and fountain pen in grade 5 titanium. Precision-machined with smooth ink flow.", features: ["Grade 5 Titanium", "Ballpoint + Fountain", "Precision Machined", "Refillable", "Leather Case Included"], colors: C.lifestyle, sku: "BV-LF-PENSET", inStock: true },

  // ── Limited Editions ──
  { id: "le1", name: "Midnight Drop 001", price: 599, category: "limited", sub: "drops", badge: "Drop", gradient: "from-violet-800 to-violet-950", rating: 5.0, reviews: 12, description: "First exclusive drop — matte black hoodie with reflective BV monogram, numbered interior tag, and premium fleece.", features: ["Reflective Monogram", "Numbered Tag", "450gsm Fleece", "Dropped Shoulders", "Limited to 300"], colors: C.limited, sizes: FASHION_SIZES, sku: "BV-LTD-001", inStock: true },
  { id: "le2", name: "Flash Drop 002", price: 399, category: "limited", sub: "drops", gradient: "from-red-700 to-red-950", rating: 4.9, reviews: 28, description: "Rapid-release capsule — technical windbreaker with heat-reactive panels that shift color in sunlight.", features: ["Heat-Reactive Panels", "Color-Shifting", "Technical Shell", "Taped Seams", "Limited to 500"], colors: C.limited, sizes: FASHION_SIZES, sku: "BV-LTD-002", inStock: true },
  { id: "le3", name: "BV x AKA Collab", price: 899, category: "limited", sub: "collabs", badge: "Collab", gradient: "from-amber-700 to-amber-950", rating: 5.0, reviews: 8, description: "Collaboration with AKA Studios — hand-painted leather jacket with artwork by AKA, certificate of authenticity.", features: ["Hand-Painted Artwork", "Full-Grain Leather", "Certificate of Authenticity", "Custom Lining", "Limited to 100"], colors: C.limited, sku: "BV-LTD-AKA", inStock: true },
  { id: "le4", name: "BV x Studio Noir", price: 749, category: "limited", sub: "collabs", gradient: "from-zinc-700 to-zinc-950", rating: 4.9, reviews: 15, description: "Dark luxury collaboration — all-black sneaker with genuine python accent, deconstructed sole, and numbered tongue.", features: ["Python Accent", "Deconstructed Sole", "Numbered Tongue", "Hand-Finished", "Limited to 200"], colors: C.limited, sizes: FOOTWEAR_SIZES, sku: "BV-LTD-NOIR", inStock: true },
  { id: "le5", name: "Pro Athlete Edition", price: 1299, originalPrice: 1599, category: "limited", sub: "signed", badge: "Signed", gradient: "from-yellow-700 to-yellow-950", rating: 5.0, reviews: 5, description: "Signed by professional athlete — game-worn style jersey with authentic autograph, hologram sticker, and photo proof.", features: ["Authentic Autograph", "Hologram Verified", "Photo Proof", "Game-Worn Style", "Limited to 50"], colors: C.limited, sizes: FASHION_SIZES, sku: "BV-LTD-ATHLETE", inStock: true },
  { id: "le6", name: "Founder's Collection", price: 2499, category: "limited", sub: "signed", gradient: "from-rose-700 to-rose-950", rating: 5.0, reviews: 3, description: "Personally signed by BV founder — premium watch with engraved caseback, leather presentation box, and founder's letter.", features: ["Founder's Signature", "Engraved Caseback", "Presentation Box", "Founder's Letter", "Limited to 25"], colors: C.limited, sku: "BV-LTD-FOUNDER", inStock: true },
  { id: "le7", name: "Series No. 042", price: 699, category: "limited", sub: "numbered", badge: "#042/500", gradient: "from-cyan-700 to-cyan-950", rating: 4.9, reviews: 42, description: "Numbered limited series — titanium chronograph with unique dial colorway and numbered caseback.", features: ["Numbered Caseback", "Unique Dial Colorway", "Titanium Case", "Swiss Movement", "Limited to 500"], colors: C.limited, sku: "BV-LTD-042", inStock: true },
  { id: "le8", name: "Series No. 188", price: 699, category: "limited", sub: "numbered", gradient: "from-teal-700 to-teal-950", rating: 4.8, reviews: 37, description: "Numbered limited series — field watch with dual-timezone, numbered caseback, and canvas strap.", features: ["Numbered Caseback", "Dual-Timezone", "Canvas Strap", "Swiss Movement", "Limited to 500"], colors: C.limited, sku: "BV-LTD-188", inStock: true },
];

const SPECS_MAP: Record<string, { label: string; value: string }[]> = {
  watches: [
    { label: "Movement", value: "Automatic / Quartz" },
    { label: "Case Material", value: "Stainless Steel / Titanium" },
    { label: "Case Diameter", value: "38–44mm" },
    { label: "Water Resistance", value: "50–300m" },
    { label: "Crystal", value: "Sapphire" },
    { label: "Strap", value: "Leather / Bracelet / Rubber" },
  ],
  fashion: [
    { label: "Material", value: "Cotton / Polyester Blend" },
    { label: "Fit", value: "Regular / Relaxed" },
    { label: "Care", value: "Machine Washable" },
    { label: "Origin", value: "Imported" },
    { label: "Closure", value: "Pull-On / Zip" },
  ],
  accessories: [
    { label: "Material", value: "Leather / Steel / Acetate" },
    { label: "Dimensions", value: "One Size" },
    { label: "Weight", value: "Lightweight" },
    { label: "Hardware", value: "Stainless Steel" },
    { label: "Origin", value: "Imported" },
  ],
  footwear: [
    { label: "Upper", value: "Leather / Knit / Suede" },
    { label: "Sole", value: "Rubber / Leather" },
    { label: "Insole", value: "Ortholite / Cushioned" },
    { label: "Heel Height", value: "Flat / 1 inch" },
    { label: "Closure", value: "Lace-Up / Slip-On" },
  ],
  tech: [
    { label: "Display", value: "AMOLED / LCD" },
    { label: "Battery", value: "7–40h" },
    { label: "Connectivity", value: "Bluetooth 5.3 / WiFi" },
    { label: "Charging", value: "USB-C / Wireless" },
    { label: "Compatibility", value: "iOS / Android" },
  ],
  lifestyle: [
    { label: "Size", value: "Standard" },
    { label: "Material", value: "Premium / Natural" },
    { label: "Scent", value: "Signature Blend" },
    { label: "Burn Time", value: "60h+" },
    { label: "Origin", value: "Handcrafted" },
  ],
  limited: [
    { label: "Edition", value: "Limited / Numbered" },
    { label: "Quantity", value: "25–500 Pieces" },
    { label: "Certificate", value: "Authenticity Included" },
    { label: "Packaging", value: "Premium Presentation" },
    { label: "Origin", value: "Handcrafted" },
  ],
};

function buildSpecs(p: Product): { label: string; value: string }[] {
  const base = SPECS_MAP[p.category] || SPECS_MAP.lifestyle;
  return [
    ...base,
    { label: "SKU", value: p.sku },
    { label: "Category", value: `${p.category} / ${p.sub}` },
    { label: "Colors", value: p.colors.map((c) => c.name).join(", ") },
    ...(p.sizes ? [{ label: "Sizes", value: p.sizes.join(", ") }] : []),
  ];
}

export function getProduct(id: string): Product | undefined {
  const p = PRODUCTS.find((pr) => pr.id === id);
  if (p && (!p.specs || p.specs.length === 0)) p.specs = buildSpecs(p);
  return p;
}

export function getRelated(product: Product, limit = 4): Product[] {
  return PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, limit);
}
