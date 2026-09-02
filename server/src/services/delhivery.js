const { safeErrorMessage } = require("../utils/helpers");

const BASE_URLS = {
  staging: "https://staging-express.delhivery.com",
  production: "https://track.delhivery.com",
};

const TRACKING_PAGE = "https://www.delhivery.com/track/package";

function config() {
  return {
    enabled: process.env.DELHIVERY_ENABLED === "true",
    env: process.env.DELHIVERY_ENV === "production" ? "production" : "staging",
    token: process.env.DELHIVERY_API_TOKEN || "",
    client: process.env.DELHIVERY_CLIENT_NAME || "",
    pickup: process.env.DELHIVERY_PICKUP_LOCATION || "",
    gst: process.env.DELHIVERY_GST || "",
    hsn: process.env.DELHIVERY_HSN || "",
    defaultWeight: process.env.DELHIVERY_DEFAULT_WEIGHT || "0.500",
  };
}

function baseUrl(cfg) {
  return BASE_URLS[cfg.env] || BASE_URLS.staging;
}

function trackingUrl(waybill) {
  if (!waybill) return "";
  return `${TRACKING_PAGE}/${encodeURIComponent(waybill)}`;
}

function shippingHeaders(cfg) {
  return {
    Authorization: `Token ${cfg.token}`,
    "Content-Type": "application/json",
  };
}

async function parseRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Delhivery error ${res.status}: ${JSON.stringify(data)}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function createShipment({ order, customer }) {
  const cfg = config();
  if (!cfg.token || !cfg.client) throw new Error("Delhivery is not configured (token/client missing)");
  const paymentMode = order.paymentMethod === "COD" ? "COD" : "Prepaid";

  const shipment = {
    name: order.shippingName || customer?.name || "",
    add: order.shippingAddress || "",
    city: order.shippingCity || "",
    state: order.shippingState || "",
    country: "India",
    pin: order.shippingPincode || "",
    phone: order.shippingPhone || "",
    order: order.orderId || order.id,
    shipment_type: "Forward",
    payment_mode: paymentMode,
    consignee_email: customer?.email || "",
    pickup_location: cfg.pickup,
    weight: cfg.defaultWeight,
  };
  if (paymentMode === "COD") shipment.cod_amount = Number(order.totalAmount) || 0;
  if (cfg.gst) shipment.seller_gst_tin = cfg.gst;
  if (cfg.hsn) shipment.hsn_code = cfg.hsn;

  const body = {
    format: "json",
    data: {
      shipments: [shipment],
      pickup_location: cfg.pickup,
      client: cfg.client,
      client_name: cfg.client,
      payment_mode: paymentMode,
    },
  };

  const res = await fetch(`${baseUrl(cfg.env)}/api/cmu/create`, {
    method: "POST",
    headers: shippingHeaders(cfg),
    body: JSON.stringify(body),
  });
  const data = await parseRes(res);

  const pkg = (Array.isArray(data.packages) && data.packages[0]) || {};
  const waybill = pkg.waybill || data.waybill || "";
  if (!waybill) throw new Error(`Delhivery did not return a waybill: ${JSON.stringify(data)}`);

  return {
    waybill,
    carrierOrderId: pkg.order || order.orderId || order.id,
    trackingUrl: trackingUrl(waybill),
    raw: data,
  };
}

async function trackShipment(waybill) {
  const cfg = config();
  if (!cfg.token) throw new Error("Delhivery is not configured (token missing)");
  const url = `${baseUrl(cfg.env)}/api/packages/json/?token=${encodeURIComponent(cfg.token)}&waybill=${encodeURIComponent(waybill)}`;
  const res = await fetch(url, { method: "GET" });
  const data = await parseRes(res);
  const raw = (Array.isArray(data.ShipmentData) && data.ShipmentData[0]) || {};
  const status = raw?.Shipment?.Status || "";
  const scn = Array.isArray(raw?.Scans) ? raw.Scans : [];
  const latestScan = scn[scn.length - 1];
  return {
    status,
    scan: latestScan ? { time: latestScan.ScanDateTime || "", instruction: latestScan.Instruction || "", location: latestScan.Location || "" } : null,
    timeline: scn.map((s) => ({ time: s.ScanDateTime || "", status: s.Status || "", location: s.Location || "", instruction: s.Instruction || "" })),
    raw: data,
  };
}

module.exports = {
  config,
  baseUrl,
  trackingUrl,
  createShipment,
  trackShipment,
  safeErrorMessage,
};