const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { adminAuth } = require("../middleware/auth");
const { safeErrorMessage, ORDER_STATUSES } = require("../utils/helpers");
const {
  sendOrderStatusEmail,
  sendDeliveryAssignedEmail,
  sendReturnApprovedEmail,
} = require("../utils/email");
const {
  config: delhiveryConfig,
  createShipment: delhiveryCreateShipment,
  trackShipment: delhiveryTrackShipment,
} = require("../services/delhivery");

const router = express.Router();

router.use(adminAuth);

const ONLINE_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"];

/* Frontend cart/checkout store product ids with a leading "db-" prefix
   (see StoreGrid/MartGrid: id: `db-${p.id}`). Normalize it before matching
   against real product ids. */
function normalizeItemProductId(raw) {
  if (!raw) return "";
  return raw && raw.startsWith("db-") ? raw.replace(/^db-/, "") : raw;
}

/* Injects a product image (product.images[0], falling back to color-option
   images) into each order item that has a productId but no image yet. This
   keeps order thumbnails working even for orders placed before the image was
   stored on the item. */
async function resolveOrderItemImages(orders) {
  const items = [];
  (Array.isArray(orders) ? orders : []).forEach((o) => {
    if (Array.isArray(o.items)) items.push(...o.items);
  });
  const ids = [...new Set(items.map((it) => it && normalizeItemProductId(it.productId)).filter(Boolean))];
  if (ids.length === 0) return orders;
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, images: true, colorOptions: true },
  });
  const imgByProductId = new Map();
  for (const p of products) {
    let img = Array.isArray(p.images) ? p.images[0] : "";
    if (!img && Array.isArray(p.colorOptions)) {
      img = p.colorOptions
        .map((c) => (Array.isArray(c.images) ? c.images[0] : typeof c.images === "string" ? c.images : null))
        .find(Boolean) || "";
    }
    imgByProductId.set(p.id, img || "");
  }
  items.forEach((it) => {
    if (it && it.productId && !it.image) {
      const pid = normalizeItemProductId(it.productId);
      if (pid) it.image = imgByProductId.get(pid) || "";
    }
  });
  return orders;
}

router.get("/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        deliveryExecutive: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    const parsed = orders.map((o) => ({ ...o, securityPhotos: o.securityPhotos ? JSON.parse(o.securityPhotos) : null }));
    await resolveOrderItemImages(parsed);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/orders/:id/delhivery-ship", async (req, res) => {
  try {
    const cfg = delhiveryConfig();
    if (!cfg.enabled) return res.status(403).json({ error: "Delhivery shipping is disabled (DELHIVERY_ENABLED is not 'true')" });
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.carrier === "DELHIVERY" && existing.waybill) {
      return res.json({ order: existing, waybill: existing.waybill, trackingUrl: existing.trackingUrl, already: true });
    }
    const items = Array.isArray(existing.items) ? existing.items : [];
    const productIds = items.map((it) => it.productId).filter((id) => id);
    let pickup = null;
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, sellerId: true },
      });
      const sellerIds = [...new Set(products.map((p) => p.sellerId).filter((id) => id))];
      if (sellerIds.length > 0) {
        pickup = await prisma.user.findUnique({
          where: { id: sellerIds[0] },
          select: { id: true, name: true, pickupName: true, pickupAddress: true, pickupCity: true, pickupState: true, pickupPincode: true, pickupPhone: true },
        });
      }
    }
    const shipped = await delhiveryCreateShipment({ order: existing, customer: existing.user, pickup });
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        carrier: "DELHIVERY",
        waybill: shipped.waybill,
        carrierOrderId: shipped.carrierOrderId,
        trackingUrl: shipped.trackingUrl,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    res.json({ order: updated, waybill: shipped.waybill, trackingUrl: shipped.trackingUrl });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/orders/:id/delhivery-track", async (req, res) => {
  try {
    const cfg = delhiveryConfig();
    if (!cfg.enabled) return res.status(403).json({ error: "Delhivery shipping is disabled (DELHIVERY_ENABLED is not 'true')" });
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (!existing.waybill) return res.status(400).json({ error: "This order has no Delhivery waybill yet" });
    const tracking = await delhiveryTrackShipment(existing.waybill);
    res.json({ order: existing, tracking });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}` });
    }
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });

    if (existing.source === "mart") {
      const updatedItems = Array.isArray(existing.items)
        ? existing.items.map((it) => {
            if (it.status === "cancelled" || it.status === "delivered" || it.status === "returned") return it;
            return { ...it, status };
          })
        : existing.items;
      const data = { status, items: updatedItems };
      if (status === "cancelled") data.cancelledAt = new Date();
      if (status === "return_requested") data.returnRequestedAt = new Date();
      if (status === "returned") data.returnedAt = new Date();
      const order = await prisma.order.update({ where: { id: req.params.id }, data });
      const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: { name: true, email: true } });
      sendOrderStatusEmail(user.email, user.name, existing.id, status).catch(() => {});
      return res.json(order);
    }

    const data = { status };
    if (status === "cancelled") data.cancelledAt = new Date();
    if (status === "return_requested") data.returnRequestedAt = new Date();
    if (status === "returned") data.returnedAt = new Date();
    if (status === "delivered") data.deliveredAt = new Date();
    if (Array.isArray(existing.items)) {
      data.items = existing.items.map((it) => {
        if (it.status === "cancelled" || it.status === "delivered" || it.status === "returned") return it;
        return { ...it, status };
      });
    }

    const order = await prisma.order.update({ where: { id: req.params.id }, data });

    const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, existing.id, status).catch(() => {});

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/items/:itemIdx/status", async (req, res) => {
  try {
    const { id, itemIdx } = req.params;
    const { status } = req.body;
    const idx = parseInt(itemIdx, 10);
    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}` });
    }
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.source === "mart") {
      return res.status(400).json({ error: "Mart orders use combined status — change the overall order status instead" });
    }
    if (!Array.isArray(order.items) || idx < 0 || idx >= order.items.length) {
      return res.status(400).json({ error: "Invalid item index" });
    }
    const item = order.items[idx];
    if (item.source === "mart") {
      return res.status(400).json({ error: "Mart items cannot be managed individually" });
    }

    const updatedItems = order.items.map((it, i) => i === idx ? { ...it, status } : it);
    function deriveStatus(items) {
      if (!items || items.length === 0) return "pending";
      const sts = items.map((s) => s.status || "pending");
      if (sts.every((s) => s === "cancelled")) return "cancelled";
      if (sts.some((s) => s === "return_requested")) return "return_requested";
      if (sts.some((s) => s === "delivered") && sts.every((s) => s === "delivered" || s === "cancelled")) return "delivered";
      if (sts.some((s) => s === "out_for_delivery")) return "out_for_delivery";
      if (sts.some((s) => s === "packed")) return "packed";
      if (sts.some((s) => s === "confirmed")) return "confirmed";
      return "pending";
    }
    const newOrderStatus = deriveStatus(updatedItems);
    const data = { items: updatedItems, status: newOrderStatus };
    if (status === "cancelled") {
      const allCancelled = updatedItems.every((it) => it.status === "cancelled");
      if (allCancelled) data.cancelledAt = new Date();
    }
    if (status === "delivered") data.deliveredAt = new Date();
    const updated = await prisma.order.update({ where: { id }, data });

    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, id, status).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/payment", async (req, res) => {
  try {
    const { action } = req.body;
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus !== "PENDING") {
      return res.status(400).json({ error: `Payment is not pending (current: ${order.paymentStatus})` });
    }
    if (!ONLINE_METHODS.includes(order.paymentMethod)) {
      return res.status(400).json({ error: `Payment approval is only available for online payments (current method: ${order.paymentMethod})` });
    }

    if (action === "approve") {
      const updatedItems = Array.isArray(order.items) ? order.items.map((it) => {
        if (it.status === "pending") return { ...it, status: "confirmed" };
        return it;
      }) : order.items;
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "APPROVED",
          paymentApprovedAt: new Date(),
          items: updatedItems,
          ...(order.status === "pending" ? { status: "confirmed" } : {}),
        },
      });

      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
      sendOrderStatusEmail(user.email, user.name, order.id, "confirmed").catch(() => {});

      return res.json(updated);
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "Payment was rejected by admin",
      },
    });

    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    sendOrderStatusEmail(user.email, user.name, order.id, "cancelled").catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/assign", async (req, res) => {
  try {
    const { deliveryId } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const assignable = ["packed", "return_requested"];
    if (!assignable.includes(order.status)) {
      return res.status(400).json({ error: `Delivery executive can only be assigned when the order is packed or a return is requested (current status: ${order.status})` });
    }

    if (!deliveryId) {
      await prisma.order.update({ where: { id: req.params.id }, data: { assignedTo: null } });
      return res.json({ message: "Order unassigned" });
    }

    const exec = await prisma.user.findUnique({ where: { id: deliveryId } });
    if (!exec || exec.role !== "DELIVERY") return res.status(400).json({ error: "Invalid delivery executive" });
    if (!exec.approved) return res.status(400).json({ error: "Delivery executive is not approved" });

    await prisma.order.update({ where: { id: req.params.id }, data: { assignedTo: deliveryId, assignedAt: new Date() } });

    sendDeliveryAssignedEmail(exec.email, exec.name, order.id, order.source).catch(() => {});

    res.json({ message: "Order assigned" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/orders/:id/return-approve", async (req, res) => {
  try {
    const { action } = req.body;
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "return_requested") {
      return res.status(400).json({ error: "No pending return request for this order" });
    }

    if (action === "reject") {
      const updatedItems = Array.isArray(order.items)
        ? order.items.map((it) => {
            if (it.status === "return_requested") return { ...it, status: "delivered" };
            return it;
          })
        : order.items;
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { items: updatedItems, status: "delivered", returnReason: null, returnRequestedAt: null },
      });
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
      sendReturnApprovedEmail(user.email, user.name, order.id, false).catch(() => {});
      return res.json(updated);
    }

    const updatedItems = Array.isArray(order.items)
      ? order.items.map((it) => {
          if (it.status === "return_requested") return { ...it, status: "returned" };
          return it;
        })
      : order.items;
    const allReturned = updatedItems.every((it) => it.status === "returned" || it.status === "cancelled");
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        items: updatedItems,
        status: "returned",
        returnedAt: new Date(),
        ...(allReturned ? {} : {}),
      },
    });

    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    sendReturnApprovedEmail(user.email, user.name, order.id, true).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/violations", async (req, res) => {
  try {
    const violations = await prisma.deliveryComplaint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        exec: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, role: true, approved: true, createdAt: true,
        _count: { select: { orders: true, savedAddresses: true, reviews: true } },
      },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalProducts, revenue, pendingOrders, pendingPaymentOrders, confirmedOrders, outForDeliveryOrders, deliveredOrders, returnedOrders, returnRequests, totalViolations] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "delivered" } }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.count({ where: { paymentStatus: "PENDING", status: { notIn: ["cancelled", "delivered", "returned", "return_requested"] } } }),
      prisma.order.count({ where: { status: "confirmed" } }),
      prisma.order.count({ where: { status: "out_for_delivery" } }),
      prisma.order.count({ where: { status: "delivered" } }),
      prisma.order.count({ where: { status: "returned" } }),
      prisma.order.count({ where: { status: "return_requested" } }),
      prisma.deliveryComplaint.count(),
    ]);
    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenue._sum.totalAmount || 0,
      pendingOrders,
      pendingPaymentOrders,
      confirmedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      returnedOrders,
      returnRequests,
      totalViolations,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/password-resets", async (req, res) => {
  try {
    const resets = await prisma.passwordReset.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    res.json(resets);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/users/cards", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        cardNumber: true, cardLevel: true, cardExpiry: true, approved: true, createdAt: true,
        walletBalance: true, peakWalletBalance: true,
      },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, approved: true, createdAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, items: true, totalAmount: true, status: true, paymentMethod: true, paymentStatus: true,
            shippingName: true, shippingPhone: true, shippingAddress: true, shippingCity: true,
            shippingState: true, shippingPincode: true, createdAt: true,
          },
        },
        savedAddresses: { orderBy: { createdAt: "desc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          select: { id: true, rating: true, comment: true, createdAt: true, product: { select: { id: true, name: true, brand: true, images: true } } },
        },
        wishlists: {
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, product: { select: { id: true, name: true, brand: true, price: true, images: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          select: { id: true, subject: true, message: true, status: true, replyMessage: true, createdAt: true },
        },
        passwordResets: {
          orderBy: { createdAt: "desc" },
          select: { id: true, method: true, status: true, failReason: true, ipAddress: true, requestedAt: true, verifiedAt: true, completedAt: true, createdAt: true },
        },
        products: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, brand: true, category: true, subCategory: true, source: true, price: true, originalPrice: true, description: true, images: true, inStock: true, badge: true, rating: true, reviewCount: true, colorOptions: true, sizeOptions: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "DELIVERY") {
      const assignedOrders = await prisma.order.findMany({
        where: { assignedTo: req.params.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, items: true, totalAmount: true, status: true,
          shippingName: true, shippingPhone: true, shippingAddress: true,
          shippingCity: true, shippingState: true, shippingPincode: true,
          paymentMethod: true, createdAt: true,
        },
      });
      user.orders = assignedOrders;
    }

    /* For a SELLER, "orders" should mean orders that contain the seller's
       own products (their sales), NOT the orders the seller placed as a buyer
       (the default user.orders relation above). */
    if (user.role === "SELLER") {
      const sellerProducts = await prisma.product.findMany({
        where: { sellerId: user.id },
        select: { id: true },
      });
      const sellerProductIds = new Set(sellerProducts.map((p) => p.id));
      const allOrders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, items: true, totalAmount: true, status: true, paymentMethod: true,
          paymentStatus: true, shippingName: true, shippingPhone: true,
          shippingAddress: true, shippingCity: true, shippingState: true,
          shippingPincode: true, userId: true, createdAt: true,
        },
      });
      user.orders = allOrders.filter((o) => {
        const arr = Array.isArray(o.items) ? o.items : [];
        return arr.some((it) => it && sellerProductIds.has(normalizeItemProductId(it.productId)));
      });
    }

    const totalSpent = user.orders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.totalAmount : 0), 0);
    await resolveOrderItemImages(user.orders);
    res.json({ ...user, totalSpent });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/delivery-executives", async (req, res) => {
  try {
    const execs = await prisma.user.findMany({
      where: { role: "DELIVERY" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, approved: true, createdAt: true,
        _count: { select: { assignedOrders: true } },
      },
    });
    res.json(execs);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/sellers", async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: "SELLER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, approved: true, submittedForApproval: true, createdAt: true,
        _count: { select: { products: true } },
      },
    });
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/users/:id/approve", async (req, res) => {
  try {
    const { approved } = req.body;
    if (typeof approved !== "boolean") return res.status(400).json({ error: "approved must be true or false" });
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "ADMIN") return res.status(400).json({ error: "Cannot approve/reject admin" });
    await prisma.user.update({ where: { id: req.params.id }, data: { approved } });
    res.json({ message: approved ? "User approved" : "User rejected" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/users/:id/email", async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "Subject and message are required" });
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, email: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    console.log(`[email] To: ${user.email} | Subject: ${subject} | Body: ${message}`);
    res.json({ success: true, message: `Email queued for ${user.name}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
});

router.get("/security/password-resets", async (req, res) => {
  try {
    const resets = await prisma.passwordReset.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const summary = {
      total: resets.length,
      completed: resets.filter((r) => r.status === "completed").length,
      pending: resets.filter((r) => r.status === "requested" || r.status === "verified").length,
      failed: resets.filter((r) => r.status === "failed").length,
    };
    res.json({ summary, resets });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/users/:id/detail", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, include: { deliveryExecutive: { select: { id: true, name: true, email: true } } } },
        savedAddresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        reviews: { orderBy: { createdAt: "desc" }, include: { product: { select: { id: true, name: true, price: true } } } },
        wishlists: { orderBy: { createdAt: "desc" }, include: { product: { select: { id: true, name: true, price: true, gradient: true } } } },
        messages: { orderBy: { createdAt: "desc" } },
        passwordResets: { orderBy: { createdAt: "desc" } },
        _count: { select: { orders: true, reviews: true, wishlists: true, messages: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, cardPinHash, ...safe } = user;
    const totalSpent = user.orders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.totalAmount : 0), 0);
    res.json({ ...safe, totalSpent, totalOrders: user._count.orders, totalReviews: user._count.reviews, totalWishlists: user._count.wishlists, totalMessages: user._count.messages });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/impersonate/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, cardNumber: user.cardNumber, cardLevel: user.cardLevel } });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

const LEVEL_PREFIX = {
  none: "BV", bronze: "BZ", silver: "SV", gold: "GL", platinum: "PL",
  diamond: "DM", black: "BK", owner: "OW",
};
const VALID_CARD_LEVELS = ["none", "bronze", "owner", "silver", "gold", "platinum", "diamond", "black"];
const UPGRADE_DURATIONS = ["ONE_MONTH", "THREE_MONTH", "SIX_MONTH"];
const DURATION_DAYS = { ONE_MONTH: 30, THREE_MONTH: 90, SIX_MONTH: 180 };

router.get("/card-upgrades", async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const requests = await prisma.cardUpgradeRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, phone: true, cardLevel: true, cardExpiry: true } } },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/card-upgrades/:id/process", async (req, res) => {
  try {
    const { action, note } = req.body;
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }
    const request = await prisma.cardUpgradeRequest.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!request) return res.status(404).json({ error: "Upgrade request not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ error: `Request is not pending (current: ${request.status})` });
    }
    if (action === "reject") {
      const updated = await prisma.cardUpgradeRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", processedAt: new Date(), note: note || null },
      });
      return res.json(updated);
    }
    const now = new Date();
    const days = DURATION_DAYS[request.duration];
    const baseDate = request.user.cardExpiry && request.user.cardExpiry > now ? request.user.cardExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const [updated] = await prisma.$transaction([
      prisma.cardUpgradeRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", processedAt: now },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { cardLevel: request.toLevel, cardExpiry: newExpiry },
      }),
    ]);

    // Update card number prefix to match new level (only for the exclusive
    // BLACK / OWNER embossed cards — other levels keep their card number)
    const newPrefix = LEVEL_PREFIX[request.toLevel] || "BV";
    const user = request.user;
    if (["black", "owner"].includes(request.toLevel) && user.cardNumber) {
      const parts = user.cardNumber.split("-");
      if (parts.length >= 2) {
        const newCardNumber = `${newPrefix}-${parts.slice(1).join("-")}`;
        const exists = await prisma.user.findFirst({ where: { cardNumber: newCardNumber, NOT: { id: user.id } } });
        if (!exists) {
          await prisma.user.update({ where: { id: user.id }, data: { cardNumber: newCardNumber } });
        }
      }
    }
    res.json({ ...updated, userCardLevel: request.toLevel, userCardExpiry: newExpiry });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/users/:id/card", async (req, res) => {
  try {
    const { cardLevel, cardExpiry } = req.body;
    if (!cardLevel || !VALID_CARD_LEVELS.includes(cardLevel)) {
      return res.status(400).json({ error: `Invalid cardLevel. Must be one of: ${VALID_CARD_LEVELS.join(", ")}` });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const newLevel = cardLevel === "none" ? null : cardLevel;
    const data = { cardLevel: newLevel };
    if (cardExpiry) data.cardExpiry = new Date(cardExpiry);
    /* The card number only regenerates when the level becomes BLACK (or OWNER),
       which gets an exclusive embossed number. Other level changes keep the
       existing card number. */
    if (["black", "owner"].includes(cardLevel) && user.cardNumber && newLevel !== user.cardLevel) {
      const newPrefix = LEVEL_PREFIX[cardLevel] || "BV";
      const oldPrefix = LEVEL_PREFIX[user.cardLevel || "none"] || "BV";
      let suffix = user.cardNumber.replace(/^[A-Z]+-/, "");
      if (oldPrefix !== "BV" && suffix.startsWith(oldPrefix + "-")) {
        suffix = suffix.replace(/^[A-Z]+-/, "");
      }
      if (!suffix || suffix.length < 5) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      }
      data.cardNumber = `${newPrefix}-${suffix}`;
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, cardLevel: true, cardNumber: true, cardExpiry: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/card-pricing", async (req, res) => {
  try {
    const pricing = await prisma.cardUpgradePricing.findMany({
      orderBy: [{ fromLevel: "asc" }, { toLevel: "asc" }, { duration: "asc" }],
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/card-pricing", async (req, res) => {
  try {
    const { fromLevel, toLevel, duration, price, active } = req.body;
    if (!fromLevel || !toLevel || !duration || price == null) {
      return res.status(400).json({ error: "fromLevel, toLevel, duration, and price are required" });
    }
    if (!VALID_CARD_LEVELS.includes(fromLevel) || !VALID_CARD_LEVELS.includes(toLevel)) {
      return res.status(400).json({ error: `Invalid level. Must be one of: ${VALID_CARD_LEVELS.join(", ")}` });
    }
    if (!UPGRADE_DURATIONS.includes(duration)) {
      return res.status(400).json({ error: `Invalid duration. Must be one of: ${UPGRADE_DURATIONS.join(", ")}` });
    }
    const data = { fromLevel, toLevel, duration, price, active: active !== undefined ? active : true };
    const pricing = await prisma.cardUpgradePricing.upsert({
      where: { fromLevel_toLevel_duration: { fromLevel, toLevel, duration } },
      update: { price: data.price, active: data.active },
      create: data,
    });
    res.status(201).json(pricing);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/category-requests", async (_req, res) => {
  try {
    const requests = await prisma.categoryRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { id: true, name: true, email: true, shopName: true } } },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/category-requests/:id/process", async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approve", "deny"].includes(action)) return res.status(400).json({ error: "action must be approve or deny" });
    const request = await prisma.categoryRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ error: "Request already processed" });

    if (action === "approve") {
      const slug = request.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (request.type === "new_category") {
        const existing = await prisma.category.findFirst({ where: { slug } });
        if (!existing) {
          const maxOrder = await prisma.category.aggregate({ where: { source: request.source }, _max: { sortOrder: true } });
          await prisma.category.create({
            data: { name: request.categoryName, slug, source: request.source, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
          });
        }
      } else if (request.type === "new_subcategory") {
        const parent = await prisma.category.findFirst({ where: { slug, source: request.source } });
        if (parent && request.subCategoryName) {
          const subSlug = request.subCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const existingSub = await prisma.subcategory.findFirst({ where: { categoryId: parent.id, slug: subSlug } });
          if (!existingSub) {
            const maxOrder = await prisma.subcategory.aggregate({ where: { categoryId: parent.id }, _max: { sortOrder: true } });
            await prisma.subcategory.create({
              data: { name: request.subCategoryName, slug: subSlug, categoryId: parent.id, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
            });
          }
        }
      }
    }

    const updated = await prisma.categoryRequest.update({
      where: { id: req.params.id },
      data: { status: action === "approve" ? "approved" : "denied", reviewedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { source, sellerId } = req.query;
    const where = {};
    if (source) where.source = source;
    if (sellerId) where.sellerId = sellerId;
    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const { inStock, name, price, badge, description } = req.body;
    const data = {};
    if (inStock !== undefined) data.inStock = inStock;
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (badge !== undefined) data.badge = badge;
    if (description !== undefined) data.description = description;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* ── Product Approvals ────────────────────────────────────────
   Seller-added products sit in "pending" until the owner sets the live sell
   price (price) and approves them. Approving edits the product in place; the
   seller's original price is kept as sellerPrice so the margin is tracked. */
router.get("/product-approvals", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { id: true, name: true, email: true, shopName: true } },
      },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/product-approvals/:id/approve", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.status !== "pending") return res.status(400).json({ error: "Product is not pending approval" });

    const { price, originalPrice, name, description, images, inStock, badge } = req.body || {};
    if (price === undefined || price === null || Number.isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: "A valid sell price is required" });
    }
    const data = {
      price: Number(price),
      status: "approved",
      rejectReason: null,
    };
    if (originalPrice !== undefined && originalPrice !== null && Number(originalPrice) >= 0) data.originalPrice = Number(originalPrice);
    if (name !== undefined && String(name).trim()) data.name = String(name).trim();
    if (description !== undefined) data.description = description || null;
    if (images !== undefined) data.images = Array.isArray(images) ? images : existing.images;
    if (inStock !== undefined) data.inStock = Boolean(inStock);
    if (badge !== undefined) data.badge = badge || null;

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/product-approvals/:id/reject", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.status !== "pending") return res.status(400).json({ error: "Product is not pending approval" });

    const { reason } = req.body || {};
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: "rejected", rejectReason: (reason && String(reason).trim()) ? String(reason).trim() : null, inStock: false },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, brand, category, subCategory, source, price, originalPrice, description, badge, images, inStock, sellerId } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }
    const product = await prisma.product.create({
      data: {
        name,
        brand: brand || null,
        category: category || null,
        subCategory: subCategory || null,
        source: source || "store",
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        description: description || null,
        badge: badge || null,
        images: Array.isArray(images) ? images : [],
        inStock: inStock !== false,
        sellerId: sellerId || null,
      },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// ── Spotlight Ads ──────────────────────────────────────────────

router.get("/spotlight-ads", async (req, res) => {
  try {
    const page = req.query.page || undefined;
    const where = page ? { page } : {};
    const ads = await prisma.spotlightAd.findMany({ where, orderBy: { sortOrder: "asc" } });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/spotlight-ads", async (req, res) => {
  try {
    const { img, tagline, line, href, page, duration, active, sortOrder } = req.body;
    if (!img || !tagline || !line) {
      return res.status(400).json({ error: "img, tagline, and line are required" });
    }
    const ad = await prisma.spotlightAd.create({
      data: {
        img,
        tagline,
        line,
        href: href || "/store",
        page: page || "home",
        duration: duration ?? 7,
        active: active !== false,
        sortOrder: sortOrder ?? 0,
      },
    });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/spotlight-ads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { img, tagline, line, href, page, duration, active, sortOrder } = req.body;
    const ad = await prisma.spotlightAd.update({
      where: { id },
      data: {
        ...(img !== undefined && { img }),
        ...(tagline !== undefined && { tagline }),
        ...(line !== undefined && { line }),
        ...(href !== undefined && { href }),
        ...(page !== undefined && { page }),
        ...(duration !== undefined && { duration }),
        ...(active !== undefined && { active }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/spotlight-ads/:id", async (req, res) => {
  try {
    await prisma.spotlightAd.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/ad-requests", async (req, res) => {
  try {
    const requests = await prisma.adRequest.findMany({ orderBy: { createdAt: "desc" } });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/ad-requests/:id/approve", async (req, res) => {
  try {
    const adReq = await prisma.adRequest.findUnique({ where: { id: req.params.id } });
    if (!adReq) return res.status(404).json({ error: "Request not found" });
    const existingAds = await prisma.spotlightAd.findMany({ where: { page: adReq.page } });
    const ad = await prisma.spotlightAd.create({
      data: {
        img: adReq.img,
        tagline: adReq.tagline,
        line: adReq.line,
        href: adReq.href,
        page: adReq.page,
        duration: adReq.duration,
        sortOrder: existingAds.length + 1,
      },
    });
    await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: "approved" } });
    res.json({ ad });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/ad-requests/:id/reject", async (req, res) => {
  try {
    const { note } = req.body;
    await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: "rejected", note: note || "" } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* Effective display image for a product (top-level images first, then any
   color-option image, matching how the storefront renders products). */
function effectiveProductImage(images, colorOptions) {
  if (Array.isArray(images) && images[0]) return images[0];
  if (Array.isArray(colorOptions)) {
    return colorOptions
      .map((c) => (Array.isArray(c.images) ? c.images[0] : typeof c.images === "string" ? c.images : null))
      .find(Boolean) || "";
  }
  return "";
}

function resolveProductPrice(p) {
  const colorOptions = Array.isArray(p.colorOptions) ? p.colorOptions : [];
  const sizeOptions = p.sizeOptions && typeof p.sizeOptions === "object" && !Array.isArray(p.sizeOptions) ? p.sizeOptions : {};
  const firstName = (colorOptions[0] && colorOptions[0].name) || "";
  const firstSizes = sizeOptions[firstName] || Object.values(sizeOptions)[0] || [];
  let price = p.price;
  let originalPrice = p.originalPrice;
  if ((!price || price <= 0)) {
    if (firstSizes[0] && firstSizes[0].price > 0) {
      price = firstSizes[0].price;
      originalPrice = firstSizes[0].originalPrice || originalPrice;
    } else if (colorOptions[0] && colorOptions[0].price > 0) {
      price = colorOptions[0].price;
      originalPrice = colorOptions[0].originalPrice || originalPrice;
    }
  }
  return { price: price || 0, originalPrice };
}

function toFeaturedCard(p) {
  if (!p) return null;
  const { price, originalPrice } = resolveProductPrice(p);
  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category || "uncategorized",
    price,
    originalPrice,
    image: effectiveProductImage(p.images, p.colorOptions),
    href: `/store/db-${p.id}`,
    source: p.source || "store",
    inStock: p.inStock,
    rating: p.rating,
    reviewCount: p.reviewCount,
  };
}

router.get("/featured", async (req, res) => {
  try {
    const featured = await prisma.featuredProduct.findMany({ orderBy: { sortOrder: "asc" } });
    if (featured.length === 0) return res.json([]);
    const products = await prisma.product.findMany({
      where: { id: { in: featured.map((f) => f.productId) }, status: "approved" },
      select: { id: true, name: true, brand: true, category: true, price: true, originalPrice: true, images: true, colorOptions: true, sizeOptions: true, source: true, inStock: true, rating: true, reviewCount: true },
    });
    const byId = new Map(products.map((p) => [p.id, toFeaturedCard(p)]));
    res.json(featured.map((f) => byId.get(f.productId) || { productId: f.productId, missing: true }).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/featured", async (req, res) => {
  try {
    const { productIds } = req.body || {};
    if (!Array.isArray(productIds)) return res.status(400).json({ error: "productIds must be an array" });
    const sanitized = [...new Set(productIds.map((id) => String(id)).filter(Boolean))];
    const existing = await prisma.featuredProduct.findMany();
    const existingByProduct = new Map(existing.map((e) => [e.productId, e.id]));
    const toKeep = existing.filter((e) => sanitized.includes(e.productId));
    const toCreate = sanitized.filter((id) => !existingByProduct.has(id));
    await prisma.$transaction([
      prisma.featuredProduct.deleteMany({ where: { productId: { notIn: sanitized } } }),
      ...toCreate.map((pid) => prisma.featuredProduct.create({ data: { productId: pid, sortOrder: sanitized.indexOf(pid) } })),
      ...toKeep.map((e) => prisma.featuredProduct.update({ where: { id: e.id }, data: { sortOrder: sanitized.indexOf(e.productId) } })),
    ]);
    res.json({ ok: true, count: sanitized.length });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// ── Testimonials ─────────────────────────────────────────────

async function nextTestimonialSort(prisma) {
  const agg = await prisma.testimonial.aggregate({ _max: { sortOrder: true } });
  return (agg._max.sortOrder || 0) + 1;
}

/* Reviews list for the owner dashboard's "feature a review" picker. */
router.get("/reviews", async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take, 10) || 100, 500);
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/testimonials", async (_req, res) => {
  try {
    const items = await prisma.testimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/testimonials", async (req, res) => {
  try {
    const { quote, name, role, avatar, rating, productName } = req.body;
    if (!quote || !quote.trim() || !name || !name.trim()) {
      return res.status(400).json({ error: "Quote and name are required" });
    }
    const t = await prisma.testimonial.create({
      data: {
        source: "custom",
        quote: quote.trim(),
        name: name.trim(),
        role: role?.trim() || null,
        avatar: avatar?.trim() || null,
        rating: rating != null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
        productName: productName?.trim() || null,
        sortOrder: await nextTestimonialSort(prisma),
      },
    });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/testimonials/feature-review", async (req, res) => {
  try {
    const { reviewId } = req.body;
    if (!reviewId) return res.status(400).json({ error: "reviewId is required" });
    const existing = await prisma.testimonial.findFirst({ where: { source: "review", reviewId } });
    if (existing) return res.status(409).json({ error: "This review is already featured" });
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    if (!review) return res.status(404).json({ error: "Review not found" });
    const t = await prisma.testimonial.create({
      data: {
        source: "review",
        reviewId: review.id,
        quote: review.comment || "Great experience with this product.",
        name: review.user?.name || "Verified Customer",
        rating: review.rating,
        productName: review.product?.name || null,
        sortOrder: await nextTestimonialSort(prisma),
      },
    });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/testimonials/:id", async (req, res) => {
  try {
    const { quote, name, role, avatar, rating, productName, active, sortOrder } = req.body;
    const t = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ error: "Testimonial not found" });
    const data = {};
    if (quote !== undefined) data.quote = quote;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (avatar !== undefined) data.avatar = avatar;
    if (rating !== undefined) data.rating = (rating != null && rating >= 1 && rating <= 5) ? Math.round(rating) : null;
    if (productName !== undefined) data.productName = productName;
    if (active !== undefined) data.active = !!active;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    const updated = await prisma.testimonial.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/testimonials/:id/toggle", async (req, res) => {
  try {
    const t = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ error: "Testimonial not found" });
    const updated = await prisma.testimonial.update({ where: { id: t.id }, data: { active: !t.active } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/testimonials/:id", async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
