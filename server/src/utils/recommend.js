/* Zero-dependency personalised recommendations.
   Hybrid scorer that mixes, per candidate product:
   - co-purchase signal (collaborative filtering over approved orders):
     "users who bought X also bought Y" — cosine-style co-occurrence
   - content similarity to the user's history (category/subcategory/brand/price band)
   - popularity fallback for cold start / sparse users

   All caching is in-memory with a short TTL; nothing is trained or stored.
*/

const { PUBLIC_WHERE, SLIM_SELECT } = require("./products");

const CO_TTL = 10 * 60 * 1000; // co-purchase map is stale after 10 min
let coCache = null;

function pairWeight(orders) {
  const pair = new Map(); // id -> Map(otherId -> co-occurrence count)
  const freq = new Map(); // id -> number of orders containing it
  for (const o of orders) {
    let items = [];
    try {
      items = Array.isArray(o.items) ? o.items : [];
    } catch {
      items = [];
    }
    const ids = [...new Set(items.map((i) => i && i.productId).filter(Boolean))];
    for (const id of ids) freq.set(id, (freq.get(id) || 0) + 1);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        if (!pair.has(a)) pair.set(a, new Map());
        if (!pair.has(b)) pair.set(b, new Map());
        pair.get(a).set(b, (pair.get(a).get(b) || 0) + 1);
        pair.get(b).set(a, (pair.get(b).get(a) || 0) + 1);
      }
    }
  }
  return { pair, freq };
}

/* Co-purchase map built once per TTL from approved orders. */
async function getCoPurchase(prisma) {
  if (coCache && Date.now() - coCache.at < CO_TTL) return coCache.data;
  const orders = await prisma.order.findMany({
    where: { paymentStatus: "APPROVED" },
    select: { items: true },
  });
  const data = pairWeight(orders);
  coCache = { at: Date.now(), data };
  return data;
}

function addWeight(map, id, w) {
  if (!id) return;
  map.set(id, (map.get(id) || 0) + w);
}

function viewWhere(userId, visitorId, since) {
  const base = { createdAt: { gte: since } };
  if (userId && visitorId) return { ...base, OR: [{ userId }, { visitorId }] };
  if (userId) return { ...base, userId };
  if (visitorId) return { ...base, visitorId };
  return null;
}

/* Weighted history of everything the user engaged with:
   orders (3x qty) > wishlist (2x) > cart (1.5x) > recent views (0.6x, recency-decayed). */
async function getUserHistory(prisma, userId, visitorId) {
  const hist = new Map();
  if (userId) {
    const orders = await prisma.order.findMany({
      where: { userId, paymentStatus: "APPROVED" },
      select: { items: true },
      take: 200,
    });
    for (const o of orders) {
      let items = [];
      try {
        items = Array.isArray(o.items) ? o.items : [];
      } catch {
        items = [];
      }
      for (const it of items) addWeight(hist, it && it.productId, 3 * (Number(it && it.quantity) || 1));
    }
    const wish = await prisma.wishlist.findMany({ where: { userId }, select: { productId: true }, take: 200 });
    for (const w of wish) addWeight(hist, w.productId, 2);
    const cart = await prisma.cartItem.findMany({ where: { userId }, select: { productId: true }, take: 200 });
    for (const c of cart) addWeight(hist, c.productId, 1.5);
  }
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const vw = (userId || visitorId) ? viewWhere(userId || null, visitorId || null, since) : null;
  if (vw) {
    const views = await prisma.productView.findMany({
      where: vw,
      select: { productId: true, createdAt: true },
      take: 300,
    });
    for (const v of views) {
      const daysAgo = (Date.now() - v.createdAt.getTime()) / (24 * 3600 * 1000);
      addWeight(hist, v.productId, 0.6 * Math.exp(-daysAgo / 12));
    }
  }
  return hist;
}

function valueOf(p, dim) {
  switch (dim) {
    case "category":
      return p.category || null;
    case "sub":
      return p.subCategory || null;
    case "brand":
      return p.brand || null;
    case "band": {
      const v = Math.floor((p.price || 0) / 500);
      return v >= 0 ? `b${v}` : null;
    }
    default:
      return null;
  }
}

function buildDims(histProducts, history) {
  const dims = { category: new Map(), sub: new Map(), brand: new Map(), band: new Map() };
  for (const p of histProducts) {
    const w = history.get(p.id) || 1;
    for (const dim of Object.keys(dims)) {
      const key = valueOf(p, dim);
      if (key != null) dims[dim].set(key, (dims[dim].get(key) || 0) + w);
    }
  }
  return dims;
}

function popularity(p) {
  return (p.rating || 0) / 5 * (1 - Math.exp(-((p.reviewCount || 0) || 0) / 30));
}

function popularitySort(a, b) {
  const pa = (a.rating || 0) * Math.log1p((a.reviewCount || 0) + 1);
  const pb = (b.rating || 0) * Math.log1p((b.reviewCount || 0) + 1);
  return pb - pa;
}

async function recommend({ prisma, userId, visitorId, source, limit = 10 }) {
  const src = source === "store" || source === "mart" ? source : null;
  const catalog = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, ...(src ? { source: src } : {}) },
    select: SLIM_SELECT,
  });

  const history = await getUserHistory(prisma, userId || null, visitorId || null);
  if (history.size === 0) {
    return catalog.filter((p) => p.inStock).sort(popularitySort).slice(0, limit);
  }

  const co = await getCoPurchase(prisma);
  const histIds = Array.from(history.keys());
  const histById = new Set(histIds);
  const histProducts = catalog.filter((p) => histById.has(p.id));
  const dims = buildDims(histProducts, history);
  const totalHistWeight = Array.from(history.values()).reduce((s, w) => s + w, 0) || 1;

  const scored = [];
  for (const p of catalog) {
    if (!p.inStock) continue;
    if (histById.has(p.id)) continue;

    /* Collaborative: strongest normalized co-occurrence with any history item. */
    let coScore = 0;
    for (const hid of histIds) {
      const w = history.get(hid) || 0;
      const coW = (co.pair.get(hid) && co.pair.get(hid).get(p.id)) || 0;
      if (coW > 0) {
        const sim = coW / Math.sqrt((co.freq.get(hid) || 1) * (co.freq.get(p.id) || 1));
        if (w * sim > coScore) coScore = w * sim;
      }
    }

    /* Content: shared category/subcategory/brand/price-band weight vs history. */
    let contentRaw = 0;
    for (const dim of Object.keys(dims)) {
      const key = valueOf(p, dim);
      if (key != null) contentRaw += dims[dim].get(key) || 0;
    }
    const contentScore = contentRaw / totalHistWeight;

    const popScore = popularity(p);
    const score = 0.55 * coScore + 0.35 * contentScore + 0.1 * popScore;
    scored.push({ product: p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.product);
}

/* Record a product view (deduped to one per user/visitor per hour). */
async function trackView(prisma, { productId, userId, visitorId }) {
  if (!productId) return false;
  if (!userId && !visitorId) return false;
  const product = await prisma.product.findUnique({
    where: { id: String(productId) },
    select: { id: true, status: true, baseProductId: true },
  });
  if (!product || product.status !== "approved" || product.baseProductId) return false;

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const vw = viewWhere(userId || null, visitorId || null, since);
  const recent = vw
    ? await prisma.productView.findFirst({ where: { ...vw, productId: product.id } })
    : null;
  if (recent) return false;

  await prisma.productView.create({
    data: { productId: product.id, userId: userId || null, visitorId: visitorId || null },
  });
  return true;
}

module.exports = { recommend, trackView, getUserHistory, getCoPurchase };