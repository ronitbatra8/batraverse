const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { SLIM_SELECT, PUBLIC_WHERE } = require("../utils/products");

const router = express.Router();

const ML_URL = process.env.ML_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 1500);
const RRF_K = 60;
const KEYWORD_TAKE = 100;
const REC_MIN = 4; // below this the shelf falls back to popular products

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

/* Small synonym table so natural-language queries still hit typed catalogue
   names ("mobile" → "phone", "fridge" → "refrigerator"). Applied with a lower
   weight than the literal token so exact matches always win. */
const SYNONYMS = {
  phone: ["mobile", "smartphone", "cellphone"],
  mobile: ["phone", "smartphone", "cellphone"],
  smartphone: ["phone", "mobile"],
  cellphone: ["phone", "mobile"],
  laptop: ["notebook", "computer"],
  computer: ["laptop", "pc"],
  pc: ["computer", "laptop"],
  tv: ["television"],
  television: ["tv"],
  fridge: ["refrigerator"],
  refrigerator: ["fridge"],
  shoes: ["footwear", "sneakers"],
  sneakers: ["shoes", "footwear"],
  footwear: ["shoes", "sneakers"],
  watch: ["watches", "wristwatch"],
  watches: ["watch", "wristwatch"],
  earphones: ["earbuds", "headphones"],
  earbuds: ["earphones", "headphones"],
  headphones: ["earphones", "headset"],
  shirt: ["tshirt", "t-shirt", "top"],
  tshirt: ["shirt", "t-shirt"],
  "t-shirt": ["tshirt", "shirt"],
  bag: ["backpack", "handbag"],
  backpack: ["bag"],
  ac: ["airconditioner", "air-conditioner"],
  airconditioner: ["ac"],
};

/* Position-aware field relevance: exact word > word prefix > string prefix >
   compact substring > loose substring. Prefix matching is what makes live
   "op" → "open …" style queries feel instant. */
function fieldScore(field, tok) {
  if (!field) return 0;
  const f = String(field).toLowerCase();
  if (!f) return 0;
  const compact = f.replace(/[^a-z0-9]/g, "");
  const words = f.split(/[^a-z0-9]+/).filter(Boolean);
  if (f === tok) return 6;
  if (words.includes(tok)) return 5;
  if (words.some((w) => w.startsWith(tok))) return 4;
  if (f.startsWith(tok)) return 3;
  if (compact.includes(tok)) return 2;
  if (f.includes(tok)) return 1;
  return 0;
}

function expandTokens(toks) {
  const out = [];
  for (const t of toks) {
    out.push({ token: t, weight: 1 });
    const syn = SYNONYMS[t];
    if (syn) {
      for (const s of syn) {
        if (!toks.includes(s)) out.push({ token: s, weight: 0.45 });
      }
    }
  }
  return out;
}

function keywordScore(p, expanded, phrase) {
  let score = 0;
  const name = p.name || "";
  const brand = p.brand || "";
  const cat = p.category || "";
  const sub = p.subCategory || "";
  const desc = p.description || "";
  for (const { token, weight } of expanded) {
    score +=
      weight *
      (fieldScore(name, token) * 3 +
        fieldScore(brand, token) * 2.2 +
        fieldScore(cat, token) * 1.4 +
        fieldScore(sub, token) * 1.6 +
        fieldScore(desc, token) * 0.5);
  }
  /* Whole-phrase bonus: "iphone 11" beats products that merely contain both
     words in different places. */
  if (phrase.length > 1) {
    const compactName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const compactPhrase = phrase.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compactPhrase && compactName.includes(compactPhrase)) score += 8;
  }
  return score;
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
    const expanded = expandTokens(toks);
    const top = Math.min(Number(req.query.top) || 40, 100);

    const products = await prisma.product.findMany({
      where: { ...PUBLIC_WHERE, inStock: true },
      select: SEARCH_SELECT,
    });

    if (toks.length === 0) return res.json({ products: [], engine: "keyword", count: 0 });

    const keyword = products
      .map((p) => ({ item: p, score: keywordScore(p, expanded, q) }))
      .filter((r) => r.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.item.rating || 0) - (a.item.rating || 0) ||
          (b.item.reviewCount || 0) - (a.item.reviewCount || 0)
      )
      .slice(0, KEYWORD_TAKE)
      .map((r) => r.item);

    const semanticHits = await semanticSearch(q);
    let engine = "keyword";
    if (semanticHits && semanticHits.length > 0) {
      const byId = new Map(products.map((p) => [p.id, p]));
      /* Drop weak semantic neighbours: only keep hits close to the best score
         (and above a floor). Without this, short/unknown queries drag in
         half the catalogue because every product has *some* similarity. */
      const bestScore = Math.max(...semanticHits.map((h) => Number(h.score) || 0));
      const minScore = Math.max(0.3, bestScore - 0.07);
      const semantic = semanticHits
        .filter((h) => h && (h.score == null || Number(h.score) >= minScore))
        .map((h) => byId.get(h.product_id))
        .filter(Boolean)
        .slice(0, RRF_K);
      if (semantic.length > 0) {
        engine = "hybrid";
        const keywordIds = new Set(keyword.map((k) => k.id));
        const semanticOnly = semantic.filter((s) => !keywordIds.has(s.id));
        /* Precision first: keyword hits always lead. Semantic neighbours only
           fill gaps up to a small cap, so an unknown/typo query shows its few
           closest matches instead of dumping the whole catalogue. Very short
           queries (1–2 chars) and strong keyword matches get no filler. */
        const fillCap = q.length < 3 || keyword.length >= 8 ? 0 : 8 - keyword.length;
        const merged = [...keyword, ...semanticOnly.slice(0, fillCap)].slice(0, top);
        res.set("Cache-Control", "public, max-age=60");
        return res.json({ products: merged, engine, count: merged.length });
      }
    }

    res.set("Cache-Control", "public, max-age=60");
    res.json({ products: keyword.slice(0, top), engine, count: keyword.length });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

function parseIdList(raw, limit) {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

/* Personalised "Recommended for you". Signals come from the client (recently
   viewed ids + past search terms + the live query) and, when the caller is
   signed in, their own order history. The ML service blends them into a single
   preference vector and returns nearest catalogue neighbours; if it's offline
   or the user is brand new we fall back to top-rated popular products so the
   shelf is never empty. */
router.get("/recommend", async (req, res) => {
  try {
    const viewed = parseIdList(req.query.viewed, 16);
    const terms = parseIdList(req.query.terms, 8);
    const q = String(req.query.q || "").trim().slice(0, 80);

    let orderedIds = [];
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        if (payload && payload.userId && !payload.purpose) {
          const orders = await prisma.order.findMany({
            where: { userId: payload.userId },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: { items: true },
          });
          const ids = [];
          for (const o of orders) {
            if (!Array.isArray(o.items)) continue;
            for (const it of o.items) {
              if (it && it.productId) ids.push(String(it.productId));
            }
          }
          orderedIds = [...new Set(ids)].slice(0, 40);
        }
      } catch {
        /* anonymous / bad token — just no order signal */
      }
    }

    const hasSignals = viewed.length > 0 || terms.length > 0 || q.length > 0 || orderedIds.length > 0;
    let rankedIds = [];

    if (hasSignals) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ML_TIMEOUT_MS + 700);
      try {
        const mlRes = await fetch(`${ML_URL}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q || null,
            search_terms: terms,
            viewed_ids: viewed,
            ordered_ids: orderedIds,
            top_k: 20,
          }),
          signal: ctrl.signal,
        });
        if (mlRes.ok) {
          const data = await mlRes.json();
          if (Array.isArray(data.results)) rankedIds = data.results.map((r) => String(r.product_id));
        }
      } catch {
        /* ML offline — fall through to popular */
      } finally {
        clearTimeout(timer);
      }
    }

    let products = [];
    if (rankedIds.length > 0) {
      const rows = await prisma.product.findMany({
        where: { id: { in: rankedIds }, ...PUBLIC_WHERE, inStock: true },
        select: SEARCH_SELECT,
      });
      const byId = new Map(rows.map((p) => [p.id, p]));
      products = rankedIds.map((id) => byId.get(id)).filter(Boolean);
    }

    if (products.length < REC_MIN) {
      const popular = await prisma.product.findMany({
        where: { ...PUBLIC_WHERE, inStock: true },
        select: SEARCH_SELECT,
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 20,
      });
      const skip = new Set([...products.map((p) => p.id), ...viewed, ...orderedIds]);
      for (const p of popular) {
        if (products.length >= 20) break;
        if (skip.has(p.id)) continue;
        products.push(p);
      }
    }

    res.set("Cache-Control", "public, max-age=300");
    res.json({ products, engine: rankedIds.length > 0 ? "ml" : "popular" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;