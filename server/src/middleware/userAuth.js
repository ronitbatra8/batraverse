const jwt = require("jsonwebtoken");
const prisma = require("../db");

function userAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (!payload.userId || payload.purpose) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* Staff accounts (SELLER) must not use customer wallet/card/member flows — they
   are dashboard-only. Run AFTER userAuth so req.userId is set. */
async function customerOnly(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "SELLER") {
      return res.status(403).json({ error: "Seller accounts only have dashboard access" });
    }
    next();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { userAuth, customerOnly };
