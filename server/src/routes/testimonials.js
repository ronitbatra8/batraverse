const express = require("express");
const prisma = require("../db");

const router = express.Router();

// Public: active testimonials, ordered for display on the home page.
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.testimonial.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        source: true,
        quote: true,
        name: true,
        role: true,
        avatar: true,
        rating: true,
        productName: true,
      },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to load testimonials" });
  }
});

module.exports = router;
