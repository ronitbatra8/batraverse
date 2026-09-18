const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { SLIM_SELECT, slimProduct, PUBLIC_WHERE } = require("../utils/products");
const { searchCatalog, suggestCatalog, normalize } = require("../utils/search");

const router = express.Router();

/* Ranked relevance search across the public catalog. */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const source = req.query.source === "store" || req.query.source === "mart" ? req.query.source : null;
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    if (!q) return res.json({ query: "", total: 0, results: [], didYouMean: null, terms: [], filters: null, chips: [], relaxed: false, autoCorrected: false, originalQuery: "" });

    const products = await prisma.product.findMany({
      where: { ...PUBLIC_WHERE, ...(source ? { source } : {}) },
      select: SLIM_SELECT,
    });
    const { results, total, didYouMean, terms, filters, chips, relaxed, autoCorrected, correctedQuery, originalQuery } = searchCatalog(products, q, limit);

    /* Never let a search page look empty: offer a corrected word, related
       popular products, and autocomplete terms instead. */
    let related = [];
    let suggestions = [];
    if (results.length === 0) {
      related = topPopular(products, 8).map(slimProduct);
      suggestions = suggestCatalog(products, q, 6);
    }

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      query: q,
      total,
      results: results.map(slimProduct),
      didYouMean,
      terms,
      filters,
      chips,
      relaxed,
      autoCorrected,
      correctedQuery,
      originalQuery,
      related,
      suggestions,
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

/* Record a search: one trending-log row, plus the user's own recent search. */
router.post("/log", async (req, res) => {
  try {
    const raw = String((req.body && req.body.q) || "").trim();
    const userId = String((req.body && req.body.userId) || "");
    const visitorId = String((req.body && req.body.visitorId) || "");
    const q = cleanLogQuery(raw);
    if (!q) return res.json({ ok: true, logged: false });

    const ownerKey = userId || (visitorId ? `visitor:${visitorId}` : "");
    await prisma.searchLog.create({ data: { query: q, ownerKey: ownerKey || null } });
    if (ownerKey) {
      await prisma.recentSearch.upsert({
        where: { ownerKey_query: { ownerKey, query: q } },
        create: { ownerKey, query: q },
        update: { createdAt: new Date() },
      });
    }
    res.json({ ok: true, logged: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* The user's own recent searches, newest first, deduped. */
router.get("/recent", async (req, res) => {
  try {
    const ownerKey = ownerKeyFromParams(req);
    if (!ownerKey) return res.json([]);
    const rows = await prisma.recentSearch.findMany({
      where: { ownerKey },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { query: true },
    });
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      if (seen.has(r.query)) continue;
      seen.add(r.query);
      out.push(r.query);
      if (out.length >= 8) break;
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* Remove one recent search (or all of them when no query is given). */
router.delete("/recent", async (req, res) => {
  try {
    const ownerKey = ownerKeyFromParams(req);
    if (!ownerKey) return res.json({ ok: true });
    const q = cleanLogQuery(String(req.query.query || ""));
    await prisma.recentSearch.deleteMany({ where: q ? { ownerKey, query: q } : { ownerKey } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* Trending searches: most-searched queries over the last 7 days. */
router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 15);
    const gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const grouped = await prisma.searchLog.groupBy({
      by: ["query"],
      where: { createdAt: { gte } },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 60,
    });
    const out = grouped
      .filter((g) => g.query.length >= 3 && !/^\d+$/.test(g.query))
      .slice(0, limit)
      .map((g) => g.query);
    res.set("Cache-Control", "public, max-age=120");
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

function ownerKeyFromParams(req) {
  const userId = String(req.query.userId || "").trim();
  const visitorId = String(req.query.visitorId || "").trim();
  return userId || (visitorId ? `visitor:${visitorId}` : "");
}

/* Normalise a query for the log/recent tables: case-folded, spaces collapsed. */
function cleanLogQuery(raw) {
  const q = normalize(raw).replace(/\s+/g, " ").trim();
  if (!q || q.length < 2 || /^\d+$/.test(q)) return "";
  return q;
}

/* Query-independent popularity: strong rating × review volume. */
function topPopular(products, n) {
  return products
    .filter((p) => p.inStock !== false)
    .sort((a, b) => {
      const sa = (a.rating || 0) * Math.log10(1 + (a.reviewCount || 0));
      const sb = (b.rating || 0) * Math.log10(1 + (b.reviewCount || 0));
      return sb - sa;
    })
    .slice(0, n);
}

module.exports = router;