/* Zero-dependency relevance search over the product catalog.
   - Field-weighted scoring (name > brand > subcategory > category > description)
   - IDF weighting across the catalog (popular terms matter less)
   - Typo tolerance via bounded Levenshtein distance
   - Prefix/substring partial matches
   - Popularity boost (rating x review count) as a query-independent signal
   - "Did you mean…" suggestion when the result set is thin but a fuzzy rewrite exists
   - Storefront query understanding: budgets ("under10000"), price ranges
     ("5000-10000"), minimum discount ("30% off"), "top rated", "new arrivals"
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

/* Split letter-letter hyphens too ("t-shirts" -> [t, shirts], "off-white" ->
   [off, white]) so compound product names and categories tokenize cleanly.
   Digit-hyphen runs like "5000-10000" and "5k-10k" stay intact for the
   price-range parser. */
function tokenize(text) {
  return normalize(text)
    .replace(/([A-Za-z])-([A-Za-z])/g, "$1 $2")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function docTokens(text) {
  return tokenize(text).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

const BUDGET_WORDS = new Set(["under", "below", "upto", "up", "max", "less", "cheaper", "within", "budget", "around"]);
const SIZE_CONTEXT_WORDS = new Set(["size", "sized", "sizes", "sizee", "fit", "fitting"]);

/* Attribute vocabulary the storefront understands: colors, sizes, audience
   (men/women/kids/unisex) and product types ("tee" → t-shirt, "denim" → jeans).
   The parser pulls these out of a free-form query so "black t shirt" becomes
   color=black + type=t-shirt instead of three loose search words. */
const COLORS = new Set([
  "black", "white", "grey", "gray", "navy", "blue", "red", "green", "yellow", "pink",
  "purple", "orange", "brown", "beige", "tan", "cream", "ivory", "maroon", "burgundy",
  "teal", "aqua", "cyan", "magenta", "silver", "gold", "copper", "bronze", "rose",
  "olive", "khaki", "indigo", "violet", "lavender", "peach", "coral", "turquoise",
  "mustard", "charcoal", "multicolor", "multicolour", "rainbow", "camo", "camouflage",
  "checkered", "striped", "mocha", "taupe", "rust", "plum", "wine",
]);
const COLOR_PHRASES = [
  "navy blue", "royal blue", "sky blue", "baby blue", "light blue", "dark blue",
  "steel blue", "powder blue", "off white", "cream white", "ivory white", "pearl white",
  "charcoal grey", "charcoal gray", "light grey", "light gray", "dark grey", "dark gray",
  "gun grey", "rose gold", "champagne gold", "olive green", "forest green", "army green",
  "mint green", "lime green", "sea green", "pastel pink", "baby pink", "hot pink",
  "blush pink", "maroon red", "brick red", "crimson red", "mustard yellow", "solid black",
];
const COLOR_PHRASES_SORTED = [...COLOR_PHRASES].sort((a, b) => b.length - a.length);

const SIZES = new Set(["xs", "xxs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl", "5xl", "os"]);
const SIZE_PHRASES = new Set([
  "extra small", "extra large", "double xl", "triple xl", "one size", "free size",
]);
const SIZE_CANON = {
  xs: "xs", xxs: "xs", xsmall: "xs", "extra small": "xs",
  s: "s", small: "s",
  m: "m", medium: "m", med: "m",
  l: "l", large: "l",
  xl: "xl", xlarge: "xl", "extra large": "xl",
  xxl: "xxl", "2xl": "xxl", "2x": "xxl", xxxl: "xxl", "3xl": "xxl", "3x": "xxl",
  "4xl": "4xl", "4x": "4xl", "5xl": "4xl",
  os: "os", onesize: "os", "one size": "os", freesize: "os", "free size": "os",
};

const GENDERS = new Map([
  ["men", "men"], ["man", "men"], ["male", "men"], ["mens", "men"], ["gents", "men"],
  ["women", "women"], ["woman", "women"], ["female", "women"], ["womens", "women"],
  ["ladies", "women"], ["girls", "women"],
  ["kids", "kids"], ["kid", "kids"], ["child", "kids"], ["children", "kids"],
  ["boys", "boys"], ["boy", "boys"], ["unisex", "unisex"],
]);

/* Product-type synonyms: a query word ("tee", "denim") plus the category words
   on the product record ("t-shirts", "sneakers") both resolve to one canon. */
const TYPE_SYNONYMS = {
  "t-shirt": ["tee", "tees", "tshirt", "tshirts"],
  shirt: ["shirt", "shirts"],
  jeans: ["jeans", "denim", "denims", "jeggings"],
  sneaker: ["sneaker", "sneakers", "trainer", "trainers", "running shoes", "runners"],
  shoe: ["shoe", "shoes", "heels", "flat", "flats"],
  boots: ["boot", "boots"],
  sandals: ["sandal", "sandals", "slides", "slippers", "chappals"],
  dress: ["dress", "dresses", "gown", "gowns", "kurti", "anarkali", "lehenga", "saree", "sari", "ethnic"],
  kurta: ["kurta", "kurtas", "pajama", "pajamas", "pyjama"],
  jacket: ["jacket", "jackets", "windbreaker", "bomber", "hoodie", "hoodies", "sweatshirt",
    "sweatshirts", "sweater", "sweaters", "cardigan", "cardigans", "pullover", "pullovers",
    "coat", "coats", "overcoat", "blazer", "blazers"],
  hat: ["hat", "hats", "cap", "caps", "beanie", "beanies", "snapback"],
  shorts: ["shorts", "short", "trackpants", "sweatpants", "joggers"],
  trouser: ["trouser", "trousers", "pants", "chinos", "cargo"],
};
const FASHION_TYPES = new Set(["t-shirt", "shirt", "jeans", "sneaker", "shoe", "boots", "sandals", "dress", "kurta", "jacket", "hat", "shorts", "trouser"]);

const TYPE_WORD = new Map();
for (const [type, words] of Object.entries(TYPE_SYNONYMS)) {
  for (const w of words) {
    for (const t of tokenize(w)) if (t.length > 1) TYPE_WORD.set(t, type);
  }
}

/* "10k" -> 10000, "2m" -> 2,000,000; raw decimals allowed. null when not an amount. */
function amountToken(tok) {
  const m = String(tok).match(/^(\d+(?:\.\d+)?)(k|m)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (m[2] && m[2].toLowerCase() === "k") return n * 1000;
  if (m[2] && m[2].toLowerCase() === "m") return n * 1e6;
  return n;
}

/* Understanding layer for storefront-style queries:
   - "watches under10000" / "below 2k" / "up to 15000"  -> soft price ceiling
   - "watches 5000-10000" / "5k-10k"                    -> hard price range
   - "watches 30% off" / "30%off"                       -> hard minimum discount
   - "top rated", "new arrivals", "newest"              -> ranking biases
   - "black t shirt"                                    -> color + type attributes
   - "xs sized men t shirt" / "men size 40"             -> size + audience attrs
   Returns the clean subject tokens plus every constraint it recognised. */
function parseQuery(rawQuery) {
  const tokens = tokenize(rawQuery);
  /* Look-ahead: does the query mention any apparel/footwear type or audience
     anywhere? Sizes like "m"/"40" only make sense in that context ("m tshirt",
     "medium dress"), but the type can come after the size in the sentence, so
     we can't wait until the loop has already parsed it. */
  const fashionHint = tokens.some(
    (tk, i) =>
      GENDERS.has(tk) ||
      (tk === "t" && (tokens[i + 1] === "shirt" || tokens[i + 1] === "shirts")) ||
      (TYPE_WORD.has(tk) && FASHION_TYPES.has(TYPE_WORD.get(tk)))
  );
  let maxPrice = null;
  let rangeMin = null;
  let rangeMax = null;
  let minDiscount = null;
  let topRated = false;
  let newArrivals = false;
  const colors = [];
  const sizes = [];
  const genders = [];
  const types = [];
  const chips = [];
  const kept = [];
  const termWords = [];

  /* amount token (optionally k/m-suffixed) plus any following pure-digit run. */
  const consumeAmount = (first, from) => {
    let digits = first.replace(/(k|m)$/i, "");
    let j = from;
    while (j < tokens.length && /^\d+$/.test(tokens[j])) {
      digits += tokens[j];
      j++;
    }
    let n;
    if (first.toLowerCase().endsWith("k")) n = parseFloat(digits) * 1000;
    else if (first.toLowerCase().endsWith("m")) n = parseFloat(digits) * 1e6;
    else n = parseFloat(digits);
    if (isNaN(n) || n <= 0) return null;
    return { n, next: j, used: tokens.slice(from, j) };
  };

  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i];

    /* price range "5000-10000" / "5k-10k" */
    const rangeTok = t.match(/^(\d+(?:\.\d+)?k?)[-\u2010-\u2015](\d+(?:\.\d+)?k?)$/i);
    if (rangeTok) {
      const a = amountToken(rangeTok[1]);
      const b = amountToken(rangeTok[2]);
      if (a != null && b != null && a > 0 && b >= a) {
        if (rangeMin == null || a < rangeMin) rangeMin = a;
        if (rangeMax == null || b > rangeMax) rangeMax = b;
        chips.push({ kind: "range", min: a, max: b, tokens: [t] });
        i++;
        continue;
      }
    }

    /* discount "30% off", "30%", "30%off" */
    let pct = null;
    let offNext = false;
    const pctGlued = t.match(/^(\d{1,3})%off$/i);
    if (pctGlued) pct = parseInt(pctGlued[1], 10);
    else {
      const pctTok = t.match(/^(\d{1,3})%$/i);
      if (pctTok) {
        pct = parseInt(pctTok[1], 10);
        if (tokens[i + 1] === "off" || tokens[i + 1] === "discount") offNext = true;
      }
    }
    if (pct != null && pct > 0 && pct <= 100) {
      if (minDiscount == null || pct > minDiscount) minDiscount = pct;
      chips.push({ kind: "discount", pct, tokens: offNext ? [t, tokens[i + 1]] : [t] });
      i += offNext ? 2 : 1;
      continue;
    }

    /* budget ceiling: glued ("under10000") or split ("below 2k", "up to 15000") */
    const glued = t.match(/^(under|below|upto|max|less|cheaper|within|budget|around)(\d{1,9}k?)$/i);
    if (glued && amountToken(glued[2])) {
      const res = consumeAmount(glued[2].toLowerCase(), i + 1);
      if (res) {
        if (maxPrice == null || res.n < maxPrice) maxPrice = res.n;
        chips.push({ kind: "under", num: res.n, tokens: [t, ...res.used] });
        i = res.next;
        continue;
      }
    }
    const isUpTo = t === "up" && tokens[i + 1] === "to";
    const amountIdx = isUpTo ? i + 2 : i + 1;
    const hasBudgetAfter = isUpTo
      ? !!(tokens[amountIdx] && amountToken(tokens[amountIdx]))
      : BUDGET_WORDS.has(t) && !!(tokens[amountIdx] && amountToken(tokens[amountIdx]));
    if (hasBudgetAfter) {
      const res = consumeAmount(tokens[amountIdx].toLowerCase(), amountIdx + 1);
      if (res) {
        if (maxPrice == null || res.n < maxPrice) maxPrice = res.n;
        const used = isUpTo ? ["up", "to", tokens[amountIdx], ...res.used] : [t, tokens[amountIdx], ...res.used];
        chips.push({ kind: "under", num: res.n, tokens: used });
        i = res.next;
        continue;
      }
    }

    /* "top rated" / "best rated" / "toprated" */
    if (/^(top|best|highest)[-\u2010-\u2015.]?rated$/i.test(t)) {
      topRated = true;
      chips.push({ kind: "toprated" });
      i++;
      continue;
    }
    if ((t === "top" || t === "best" || t === "highest") && tokens[i + 1] === "rated") {
      topRated = true;
      chips.push({ kind: "toprated" });
      i += 2;
      continue;
    }

    /* "new arrivals", "newest", "latest" */
    const gluedNew = t.match(/^new[\-\u2010-\u2015]?arrivals?$/i);
    if (gluedNew) {
      newArrivals = true;
      chips.push({ kind: "new" });
      i++;
      continue;
    }
    if (t === "new" || t === "newest" || t === "latest") {
      const next = tokens[i + 1];
      if (t === "new" && (next === "arrival" || next === "arrivals")) {
        newArrivals = true;
        chips.push({ kind: "new" });
        i += 2;
        continue;
      }
      if (t === "newest" || t === "latest") {
        newArrivals = true;
        chips.push({ kind: "new" });
        i++;
        continue;
      }
      /* "new" alone stays a real search word ("new balance") */
    }

    /* ---- attribute layer ---- */

    /* product type bigram "t shirt" / "t shirts" */
    if (t === "t" && (tokens[i + 1] === "shirt" || tokens[i + 1] === "shirts")) {
      types.push({ canonical: "t-shirt", tokens: [t, tokens[i + 1]] });
      chips.push({ kind: "type", type: "t-shirt", tokens: [t, tokens[i + 1]] });
      termWords.push("shirt");
      i += 2;
      continue;
    }

    /* single-word types ("tee", "denim", "dress", "hat", "boots"…) */
    if (t.length > 1 && TYPE_WORD.has(t)) {
      const canonical = TYPE_WORD.get(t);
      types.push({ canonical, tokens: [t] });
      chips.push({ kind: "type", type: canonical, tokens: [t] });
      termWords.push(t);
      i++;
      continue;
    }

    /* colors — longest phrase first ("navy blue"), then single words */
    let colPhrase = null;
    for (const phr of COLOR_PHRASES_SORTED) {
      const pwords = phr.split(" ");
      if (pwords.length <= 3 && tokens.slice(i, i + pwords.length).join(" ") === phr) {
        colPhrase = phr;
        break;
      }
    }
    if (colPhrase) {
      const pwords = colPhrase.split(" ");
      colors.push({ words: pwords, tokens: tokens.slice(i, i + pwords.length) });
      chips.push({ kind: "color", color: pwords.join(" "), tokens: tokens.slice(i, i + pwords.length) });
      for (const w of pwords) termWords.push(w);
      i += pwords.length;
      continue;
    }
    if (COLORS.has(t)) {
      colors.push({ words: [t], tokens: [t] });
      chips.push({ kind: "color", color: t, tokens: [t] });
      termWords.push(t);
      i++;
      continue;
    }

    /* audience: "men", "men's" (→ "men", "s"), "women", "kids", "unisex" */
    if (GENDERS.has(t)) {
      let glean = i + 1;
      if (tokens[glean] === "s") glean++; /* possessive "men's" */
      genders.push({ canonical: GENDERS.get(t), tokens: tokens.slice(i, glean) });
      chips.push({ kind: "gender", gender: GENDERS.get(t), tokens: tokens.slice(i, glean) });
      termWords.push(GENDERS.get(t));
      i = glean;
      continue;
    }

    /* sizes — "extra small"/"one size" phrases, then words/letters/numerics.
       Letter + numeric sizes only count when the query is clearly about
       clothing/footwear (a fashion type or audience word is present, or the
       token is a size word like "size"/"sized"). Otherwise they stay subjects. */
    if (SIZE_PHRASES.has(`${t} ${tokens[i + 1] || ""}`)) {
      const two = `${t} ${tokens[i + 1]}`;
      const canonical = SIZE_CANON[two];
      sizes.push({ canonical, tokens: [t, tokens[i + 1]] });
      chips.push({ kind: "size", size: canonical, tokens: [t, tokens[i + 1]] });
      termWords.push(canonical);
      i += 2;
      continue;
    }
    if (SIZE_CONTEXT_WORDS.has(t)) {
      i++;
      continue;
    }
    const fashionOn =
      types.length > 0 && types.some((ty) => FASHION_TYPES.has(ty.canonical));
    const ctx = fashionOn || fashionHint || genders.length > 0 || SIZE_CONTEXT_WORDS.has(tokens[i + 1]);
    const canon = SIZE_CANON[t];
    const numericSize = /^\d{1,2}$/.test(t) && Number(t) >= 1 && Number(t) <= 15;
    if ((canon || numericSize) && ctx) {
      const canonical = canon || t;
      sizes.push({ canonical, tokens: [t] });
      chips.push({ kind: "size", size: canonical, tokens: [t] });
      termWords.push(canonical);
      i++;
      continue;
    }

    kept.push(t);
    termWords.push(t);
    i++;
  }

  return {
    tokens: kept,
    terms: termWords.filter((tw) => tw.length > 1 && !STOP_WORDS.has(tw)),
    maxPrice,
    rangeMin,
    rangeMax,
    minDiscount,
    topRated,
    newArrivals,
    colors,
    sizes,
    genders,
    types,
    chips,
  };
}

/* Smallest real price a customer can pay for a product: top-level sell
   price first, else the cheapest color/size variant (0 = genuinely free). */
function effectiveMinPrice(p) {
  const cands = [];
  const push = (n) => {
    if (typeof n === "number" && isFinite(n)) cands.push(n);
    else if (n != null && isFinite(Number(n))) cands.push(Number(n));
  };
  push(p.price);
  if (Array.isArray(p.colorOptions)) for (const c of p.colorOptions) push(c && c.price);
  if (p.sizeOptions && typeof p.sizeOptions === "object") {
    for (const sizes of Object.values(p.sizeOptions)) {
      if (sizes && typeof sizes === "object") {
        for (const v of Object.values(sizes)) push(v);
      }
    }
  }
  const positive = cands.filter((n) => n > 0);
  return positive.length > 0 ? Math.min(...positive) : cands.length > 0 ? Math.min(...cands) : 0;
}

/* Round discount percentage vs the original price (0 when none/original absent). */
function discountPct(p) {
  const orig = p && p.originalPrice != null ? Number(p.originalPrice) : 0;
  const cur = effectiveMinPrice(p);
  if (!orig || orig <= cur || cur <= 0) return 0;
  return Math.round(((orig - cur) / orig) * 100);
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
    const maxDist = term.length >= 8 || tok.length >= 8 ? 2 : term.length >= 5 && tok.length >= 5 ? 2 : 1;
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

/* Attribute words a product actually offers, gathered from its name, category,
   subcategory, color variants and size options. Used to match query attributes. */
function attrVocab(p) {
  const nameToks = tokenize(p.name);
  const subToks = tokenize(p.subCategory);
  const catToks = tokenize(p.category);
  const vTok = [];
  if (Array.isArray(p.colorOptions)) for (const c of p.colorOptions) if (c && c.name) vTok.push(...tokenize(c.name));
  if (p.sizeOptions && typeof p.sizeOptions === "object") for (const k of Object.keys(p.sizeOptions)) vTok.push(...tokenize(k));
  const allToks = [...nameToks, ...subToks, ...catToks, ...vTok];
  const attrColors = new Set(allToks.filter((tk) => COLORS.has(tk)));
  const attrSizes = new Set(
    allToks
      .map((tk) => {
        if (SIZE_CANON[tk]) return SIZE_CANON[tk];
        if (/^\d{1,2}$/.test(tk)) {
          const n = Number(tk);
          if (n >= 1 && n <= 15) return tk;
        }
        return null;
      })
      .filter(Boolean)
  );
  const attrGenders = new Set(allToks.filter((tk) => GENDERS.has(tk)).map((tk) => GENDERS.get(tk)));
  const attrTypes = new Set(allToks.filter((tk) => TYPE_WORD.has(tk)).map((tk) => TYPE_WORD.get(tk)));
  /* Hyphen-split "t-shirts" -> ["t", "shirts"]; stitch them back into the
     canonical "t-shirt" type so attribute matching stays precise. */
  if (allToks.includes("t") && allToks.some((tk) => TYPE_WORD.get(tk) === "shirt")) {
    attrTypes.add("t-shirt");
  }
  return { attrColors, attrSizes, attrGenders, attrTypes };
}

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
    return { product: p, fields, all, ...attrVocab(p) };
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

/* ---- spelling correction layer ------------------------------------------
   Handles the mistakes real shoppers make: dropped/extra letters, transposed
   or guessed characters ("tshit" -> "tshirt", "sneker" -> "sneakers",
   "addidas" -> "adidas"). The vocabulary is the catalog itself plus every
   known attribute word, so corrections always point at real products. */

function buildCatalogVocab(docs) {
  const vocab = new Map();
  const boost = Math.max(Math.floor(docs.length * 0.15), 5);
  for (const d of docs) {
    for (const t of d.all) vocab.set(t, (vocab.get(t) || 0) + 1);
  }
  /* Known-good terms get a frequency bump so a typo like "tshits" prefers the
     dictionary form over a rarer doc token spelled a letter or two away. */
  for (const t of COLORS) vocab.set(t, (vocab.get(t) || 0) + boost);
  for (const t of Object.keys(SIZE_CANON)) vocab.set(t, (vocab.get(t) || 0) + boost);
  for (const t of TYPE_WORD.keys()) vocab.set(t, (vocab.get(t) || 0) + boost);
  for (const [t] of GENDERS) vocab.set(t, (vocab.get(t) || 0) + boost);
  return vocab;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* A token already covered by an exact or prefix match does not need fixing. */
function hasVocabCoverage(tok, vocab) {
  if (tok.length < 3) return true;
  for (const term of vocab.keys()) {
    if (term.length > tok.length && term.startsWith(tok)) return true;
  }
  return false;
}

/* Best correction for an unknown token: nearest catalog word (edit distance
   bounded by 1 for short tokens, 2 otherwise), ties broken by frequency so we
   prefer the common term. Returns null when nothing is close. */
function correctToken(tok, vocab) {
  if (tok.length < 4) return null;
  const maxDist = tok.length >= 5 ? 2 : 1;
  let bestDist = maxDist + 1;
  const cands = [];
  for (const [term, df] of vocab) {
    if (term.length < 3) continue;
    if (Math.abs(term.length - tok.length) > maxDist) continue;
    const dist = editDistance(term, tok, maxDist);
    if (dist > maxDist) continue;
    if (dist < bestDist) {
      bestDist = dist;
      cands.length = 0;
    }
    if (dist === bestDist) cands.push({ term, df });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.df - a.df);
  const best = cands[0].term;
  return best === tok ? null : best;
}

function searchCatalog(products, rawQuery, limit = 60) {
  const docs = buildDocs(products);
  const idf = computeIdf(docs);
  const vocab = buildCatalogVocab(docs);

  /* Spelling pass: any subject token the catalog doesn't know gets rewritten
     to its nearest real term, then the whole query is re-parsed so the fix
     feeds attribute understanding ("tshits" -> "tshirt" -> type t-shirt). */
  let parse = parseQuery(rawQuery);
  const corrections = new Map();
  for (const tok of parse.tokens) {
    if (tok.length < 4 || vocab.has(tok) || hasVocabCoverage(tok, vocab)) continue;
    const c = correctToken(tok, vocab);
    if (c) corrections.set(tok, c);
  }
  let correctedQuery = null;
  if (corrections.size > 0) {
    let rebuilt = rawQuery;
    for (const [orig, corr] of corrections) {
      rebuilt = rebuilt.replace(new RegExp(`\\b${escapeRegExp(orig)}\\b`, "gi"), corr);
    }
    if (rebuilt.trim() !== rawQuery.trim()) {
      correctedQuery = rebuilt.trim();
      parse = parseQuery(correctedQuery);
    }
  }

  const { tokens: qTokens, terms, maxPrice, rangeMin, rangeMax, minDiscount, topRated, newArrivals, colors, sizes, genders, types, chips } = parse;
  const filtered = qTokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  const attrCount = colors.length + sizes.length + genders.length + types.length;
  const hasAttrs = attrCount > 0;
  const hasConstraint = topRated || newArrivals || maxPrice > 0 || rangeMin || rangeMax || minDiscount > 0;
  if (filtered.length === 0 && !hasConstraint && !hasAttrs) {
    return { results: [], total: 0, didYouMean: correctedQuery, terms: [], filters: { under: maxPrice, rangeMin, rangeMax, discount: minDiscount, topRated, newArrivals, colors: [], sizes: [], genders: [], types: [] }, chips, relaxed: false, autoCorrected: !!correctedQuery, correctedQuery, originalQuery: rawQuery };
  }
  const hasSubjects = filtered.length > 0;

  const scored = [];
  const bestFuzzy = new Map();
  const fuzzyIdf = new Map();

  const colorHits = (d) =>
    colors.filter((c) => c.words.some((w) => d.attrColors.has(w))).length;
  const sizeHits = (d) => sizes.filter((sz) => d.attrSizes.has(sz.canonical)).length;
  const genderHits = (d) => genders.filter((g) => d.attrGenders.has(g.canonical)).length;
  const typeHits = (d) => types.filter((ty) => d.attrTypes.has(ty.canonical)).length;

  for (const d of docs) {
    let score = 0;
    let matched = 0;
    let nameExact = false;

    for (const tok of filtered) {
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

    /* Subjects must be matched when present; a pure-attribute query keeps any
       product that satisfies at least one attribute. */
    const cHits = colorHits(d);
    const sHits = sizeHits(d);
    const gHits = genderHits(d);
    const tHits = typeHits(d);
    const attrHits = cHits + sHits + gHits + tHits;
    if (hasSubjects && matched === 0) continue;
    if (!hasSubjects && hasAttrs && attrHits === 0) continue;

    let base;
    if (!hasSubjects) {
      base = 1;
    } else {
      const coverage = matched / filtered.length;
      const pop = 1 + (0.4 * (d.product.rating || 0)) / 5 * (1 - Math.exp(-((d.product.reviewCount || 0) || 0) / 30));
      const exact = nameExact ? FIELD_WEIGHTS.name.exactBoost : 1;
      const stock = d.product.inStock === false ? 0.5 : 1;
      base = (0.5 + 0.5 * coverage) * pop * exact * stock;
    }

    /* "top rated watches": strongly favour better-reviewed products. */
    if (topRated) base *= 1 + (0.7 * (d.product.rating || 0)) / 5;

    /* "new arrivals": new-badged items jump to the top, others fall back. */
    if (newArrivals) base *= /new/i.test(d.product.badge || "") ? 1.6 : 0.35;

    /* Price ceiling (e.g. "watches under10000"): products inside the budget
       come first — cheaper in-budget matches rank ahead of ones near the cap —
       while over-budget products still appear, just lower. */
    let fits = true;
    if (maxPrice != null) {
      const price = effectiveMinPrice(d.product);
      fits = price <= maxPrice;
      if (fits) {
        base *= 1 + 0.5 * (1 - (price > 0 ? price : 1) / maxPrice);
      }
    }

    /* Attribute match bonus: type matches matter most, then color/audience/size. */
    const attrBonus = cHits * 2.2 + sHits * 1.6 + gHits * 1.4 + tHits * 3.0;
    const attrAll = attrCount === 0 || attrHits === attrCount;

    const finalScore = (hasSubjects ? score * base : base) + attrBonus;
    scored.push({ product: d.product, score: finalScore, fits, attrAll });
  }

  /* Hard constraints (price range, minimum discount) genuinely filter the list.
     If nothing survives them, relax back to the full set so the page never
     looks empty — marked `relaxed` so the UI can say so. */
  const hasHard = rangeMin != null || rangeMax != null || minDiscount != null;
  let pool = scored;
  let relaxed = false;
  if (hasHard) {
    const pass = scored.filter((s) => {
      const price = effectiveMinPrice(s.product);
      if (rangeMin != null && price < rangeMin) return false;
      if (rangeMax != null && price > rangeMax) return false;
      if (minDiscount != null && discountPct(s.product) < minDiscount) return false;
      return true;
    });
    if (pass.length > 0) {
      pool = pass;
    } else {
      pool = scored;
      relaxed = true;
    }
  }

  /* Attribute queries: products satisfying every attribute win the top block,
     partial matches (closest colours/sizes/types) follow. When nothing matches
     every attribute we still show the closest picks, flagged as relaxed. */
  if (hasAttrs && pool.length > 0 && !pool.some((s) => s.attrAll)) relaxed = true;

  pool.sort(
    (a, b) =>
      Number(b.attrAll) - Number(a.attrAll) ||
      Number(b.fits) - Number(a.fits) ||
      b.score - a.score
  );
  const total = pool.length;
  const results = pool.slice(0, limit).map((s) => s.product);

  /* "Did you mean…": a spelling correction wins outright; otherwise only
     matters when results are thin and at least one token was a fuzzy rewrite. */
  let didYouMean = correctedQuery;
  if (!didYouMean && results.length <= 3 && bestFuzzy.size > 0) {
    const replaced = filtered
      .map((t) => (bestFuzzy.has(t) && fuzzyIdf.get(t) > (idf.get(t) || 0) ? bestFuzzy.get(t) : t))
      .join(" ");
    if (replaced && replaced !== normalize(rawQuery).trim()) didYouMean = replaced;
  }

  return {
    results,
    total,
    didYouMean,
    terms,
    filters: {
      under: maxPrice,
      rangeMin,
      rangeMax,
      discount: minDiscount,
      topRated,
      newArrivals,
      colors: colors.map((c) => c.words.join(" ")),
      sizes: sizes.map((s) => s.canonical),
      genders: genders.map((g) => g.canonical),
      types: types.map((t) => t.canonical),
    },
    chips,
    relaxed,
    autoCorrected: !!correctedQuery,
    correctedQuery,
    originalQuery: rawQuery,
  };
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

module.exports = { searchCatalog, suggestCatalog, parseQuery, normalize, tokenize };