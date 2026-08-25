function safeErrorMessage(err) {
  return process.env.NODE_ENV === "production" ? "Something went wrong" : (err.message || "Something went wrong");
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isEmail(identifier) {
  return typeof identifier === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
}

function normalizePhone(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/[\s\-()+.]+/g, "");
  return cleaned.startsWith("91") && cleaned.length === 12 ? cleaned.slice(2) : cleaned;
}

function isPhone(identifier) {
  if (typeof identifier !== "string") return false;
  const n = normalizePhone(identifier);
  return /^[6-9]\d{9}$/.test(n);
}

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
];

const MESSAGE_STATUSES = ["pending", "in-progress", "replied", "resolved"];

const PRIVATE_VIEWING_STATUSES = ["requested", "confirmed", "completed", "cancelled"];

module.exports = { safeErrorMessage, validateEmail, isEmail, normalizePhone, isPhone, ORDER_STATUSES, MESSAGE_STATUSES, PRIVATE_VIEWING_STATUSES };
