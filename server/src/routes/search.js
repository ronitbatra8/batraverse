const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { SLIM_SELECT, PUBLIC_WHERE } = require("../utils/products");

const router = express.Router();

const ML_URL = process.env.ML_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 1500);
const RRF_K = 60;
const KEYWORD_TAKE = 100;

const SEARCH_SELECT = {
  ...SLIM_SELECT,
  description: true,
};

function tokenize(q) {
  return String(q || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function inField(field, tok) {
  if (!field) return false;
  const f = field.toLowerCase();
  if (f.includes(tok)) return true;
  const fc = f.replace(/[^a-z0-9]/g, "");
  if (fc.includes(tok)) return true;
  if (tok.length >= 4 && f.split(/\s+/).some((w) => w.startsWith(tok))) return true;
  return false;
}

function keywordScore(p, toks) {
  let score = 0;
  for (const t of toks) {
    const name = p.name || "";
    const brand = p.brand || "";
    const cat = p.category || "";
    const sub = p.subCategory || "";
    const desc = p.description || "";
    const nameLower = name.toLowerCase();
    if (inField(name, t)) score += 3;
    if (nameLower.split(/\s+/).includes(t)) score += 2;
    if (inField(brand, t)) score += 2;
    if (inField(cat, t)) score += 1.2;
    if (inField(sub, t)) score += 1.4;
    if (inField(desc, t)) score += 0.6;
  }
  return score;
}

/* Reciprocal Rank Fusion: combine two ranked lists by position so a product
   does well when EITHER keyword or semantic ranking (or both) likes it.
   Products ranked by BOTH get a bonus — precise keyword + semantic agreement
   is worth more than either alone. */
function mergeRanked(keyword, semantic) {
  const kwSet = new Set(keyword.map((k) => k.id));
  const semSet = new Set(semantic.map((s) => s.id));
  const scores = new Map();
  const push = (list) => {
    list.forEach((item, i) => {
      const key = item.id;
      const add = 1 / (RRF_K + i + 1);
      scores.set(key, { id: key, rrf: (scores.get(key)?.rrf || 0) + add, item });
    });
  };
  push(keyword);
  push(semantic);
  return [...scores.values()]
    .map((e) => ({ ...e, rrf: kwSet.has(e.id) && semSet.has(e.id) ? e.rrf * 1.35 : e.rrf }))
    .sort(
      (a, b) => b.rrf - a.rrf || (b.item.rating || 0) - (a.item.rating || 0) || (b.item.reviewCount || 0) - (a.item.reviewCount || 0)
    );
}

async function semanticSearch(query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: RRF_K }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ products: [], engine: "keyword", count: 0 });

    const toks = tokenize(q);
    const top = Math.min(Number(req.query.top) || 40, 100);

    const products = await prisma.product.findMany({
      where: { ...PUBLIC_WHERE, inStock: true },
      select: SEARCH_SELECT,
    });

    if (toks.length === 0) return res.json({ products: [], engine: "keyword", count: 0 });

    const keyword = products
      .map((p) => ({ item: p, score: keywordScore(p, toks) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, KEYWORD_TAKE)
      .map((r) => r.item);

    const semanticHits = await semanticSearch(q);
    let engine = "keyword";
    if (semanticHits && semanticHits.length > 0) {
      const byId = new Map(products.map((p) => [p.id, p]));
      const semantic = semanticHits
        .map((h) => byId.get(h.product_id))
        .filter(Boolean)
        .slice(0, RRF_K);
      if (semantic.length > 0) {
        engine = "ml";
        const merged = mergeRanked(keyword, semantic).slice(0, top);
        res.set("Cache-Control", "public, max-age=60");
        return res.json({ products: merged.map((m) => m.item), engine, count: merged.length });
      }
    }

    res.set("Cache-Control", "public, max-age=60");
    res.json({ products: keyword.slice(0, top), engine, count: keyword.length });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;