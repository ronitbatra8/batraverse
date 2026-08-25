const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { sellerAuth, requireSeller } = require("../middleware/sellerAuth");

const router = express.Router();

router.use(sellerAuth);
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

const STORE_CATEGORIES = ["watches", "fashion", "accessories", "footwear", "tech", "lifestyle", "limited"];
const MART_CATEGORIES = ["fruits", "dairy", "snacks", "beverages", "instant", "personal", "cleaning", "bakery"];
const ALL_CATEGORIES = { store: STORE_CATEGORIES, mart: MART_CATEGORIES };

router.get("/categories", (_req, res) => {
  res.json(ALL_CATEGORIES);
});

router.post("/upload", upload.array("images", 10), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
  const urls = req.files.map((f) => `/uploads/products/${f.filename}`);
  res.json({ urls });
});

router.get("/profile", (req, res) => {
  res.json(req.user);
});

router.put("/profile", async (req, res) => {
  try {
    const { shopName, shopDescription } = req.body;
    const data = {};
    if (shopName !== undefined) data.shopName = shopName;
    if (shopDescription !== undefined) data.shopDescription = shopDescription;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, shopName: true, shopDescription: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const sellerProducts = await prisma.product.findMany({
      where: { sellerId: req.userId },
      select: { id: true, reviewCount: true },
    });
    const productIds = sellerProducts.map((p) => p.id);
    const totalProducts = sellerProducts.length;

    let totalOrders = 0;
    let totalRevenue = 0;
    let pendingOrders = 0;

    if (productIds.length > 0) {
      const allOrders = await prisma.order.findMany({
        select: { id: true, status: true, totalAmount: true, items: true },
      });
      for (const order of allOrders) {
        if (!Array.isArray(order.items)) continue;
        const hasSellerItem = order.items.some((item) => item.productId && productIds.includes(item.productId));
        if (!hasSellerItem) continue;
        totalOrders++;
        if (order.status !== "cancelled") totalRevenue += order.totalAmount;
        if (order.status === "pending" || order.status === "confirmed") pendingOrders++;
      }
    }

    const topProducts = await prisma.product.findMany({
      where: { sellerId: req.userId },
      orderBy: { reviewCount: "desc" },
      take: 5,
      select: { id: true, name: true, brand: true, price: true, images: true, reviewCount: true, rating: true },
    });

    res.json({ totalProducts, totalOrders, totalRevenue, pendingOrders, topProducts });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, brand: true, category: true, subCategory: true, source: true, price: true, originalPrice: true, description: true, images: true, inStock: true, badge: true, rating: true, reviewCount: true, specifications: true, keyFeatures: true, colorOptions: true, sizeOptions: true },
    });
    res.json(products);
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
    const data = {};
    if (name !== undefined) data.name = name;
    if (brand !== undefined) data.brand = brand;
    if (category !== undefined) data.category = category;
    if (subCategory !== undefined) data.subCategory = subCategory;
    if (source !== undefined) data.source = source;
    if (price !== undefined) data.price = price;
    if (originalPrice !== undefined) data.originalPrice = originalPrice;
    if (description !== undefined) data.description = description;
    if (images !== undefined) data.images = images;
    if (inStock !== undefined) data.inStock = inStock;
    if (badge !== undefined) data.badge = badge;
    if (specifications !== undefined) data.specifications = specifications;
    if (keyFeatures !== undefined) data.keyFeatures = keyFeatures;
    if (colorOptions !== undefined) data.colorOptions = colorOptions;
    if (sizeOptions !== undefined) data.sizeOptions = sizeOptions;
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
      select: { id: true },
    });
    const productIds = sellerProducts.map((p) => p.id);

    if (productIds.length === 0) return res.json([]);

    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, totalAmount: true, items: true, createdAt: true,
        shippingName: true, shippingCity: true,
        userId: true,
      },
    });

    const sellerOrders = [];
    for (const order of allOrders) {
      if (!Array.isArray(order.items)) continue;
      const sellerItems = order.items.filter((item) => {
        if (!item.productId) return false;
        const pid = item.productId.startsWith("db-") ? item.productId.slice(3) : item.productId;
        return productIds.includes(pid);
      });
      if (sellerItems.length === 0) continue;
      sellerOrders.push({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        shippingName: order.shippingName,
        shippingCity: order.shippingCity,
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
    if (!["store", "mart", "mediverse"].includes(source)) return res.status(400).json({ error: "source must be store, mart, or mediverse" });
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
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: req.userId } });
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
