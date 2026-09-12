const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { sellerAuth, requireSeller } = require("../middleware/sellerAuth");
const { buildSellerPricing, buildSellerDetails, effectiveSellerPrice } = require("../utils/products");

const router = express.Router();

router.use(sellerAuth);

// ---- Seller onboarding (account created but not yet approved) ----
// These run with a valid logged-in seller token but BEFORE the approved-only
// gate below, so a freshly registered seller can complete their mandatory
// profile and submit for owner review.

const PROFILE_SELECT = { id: true, name: true, email: true, phone: true, role: true, approved: true, submittedForApproval: true, rejectedAt: true, shopName: true, shopDescription: true, pickupName: true, pickupAddress: true, pickupCity: true, pickupState: true, pickupPincode: true, pickupPhone: true };

function profileDataFromBody(body) {
  const { shopName, shopDescription, pickupName, pickupAddress, pickupCity, pickupState, pickupPincode, pickupPhone } = body;
  const data = {};
  if (shopName !== undefined) data.shopName = String(shopName).trim();
  if (shopDescription !== undefined) data.shopDescription = String(shopDescription).trim();
  if (pickupName !== undefined) data.pickupName = String(pickupName).trim();
  if (pickupAddress !== undefined) data.pickupAddress = String(pickupAddress).trim();
  if (pickupCity !== undefined) data.pickupCity = String(pickupCity).trim();
  if (pickupState !== undefined) data.pickupState = String(pickupState).trim();
  if (pickupPincode !== undefined) data.pickupPincode = String(pickupPincode).trim();
  if (pickupPhone !== undefined) data.pickupPhone = String(pickupPhone).trim();
  return data;
}

router.get("/onboarding", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: PROFILE_SELECT });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "SELLER") return res.status(403).json({ error: "Seller access required" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/complete-profile", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, role: true, approved: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "SELLER") return res.status(403).json({ error: "Seller access required" });
    if (user.approved) return res.status(400).json({ error: "Account already approved" });
    const data = profileDataFromBody(req.body);
    const updated = await prisma.user.update({ where: { id: req.userId }, data, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/submit-approval", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: PROFILE_SELECT });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "SELLER") return res.status(403).json({ error: "Seller access required" });
    if (user.approved) return res.status(400).json({ error: "Account already approved" });
    const missing = [];
    if (!user.shopName) missing.push("Shop Name");
    if (!user.shopDescription) missing.push("Shop Description");
    if (!user.pickupName) missing.push("Pickup Contact Name");
    if (!user.pickupPhone) missing.push("Pickup Phone");
    if (!user.pickupAddress) missing.push("Pickup Address");
    if (!user.pickupCity) missing.push("Pickup City");
    if (!user.pickupState) missing.push("Pickup State");
    if (!user.pickupPincode) missing.push("Pickup Pincode");
    if (missing.length > 0) return res.status(400).json({ error: `Complete all mandatory fields: ${missing.join(", ")}` });
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { submittedForApproval: true, rejectedAt: null }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.use(requireSeller);

const uploadsDir = path.join(__dirname, "..", "..", "uploads", "products");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extOk = /\.(jpg|jpeg|png|gif|webp|svg|heic|heif|avif)$/i.test(file.originalname);
    const mimeOk = /^image\/(jpeg|png|gif|webp|svg\+xml|heic|heif|avif)$/i.test(file.mimetype || "");
    if (extOk || mimeOk) cb(null, true);
    else cb(new Error("Only image files allowed (jpg, png, webp, gif, svg, heic, avif)"));
  },
});

const STORE_CATEGORIES = ["watches", "fashion", "accessories", "footwear", "tech", "lifestyle", "limited"];
const MART_CATEGORIES = ["fruits", "dairy", "snacks", "beverages", "instant", "personal", "cleaning", "bakery"];
const ALL_CATEGORIES = { store: STORE_CATEGORIES, mart: MART_CATEGORIES };

router.get("/categories", (_req, res) => {
  res.json(ALL_CATEGORIES);
});

router.post("/upload", (req, res) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Image too large (max 15MB per image)" });
        if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ error: "Too many images (max 10)" });
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    const urls = req.files.map((f) => `/uploads/products/${f.filename}`);
    res.json({ urls });
  });
});

router.get("/profile", (req, res) => {
  res.json(req.user);
});

router.put("/profile", async (req, res) => {
  try {
    const { shopName, shopDescription, pickupName, pickupAddress, pickupCity, pickupState, pickupPincode, pickupPhone } = req.body;
    const data = {};
    if (shopName !== undefined) data.shopName = shopName;
    if (shopDescription !== undefined) data.shopDescription = shopDescription;
    if (pickupName !== undefined) data.pickupName = pickupName;
    if (pickupAddress !== undefined) data.pickupAddress = pickupAddress;
    if (pickupCity !== undefined) data.pickupCity = pickupCity;
    if (pickupState !== undefined) data.pickupState = pickupState;
    if (pickupPincode !== undefined) data.pickupPincode = pickupPincode;
    if (pickupPhone !== undefined) data.pickupPhone = pickupPhone;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, shopName: true, shopDescription: true, pickupName: true, pickupAddress: true, pickupCity: true, pickupState: true, pickupPincode: true, pickupPhone: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const sellerProducts = await prisma.product.findMany({
      where: { sellerId: req.userId, baseProductId: null },
      select: { id: true, reviewCount: true },
    });
    const productIds = sellerProducts.map((p) => p.id);
    const totalProducts = sellerProducts.length;

    let totalOrders = 0;
    let pendingOrders = 0;

    if (productIds.length > 0) {
      const allOrders = await prisma.order.findMany({
        select: { id: true, status: true, items: true },
      });
      for (const order of allOrders) {
        if (!Array.isArray(order.items)) continue;
        const hasSellerItem = order.items.some((item) => {
          if (!item.productId) return false;
          const pid = item.productId.startsWith("db-") ? item.productId.slice(3) : item.productId;
          return productIds.includes(pid);
        });
        if (!hasSellerItem) continue;
        totalOrders++;
        if (order.status === "pending" || order.status === "confirmed") pendingOrders++;
      }
    }

    const topProducts = await prisma.product.findMany({
      where: { sellerId: req.userId, baseProductId: null },
      orderBy: { reviewCount: "desc" },
      take: 5,
      select: { id: true, name: true, brand: true, price: true, images: true, reviewCount: true, rating: true },
    });

    const [payoutAgg, pendingAgg] = await prisma.$transaction([
      prisma.sellerPayout.aggregate({ where: { sellerId: req.userId, status: "paid" }, _sum: { amount: true }, _count: true }),
      prisma.sellerPayout.aggregate({ where: { sellerId: req.userId, status: "pending" }, _sum: { amount: true }, _count: true }),
    ]);

    res.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      topProducts,
      payoutTotal: payoutAgg._sum.amount || 0,
      payoutsCount: payoutAgg._count,
      payoutPending: pendingAgg._sum.amount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/payouts", async (req, res) => {
  try {
    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Enrich with the customer-charged price per item so the seller can see the
    // split (their sellerPrice vs the live sell price the customer paid).
    const orderIds = [...new Set(payouts.map((p) => p.orderId))];
    const orders = orderIds.length > 0
      ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, items: true } })
      : [];
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const result = payouts.map((p) => {
      const order = orderById.get(p.orderId);
      const item = order && Array.isArray(order.items) ? order.items[p.itemIdx] : null;
      return {
        ...p,
        chargedPrice: item ? Number(item.price) || 0 : null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.userId, baseProductId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, brand: true, category: true, subCategory: true, source: true, price: true, originalPrice: true, description: true, images: true, inStock: true, badge: true, rating: true, reviewCount: true, specifications: true, keyFeatures: true, colorOptions: true, sizeOptions: true, status: true, sellerPrice: true, sellerDetails: true, rejectReason: true },
    });
    const liveIds = products.map((p) => p.id);
    const drafts = liveIds.length > 0
      ? await prisma.product.findMany({
          where: { sellerId: req.userId, baseProductId: { in: liveIds }, status: { in: ["pending", "rejected"] } },
          orderBy: { createdAt: "desc" },
          select: { baseProductId: true, name: true, brand: true, category: true, subCategory: true, source: true, price: true, originalPrice: true, description: true, images: true, inStock: true, badge: true, specifications: true, keyFeatures: true, colorOptions: true, sizeOptions: true, status: true, rejectReason: true, sellerPrice: true },
        })
      : [];
    const draftByBase = new Map();
    for (const d of drafts) {
      if (d.baseProductId && !draftByBase.has(d.baseProductId)) draftByBase.set(d.baseProductId, d);
    }
    /* Backfill: products created before the sellerDetails snapshot exists get a
       seller copy seeded from their current (approved) details so editing keeps
       working for older products too. */
    const result = products.map((p) => {
      const hasSellerCopy = p.sellerDetails && typeof p.sellerDetails === "object" && Object.keys(p.sellerDetails).length > 0;
      const sellerCopy = hasSellerCopy
        ? p.sellerDetails
        : buildSellerDetails({ name: p.name, brand: p.brand, category: p.category, subCategory: p.subCategory, source: p.source, price: p.price, originalPrice: p.originalPrice, description: p.description, images: p.images, inStock: p.inStock, badge: p.badge, specifications: p.specifications, keyFeatures: p.keyFeatures, colorOptions: p.colorOptions, sizeOptions: p.sizeOptions });
      return {
        ...p,
        sellerDetails: sellerCopy,
        sellerDetailsIsBackfill: !hasSellerCopy,
        pendingUpdate: draftByBase.has(p.id) ? draftByBase.get(p.id) : undefined,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, brand, category, subCategory, source, price, originalPrice, description, images, inStock, badge, specifications, keyFeatures, colorOptions, sizeOptions } = req.body;
    if (name == null || !name.trim()) return res.status(400).json({ error: "Product name is required" });
    const hasColors = Array.isArray(colorOptions) && colorOptions.length > 0;
    if (!hasColors && (price == null || price < 0)) return res.status(400).json({ error: "Valid price is required" });
    if (!source || !["store", "mart"].includes(source)) return res.status(400).json({ error: "Source must be 'store' or 'mart'" });
    const hasImages = Array.isArray(images) && images.length > 0;
    const hasColorImages = hasColors && colorOptions.some((c) => Array.isArray(c.images) && c.images.length > 0);
    if (!hasImages && !hasColorImages) return res.status(400).json({ error: "At least one product image is required" });

    if (category) {
      const cat = await prisma.category.findFirst({ where: { slug: category, source, active: true } });
      if (!cat) return res.status(400).json({ error: `Invalid category '${category}' for ${source}` });
    }
    if (subCategory && category) {
      const cat = await prisma.category.findFirst({ where: { slug: category, source, active: true } });
      if (cat) {
        const sub = await prisma.subcategory.findFirst({ where: { categoryId: cat.id, slug: subCategory, active: true } });
        if (!sub) return res.status(400).json({ error: `Invalid subcategory '${subCategory}'` });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        brand: brand || null,
        category: category || null,
        subCategory: subCategory || null,
        source,
        price,
        originalPrice: originalPrice || null,
        description: description || null,
        images: Array.isArray(images) ? images : [],
        inStock: inStock !== undefined ? inStock : true,
        badge: badge || null,
        sellerId: req.userId,
        status: "pending",
        sellerPrice: (price != null && price > 0) ? price : null,
        sellerPricing: buildSellerPricing(price, colorOptions, sizeOptions),
        sellerDetails: buildSellerDetails({ name, brand, category, subCategory, source, price, originalPrice, description, images, inStock, badge, specifications, keyFeatures, colorOptions, sizeOptions }),
        rejectReason: null,
        specifications: Array.isArray(specifications) ? specifications : [],
        keyFeatures: Array.isArray(keyFeatures) ? keyFeatures : [],
        colorOptions: Array.isArray(colorOptions) ? colorOptions : [],
        sizeOptions: (sizeOptions && typeof sizeOptions === "object" && !Array.isArray(sizeOptions)) ? sizeOptions : {},
      },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.sellerId !== req.userId) return res.status(403).json({ error: "Not authorized to edit this product" });

    const { name, brand, category, subCategory, source, price, originalPrice, description, images, inStock, badge, specifications, keyFeatures, colorOptions, sizeOptions } = req.body;

    /* Editing a LIVE (approved) product creates an UPDATE REQUEST — a pending
       draft copy that goes through owner approval exactly like a new product.
       The live product keeps showing the currently approved details until the
       owner approves the update and replaces them. */
    if (existing.status === "approved") {
      if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: "Product name is required" });
      if (images !== undefined) {
        const hasImages = Array.isArray(images) && images.length > 0;
        const hasColorImages = Array.isArray(colorOptions) && colorOptions.some((c) => Array.isArray(c.images) && c.images.length > 0);
        if (!hasImages && !hasColorImages) return res.status(400).json({ error: "At least one product image is required" });
      }
      const existingDraft = await prisma.product.findFirst({
        where: { sellerId: req.userId, baseProductId: existing.id, status: { in: ["pending", "rejected"] } },
        orderBy: { createdAt: "desc" },
      });
      /* Prefer the seller's own last-entered values (pending/rejected draft) as
         the base so re-editing never resets to the owner-approved details. */
      const base = existingDraft || existing;
      const colors = colorOptions !== undefined ? colorOptions : base.colorOptions;
      const sizes = sizeOptions !== undefined ? sizeOptions : base.sizeOptions;
      const draftPrice = price !== undefined ? (price != null ? Number(price) : null) : base.price;
      const sellerPrice = draftPrice != null && draftPrice > 0 ? draftPrice : null;
      const sellerDetails = buildSellerDetails(
        name !== undefined ? { name, brand, category, subCategory, source, price: draftPrice, originalPrice, description, images, inStock, badge, specifications, keyFeatures, colorOptions: colors, sizeOptions: sizes }
          : base.sellerDetails
      );
      const draftData = {
        name: name !== undefined ? name : base.name,
        brand: brand !== undefined ? brand : base.brand,
        category: category !== undefined ? category : base.category,
        subCategory: subCategory !== undefined ? subCategory : base.subCategory,
        source: source !== undefined ? source : base.source || "store",
        price: draftPrice != null && draftPrice > 0 ? draftPrice : base.price,
        originalPrice: originalPrice !== undefined ? originalPrice : base.originalPrice,
        description: description !== undefined ? description : base.description,
        images: images !== undefined ? images : base.images,
        inStock: inStock !== undefined ? Boolean(inStock) : base.inStock,
        badge: badge !== undefined ? badge : base.badge,
        specifications: specifications !== undefined ? specifications : base.specifications,
        keyFeatures: keyFeatures !== undefined ? keyFeatures : base.keyFeatures,
        colorOptions: colors,
        sizeOptions: sizes,
        status: "pending",
        rejectReason: null,
        sellerPrice,
        sellerPricing: buildSellerPricing(draftPrice != null ? draftPrice : base.price, colors, sizes),
        sellerDetails,
      };
      if (existingDraft) {
        const product = await prisma.product.update({ where: { id: existingDraft.id }, data: draftData });
        /* Persist the seller's entered copy on the live product too, so editing
           always reflects what the seller filled in (even while pending). */
        if (existing.baseProductId === null) {
          await prisma.product.update({ where: { id: existing.id }, data: { sellerDetails } });
        }
        return res.json({ ...product, alreadyInReview: true });
      }
      const product = await prisma.product.create({
        data: { ...draftData, sellerId: req.userId, approvalType: "update", baseProductId: existing.id },
      });
      /* Persist the seller's entered copy on the live product too. */
      if (existing.baseProductId === null) {
        await prisma.product.update({ where: { id: existing.id }, data: { sellerDetails } });
      }
      return res.status(201).json({ ...product, submittedForReview: true });
    }

    const data = {};
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: "Product name is required" });
    if (images !== undefined) {
      const hasImages = Array.isArray(images) && images.length > 0;
      const hasColorImages = Array.isArray(colorOptions) && colorOptions.some((c) => Array.isArray(c.images) && c.images.length > 0);
      if (!hasImages && !hasColorImages) return res.status(400).json({ error: "At least one product image is required" });
    }
    if (name !== undefined) data.name = name;
    if (brand !== undefined) data.brand = brand;
    if (category !== undefined) data.category = category;
    if (subCategory !== undefined) data.subCategory = subCategory;
    if (source !== undefined) data.source = source;
    if (originalPrice !== undefined) data.originalPrice = originalPrice;
    if (description !== undefined) data.description = description;
    if (images !== undefined) data.images = images;
    if (inStock !== undefined) data.inStock = inStock;
    if (badge !== undefined) data.badge = badge;
    if (specifications !== undefined) data.specifications = specifications;
    if (keyFeatures !== undefined) data.keyFeatures = keyFeatures;
    if (colorOptions !== undefined) data.colorOptions = colorOptions;
    if (sizeOptions !== undefined) data.sizeOptions = sizeOptions;

    if (price !== undefined) data.price = price;
    if (price !== undefined) data.sellerPrice = (price != null && price > 0) ? price : null;
    data.sellerPricing = buildSellerPricing(
      price !== undefined ? price : existing.price,
      colorOptions !== undefined ? colorOptions : existing.colorOptions,
      sizeOptions !== undefined ? sizeOptions : existing.sizeOptions
    );
    data.sellerDetails = buildSellerDetails({
      name: name !== undefined ? name : existing.name,
      brand: brand !== undefined ? brand : existing.brand,
      category: category !== undefined ? category : existing.category,
      subCategory: subCategory !== undefined ? subCategory : existing.subCategory,
      source: source !== undefined ? source : existing.source,
      price: price !== undefined ? price : existing.price,
      originalPrice: originalPrice !== undefined ? originalPrice : existing.originalPrice,
      description: description !== undefined ? description : existing.description,
      images: images !== undefined ? images : existing.images,
      inStock: inStock !== undefined ? inStock : existing.inStock,
      badge: badge !== undefined ? badge : existing.badge,
      specifications: specifications !== undefined ? specifications : existing.specifications,
      keyFeatures: keyFeatures !== undefined ? keyFeatures : existing.keyFeatures,
      colorOptions: colorOptions !== undefined ? colorOptions : existing.colorOptions,
      sizeOptions: sizeOptions !== undefined ? sizeOptions : existing.sizeOptions,
    });

    /* Editing a rejected product re-submits it for approval. */
    if (existing.status === "rejected") {
      data.status = "pending";
      data.rejectReason = null;
      data.inStock = inStock !== undefined ? inStock : false;
    }

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.sellerId !== req.userId) return res.status(403).json({ error: "Not authorized to delete this product" });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/products/:id/stock", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.sellerId !== req.userId) return res.status(403).json({ error: "Not authorized to update this product" });
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { inStock: !existing.inStock },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const sellerProducts = await prisma.product.findMany({
      where: { sellerId: req.userId },
      select: { id: true, sellerPrice: true, sellerPricing: true },
    });
    const productById = new Map(sellerProducts.map((p) => [p.id, p]));
    const productIds = [...productById.keys()];

    if (productIds.length === 0) return res.json([]);

    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, orderId: true, status: true, totalAmount: true, items: true, createdAt: true,
        shippingName: true, shippingCity: true, shippingState: true,
        shippingAddress: true, shippingPincode: true, shippingPhone: true,
        userId: true,
      },
    });

    const sellerOrders = [];
    for (const order of allOrders) {
      if (!Array.isArray(order.items)) continue;
      const sellerItems = [];
      for (const item of order.items) {
        if (!item.productId) continue;
        const pid = item.productId.startsWith("db-") ? item.productId.slice(3) : item.productId;
        const product = productById.get(pid);
        if (!product) continue;
        const sellerUnit = effectiveSellerPrice(product, item);
        sellerItems.push({ ...item, sellerPrice: sellerUnit != null && sellerUnit > 0 ? sellerUnit : null });
      }
      if (sellerItems.length === 0) continue;
      sellerOrders.push({
        id: order.id,
        orderId: order.orderId,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        shippingName: order.shippingName,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingAddress: order.shippingAddress,
        shippingPincode: order.shippingPincode,
        shippingPhone: order.shippingPhone,
        items: sellerItems,
        userId: order.userId,
      });
    }

    const userIds = [...new Set(sellerOrders.map((o) => o.userId))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = {};
    for (const u of users) userMap[u.id] = u;

    const result = sellerOrders.map((o) => ({ ...o, user: userMap[o.userId] || null, userId: undefined }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/category-requests", async (req, res) => {
  try {
    const { type, source, categoryName, subCategoryName, reason } = req.body;
    if (!type || !source || !categoryName) return res.status(400).json({ error: "type, source, categoryName are required" });
    if (!["new_category", "new_subcategory"].includes(type)) return res.status(400).json({ error: "type must be new_category or new_subcategory" });
    if (!["store", "mart"].includes(source)) return res.status(400).json({ error: "source must be store or mart" });
    const request = await prisma.categoryRequest.create({
      data: {
        sellerId: req.userId,
        type,
        source,
        categoryName,
        subCategoryName: subCategoryName || null,
        reason: reason || null,
      },
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/category-requests", async (req, res) => {
  try {
    const requests = await prisma.categoryRequest.findMany({
      where: { sellerId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/ad-requests", async (req, res) => {
  try {
    const { img, tagline, line, href, page, duration } = req.body;
    if (!img || !tagline || !line) {
      return res.status(400).json({ error: "img, tagline, and line are required" });
    }
    const seller = await prisma.user.findUnique({ where: { id: req.userId }, select: { shopName: true } });
    const ad = await prisma.adRequest.create({
      data: {
        sellerId: req.userId,
        sellerName: seller?.shopName || "",
        img,
        tagline,
        line,
        href: href || "/store",
        page: page || "home",
        duration: duration ?? 7,
      },
    });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/ad-requests", async (req, res) => {
  try {
    const requests = await prisma.adRequest.findMany({
      where: { sellerId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/ad-requests/:id", async (req, res) => {
  try {
    const ad = await prisma.adRequest.findUnique({ where: { id: req.params.id } });
    if (!ad || ad.sellerId !== req.userId) {
      return res.status(404).json({ error: "Not found" });
    }
    await prisma.adRequest.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
