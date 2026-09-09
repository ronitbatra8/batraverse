const express = require("express");
const prisma = require("../db");
const { userAuth, customerOnly } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");
const { getEffectiveCardLevel } = require("../utils/cardLevel");

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

router.get("/balance", userAuth, customerOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { walletBalance: true, peakWalletBalance: true, cardLevel: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const level = getEffectiveCardLevel(user);
    res.json({ balance: user.walletBalance, peakBalance: user.peakWalletBalance || 0, level });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/topup", userAuth, customerOnly, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, upiId } = req.body;

    if (!amount || typeof amount !== "number" || amount < MIN_TOPUP) {
      return res.status(400).json({ error: `Minimum top-up is ₹${MIN_TOPUP}` });
    }

    const method = paymentMethod || "UPI";
    if (!["COD", "UPI_DELIVERY", "UPI"].includes(method)) {
      return res.status(400).json({ error: "Invalid payment method. Must be one of: COD, UPI_DELIVERY, UPI" });
    }
    if (method === "UPI" && (!transactionId || typeof transactionId !== "string" || transactionId.trim().length < 6)) {
      return res.status(400).json({ error: "Valid UPI transaction ID is required for online UPI" });
    }

    if (transactionId && typeof transactionId === "string" && transactionId.trim()) {
      const existing = await prisma.walletTopUp.findFirst({
        where: { userId: req.userId, transactionId: transactionId.trim() },
      });
      if (existing) {
        return res.status(400).json({ error: "This transaction ID has already been submitted" });
      }
    }

    const topUp = await prisma.walletTopUp.create({
      data: {
        userId: req.userId,
        amount,
        paymentMethod: method,
        transactionId: transactionId && typeof transactionId === "string" ? transactionId.trim() : null,
        upiId: upiId?.trim() || null,
      },
    });

    res.status(201).json({ message: "Top-up request submitted. Waiting for admin approval.", topUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/my-topups", userAuth, customerOnly, async (req, res) => {
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

router.get("/my-history", userAuth, customerOnly, async (req, res) => {
  try {
    const [topUps, upgrades] = await Promise.all([
      prisma.walletTopUp.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.cardUpgradeRequest.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const entries = [
      ...topUps.map((t) => {
        const isManual = (t.transactionId || "").startsWith("ADMIN:");
        if (isManual) {
          return {
            id: t.id,
            kind: t.amount < 0 ? "manual_debit" : "manual_credit",
            amount: t.amount,
            status: t.status,
            paymentMethod: t.paymentMethod || null,
            transactionId: t.transactionId || null,
            note: t.adminNote || null,
            createdAt: t.createdAt,
          };
        }
        return {
          id: t.id,
          kind: "topup",
          amount: t.amount,
          status: t.status,
          paymentMethod: t.paymentMethod || null,
          transactionId: t.transactionId || null,
          note: t.adminNote || null,
          createdAt: t.createdAt,
        };
      }),
      ...upgrades.map((u) => ({
        id: u.id,
        kind: "upgrade",
        amount: u.price,
        status: u.status,
        paymentMethod: u.paymentMethod || null,
        transactionId: u.transactionId || null,
        levelFrom: u.fromLevel,
        levelTo: u.toLevel,
        note: u.note || null,
        createdAt: u.createdAt,
      })),
    ];

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(entries);
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
    const newPeak = Math.max(target.peakWalletBalance, newBalance);
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

    res.json({ message: `₹${num} credited to wallet`, newBalance, peakWalletBalance: newPeak, topUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/admin/debit", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const { userId, amount } = req.body;
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId is required" });
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: "Amount must be a positive number" });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true, peakWalletBalance: true } });
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.walletBalance < num) return res.status(400).json({ error: "Amount exceeds current balance" });

    const newBalance = target.walletBalance - num;
    const [topUp] = await prisma.$transaction([
      prisma.walletTopUp.create({
        data: {
          userId,
          amount: -num,
          transactionId: `ADMIN:${Date.now()}`,
          status: "APPROVED",
          adminNote: "Manual debit by owner",
          processedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: num } },
      }),
    ]);

    res.json({ message: `₹${num} debited from wallet`, newBalance, topUp });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/admin/history", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });

    const [topUps, upgrades] = await Promise.all([
      prisma.walletTopUp.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.cardUpgradeRequest.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const entries = [
      ...topUps.map((t) => {
        const isManual = (t.transactionId || "").startsWith("ADMIN:");
        if (isManual) {
          return {
            id: t.id,
            kind: t.amount < 0 ? "manual_debit" : "manual_credit",
            amount: t.amount,
            status: t.status,
            transactionId: t.transactionId || null,
            note: t.adminNote || null,
            createdAt: t.createdAt,
            userId: t.userId,
            user: t.user,
          };
        }
        return {
          id: t.id,
          kind: "topup",
          amount: t.amount,
          status: t.status,
          paymentMethod: t.paymentMethod || null,
          transactionId: t.transactionId || null,
          note: t.adminNote || null,
          createdAt: t.createdAt,
          userId: t.userId,
          user: t.user,
        };
      }),
      ...upgrades.map((u) => ({
        id: u.id,
        kind: "upgrade",
        amount: u.price,
        status: "APPROVED",
        paymentMethod: u.paymentMethod || null,
        transactionId: u.transactionId || null,
        levelFrom: u.fromLevel,
        levelTo: u.toLevel,
        note: u.note || null,
        createdAt: u.createdAt,
        userId: u.userId,
        user: u.user,
      })),
    ];

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(entries);
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
