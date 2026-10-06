/**
 * Seller price estimate.
 *
 * Mirrors the owner money split (GET /api/admin/finance) line for line, built
 * as an addition instead of a deduction. The dashboard reaches net earnings by
 * subtracting each cost from gross revenue:
 *
 *   gross - gstCollected - external - delivery - sellerPayout - cod = net
 *
 * The estimate starts from the seller price and adds those same charges back
 * up to what the customer pays:
 *
 *   seller + delivery + external + gst = customer pays
 *
 * Two rules taken straight from the dashboard:
 *
 *  - GST is INCLUSIVE, never added on top. The dashboard extracts it with
 *    `total - total / (1 + rate)` (orders.js:191), so the total is solved
 *    first and GST is read back out of it. Extracting from the estimated
 *    total returns exactly the GST shown.
 *
 *  - External sits on the customer-paid total, the same base Razorpay's fee
 *    uses (admin.js:851 applies it to `totalAmount`). It is a single flat 3%
 *    round figure that covers three things together: Razorpay's 2% + 18% GST,
 *    other external costs such as COD collection, and Batraverse's margin. It
 *    is deliberately NOT itemised - this is an estimate, not an exact
 *    calculation, and the dashboard still reports the real per-order costs.
 *    On a standard order the 3% lands above Razorpay's true 2.36%, so the
 *    line is always solvent; the excess is the margin.
 *
 * Delivery and COD are likewise allowed to drift. Delivery is a flat Rs49
 * rather than the per-order figure, because the real charge varies (Rs49
 * standard, free above the checkout thresholds where Batraverse funds Rs60,
 * Rs98 with express). COD collection is not modelled at all. Both are
 * accepted divergence - only GST and the seller payout tie out exactly.
 *
 * All arithmetic is in whole paise. Mixing rounded rupee figures with float
 * percentages moved results by a paisa and broke the tie-out to the dashboard.
 */
export const ESTIMATE_DELIVERY = 49;

/** Round external charge, applied to the customer-paid total. */
export const EXTERNAL_RATE = 0.03;

/** GST rate. Per-category in the DB (defaults to 18), so this is the default. */
export const GST_RATE = 0.18;

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface PriceEstimate {
  /** Seller-entered price for the variant. This is what they get paid. */
  sellerPrice: number;
  /** Flat delivery used for the estimate. */
  delivery: number;
  /** External charge at 3% of the customer-paid total. */
  external: number;
  /** 18% GST contained within livePrice, not added onto it. */
  gst: number;
  /** livePrice less GST - the figure before GST. */
  netBeforeGst: number;
  /** What the customer is estimated to pay. Contains GST. */
  livePrice: number;
}

/** Mirrors admin.js:851 - the fee base is the customer-paid total. */
const externalOf = (totalPaise: number): number =>
  Math.round(totalPaise * EXTERNAL_RATE);

/** Mirrors orders.js:191 - GST is extracted from the total, never added. */
const gstOf = (totalPaise: number): number =>
  Math.round(totalPaise - totalPaise / (1 + GST_RATE));

/**
 * Returns the customer total (in paise) for which the dashboard's own split
 * lands back on `sellerPaise` exactly. Rounding can move the split by a paisa,
 * so the total is stepped until it reconciles.
 */
function solveTotal(sellerPaise: number, deliveryPaise: number): number {
  const netShare = 1 / (1 + GST_RATE) - EXTERNAL_RATE;
  const anchor = Math.round((sellerPaise + deliveryPaise) / netShare);

  for (let d = 0; d <= 10; d++) {
    for (const candidate of d === 0 ? [anchor] : [anchor - d, anchor + d]) {
      const remaining = candidate - externalOf(candidate) - gstOf(candidate) - deliveryPaise;
      if (remaining === sellerPaise) return candidate;
    }
  }
  return anchor;
}

export function estimatePrice(
  sellerPrice: number,
  delivery: number = ESTIMATE_DELIVERY
): PriceEstimate {
  const sellerPaise = Math.round(sellerPrice * 100);
  const deliveryPaise = Math.round(delivery * 100);

  const totalPaise = solveTotal(sellerPaise, deliveryPaise);
  const externalPaise = externalOf(totalPaise);
  const gstPaise = gstOf(totalPaise);

  return {
    sellerPrice: round2(sellerPaise / 100),
    delivery: round2(deliveryPaise / 100),
    external: round2(externalPaise / 100),
    gst: round2(gstPaise / 100),
    netBeforeGst: round2((totalPaise - gstPaise) / 100),
    livePrice: round2(totalPaise / 100),
  };
}