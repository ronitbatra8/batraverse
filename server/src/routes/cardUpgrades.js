const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");
const { getEffectiveCardLevel } = require("../utils/cardLevel");

const router = express.Router();

const VALID_LEVELS = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
const LEVEL_ORDER = { none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, black: 6 };
const VALID_PAYMENT_METHODS = ["COD", "UPI_DELIVERY", "UPI"];

router.get("/pricing", async (req, res) => {
  try {
    const where = { active: true };
    if (req.query.fromLevel) where.fromLevel = req.query.fromLevel;
    if (req.query.toLevel) where.toLevel = req.query.toLevel;
    const pricing = await prisma.cardUpgradePricing.findMany({
      where,
      orderBy: [{ fromLevel: "asc" }, { toLevel: "asc" }],
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/request", userAuth, async (req, res) => {
  try {
    const { toLevel, paymentMethod, transactionId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { cardLevel: true, walletBalance: true, peakWalletBalance: true, cardExpiry: true },
    });
    const fromLevel = getEffectiveCardLevel(user);
    const currentBalance = user.walletBalance ?? 0;

    if (!VALID_LEVELS.includes(toLevel)) {
      return res.status(400).json({ error: `Invalid toLevel. Must be one of: ${VALID_LEVELS.join(", ")}` });
    }
    if (LEVEL_ORDER[fromLevel] >= LEVEL_ORDER[toLevel]) {
      return res.status(400).json({ error: "Target level must be higher than your current level" });
    }
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(", ")}` });
    }
    if (paymentMethod === "UPI" && (!transactionId || typeof transactionId !== "string" || transactionId.trim().length < 6)) {
      return res.status(400).json({ error: "A valid UPI transaction ID (min 6 characters) is required for online UPI" });
    }

    const pricing = await prisma.cardUpgradePricing.findUnique({
      where: { fromLevel_toLevel: { fromLevel, toLevel } },
    });
    if (!pricing || !pricing.active) {
      return res.status(404).json({ error: "No active pricing found for this upgrade. Please contact admin." });
    }

    const amount = Math.max(pricing.price - currentBalance, 0);
    if (amount < 1) {
      return res.status(400).json({ error: "Your wallet balance already covers this tier. No upgrade needed." });
    }

    const request = await prisma.cardUpgradeRequest.create({
      data: {
        fromLevel,
        toLevel,
        price: amount,
        paymentMethod,
        paymentStatus: "PENDING",
        transactionId: paymentMethod === "UPI" ? transactionId.trim() : null,
        userId: req.userId,
      },
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/my-requests", userAuth, async (req, res) => {
  try {
    const requests = await prisma.cardUpgradeRequest.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
