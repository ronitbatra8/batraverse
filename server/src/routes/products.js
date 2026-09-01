const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { SLIM_SELECT, FULL_SELECT, slimProduct } = require("../utils/products");

const router = express.Router();

/* Single product (FULL detail) and — with ?related=true — lightweight
   same-category picks. Detail pages use this instead of re-downloading the
   entire catalog. */
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: FULL_SELECT,
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.set("Cache-Control", "public, max-age=300");
    if (req.query.related === "true") {
      const related = await prisma.product.findMany({
        where: { source: product.source, category: product.category, id: { not: product.id } },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 10,
        select: SLIM_SELECT,
      });
      return res.json({ product, related: related.map(slimProduct) });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;