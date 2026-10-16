const express = require("express");
const prisma = require("../db");
const { PUBLIC_WHERE } = require("../utils/products");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

/* Lightweight, public payload for the storefront's /sitemap.xml. Returns only
   the store category/subcategory slugs and the approved store product ids +
   createdAt — everything needed to build every indexable storefront URL
   without shipping full product payloads. Mart is intentionally excluded. */
router.get("/", async (_req, res) => {
  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { active: true, source: "store" },
        select: {
          slug: true,
          subcategories: {
            where: { active: true },
            select: { slug: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { ...PUBLIC_WHERE, source: "store" },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
    ]);
    res.set("Cache-Control", "public, max-age=600");
    res.json({ categories, products });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
