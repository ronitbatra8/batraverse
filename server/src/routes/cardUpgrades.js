const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

const VALID_LEVELS = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
const LEVEL_ORDER = { none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, black: 6 };
const VALID_DURATIONS = ["ONE_MONTH", "THREE_MONTH", "SIX_MONTH"];
const DURATION_DAYS = { ONE_MONTH: 30, THREE_MONTH: 90, SIX_MONTH: 180 };

const LEVEL_PREFIX = {
  none: "BV", bronze: "BZ", silver: "SV", gold: "GL", platinum: "PL", diamond: "DM", black: "BK", owner: "OW",
};
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateCardNumberForLevel(level) {
  const prefix = LEVEL_PREFIX[level] || "BV";
  const randAlpha = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  const randNum = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}-${randAlpha(4)}-${randNum(4)}`;
}

router.get("/pricing", async (req, res) => {
  try {
    const where = { active: true };
    if (req.query.fromLevel) where.fromLevel = req.query.fromLevel;
    if (req.query.toLevel) where.toLevel = req.query.toLevel;
    const pricing = await prisma.cardUpgradePricing.findMany({
      where,
      orderBy: [{ fromLevel: "asc" }, { toLevel: "asc" }, { duration: "asc" }],
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/request", userAuth, async (req, res) => {
  try {
    const { toLevel, duration, paymentMethod } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cardLevel: true, cardExpiry: true } });
    const fromLevel = user.cardLevel || "none";

    if (!VALID_LEVELS.includes(toLevel)) {
      return res.status(400).json({ error: `Invalid toLevel. Must be one of: ${VALID_LEVELS.join(", ")}` });
    }
    if (!VALID_DURATIONS.includes(duration)) {
      return res.status(400).json({ error: `Invalid duration. Must be one of: ${VALID_DURATIONS.join(", ")}` });
    }
    if (LEVEL_ORDER[fromLevel] >= LEVEL_ORDER[toLevel]) {
      return res.status(400).json({ error: "Target level must be higher than your current level" });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const pricing = await prisma.cardUpgradePricing.findUnique({
      where: { fromLevel_toLevel_duration: { fromLevel, toLevel, duration } },
    });
    if (!pricing || !pricing.active) {
      return res.status(404).json({ error: "No active pricing found for this upgrade. Please contact admin." });
    }

    const AUTO_APPROVE_METHODS = ["COD", "UPI_DELIVERY"];
    const isAutoApprove = AUTO_APPROVE_METHODS.includes(paymentMethod);

    const request = await prisma.cardUpgradeRequest.create({
      data: {
        fromLevel,
        toLevel,
        duration,
        price: pricing.price,
        paymentMethod,
        paymentStatus: isAutoApprove ? "APPROVED" : "PENDING",
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
