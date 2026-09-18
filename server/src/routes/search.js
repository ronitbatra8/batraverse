const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { SLIM_SELECT, slimProduct, PUBLIC_WHERE } = require("../utils/products");
const { searchCatalog, suggestCatalog } = require("../utils/search");

const router = express.Router();

/* Ranked relevance search across the public catalog. */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const source = req.query.source === "store" || req.query.source === "mart" ? req.query.source : null;
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    if (!q) return res.json({ query: "", total: 0, results: [], didYouMean: null });

    const products = await prisma.product.findMany({
      where: { ...PUBLIC_WHERE, ...(source ? { source } : {}) },
      select: SLIM_SELECT,
    });
    const { results, didYouMean } = searchCatalog(products, q, limit);

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      query: q,
      total: results.length,
      results: results.map(slimProduct),
      didYouMean,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* Autocomplete terms. */
router.get("/suggest", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    if (!q) return res.json([]);

    const products = await prisma.product.findMany({
      where: { ...PUBLIC_WHERE },
      select: { name: true, brand: true, category: true, subCategory: true },
    });
    res.set("Cache-Control", "public, max-age=60");
    res.json(suggestCatalog(products, q, limit));
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;