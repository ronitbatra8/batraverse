const express = require("express");
const router = express.Router();
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const READY = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

function configMissing(res) {
  return res.status(503).json({
    error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env, restart the server, and set the same key id as NEXT_PUBLIC_RAZORPAY_KEY_ID in the client .env.local.",
  });
}

router.get("/keys", userAuth, (req, res) => {
  res.json({ keyId: READY ? RAZORPAY_KEY_ID : null, enabled: READY });
});

router.post("/order-create", userAuth, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { amountPaise, currency, receipt } = req.body || {};
    const amount = Math.round(Number(amountPaise || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount (expected positive integer in paise)" });
    }
    const auth = Buffer.from(RAZORPAY_KEY_ID + ":" + RAZORPAY_KEY_SECRET).toString("base64");
    const body = JSON.stringify({
      amount,
      currency: currency || "INR",
      receipt: receipt || ("order_receipt_" + Date.now()),
    });
    const rsp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + auth,
      },
      body,
    });
    const data = await rsp.json().catch(() => ({}));
    if (!rsp.ok) {
      return res.status(rsp.status).json({ error: data && data.error && data.error.description ? data.error.description : "Razorpay order creation failed" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/verify", userAuth, async (req, res) => {
  try {
    if (!READY) return configMissing(res);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required" });
    }
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");
    if (expected !== razorpaySignature) {
      return res.status(400).json({ error: "Invalid Razorpay signature" });
    }
    res.json({ verified: true, paymentId: razorpayPaymentId });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
