const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { slimProduct } = require("../utils/products");
const { recommend, trackView } = require("../utils/recommend");

const router = express.Router();

/* Hybrid personalised recommendations. Accepted params:
   userId, visitorId (at least one), source (store|mart, optional), limit. */
router.get("/", async (req, res) => {
  try {
    const { userId, visitorId, source } = req.query;
    const limit = Math.min(Number(req.query.limit) || 10, 30);
    const products = await recommend({
      prisma,
      userId: userId || null,
      visitorId: visitorId || null,
      source: source || null,
      limit,
    });
    res.set("Cache-Control", "no-store");
    res.json(products.map(slimProduct));
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* Record a product view (feeding personalisation). Deduped server-side. */
router.post("/track", async (req, res) => {
  try {
    const { productId, userId, visitorId } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });
    const recorded = await trackView(prisma, { productId, userId: userId || null, visitorId: visitorId || null });
    res.json({ ok: true, recorded });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;