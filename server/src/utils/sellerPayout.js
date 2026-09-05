const prisma = require("../db");

/* Order items may carry a "db-" product-id prefix from the storefront. Normalize
   before matching against real product ids (mirrors admin.js). */
function normalizeItemProductId(raw) {
  if (!raw) return "";
  return raw && raw.startsWith("db-") ? raw.replace(/^db-/, "") : raw;
}

/* Credits/reverses seller payouts for an order whose per-item statuses changed.
   Compares the OLD items (order.items) with the new items and:
     - credits the product's seller (at product.sellerPrice * quantity) when an
       item becomes "delivered"
     - reverses a previously-paid payout when an item becomes "returned"/"cancelled"
   Idempotent: payouts are keyed by unique (orderId, itemIdx); a credit only moves
   a reversed payout back to "paid" and a reversal only acts on a "paid" payout.
   Items without a seller (store-owned products) are skipped. */
async function syncPayoutsForItemChange(order, newItems) {
  if (!order || !Array.isArray(order.items) || !Array.isArray(newItems)) return;

  const credits = [];
  const reversals = [];
  order.items.forEach((oldItem, idx) => {
    const newItem = newItems[idx];
    if (!newItem) return;
    const oldStatus = (oldItem && oldItem.status) || "pending";
    const newStatus = newItem.status || "pending";
    if (oldStatus === newStatus) return;
    if (newStatus === "delivered") {
      credits.push(idx);
    } else if (newStatus === "returned" || newStatus === "cancelled") {
      reversals.push(idx);
    }
  });
  if (credits.length === 0 && reversals.length === 0) return;

  if (credits.length > 0) {
    const ids = [...new Set(credits.map((idx) => normalizeItemProductId(newItems[idx].productId)).filter(Boolean))];
    const products = ids.length > 0
      ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, sellerId: true, sellerPrice: true, name: true } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const idx of credits) {
      const item = newItems[idx];
      const product = productById.get(normalizeItemProductId(item.productId));
      if (!product || !product.sellerId) continue;
      const qty = item.quantity || 1;
      const unitPrice = product.sellerPrice != null && product.sellerPrice > 0
        ? product.sellerPrice
        : Number(item.price) || 0;
      const amount = Math.round(unitPrice * qty * 100) / 100;
      if (amount <= 0) continue;

      await prisma.$transaction(async (tx) => {
        const existing = await tx.sellerPayout.findUnique({
          where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
        });
        if (existing && existing.status === "paid") return;
        const seller = await tx.user.findUnique({
          where: { id: product.sellerId },
          select: { walletBalance: true, peakWalletBalance: true },
        });
        if (!seller) return;
        const newBalance = seller.walletBalance + amount;
        await tx.user.update({
          where: { id: product.sellerId },
          data: {
            walletBalance: { increment: amount },
            ...(newBalance > (seller.peakWalletBalance || 0) ? { peakWalletBalance: newBalance } : {}),
          },
        });
        if (existing) {
          await tx.sellerPayout.update({
            where: { id: existing.id },
            data: { status: "paid", paidAt: new Date(), reversedAt: null },
          });
        } else {
          await tx.sellerPayout.create({
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
              status: "paid",
              paidAt: new Date(),
            },
          });
        }
      });
    }
  }

  if (reversals.length > 0) {
    for (const idx of reversals) {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.sellerPayout.findUnique({
          where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
        });
        if (!existing || existing.status !== "paid") return;
        const seller = await tx.user.findUnique({
          where: { id: existing.sellerId },
          select: { walletBalance: true },
        });
        if (!seller) return;
        const deduct = Math.min(seller.walletBalance, existing.amount);
        if (deduct > 0) {
          await tx.user.update({
            where: { id: existing.sellerId },
            data: { walletBalance: { decrement: deduct } },
          });
        }
        await tx.sellerPayout.update({
          where: { id: existing.id },
          data: { status: "reversed", reversedAt: new Date() },
        });
      });
    }
  }
}

module.exports = { syncPayoutsForItemChange, normalizeItemProductId };