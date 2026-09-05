const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

const MIN_TOPUP = 50;

const LEVEL_THRESHOLDS = [
  { level: "black", min: 30000 },
  { level: "diamond", min: 15000 },
  { level: "platinum", min: 5000 },
  { level: "gold", min: 1500 },
  { level: "silver", min: 500 },
  { level: "bronze", min: 100 },
  { level: "none", min: 0 },
];

function levelFromBalance(balance) {
  for (const t of LEVEL_THRESHOLDS) {
    if (balance >= t.min) return t.level;
  }
  return "none";
}

router.get("/balance", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { walletBalance: true, peakWalletBalance: true, cardLevel: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const level = user.cardLevel === "owner" ? "owner" : levelFromBalance(user.peakWalletBalance || 0);
    res.json({ balance: user.walletBalance, peakBalance: user.peakWalletBalance || 0, level });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/topup", userAuth, async (req, res) => {
  try {
    const { amount, transactionId, upiId } = req.body;

    if (!amount || typeof amount !== "number" || amount < MIN_TOPUP) {
      return res.status(400).json({ error: `Minimum top-up is ₹${MIN_TOPUP}` });
    }
    if (!transactionId || typeof transactionId !== "string" || transactionId.trim().length < 6) {
      return res.status(400).json({ error: "Valid UPI transaction ID is required" });
    }

    const existing = await prisma.walletTopUp.findFirst({
      where: { userId: req.userId, transactionId: transactionId.trim() },
    });
    if (existing) {
      return res.status(400).json({ error: "This transaction ID has already been submitted" });
    }

    const topUp = await prisma.walletTopUp.create({
      data: {
        userId: req.userId,
        amount,
        transactionId: transactionId.trim(),
        upiId: upiId?.trim() || null,
      },
    });

    res.status(201).json({ message: "Top-up request submitted. Waiting for admin approval.", topUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/my-topups", userAuth, async (req, res) => {
  try {
    const topUps = await prisma.walletTopUp.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(topUps);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/admin/pending", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const pending = await prisma.walletTopUp.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/admin/approve/:topUpId", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const { topUpId } = req.params;
    const { adminNote } = req.body;

    const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
    if (!topUp) return res.status(404).json({ error: "Top-up request not found" });
    if (topUp.status !== "PENDING") return res.status(400).json({ error: "Request already processed" });

    const walletUser = await prisma.user.findUnique({ where: { id: topUp.userId }, select: { walletBalance: true, peakWalletBalance: true } });
    const newBalance = walletUser.walletBalance + topUp.amount;
    const [updatedTopUp] = await prisma.$transaction([
      prisma.walletTopUp.update({
        where: { id: topUpId },
        data: { status: "APPROVED", adminNote: adminNote || null, processedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: topUp.userId },
        data: {
          walletBalance: { increment: topUp.amount },
          ...(newBalance > walletUser.peakWalletBalance ? { peakWalletBalance: newBalance } : {}),
        },
      }),
    ]);

    res.json({ message: `₹${topUp.amount} credited to user wallet`, topUp: updatedTopUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/admin/reject/:topUpId", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const { topUpId } = req.params;
    const { adminNote } = req.body;

    const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
    if (!topUp) return res.status(404).json({ error: "Top-up request not found" });
    if (topUp.status !== "PENDING") return res.status(400).json({ error: "Request already processed" });

    const updated = await prisma.walletTopUp.update({
      where: { id: topUpId },
      data: { status: "REJECTED", adminNote: adminNote || null, processedAt: new Date() },
    });

    res.json({ message: "Top-up request rejected", topUp: updated });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/admin/credit", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const { userId, amount } = req.body;
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId is required" });
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: "Amount must be a positive number" });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true, peakWalletBalance: true } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const newBalance = target.walletBalance + num;
    const [topUp] = await prisma.$transaction([
      prisma.walletTopUp.create({
        data: {
          userId,
          amount: num,
          transactionId: `ADMIN:${Date.now()}`,
          status: "APPROVED",
          adminNote: "Manual credit by owner",
          processedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: num },
          ...(newBalance > target.peakWalletBalance ? { peakWalletBalance: newBalance } : {}),
        },
      }),
    ]);

    res.json({ message: `₹${num} credited to wallet`, newBalance, topUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/admin/all", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const { status, page = "1", limit = "20" } = req.query;
    const where = {};
    if (status) where.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [topUps, total] = await prisma.$transaction([
      prisma.walletTopUp.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.walletTopUp.count({ where }),
    ]);

    res.json({ topUps, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
