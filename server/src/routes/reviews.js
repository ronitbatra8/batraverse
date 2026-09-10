const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

function normalizeProductId(raw) {
  if (!raw) return "";
  return raw.startsWith("db-") ? raw.replace(/^db-/, "") : raw;
}

/* The current user's reviews for a set of products (comma-separated productIds). */
router.get("/mine", userAuth, async (req, res) => {
  try {
    const raw = String(req.query.productIds || "").split(",").map((s) => s.trim()).filter(Boolean);
    const productIds = [...new Set(raw.map(normalizeProductId))];
    if (productIds.length === 0) return res.json([]);
    const reviews = await prisma.review.findMany({
      where: { userId: req.userId, productId: { in: productIds } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/:productId", async (req, res) => {
  try {
    const productId = normalizeProductId(req.params.productId);
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: reviews.length,
      avg: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
      dist: [0, 0, 0, 0, 0],
    };
    for (const r of reviews) stats.dist[r.rating - 1]++;

    res.json({ reviews, stats });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/", userAuth, async (req, res) => {
  try {
    const { rating, title, body } = req.body;
    const productId = normalizeProductId(req.body.productId);
    if (!productId || !rating) {
      return res.status(400).json({ error: "productId and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existing = await prisma.review.findFirst({ where: { userId: req.userId, productId } });
    if (existing) {
      return res.status(409).json({ error: "You have already reviewed this product" });
    }

    const review = await prisma.review.create({
      data: {
        userId: req.userId,
        productId,
        rating,
        comment: body || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: { increment: 1 },
        rating: { increment: 0 },
      },
    });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      const allReviews = await prisma.review.findMany({ where: { productId } });
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      await prisma.product.update({
        where: { id: productId },
        data: { rating: Math.round(avg * 10) / 10 },
      });
    }

    res.json(review);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "You have already reviewed this product" });
    }
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/:id/helpful", async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.update({
      where: { id },
      data: {},
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
