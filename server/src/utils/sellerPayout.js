const prisma = require("../db");

/* Order items may carry a "db-" product-id prefix from the storefront. Normalize
   before matching against real product ids (mirrors admin.js). */
function normalizeItemProductId(raw) {
  if (!raw) return "";
  return raw && raw.startsWith("db-") ? raw.replace(/^db-/, "") : raw;
}

/* Maintains the seller settlement ledger for an order whose per-item statuses
   changed. Compares the OLD items (order.items) with the new items and:
     - creates a PENDING payout (amount owed to the product's seller at
       product.sellerPrice * quantity) when an item becomes "delivered"
     - VOIDS a still-pending payout when an item becomes "returned"/"cancelled"
   Payments happen outside the app (bank/UPI) — no wallet is touched. The owner
   marks a pending payout paid via the admin endpoint. Idempotent: keyed by
   unique (orderId, itemIdx); re-delivery moves a voided payout back to pending,
   and voiding only acts on a pending payout. Items without a seller (store-owned
   products) are skipped. */
async function syncPayoutsForItemChange(order, newItems) {
  if (!order || !Array.isArray(order.items) || !Array.isArray(newItems)) return;

  const delivers = [];
  const voids = [];
  order.items.forEach((oldItem, idx) => {
    const newItem = newItems[idx];
    if (!newItem) return;
    const oldStatus = (oldItem && oldItem.status) || "pending";
    const newStatus = newItem.status || "pending";
    if (oldStatus === newStatus) return;
    if (newStatus === "delivered") {
      delivers.push(idx);
    } else if (newStatus === "returned" || newStatus === "cancelled") {
      voids.push(idx);
    }
  });
  if (delivers.length === 0 && voids.length === 0) return;

  if (delivers.length > 0) {
    const ids = [...new Set(delivers.map((idx) => normalizeItemProductId(newItems[idx].productId)).filter(Boolean))];
    const products = ids.length > 0
      ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, sellerId: true, sellerPrice: true, name: true } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const idx of delivers) {
      const item = newItems[idx];
      const product = productById.get(normalizeItemProductId(item.productId));
      if (!product || !product.sellerId) continue;
      const qty = item.quantity || 1;
      const unitPrice = product.sellerPrice != null && product.sellerPrice > 0
        ? product.sellerPrice
        : Number(item.price) || 0;
      const amount = Math.round(unitPrice * qty * 100) / 100;
      if (amount <= 0) continue;

      const existing = await prisma.sellerPayout.findUnique({
        where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
      });
      if (existing && existing.status === "pending") continue;
      if (existing) {
        await prisma.sellerPayout.update({
          where: { id: existing.id },
          data: { status: "pending", voidedAt: null },
        });
      } else {
        await prisma.sellerPayout.create({
          data: {
            sellerId: product.sellerId,
            orderId: order.id,
            orderRef: order.orderId || order.id,
            itemIdx: idx,
            productId: product.id,
            productName: item.name || product.name || "Product",
            quantity: qty,
            unitPrice,
            amount,
            status: "pending",
          },
        });
      }
    }
  }

  if (voids.length > 0) {
    for (const idx of voids) {
      const existing = await prisma.sellerPayout.findUnique({
        where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
      });
      // Only void payouts nothing has been sent for yet; a paid payout stays
      // recorded (return/refund happens between owner and seller directly).
      if (!existing || existing.status !== "pending") continue;
      await prisma.sellerPayout.update({
        where: { id: existing.id },
        data: { status: "voided", voidedAt: new Date() },
      });
    }
  }
}

module.exports = { syncPayoutsForItemChange, normalizeItemProductId };