const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const prisma = require("../db");
const { userAuth, customerOnly } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const READY = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const MIN_TOPUP = 50;
const VALID_LEVELS = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
const LEVEL_ORDER = { none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, black: 6 };

const { getEffectiveCardLevel } = require("../utils/cardLevel");

function configMissing(res) {
  return res.status(503).json({
    error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env, restart the server, and set the value of RAZORPAY_KEY_ID as NEXT_PUBLIC_RAZORPAY_KEY_ID in the client .env.local.",
  });
}

function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  return expected === signature;
}

async function createRazorpayOrder(amountPaise, receipt) {
  const auth = Buffer.from(RAZORPAY_KEY_ID + ":" + RAZORPAY_KEY_SECRET).toString("base64");
  const body = JSON.stringify({
    amount: amountPaise,
    currency: "INR",
    receipt: receipt || ("order_receipt_" + Date.now()),
  });
  const rsp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + auth,
    },
    body,
  });
  const data = await rsp.json().catch(() => ({}));
  if (!rsp.ok) {
    const err = new Error(data && data.error && data.error.description ? data.error.description : "Razorpay order creation failed");
    err.status = rsp.status;
    throw err;
  }
  return data;
}

router.get("/keys", userAuth, (req, res) => {
  res.json({ keyId: READY ? RAZORPAY_KEY_ID : null, enabled: READY });
});

router.post("/order-create", userAuth, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { amountPaise, currency, receipt } = req.body || {};
    const amount = Math.round(Number(amountPaise || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount (expected positive integer in paise)" });
    }
    if (currency && currency !== "INR") {
      return res.status(400).json({ error: "Only INR is supported" });
    }
    const data = await createRazorpayOrder(amount, receipt);
    res.json(data);
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/verify", userAuth, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({ error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required and must be valid" });
    }
    res.json({ verified: true, paymentId: razorpayPaymentId });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* --- Wallet top-up via Razorpay ------------------------------------------- */

router.post("/topup-order", userAuth, customerOnly, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const amount = Math.round(Number(req.body?.amount || 0));
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return res.status(400).json({ error: `Minimum top-up is ₹${MIN_TOPUP}` });
    }
    const order = await createRazorpayOrder(amount * 100, "topup_" + Date.now());
    const topUp = await prisma.walletTopUp.create({
      data: {
        userId: req.userId,
        amount,
        paymentMethod: "RAZORPAY",
        transactionId: "RZP:" + order.id,
        status: "PENDING",
      },
    });
    res.status(201).json({ order, topUpId: topUp.id });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/topup-verify", userAuth, customerOnly, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({ error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required and must be valid" });
    }
    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: req.userId, transactionId: "RZP:" + razorpayOrderId },
    });
    if (!topUp) {
      return res.status(404).json({ error: "Top-up request not found for this payment" });
    }
    if (topUp.status === "APPROVED") {
      return res.json({ message: "Top-up already credited", topUp });
    }
    if (topUp.status !== "PENDING") {
      return res.status(400).json({ error: `Top-up is already processed (${topUp.status})` });
    }
    const walletUser = await prisma.user.findUnique({ where: { id: topUp.userId }, select: { walletBalance: true, peakWalletBalance: true } });
    const newBalance = walletUser.walletBalance + topUp.amount;
    const [updatedTopUp] = await prisma.$transaction([
      prisma.walletTopUp.update({
        where: { id: topUp.id },
        data: { status: "APPROVED", adminNote: "Razorpay payment " + razorpayPaymentId, processedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: topUp.userId },
        data: {
          walletBalance: { increment: topUp.amount },
          ...(newBalance > walletUser.peakWalletBalance ? { peakWalletBalance: newBalance } : {}),
        },
      }),
    ]);
    res.json({ message: `₹${topUp.amount} credited to your wallet`, newBalance, topUp: updatedTopUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* --- Card upgrade via Razorpay -------------------------------------------- */

router.post("/upgrade-order", userAuth, customerOnly, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { toLevel } = req.body || {};
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { cardLevel: true, walletBalance: true, peakWalletBalance: true, cardExpiry: true, role: true },
    });
    const fromLevel = getEffectiveCardLevel(user);
    const currentBalance = user.walletBalance ?? 0;

    if (!VALID_LEVELS.includes(toLevel)) {
      return res.status(400).json({ error: `Invalid toLevel. Must be one of: ${VALID_LEVELS.join(", ")}` });
    }
    if (LEVEL_ORDER[fromLevel] >= LEVEL_ORDER[toLevel]) {
      return res.status(400).json({ error: "Target level must be higher than your current level" });
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

    const order = await createRazorpayOrder(amount * 100, "upgrade_" + Date.now());
    const request = await prisma.cardUpgradeRequest.create({
      data: {
        fromLevel,
        toLevel,
        price: amount,
        paymentMethod: "RAZORPAY",
        paymentStatus: "PENDING",
        transactionId: "RZP:" + order.id,
        status: "PENDING",
        userId: req.userId,
      },
    });
    res.status(201).json({ order, upgradeId: request.id });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/upgrade-verify", userAuth, customerOnly, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({ error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required and must be valid" });
    }
    const request = await prisma.cardUpgradeRequest.findFirst({
      where: { userId: req.userId, transactionId: "RZP:" + razorpayOrderId },
    });
    if (!request) {
      return res.status(404).json({ error: "Upgrade request not found for this payment" });
    }
    if (request.status === "APPROVED") {
      return res.json({ message: "Upgrade already processed", upgrade: request });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ error: `Upgrade is already processed (${request.status})` });
    }
    const now = new Date();
    const walletUser = await prisma.user.findUnique({ where: { id: request.userId }, select: { walletBalance: true, peakWalletBalance: true } });
    const newBalance = walletUser.walletBalance + request.price;
    const [updated] = await prisma.$transaction([
      prisma.cardUpgradeRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", paymentStatus: "APPROVED", processedAt: now },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: {
          walletBalance: { increment: request.price },
          ...(newBalance > walletUser.peakWalletBalance ? { peakWalletBalance: newBalance } : {}),
        },
      }),
    ]);
    res.json({
      message: `₹${request.price} credited to your wallet and your card upgraded`,
      newBalance,
      cardLevel: getEffectiveCardLevel({ ...walletUser, walletBalance: newBalance, peakWalletBalance: Math.max(walletUser.peakWalletBalance, newBalance) }),
      upgrade: updated,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;