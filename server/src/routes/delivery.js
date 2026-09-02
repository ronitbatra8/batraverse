const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");
const {
  generateOTP,
  sendDeliveryVerificationEmail,
  sendDeliveryWarningEmail,
  sendOrderStatusEmail,
} = require("../utils/email");

const router = express.Router();

const MART_CANCEL_WINDOW_MS = 5 * 60 * 1000;
const STORE_CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;

function isWithinCancelWindow(order) {
  if (!order.assignedAt) return false;
  const windowMs = order.source === "mart" ? MART_CANCEL_WINDOW_MS : STORE_CANCEL_WINDOW_MS;
  return Date.now() - new Date(order.assignedAt).getTime() <= windowMs;
}

router.get("/orders", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ error: "Only delivery executives can access this" });
    }
    const orders = await prisma.order.findMany({
      where: { assignedTo: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/status", userAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ error: "Only delivery executives can access this" });
    }
    if (!status || !["out_for_delivery", "delivered"].includes(status)) {
      return res.status(400).json({ error: "Status must be out_for_delivery or delivered" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.assignedTo !== req.userId) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }
    if (status === "out_for_delivery" && !["packed", "return_requested"].includes(order.status)) {
      return res.status(400).json({ error: `Cannot mark as out for delivery from status: ${order.status}` });
    }
    if (status === "delivered" && order.status !== "out_for_delivery") {
      return res.status(400).json({ error: `Cannot mark as delivered from status: ${order.status}` });
    }

    if (status === "delivered") {
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.deliveryOTP.create({
        data: { orderId: order.id, code, expiresAt },
      });
      const customer = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true },
      });
      sendDeliveryVerificationEmail(customer.email, customer.name, order.id, code).catch(() => {});
      return res.json({ message: "Verification OTP sent to customer. Awaiting confirmation." });
    }

    if (status === "out_for_delivery") {
      const updatedItems = Array.isArray(order.items)
        ? order.items.map((it) => {
            if (it.status === "cancelled" || it.status === "delivered" || it.status === "returned") return it;
            return { ...it, status: "out_for_delivery" };
          })
        : order.items;
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: "out_for_delivery", items: updatedItems },
      });
      const customer = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true },
      });
      sendOrderStatusEmail(customer.email, customer.name, order.id, "out_for_delivery").catch(() => {});
      return res.json(updated);
    }
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/unassign", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, name: true, email: true } });
    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ error: "Only delivery executives can access this" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.assignedTo !== req.userId) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }

    const withinWindow = isWithinCancelWindow(order);

    if (!withinWindow) {
      await prisma.deliveryComplaint.create({
        data: {
          orderId: order.id,
          execId: req.userId,
          reason: "Late unassignment — outside allowed time window",
          orderSource: order.source,
        },
      });
      sendDeliveryWarningEmail(user.email, user.name, order.id, "Late unassignment — outside allowed time window").catch(() => {});
    }

    await prisma.order.update({ where: { id: order.id }, data: { assignedTo: null } });
    res.json({ message: "Order unassigned", withinWindow });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/orders/:id/resend-otp", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ error: "Only delivery executives can access this" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.assignedTo !== req.userId) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }
    if (order.status !== "out_for_delivery") {
      return res.status(400).json({ error: "Order is not out for delivery" });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.deliveryOTP.create({
      data: { orderId: order.id, code, expiresAt },
    });
    const customer = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { name: true, email: true },
    });
    sendDeliveryVerificationEmail(customer.email, customer.name, order.id, code).catch(() => {});

    res.json({ message: "OTP resent to customer" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/orders/:id/verify-otp", userAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ error: "Only delivery executives can access this" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.assignedTo !== req.userId) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }
    if (order.status !== "out_for_delivery") {
      return res.status(400).json({ error: "Order is not out for delivery" });
    }

    const otpRecord = await prisma.deliveryOTP.findFirst({
      where: { orderId: order.id, verified: false },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord) {
      return res.status(400).json({ error: "No verification OTP found. Send verification code first." });
    }
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ error: "OTP has expired. Resend the verification code." });
    }
    if (otpRecord.code !== String(code)) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    await prisma.deliveryOTP.update({ where: { id: otpRecord.id }, data: { verified: true } });

    const updatedItems = Array.isArray(order.items)
      ? order.items.map((it) => ({ ...it, status: "delivered" }))
      : order.items;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { items: updatedItems, status: "delivered", deliveredAt: new Date() },
    });

    const customer = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { name: true, email: true },
    });
    sendOrderStatusEmail(customer.email, customer.name, order.id, "delivered").catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
