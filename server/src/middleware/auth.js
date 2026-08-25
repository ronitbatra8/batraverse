const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (key && safeEqual(key, process.env.ADMIN_KEY)) {
    req.admin = true;
    return next();
  }

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      if (payload.role === "ADMIN") {
        req.admin = true;
        req.userId = payload.userId;
        return next();
      }
    } catch {
      // fall through to 403
    }
  }

  return res.status(403).json({ error: "Invalid admin key" });
}

module.exports = { adminAuth };
