require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");
const newsletterRoutes = require("./routes/newsletter");
const messageRoutes = require("./routes/messages");
const privateViewingRoutes = require("./routes/privateViewing");
const authRoutes = require("./routes/auth");
const addressRoutes = require("./routes/addresses");
const orderRoutes = require("./routes/orders");
const cardUpgradeRoutes = require("./routes/cardUpgrades");
const cartRoutes = require("./routes/cart");
const deliveryRoutes = require("./routes/delivery");
const sellerRoutes = require("./routes/seller");
const categoryRoutes = require("./routes/categories");
const wishlistRoutes = require("./routes/wishlist");
const reviewRoutes = require("./routes/reviews");
const testimonialRoutes = require("./routes/testimonials");
const walletRoutes = require("./routes/wallet");

const app = express();

const path = require("path");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: Number(process.env.AUTH_LIMIT_MAX || 20), message: { error: "Too many requests, please try again later" } });
const strictAuthLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: Number(process.env.AUTH_STRICT_LIMIT_MAX || 30), message: { error: "Too many requests, please try again later" } });

app.get("/", (req, res) => res.json({ name: "BATRAVERSE API", status: "ok" }));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Public spotlight ads endpoint
const { PrismaClient } = require("@prisma/client");
const _prisma = new PrismaClient();
app.get("/api/spotlight-ads", async (req, res) => {
  try {
    const page = req.query.page || "home";
    const ads = await _prisma.spotlightAd.findMany({
      where: { active: true, page },
      orderBy: { sortOrder: "asc" },
    });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load ads" });
  }
});

app.get("/api/featured", async (req, res) => {
  try {
    const featured = await _prisma.featuredProduct.findMany({ orderBy: { sortOrder: "asc" } });
    if (featured.length === 0) return res.json([]);
    const products = await _prisma.product.findMany({
      where: { id: { in: featured.map((f) => f.productId) } },
      select: { id: true, name: true, brand: true, category: true, price: true, originalPrice: true, images: true, colorOptions: true, sizeOptions: true, source: true, inStock: true, rating: true, reviewCount: true },
    });
    const imageOf = (images, colorOptions) => {
      if (Array.isArray(images) && images[0]) return images[0];
      if (Array.isArray(colorOptions)) {
        return colorOptions.map((c) => (Array.isArray(c.images) ? c.images[0] : typeof c.images === "string" ? c.images : null)).find(Boolean) || "";
      }
      return "";
    };
    const priceOf = (p) => {
      const colorOptions = Array.isArray(p.colorOptions) ? p.colorOptions : [];
      const sizeOptions = p.sizeOptions && typeof p.sizeOptions === "object" && !Array.isArray(p.sizeOptions) ? p.sizeOptions : {};
      const firstName = (colorOptions[0] && colorOptions[0].name) || "";
      const firstSizes = sizeOptions[firstName] || Object.values(sizeOptions)[0] || [];
      let price = p.price;
      let originalPrice = p.originalPrice;
      if (!price || price <= 0) {
        if (firstSizes[0] && firstSizes[0].price > 0) {
          price = firstSizes[0].price;
          originalPrice = firstSizes[0].originalPrice || originalPrice;
        } else if (colorOptions[0] && colorOptions[0].price > 0) {
          price = colorOptions[0].price;
          originalPrice = colorOptions[0].originalPrice || originalPrice;
        }
      }
      return { price: price || 0, originalPrice };
    };
    const byId = new Map();
    for (const p of products) {
      const { price, originalPrice } = priceOf(p);
      byId.set(p.id, {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category || "uncategorized",
        price,
        originalPrice,
        image: imageOf(p.images, p.colorOptions),
        href: `/store/db-${p.id}`,
        source: p.source || "store",
        inStock: p.inStock,
      });
    }
    res.json(featured.map((f) => byId.get(f.productId)).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load featured" });
  }
});

app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/private-viewing", privateViewingRoutes);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", strictAuthLimiter);
app.use("/api/auth/send-otp", strictAuthLimiter);
app.use("/api/auth/verify-otp", strictAuthLimiter);
app.use("/api/auth/verify-reset-code", strictAuthLimiter);
app.use("/api/auth/reset-password", strictAuthLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/card-upgrades", cardUpgradeRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/wallet", walletRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BATRAVERSE API listening on http://localhost:${PORT}`);
});
