const jwt = require("jsonwebtoken");
const prisma = require("../db");

function sellerAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (!payload.userId) return res.status(401).json({ error: "Invalid token" });
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireSeller(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, role: true, approved: true, name: true, email: true, phone: true, shopName: true, shopDescription: true, pickupName: true, pickupAddress: true, pickupCity: true, pickupState: true, pickupPincode: true, pickupPhone: true, cardNumber: true, cardLevel: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "SELLER") return res.status(403).json({ error: "Seller access required" });
    if (!user.approved) return res.status(403).json({ error: "Account pending admin approval" });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { sellerAuth, requireSeller };
