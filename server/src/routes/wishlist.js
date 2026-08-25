const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

router.get("/", userAuth, async (req, res) => {
  try {
    const items = await prisma.wishlist.findMany({
      where: { userId: req.userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/", userAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }
    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.userId, productId } },
    });
    if (existing) {
      return res.json(existing);
    }
    const item = await prisma.wishlist.create({
      data: { userId: req.userId, productId },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/:productId", userAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    await prisma.wishlist.deleteMany({
      where: { userId: req.userId, productId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/", userAuth, async (req, res) => {
  try {
    await prisma.wishlist.deleteMany({ where: { userId: req.userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
