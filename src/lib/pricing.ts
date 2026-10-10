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

/* Delivery estimate per packaging-weight band. Stepped, not linear — light
   parcels ride the flat ₹49 store rate; heavier ones pick up the courier's
   volumetric surcharge as the band passes 500 g. The ceiling of each band
   mirrors PACKAGING_WEIGHT_GRAMS: 500/1000/1500/2000/3000/5000 grams, with
   999999 the open-ended above-5 kg band. */
export const WEIGHT_DELIVERY_BANDS: { grams: number; delivery: number }[] = [
  { grams: 500, delivery: 49 },
  { grams: 1000, delivery: 91 },
  { grams: 1500, delivery: 131 },
  { grams: 2000, delivery: 143 },
  { grams: 3000, delivery: 184 },
  { grams: 5000, delivery: 229 },
  { grams: 999999, delivery: 321 },
];

/** Delivery estimate for a declared packaging weight (grams). Unset/null or a
   weight no band covers falls back to the standard ₹49 flat rate. */
export function deliveryForWeight(grams: number | null | undefined): number {
  if (!grams || grams <= 0) return ESTIMATE_DELIVERY;
  const band = WEIGHT_DELIVERY_BANDS.find((b) => grams <= b.grams);
  return (band || WEIGHT_DELIVERY_BANDS[WEIGHT_DELIVERY_BANDS.length - 1]).delivery;
}

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

/* ------------------------------------------------------------------ *
 * Rate calculator
 *
 * The seller estimate above fixes every rate at its usual value because
 * the seller is only allowed to see the outcome. The owner calculator is
 * the other way round: every charge is an input, so a product can be
 * priced against its own GST band, its own delivery cost and its own
 * gateway fee.
 *
 * Same two rules as the estimate above:
 *
 *  - GST is inclusive. The total is what the customer pays and GST is read
 *    back out of it with `total - total / (1 + rate)` - never added on top.
 *
 *  - The gateway fee is a percentage of the customer-paid total, the base
 *    Razorpay itself charges on.
 *
 * The remainder after GST, gateway, delivery, COD and the seller payout is
 * BatraVerse's margin, so a negative one is exactly the loss the calculator
 * exists to prevent. All arithmetic is in paise so every line ties back to
 * the total to the paisa.
 * ------------------------------------------------------------------ */

export interface RateCharges {
  /** What BatraVerse pays the seller for the unit. */
  sellerPrice: number;
  /** GST as a fraction of the total (0.18 = 18%). Per-category in the DB. */
  gstRate: number;
  /** Delivery charged for the order. */
  delivery: number;
  /** Gateway fee as a fraction of the total (0.02 = Razorpay's 2%). */
  gatewayRate: number;
  /** Cash-on-delivery collection fee. 0 for prepaid orders. */
  cod: number;
}

export interface RateBreakdown {
  sellerPrice: number;
  delivery: number;
  gateway: number;
  cod: number;
  gst: number;
  /** What BatraVerse keeps. Negative means the platform takes the loss. */
  margin: number;
  /** What the customer pays. Contains GST. */
  customerPrice: number;
  /** customerPrice less GST. */
  netBeforeGst: number;
}

const toPaise = (n: number): number => Math.round(n * 100);
const toRupees = (p: number): number => round2(p / 100);

function breakdownPaise(totalPaise: number, c: RateCharges): RateBreakdown {
  const sellerPaise = toPaise(c.sellerPrice);
  const deliveryPaise = toPaise(c.delivery);
  const codPaise = toPaise(c.cod);
  const gatewayPaise = Math.round(totalPaise * c.gatewayRate);
  const gstPaise = Math.round(totalPaise - totalPaise / (1 + c.gstRate));
  const marginPaise = totalPaise - gatewayPaise - gstPaise - deliveryPaise - codPaise - sellerPaise;

  return {
    sellerPrice: toRupees(sellerPaise),
    delivery: toRupees(deliveryPaise),
    gateway: toRupees(gatewayPaise),
    cod: toRupees(codPaise),
    gst: toRupees(gstPaise),
    margin: toRupees(marginPaise),
    customerPrice: toRupees(totalPaise),
    netBeforeGst: toRupees(totalPaise - gstPaise),
  };
}

/**
 * The price to charge so that every cost is covered and BatraVerse still
 * keeps `margin`. With a zero margin this is the break-even price: anything
 * below it is a loss.
 *
 * Solves `total / (1 + gst) - gateway * total = seller + delivery + cod + margin`
 * then steps off the anchor until the rounded lines reconcile to the paisa.
 */
export function priceToSet(c: RateCharges, margin: number): RateBreakdown {
  const denom = 1 / (1 + c.gstRate) - c.gatewayRate;
  if (!(denom > 0)) return breakdownPaise(0, c);

  const sellerPaise = toPaise(c.sellerPrice);
  const deliveryPaise = toPaise(c.delivery);
  const codPaise = toPaise(c.cod);
  const marginPaise = toPaise(margin);
  const anchor = Math.round((sellerPaise + deliveryPaise + codPaise + marginPaise) / denom);

  let totalPaise = anchor;
  for (let d = 0; d <= 25; d++) {
    let found = -1;
    for (const candidate of d === 0 ? [anchor] : [anchor - d, anchor + d]) {
      const gatewayPaise = Math.round(candidate * c.gatewayRate);
      const gstPaise = Math.round(candidate - candidate / (1 + c.gstRate));
      if (candidate - gatewayPaise - gstPaise - deliveryPaise - codPaise - sellerPaise === marginPaise) {
        found = candidate;
        break;
      }
    }
    if (found >= 0) { totalPaise = found; break; }
  }

  return breakdownPaise(totalPaise, c);
}

/** What a chosen customer price actually leaves BatraVerse. */
export function marginAt(customerPrice: number, c: RateCharges): RateBreakdown {
  return breakdownPaise(Math.max(0, toPaise(customerPrice)), c);
}