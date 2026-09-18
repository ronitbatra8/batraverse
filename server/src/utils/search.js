/* Zero-dependency relevance search over the product catalog.
   - Field-weighted scoring (name > brand > subcategory > category > description)
   - IDF weighting across the catalog (popular terms matter less)
   - Typo tolerance via bounded Levenshtein distance
   - Prefix/substring partial matches
   - Popularity boost (rating x review count) as a query-independent signal
   - "Did you mean…" suggestion when the result set is thin but a fuzzy rewrite exists
*/

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "set", "of", "in", "on", "at", "to", "from", "new", "by", "best",
]);

function normalize(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[/()\[\]{}'".,!?:;₹$€£]/g, " ");
}

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function docTokens(text) {
  return tokenize(text).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/* Bounded Levenshtein — returns max+1 once the distance exceeds max. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

/* Match strength between a stored term and a query token:
   2.0 exact word, 1.3 prefix, 1.1 suffix/partial, 0.75 fuzzy (typo). */
function matchKind(term, tok) {
  if (term === tok) return 2.0;
  if (tok.length >= 3 && term.startsWith(tok)) return 1.3;
  if (tok.length >= 3 && term.length >= 3 && tok.startsWith(term)) return 1.1;
  if (tok.length >= 4 && term.length >= 4) {
    const maxDist = term.length >= 8 || tok.length >= 8 ? 2 : 1;
    if (editDistance(term, tok, maxDist) <= maxDist) return 0.75;
  }
  return 0;
}

const FIELD_WEIGHTS = {
  name: { weight: 3, exactBoost: 1.15 },
  brand: { weight: 2 },
  sub: { weight: 1.4 },
  category: { weight: 1.1 },
  description: { weight: 0.5 },
};

function buildDocs(products) {
  return products.map((p) => {
    const fields = {
      name: { tokens: docTokens(p.name), weight: FIELD_WEIGHTS.name.weight, exactBoost: FIELD_WEIGHTS.name.exactBoost },
      brand: { tokens: docTokens(p.brand), weight: FIELD_WEIGHTS.brand.weight },
      sub: { tokens: docTokens(p.subCategory), weight: FIELD_WEIGHTS.sub.weight },
      category: { tokens: docTokens(p.category), weight: FIELD_WEIGHTS.category.weight },
      description: { tokens: docTokens(p.description), weight: FIELD_WEIGHTS.description.weight },
    };
    const all = new Set();
    for (const f of Object.values(fields)) for (const t of f.tokens) all.add(t);
    return { product: p, fields, all };
  });
}

function computeIdf(docs, prefix) {
  const df = new Map();
  for (const d of docs) {
    if (prefix && ![d.product.name, d.product.brand].some((s) => s && s.toLowerCase().startsWith(prefix))) continue;
    for (const t of d.all) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = Math.max(docs.length, 1);
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log(1 + N / (1 + c)));
  return idf;
}

function searchCatalog(products, rawQuery, limit = 60) {
  const docs = buildDocs(products);
  const idf = computeIdf(docs);

  const qTokens = tokenize(rawQuery).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  if (qTokens.length === 0) return { results: [], didYouMean: null };

  const scored = [];
  const bestFuzzy = new Map(); // qToken -> strongest fuzzy replacement term
  const fuzzyIdf = new Map(); // qToken -> idf of that replacement

  for (const d of docs) {
    let score = 0;
    let matched = 0;
    let nameExact = false;

    for (const tok of qTokens) {
      let best = 0;
      for (const [fieldName, f] of Object.entries(d.fields)) {
        for (const ft of f.tokens) {
          const k = matchKind(ft, tok);
          if (k === 0) continue;
          const tIdf = idf.get(ft) || 0;
          const s = f.weight * tIdf * k;
          if (s >= best) {
            if (s === best && fieldName !== "name") continue;
            best = s;
            if (fieldName === "name" && ft === tok) nameExact = true;
            if (k === 0.75) {
              if (!bestFuzzy.has(tok) || tIdf > (fuzzyIdf.get(tok) || 0)) {
                bestFuzzy.set(tok, ft);
                fuzzyIdf.set(tok, tIdf);
              }
            }
          }
        }
      }
      if (best > 0) {
        score += best;
        matched++;
      }
    }

    if (matched === 0) continue;

    const coverage = matched / qTokens.length;
    const pop = 1 + (0.4 * (d.product.rating || 0)) / 5 * (1 - Math.exp(-((d.product.reviewCount || 0) || 0) / 30));
    const exact = nameExact ? FIELD_WEIGHTS.name.exactBoost : 1;
    const stock = d.product.inStock === false ? 0.5 : 1;
    score *= (0.5 + 0.5 * coverage) * pop * exact * stock;
    scored.push({ product: d.product, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit).map((s) => s.product);

  /* "Did you mean…": only matters when results are thin and at least one
     token was a fuzzy (typo) rewrite. */
  let didYouMean = null;
  if (results.length <= 3 && bestFuzzy.size > 0) {
    const replaced = qTokens
      .map((t) => (bestFuzzy.has(t) && fuzzyIdf.get(t) > (idf.get(t) || 0) ? bestFuzzy.get(t) : t))
      .join(" ");
    if (replaced && replaced !== normalize(rawQuery).trim()) didYouMean = replaced;
  }

  return { results, didYouMean };
}

/* Autocomplete terms drawn from names, brands, categories and subcategories.
   Prefers exact/prefix matches, then fuzzy — reusing the same match lens. */
function suggestCatalog(products, rawQuery, limit = 8) {
  const tokens = tokenize(rawQuery).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];

  const pool = new Map(); // term -> frequency across catalog
  for (const p of products) {
    for (const text of [p.name, p.brand, p.category, p.subCategory]) {
      for (const t of docTokens(text)) pool.set(t, (pool.get(t) || 0) + 1);
    }
  }

  const scored = [];
  for (const [term, freq] of pool) {
    let best = 0;
    for (const qt of tokens) {
      let k = matchKind(term, qt);
      if (k === 0) continue;
      if (k === 2.0) k = 2.0; // exact
      else if (k === 1.3 || k === 1.1) k = 1.2; // prefix/partial
      else k = 0.6; // fuzzy
      const s = k * (term.length >= qt.length ? 1 : 0.85);
      if (s > best) best = s;
    }
    if (best > 0) scored.push({ term, score: best, freq });
  }

  scored.sort((a, b) => b.score - a.score || b.freq - a.freq);
  const seen = new Set();
  const out = [];
  for (const s of scored) {
    if (seen.has(s.term)) continue;
    seen.add(s.term);
    out.push(s.term);
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = { searchCatalog, suggestCatalog, normalize, tokenize };