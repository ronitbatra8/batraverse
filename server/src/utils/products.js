const SLIM_SELECT = {
  id: true,
  name: true,
  brand: true,
  category: true,
  subCategory: true,
  price: true,
  originalPrice: true,
  images: true,
  inStock: true,
  badge: true,
  rating: true,
  reviewCount: true,
  source: true,
  colorOptions: true,
  sizeOptions: true,
};

const FULL_SELECT = {
  ...SLIM_SELECT,
  description: true,
  specifications: true,
  keyFeatures: true,
  seller: { select: { id: true, name: true, shopName: true, email: true } },
};

/* Compact per-variant data for list/grid views: keep the swatch/price bits the
   cards need, drop the big nested image/spec/feature arrays that only the
   detail page uses. */
function compactColorOptions(colorOptions) {
  if (!Array.isArray(colorOptions)) return [];
  return colorOptions.map((c) => ({
    name: c && typeof c.name === "string" ? c.name : "Default",
    hex: c && typeof c.hex === "string" ? c.hex : "#18181b",
    colors: c && Array.isArray(c.colors) && c.colors.length > 0 ? c.colors : undefined,
    price: c && typeof c.price === "number" ? c.price : undefined,
    originalPrice: c && typeof c.originalPrice === "number" ? c.originalPrice : undefined,
  }));
}

function slimProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subCategory: p.subCategory,
    price: p.price,
    originalPrice: p.originalPrice,
    images: p.images || [],
    inStock: p.inStock,
    badge: p.badge,
    rating: p.rating,
    reviewCount: p.reviewCount,
    source: p.source,
    colorOptions: compactColorOptions(p.colorOptions),
    sizeOptions: p.sizeOptions || {},
  };
}

module.exports = { SLIM_SELECT, FULL_SELECT, slimProduct };