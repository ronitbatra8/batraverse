const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

router.get("/", userAuth, async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/sync", userAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "items array is required" });
    }

    const existing = await prisma.cartItem.findMany({ where: { userId: req.userId } });
    const existingMap = new Map(existing.map((e) => [`${e.productId}::${e.color || ""}::${e.size || ""}`, e]));

    const ops = [];
    const seen = new Set();

    for (const item of items) {
      const key = `${item.productId}::${item.color || ""}::${item.size || ""}`;
      seen.add(key);
      const existingItem = existingMap.get(key);

      if (existingItem) {
        ops.push(
          prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { qty: item.qty || existingItem.qty, price: item.price || existingItem.price, image: item.image || existingItem.image, source: item.source || existingItem.source },
          })
        );
      } else {
        ops.push(
          prisma.cartItem.create({
            data: {
              userId: req.userId,
              productId: item.productId,
              name: item.name,
              price: item.price,
              color: item.color || null,
              colorHex: item.colorHex || null,
              image: item.image || null,
              size: item.size || null,
              source: item.source || null,
              qty: item.qty || 1,
            },
          })
        );
      }
    }

    for (const [key, existingItem] of existingMap) {
      if (!seen.has(key)) {
        ops.push(prisma.cartItem.delete({ where: { id: existingItem.id } }));
      }
    }

    await prisma.$transaction(ops);

    const updated = await prisma.cartItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(updated);
  } catch (err) {
    console.error("Cart sync error:", err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/", userAuth, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
