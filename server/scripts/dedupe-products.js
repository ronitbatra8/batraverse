const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function backup() {
  const dir = path.join(__dirname, "..", "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `pre-dedup-${stamp}.json`);
  const products = await prisma.product.findMany();
  const reviews = await prisma.review.findMany();
  const wishlists = await prisma.wishlist.findMany();
  fs.writeFileSync(file, JSON.stringify({ products, reviews, wishlists }, null, 2));
  console.log("Backup written:", file);
  return file;
}

async function main() {
  await backup();

  const all = await prisma.product.findMany();
  const byName = {};
  for (const p of all) {
    if (!byName[p.name]) byName[p.name] = [];
    byName[p.name].push(p);
  }

  let keepCount = 0;
  let deleteCount = 0;
  let repointReviews = 0;
  let repointWishlists = 0;
  let updatedRatings = 0;

  for (const [name, rows] of Object.entries(byName)) {
    if (rows.length === 1) {
      keepCount++;
      // Still recompute rating/reviewCount for consistency?
      continue;
    }

    // Canonical: prefer the row with the most reviews; tiebreak higher rating; then lexicographically smallest id.
    const canonical = [...rows].sort((a, b) => {
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })[0];

    const dupIds = rows.filter((r) => r.id !== canonical.id).map((r) => r.id);
    if (dupIds.length === 0) {
      keepCount++;
      continue;
    }

    // Re-point reviews & wishlists from duplicate ids to the canonical id.
    const rRes = await prisma.review.updateMany({
      where: { productId: { in: dupIds } },
      data: { productId: canonical.id },
    });
    const wRes = await prisma.wishlist.updateMany({
      where: { productId: { in: dupIds } },
      data: { productId: canonical.id },
    });
    repointReviews += rRes.count;
    repointWishlists += wRes.count;

    // Recompute canonical rating/reviewCount from all merged reviews.
    const merged = await prisma.review.findMany({ where: { productId: canonical.id } });
    const reviewCount = merged.length;
    const rating = reviewCount > 0
      ? Math.round((merged.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;
    await prisma.product.update({
      where: { id: canonical.id },
      data: { rating, reviewCount },
    });
    updatedRatings++;

    // Delete duplicate rows.
    const del = await prisma.product.deleteMany({ where: { id: { in: dupIds } } });
    deleteCount += del.count;
    keepCount++;
  }

  console.log(`Done. kept=${keepCount} deleted=${deleteCount} repointedReviews=${repointReviews} repointedWishlists=${repointWishlists} recomputedRatings=${updatedRatings}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
