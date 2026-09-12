const prisma = require("../db");
const { effectiveSellerPrice } = require("./products");

/* Order items may carry a "db-" product-id prefix from the storefront. Normalize
   before matching against real product ids (mirrors admin.js). */
function normalizeItemProductId(raw) {
  if (!raw) return "";
  return raw && raw.startsWith("db-") ? raw.replace(/^db-/, "") : raw;
}

const VOID_STATUSES = new Set(["return_approved", "returned"]);
const PENDING_STATUSES = new Set(["delivered", "return_requested", "return_rejected"]);
const REMOVE_STATUSES = new Set(["pending", "confirmed", "shipped", "packed", "out_for_delivery", "cancelled"]);

/* Status-driven seller settlement ledger. After an order's status changes, snap
   every payout for that order to what the CURRENT status alone implies (nothing
   else happens, no transition history):
     - pending / confirmed / shipped / packed / out_for_delivery / cancelled
       → NO payout (removed)
     - delivered / return_requested / return_rejected
       → payout PENDING (created if missing, revived if voided)
     - return_approved / returned
       → payout VOIDED (created if missing)
   Paid payouts are never touched — the money was already sent to the seller.
   Items without a seller (store-owned products) are skipped. */
async function reconcilePayoutsForStatus(order, newItems, status) {
  if (!order || !Array.isArray(newItems)) return;

  const idxs = [];
  const idsByIdx = new Map();
  for (let i = 0; i < newItems.length; i += 1) {
    const item = newItems[i] || {};
    const pid = normalizeItemProductId(item.productId);
    idxs.push(i);
    if (pid) idsByIdx.set(i, pid);
  }

  // 1) Remove state — drop every non-paid payout on the order.
  if (REMOVE_STATUSES.has(status)) {
    for (const idx of idxs) {
      const pay = await prisma.sellerPayout.findUnique({
        where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
      });
      if (pay && pay.status !== "paid") {
        await prisma.sellerPayout.delete({ where: { id: pay.id } });
      }
    }
    return;
  }

  // 2) Pending/Voided state — ensure a payout exists for each sellable item and
  //    set its status to what the order status implies.
  const ids = [...new Set(idsByIdx.values())];
  const products = ids.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, sellerId: true, sellerPrice: true, sellerPricing: true, name: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));
  const target = VOID_STATUSES.has(status) ? "voided" : "pending";

  for (const idx of idxs) {
    const pid = idsByIdx.get(idx);
    const product = pid ? productById.get(pid) : null;
    if (!product || !product.sellerId) continue;

    const item = newItems[idx] || {};
    const qty = item.quantity || 1;
    const sellerUnit = effectiveSellerPrice(product, item);
    const unitPrice = sellerUnit != null && sellerUnit > 0
      ? sellerUnit
      : Number(item.price) || 0;
    const amount = Math.round(unitPrice * qty * 100) / 100;
    if (amount <= 0) continue;

    let pay = await prisma.sellerPayout.findUnique({
      where: { orderId_itemIdx: { orderId: order.id, itemIdx: idx } },
    });
    if (!pay) {
      pay = await prisma.sellerPayout.create({
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
    if (pay.status === "paid") continue;
    if (target === "pending" && pay.status !== "pending") {
      await prisma.sellerPayout.update({ where: { id: pay.id }, data: { status: "pending", voidedAt: null } });
    } else if (target === "voided" && pay.status !== "voided") {
      await prisma.sellerPayout.update({ where: { id: pay.id }, data: { status: "voided", voidedAt: new Date() } });
    }
  }
}

module.exports = { reconcilePayoutsForStatus, normalizeItemProductId };