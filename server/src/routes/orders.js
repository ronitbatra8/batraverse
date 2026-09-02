const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");
const {
  sendOrderStatusEmail,
  sendOrderConfirmationEmail,
  sendDeliveryVerificationEmail,
  generateOTP,
} = require("../utils/email");

const router = express.Router();

function generateOrderId(source) {
  const prefix = source === "store" ? "st" : "mt";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return prefix + suffix;
}

function deriveOrderStatus(items) {
  if (!Array.isArray(items) || items.length === 0) return "pending";
  const statuses = items.map((it) => it.status || "pending");
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.some((s) => s === "return_requested")) return "return_requested";
  if (statuses.some((s) => s === "delivered") && statuses.every((s) => s === "delivered" || s === "cancelled")) return "delivered";
  if (statuses.some((s) => s === "out_for_delivery")) return "out_for_delivery";
  if (statuses.some((s) => s === "packed")) return "packed";
  if (statuses.some((s) => s === "confirmed")) return "confirmed";
  return "pending";
}

const AUTO_APPROVE_METHODS = ["COD", "UPI_DELIVERY"];
const ONLINE_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"];

const LEVEL_DISCOUNT = { none: 0, bronze: 0, silver: 0, gold: 0, platinum: 5, diamond: 10, black: 15, owner: 15 };
const LEVEL_ORDER = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];

function getLevelFromBalance(balance) {
  if (balance >= 30000) return "black";
  if (balance >= 15000) return "diamond";
  if (balance >= 5000) return "platinum";
  if (balance >= 1500) return "gold";
  if (balance >= 500) return "silver";
  if (balance >= 100) return "bronze";
  return "none";
}

router.get("/my", userAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    const parsed = orders.map((o) => ({ ...o, securityPhotos: o.securityPhotos ? JSON.parse(o.securityPhotos) : null }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/", userAuth, async (req, res) => {
  try {
    const { items, shipping, paymentMethod, source, deliveryMode, transactionId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item is required" });
    }
    if (!shipping || !shipping.name || !shipping.phone || !shipping.address || !shipping.city) {
      return res.status(400).json({ error: "Shipping information is required" });
    }
    if (source === "mixed") {
      return res.status(400).json({ error: "Mixed orders are not allowed. Please place store and mart orders separately." });
    }
    if (source !== "store" && source !== "mart") {
      return res.status(400).json({ error: "Source must be 'store' or 'mart'" });
    }

    const orderItems = items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.qty) || 1;
      return {
        productId: item.productId || null,
        name: item.name,
        price,
        quantity,
        color: item.color || null,
        colorHex: item.colorHex || null,
        size: item.size || null,
        source,
        status: "pending",
      };
    });

    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    // Card-level discount
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cardLevel: true, freeDeliveryUsed: true, freeDeliveryMonth: true, walletBalance: true, peakWalletBalance: true } });
    const effectiveLevel = user.cardLevel === "owner" ? "owner" : getLevelFromBalance(user.peakWalletBalance || 0);
    const discountPct = LEVEL_DISCOUNT[effectiveLevel] || 0;
    const discountAmount = discountPct > 0 ? Math.round(subtotal * discountPct / 100 * 100) / 100 : 0;
    const discountedSubtotal = subtotal - discountAmount;

    // Free delivery check
    const currentMonth = new Date().toISOString().slice(0, 7);
    let freeDeliveryUsed = user.freeDeliveryUsed || 0;
    if (user.freeDeliveryMonth !== currentMonth) {
      freeDeliveryUsed = 0;
    }
    const LEVEL_FREE_DEL = { none: 0, bronze: 1, silver: 2, gold: 5, platinum: 7, diamond: 10, black: 15, owner: 15 };
    const freeDelLimit = LEVEL_FREE_DEL[effectiveLevel] || 0;
    const hasFreeDelivery = freeDelLimit > 0 && freeDeliveryUsed < freeDelLimit;

    const expressFee = source === "mart" && deliveryMode === "express" ? 49 : 0;
    let deliveryCharge = discountedSubtotal >= 150 ? 0 : 49;
    if (hasFreeDelivery) deliveryCharge = 0;

    const totalAmount = Math.round((discountedSubtotal + deliveryCharge + expressFee) * 100) / 100;

    const isAutoApprove = AUTO_APPROVE_METHODS.includes(paymentMethod);
    const isWalletPay = paymentMethod === "WALLET";
    let paymentStatus = isAutoApprove ? "APPROVED" : "PENDING";
    let initialStatus = isAutoApprove ? "confirmed" : "pending";

    if (isWalletPay) {
      if ((user.walletBalance || 0) < totalAmount) {
        return res.status(400).json({ error: `Insufficient wallet balance. You have ₹${(user.walletBalance || 0).toFixed(2)} but need ₹${totalAmount.toFixed(2)}. Please recharge your wallet.` });
      }
      paymentStatus = "APPROVED";
      initialStatus = "confirmed";
    }

    const order = await prisma.order.create({
      data: {
        orderId: generateOrderId(source),
        items: orderItems,
        totalAmount,
        status: initialStatus,
        paymentMethod: paymentMethod || "CARD",
        paymentStatus,
        ...(isAutoApprove ? { paymentApprovedAt: new Date() } : {}),
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingAddress: shipping.address + (shipping.apartment ? `, ${shipping.apartment}` : ""),
        shippingCity: shipping.city,
        shippingState: shipping.state || null,
        shippingPincode: shipping.pincode || null,
        userId: req.userId,
        source,
        deliveryMode: deliveryMode || "standard",
        transactionId: transactionId || null,
      },
    });

    // Update free delivery counter if free delivery was used
    if (hasFreeDelivery) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { freeDeliveryUsed: freeDeliveryUsed + 1, freeDeliveryMonth: currentMonth },
      });
    }

    // Deduct from wallet if paying via WALLET
    if (isWalletPay) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { walletBalance: { decrement: totalAmount } },
      });
    }

    const emailUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    sendOrderConfirmationEmail(emailUser.email, emailUser.name, order.id, totalAmount, source).catch(() => {});

    res.status(201).json({ ...order, discount: discountAmount, discountPct, freeDelivery: hasFreeDelivery });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/cancel", userAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.userId) return res.status(403).json({ error: "Not your order" });
    if (order.source === "mart") {
      return res.status(400).json({ error: "Mart orders cannot be cancelled by customer" });
    }
    if (["packed", "out_for_delivery", "delivered", "cancelled", "returned"].includes(order.status)) {
      return res.status(400).json({ error: "Order cannot be cancelled at this stage" });
    }

    const updatedItems = order.items.map((it) => ({ ...it, status: "cancelled" }));
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { items: updatedItems, status: "cancelled", cancelledAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, order.id, "cancelled").catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/items/:itemIdx/cancel", userAuth, async (req, res) => {
  try {
    const { id, itemIdx } = req.params;
    const idx = parseInt(itemIdx, 10);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.userId) return res.status(403).json({ error: "Not your order" });
    if (order.source === "mart") return res.status(400).json({ error: "Mart orders cannot be cancelled by customer" });
    if (!Array.isArray(order.items) || idx < 0 || idx >= order.items.length) {
      return res.status(400).json({ error: "Invalid item index" });
    }
    const item = order.items[idx];
    if (item.status === "cancelled") return res.status(400).json({ error: "Item already cancelled" });
    if (["packed", "out_for_delivery", "delivered", "returned"].includes(item.status)) {
      return res.status(400).json({ error: "Item cannot be cancelled at this stage" });
    }

    const updatedItems = order.items.map((it, i) => i === idx ? { ...it, status: "cancelled" } : it);
    const newStatus = deriveOrderStatus(updatedItems);
    const allCancelled = updatedItems.every((it) => it.status === "cancelled");
    await prisma.order.update({
      where: { id },
      data: {
        items: updatedItems,
        status: newStatus,
        ...(allCancelled ? { cancelledAt: new Date() } : {}),
      },
    });
    const updatedOrder = await prisma.order.findUnique({ where: { id } });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, id, "cancelled").catch(() => {});

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/:id/return-request", userAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.userId) return res.status(403).json({ error: "Not your order" });
    if (order.source === "mart") {
      return res.status(400).json({ error: "Mart orders cannot be returned" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Can only request return for delivered orders" });
    }
    if (!order.deliveredAt) {
      return res.status(400).json({ error: "Delivery timestamp not found" });
    }
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(order.deliveredAt).getTime();
    if (elapsed > twoHoursMs) {
      return res.status(400).json({ error: "Return window has expired (2 hours after delivery)" });
    }

    const updatedItems = order.items.map((it) => {
      if (it.status === "delivered") return { ...it, status: "return_requested" };
      return it;
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        items: updatedItems,
        status: "return_requested",
        returnRequestedAt: new Date(),
        returnReason: reason || null,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, order.id, "return_requested").catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/:id/verify-delivery", userAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.userId) return res.status(403).json({ error: "Not your order" });
    if (order.status !== "out_for_delivery") {
      return res.status(400).json({ error: "Order is not out for delivery" });
    }

    const otpRecord = await prisma.deliveryOTP.findFirst({
      where: { orderId: order.id, verified: false },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      return res.status(400).json({ error: "No verification OTP found. Ask delivery executive to resend." });
    }
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ error: "OTP has expired. Ask delivery executive to resend." });
    }
    if (otpRecord.code !== String(code)) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    await prisma.deliveryOTP.update({ where: { id: otpRecord.id }, data: { verified: true } });

    const updatedItems = order.items.map((it) => ({ ...it, status: "delivered" }));
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { items: updatedItems, status: "delivered", deliveredAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, order.id, "delivered").catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.patch("/:id/transaction-id", userAuth, async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId || typeof transactionId !== "string" || transactionId.trim().length < 6) {
      return res.status(400).json({ error: "Valid transaction ID is required (min 6 characters)" });
    }
    const order = await prisma.order.findFirst({ where: { orderId: req.params.id, userId: req.userId } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus !== "PENDING") return res.status(400).json({ error: "Payment already processed" });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { transactionId: transactionId.trim() },
    });
    res.json({ message: "Transaction ID saved. Awaiting payment confirmation.", order: updated });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
