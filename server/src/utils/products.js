/* Public visibility filter: products of a rejected seller (rejectedAt set) are
   temporarily hidden — their own catalog products (sellerId null) stay live.
   Reapproving the seller clears rejectedAt and brings them back unchanged.
   Only real products (baseProductId null) are ever public — update-request
   drafts never surface on the storefront. */
const PUBLIC_WHERE = {
  status: "approved",
  baseProductId: null,
  OR: [{ sellerId: null }, { seller: { rejectedAt: null } }],
};

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
  status: true,
  colorOptions: true,
  sizeOptions: true,
};

/* Public detail select: only the seller's shopName is exposed to customers.
   Personal/seller fields (id, name, email) stay between owner and seller. */
const FULL_SELECT = {
  ...SLIM_SELECT,
  description: true,
  specifications: true,
  keyFeatures: true,
  baseProductId: true,
  approvalType: true,
  seller: { select: { shopName: true, rejectedAt: true } },
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
    images: c && Array.isArray(c.images) && c.images.length > 0 ? c.images : undefined,
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

/* Snapshot of the seller-entered prices, captured at submission time and kept
   untouched through approval (the owner edits the LIVE sell prices on approval,
   not this). Structure: { price?, colors?: { [color]: number }, sizes?: { [color]: { [size]: number } } } */
function buildSellerPricing(price, colorOptions, sizeOptions) {
  const colors = {};
  if (Array.isArray(colorOptions)) {
    for (const c of colorOptions) {
      if (c && typeof c.name === "string") {
        colors[c.name] = typeof c.price === "number" && isFinite(c.price) ? c.price : null;
      }
    }
  }
  const sizes = {};
  if (sizeOptions && typeof sizeOptions === "object" && !Array.isArray(sizeOptions)) {
    for (const [colorName, sizeArr] of Object.entries(sizeOptions)) {
      if (!Array.isArray(sizeArr)) continue;
      const m = {};
      for (const s of sizeArr) {
        if (s && typeof s.name === "string") {
          m[s.name] = typeof s.price === "number" && isFinite(s.price) ? s.price : null;
        }
      }
      sizes[colorName] = m;
    }
  }
  return {
    price: typeof price === "number" && isFinite(price) ? price : null,
    colors,
    sizes,
  };
}

/* Full seller-entered detail snapshot, kept alongside the live/owner-approved
   fields. Every buyer-facing change the seller submits lands here; owner
   approval edits ONLY the live fields. Mirrors the sellerPrice/sellerPricing
   pattern used for payouts. */
function buildSellerDetails(d) {
  return {
    name: d && d.name !== undefined ? d.name : null,
    brand: d && d.brand !== undefined ? d.brand : null,
    category: d && d.category !== undefined ? d.category : null,
    subCategory: d && d.subCategory !== undefined ? d.subCategory : null,
    source: d && d.source !== undefined ? d.source : "store",
    price: d && d.price != null ? Number(d.price) : null,
    originalPrice: d && d.originalPrice != null ? Number(d.originalPrice) : null,
    description: d && d.description !== undefined ? d.description : null,
    images: d && Array.isArray(d.images) ? d.images : [],
    inStock: d && d.inStock !== undefined ? Boolean(d.inStock) : true,
    badge: d && d.badge !== undefined ? d.badge : null,
    specifications: d && Array.isArray(d.specifications) ? d.specifications : [],
    keyFeatures: d && Array.isArray(d.keyFeatures) ? d.keyFeatures : [],
    colorOptions: d && Array.isArray(d.colorOptions) ? d.colorOptions : [],
    sizeOptions: d && d.sizeOptions && typeof d.sizeOptions === "object" && !Array.isArray(d.sizeOptions) ? d.sizeOptions : {},
  };
}

/* Best seller-entered price for a purchased order item, in precedence order:
  1) size price under the purchased color (order item carries color + size)
  2) color price
  3) legacy product.sellerPrice (simple products)
  4) the paid item price (only when nothing was ever recorded) */
function effectiveSellerPrice(product, item) {
  const snap = product && typeof product.sellerPricing === "object" && product.sellerPricing ? product.sellerPricing : {};
  const color = item && item.color ? String(item.color) : null;
  const size = item && item.size ? String(item.size) : null;
  if (size && color && snap.sizes && snap.sizes[color] && typeof snap.sizes[color][size] === "number" && snap.sizes[color][size] > 0) {
    return snap.sizes[color][size];
  }
  if (color && snap.colors && typeof snap.colors[color] === "number" && snap.colors[color] > 0) {
    return snap.colors[color];
  }
  if (product && product.sellerPrice != null && product.sellerPrice > 0) {
    return product.sellerPrice;
  }
  return null;
}

module.exports = { SLIM_SELECT, FULL_SELECT, slimProduct, buildSellerPricing, buildSellerDetails, effectiveSellerPrice, PUBLIC_WHERE };