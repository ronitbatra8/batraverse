const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage, validateEmail, normalizePhone, isEmail, isPhone } = require("../utils/helpers");
const { generateOTP, sendResetPasswordEmail, sendPasswordChangedEmail, sendOTPEmail } = require("../utils/email");

const router = express.Router();

const ROLE_PREFIX = {
  ADMIN: "FD",
  SELLER: "GL",
  DELIVERY: "SV",
  USER: "BV",
};

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com","throwaway.com","guerrillamail.com","mailinator.com","yopmail.com",
  "guerrillamailblock.com","grr.la","dispostable.com","sharklasers.com","guerrillamail.info",
  "grr.la","dispostable.com","tempail.com","temp-mail.org","fakeinbox.com","temp-mail.io",
  "mohmal.com","burnermail.io","harakirimail.com","tmail.io","tmpmail.net","1secmail.com",
  "maildrop.cc","mailnesia.com","trashmail.com","throwam.com","getnada.com","emailondeck.com",
  "tempinbox.com","discard.email","discardmail.com","mailcatch.com","tempomail.fr",
  "tmpmail.org","tmpmail.me","tmpmail.co","meltmail.com","spamgourmet.com","spaml.com",
  "deadaddress.com","boun.cr","mt2015.com","guerrillamail.de","guerrillamail.net",
  "inbox.testmail.app","tmpmail.nocbeer.org","tmpmail.yobi34.com"
]);

// Owner accounts are auto-trusted (their own SELLER/DELIVERY accounts skip manual approval).
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "ronit_batra_08_11@gmail.com").toLowerCase();
const OWNER_PHONE = process.env.OWNER_PHONE ? String(process.env.OWNER_PHONE).replace(/[\s\-()+.]+/g, "") : "9000000001";

function generateCardNumber(name) {
  const parts = (name || "").trim().split(/\s+/);
  let prefix;
  if (parts.length >= 2) {
    prefix = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    prefix = parts[0].slice(0, 2).toUpperCase();
  } else {
    prefix = "BV";
  }
  if (!/^[A-Z]{2}$/.test(prefix)) prefix = "BV";
  const randAlpha = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  const randNum = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}-${randAlpha(4)}-${randNum(4)}`;
}

function generateCardNumberForLevel(level) {
  const PREFIX = { none: "BV", bronze: "BZ", silver: "SV", gold: "GL", platinum: "PL", diamond: "DM", black: "BK", owner: "OW" };
  const prefix = PREFIX[level] || "BV";
  const randAlpha = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  const randNum = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}-${randAlpha(4)}-${randNum(4)}`;
}

function findUserByIdentifier(identifier) {
  if (isEmail(identifier)) {
    return prisma.user.findUnique({ where: { email: identifier.trim().toLowerCase() } });
  }
  if (isPhone(identifier)) {
    return prisma.user.findFirst({ where: { phone: normalizePhone(identifier) } });
  }
  return null;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    approved: user.approved,
    submittedForApproval: !!user.submittedForApproval,
    cardNumber: user.cardNumber || null,
    cardLevel: user.cardLevel || null,
    cardExpiry: user.cardExpiry || null,
    walletBalance: user.walletBalance || 0,
    peakWalletBalance: user.peakWalletBalance || 0,
    hasCardPin: !!user.cardPinHash,
    createdAt: user.createdAt,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, role, verifyToken } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Name, email, phone and password are required" });
    }
    if (!verifyToken) {
      return res.status(400).json({ error: "Email verification is required. Please verify your email with the OTP first." });
    }
    if (String(name).trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (!isPhone(phone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit Indian phone number" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split("@")[1];
    if (DISPOSABLE_DOMAINS.has(emailDomain)) {
      return res.status(400).json({ error: "Please use a permanent email address" });
    }
    const normalizedPhone = normalizePhone(phone);

    let emailVerified = false;
    try {
      const decoded = jwt.verify(String(verifyToken), process.env.JWT_SECRET);
      emailVerified = decoded.purpose === "email-verify" && decoded.email === normalizedEmail;
    } catch {
      emailVerified = false;
    }
    if (!emailVerified) {
      return res.status(400).json({ error: "Email verification is required. Please verify your email with the OTP first." });
    }

    const [emailExists, phoneExists] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      prisma.user.findFirst({ where: { phone: normalizedPhone } }),
    ]);
    if (emailExists) return res.status(400).json({ error: "Email already registered" });
    if (phoneExists) return res.status(400).json({ error: "Phone number already registered" });

    const validRoles = ["USER", "CUSTOMER", "SELLER", "DELIVERY"];
    const requestedRole = validRoles.includes(role) ? role : "CUSTOMER";
    const userRole = requestedRole === "CUSTOMER" ? "USER" : requestedRole;
    const needsApproval = userRole === "SELLER" || userRole === "DELIVERY";
    const isOwner = normalizedEmail === OWNER_EMAIL || normalizedPhone === OWNER_PHONE;

    const hashed = await bcrypt.hash(String(password), 10);
    let cardNumber;
    let cardUnique = false;
    while (!cardUnique) {
      cardNumber = generateCardNumber(name);
      const existing = await prisma.user.findUnique({ where: { cardNumber } });
      if (!existing) cardUnique = true;
    }
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash: hashed,
        role: userRole,
        approved: !needsApproval || isOwner,
        cardNumber,
        cardLevel: null,
      },
    });
    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const id = (identifier ?? email ?? phone ?? "").trim();
    if (!id) {
      return res.status(400).json({ error: "Email, phone, or card number is required" });
    }

    let user;

    if (isEmail(id)) {
      user = await prisma.user.findUnique({ where: { email: id.toLowerCase() } });
    } else if (isPhone(id)) {
      user = await prisma.user.findFirst({ where: { phone: normalizePhone(id) } });
    } else {
      user = await prisma.user.findFirst({ where: { cardNumber: { equals: id, mode: "insensitive" } } });
    }

    if (!user) {
      return res.status(401).json({ error: "No account found with these details", code: "NOT_FOUND" });
    }

    if (!password) {
      return res.status(401).json({ error: "Please enter your password", code: "NO_PASSWORD" });
    }

    let valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid && user.cardPinHash) {
      valid = await bcrypt.compare(String(password), user.cardPinHash);
    }
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password. Please try again.", code: "WRONG_PASSWORD" });
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/me", userAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        savedAddresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        _count: { select: { orders: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const currentMonth = new Date().toISOString().slice(0, 7);
    let freeDeliveryUsed = user.freeDeliveryUsed || 0;
    if (user.freeDeliveryMonth !== currentMonth) {
      freeDeliveryUsed = 0;
    }
    res.json({
      ...publicUser(user),
      savedAddresses: user.savedAddresses,
      orderCount: user._count.orders,
      cardLevel: user.cardLevel || null,
      cardExpiry: user.cardExpiry || null,
      freeDeliveryUsed,
      freeDeliveryMonth: currentMonth,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/me", userAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const data = {};
    if (name !== undefined) {
      if (String(name).trim().length < 2) return res.status(400).json({ error: "Name must be at least 2 characters" });
      data.name = name.trim();
    }
    if (phone !== undefined) {
      if (!isPhone(phone)) return res.status(400).json({ error: "Please enter a valid 10-digit Indian phone number" });
      const normalizedPhone = normalizePhone(phone);
      const dup = await prisma.user.findFirst({ where: { phone: normalizedPhone, NOT: { id: req.userId } } });
      if (dup) return res.status(400).json({ error: "Phone number already registered" });
      data.phone = normalizedPhone;
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      include: {
        savedAddresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        _count: { select: { orders: true } },
      },
    });
    res.json({
      ...publicUser(user),
      savedAddresses: user.savedAddresses,
      orderCount: user._count.orders,
      cardLevel: user.cardLevel || null,
      cardExpiry: user.cardExpiry || null,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

const LEVEL_PREFIX_MAP = {
  none: "BV",
  bronze: "BZ",
  silver: "SV",
  gold: "GL",
  platinum: "PL",
  diamond: "DM",
  black: "BK",
  owner: "OW",
};

router.put("/me/card-number", userAuth, async (req, res) => {
  try {
    const { mode, customText, customPrefix, customNumber } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const rand = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
    const getLevelFromBal = (bal) => { if (bal >= 30000) return "black"; if (bal >= 15000) return "diamond"; if (bal >= 5000) return "platinum"; if (bal >= 1500) return "gold"; if (bal >= 500) return "silver"; if (bal >= 100) return "bronze"; return "none"; };
    const level = user.cardLevel === "owner" ? "owner" : getLevelFromBal(user.walletBalance || 0);
    const prefix = LEVEL_PREFIX_MAP[level] || "BV";

    let cardNumber;

    if (mode === "full" && (user.cardLevel === "owner" || user.cardLevel === "black")) {
      const p = String(customPrefix || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
      const t = String(customText || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10);
      const n = String(customNumber || "").replace(/[^0-9]/g, "").slice(0, 6);
      if (!p || p.length < 1) return res.status(400).json({ error: "Prefix must be 1-6 characters (alphabet only)" });
      if (!t || t.length < 1) return res.status(400).json({ error: "Text must be 1-10 characters (alphabet only)" });
      const numPart = n.length > 0 ? n : rand(nums, 4);
      cardNumber = `${p}-${t}-${numPart}`;

    } else if (mode === "half" && (user.cardLevel === "black" || user.cardLevel === "owner")) {
      const t = String(customText || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10);
      if (!t || t.length < 1) return res.status(400).json({ error: "Text must be 1-10 characters (alphabet only)" });
      const nameParts = (user.name || "").trim().split(/\s+/);
      let namePrefix;
      if (nameParts.length >= 2) namePrefix = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      else if (nameParts.length === 1 && nameParts[0].length >= 2) namePrefix = nameParts[0].slice(0, 2).toUpperCase();
      else namePrefix = "BV";
      cardNumber = `${namePrefix}-${t}-${rand(alpha, 4)}`;

    } else {
      return res.status(400).json({ error: "Invalid mode for your card level" });
    }

    const existing = await prisma.user.findFirst({ where: { cardNumber, NOT: { id: req.userId } } });
    if (existing) {
      return res.status(400).json({ error: "This card number already exists, try again" });
    }
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { cardNumber },
      select: { id: true, cardNumber: true },
    });
    res.json({ cardNumber: updated.cardNumber });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/me/card-pin", userAuth, async (req, res) => {
  try {
    const { pin, currentPassword } = req.body;
    if (!pin || String(pin).length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 characters" });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required to set card PIN" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect current password" });
    }
    const pinHash = await bcrypt.hash(String(pin), 10);
    await prisma.user.update({ where: { id: req.userId }, data: { cardPinHash: pinHash } });
    res.json({ message: "Card PIN set successfully" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/me/card-pin", userAuth, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required to remove card PIN" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect current password" });
    }
    await prisma.user.update({ where: { id: req.userId }, data: { cardPinHash: null } });
    res.json({ message: "Card PIN removed" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Email or phone number is required" });

    let user;
    let lookupType;
    if (isEmail(identifier)) {
      lookupType = "email";
      user = await prisma.user.findUnique({ where: { email: identifier.trim().toLowerCase() } });
    } else if (isPhone(identifier)) {
      lookupType = "phone";
      user = await prisma.user.findFirst({ where: { phone: normalizePhone(identifier) } });
    } else {
      return res.status(400).json({ error: "Please enter a valid email address or phone number" });
    }
    if (!user) return res.status(404).json({ error: "No account found with these details" });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.upsert({
      where: { email: user.email },
      update: { code, name: user.name, password: "RESET", expiresAt, createdAt: new Date() },
      create: { email: user.email, code, name: user.name, password: "RESET", expiresAt },
    });

    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
    const method = lookupType === "phone" ? "sms" : "email";
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        method,
        ipAddress: typeof ip === "string" ? ip : ip?.[0] || null,
        status: "requested",
      },
    });

    await sendResetPasswordEmail(user.email, code, user.name);

    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    res.json({ message: `OTP sent to ${maskedEmail}`, maskedEmail, identifier: maskedEmail });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code) return res.status(400).json({ error: "Identifier and OTP code are required" });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(404).json({ error: "No account found" });

    const record = await prisma.otp.findUnique({ where: { email: user.email } });
    if (!record) return res.status(400).json({ error: "No reset request found. Please try again." });
    if (record.password !== "RESET") return res.status(400).json({ error: "Invalid reset session. Please try again." });
    if (new Date() > record.expiresAt) {
      await prisma.otp.delete({ where: { email: user.email } });
      const pending = await prisma.passwordReset.findFirst({ where: { userId: user.id, status: "requested" }, orderBy: { createdAt: "desc" } });
      if (pending) await prisma.passwordReset.update({ where: { id: pending.id }, data: { status: "failed", failReason: "OTP expired" } });
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }
    if (record.code !== String(code).trim()) {
      const pending = await prisma.passwordReset.findFirst({ where: { userId: user.id, status: "requested" }, orderBy: { createdAt: "desc" } });
      if (pending) await prisma.passwordReset.update({ where: { id: pending.id }, data: { status: "failed", failReason: "Incorrect OTP entered" } });
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }

    const resetToken = jwt.sign({ userId: user.id, purpose: "reset" }, process.env.JWT_SECRET, { expiresIn: "15m" });
    await prisma.otp.delete({ where: { email: user.email } });

    const pending = await prisma.passwordReset.findFirst({ where: { userId: user.id, status: "requested" }, orderBy: { createdAt: "desc" } });
    if (pending) await prisma.passwordReset.update({ where: { id: pending.id }, data: { status: "verified", verifiedAt: new Date() } });

    res.json({ resetToken, message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ error: "Reset token and new password are required" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: "Invalid or expired reset token. Please start over." });
    }
    if (decoded.purpose !== "reset") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash: hashed } });

    const pending = await prisma.passwordReset.findFirst({ where: { userId: decoded.userId, status: "verified" }, orderBy: { createdAt: "desc" } });
    if (pending) {
      await prisma.passwordReset.update({ where: { id: pending.id }, data: { status: "completed", completedAt: new Date() } });
    }

    try {
      const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
      await sendPasswordChangedEmail(user.email, user.name, pending?.method || "Forgot Password", typeof ip === "string" ? ip : ip?.[0] || null);
    } catch (emailErr) {
      console.error("Password changed email failed:", emailErr.message);
    }

    res.json({ message: "Password reset successfully! You can now sign in with your new password." });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and OTP code are required" });
    const normalized = String(email).trim().toLowerCase();
    const record = await prisma.otp.findUnique({ where: { email: normalized } });
    if (!record) return res.status(400).json({ error: "No verification request found" });
    if (new Date() > record.expiresAt) {
      await prisma.otp.delete({ where: { email: record.email } });
      return res.status(400).json({ error: "OTP has expired. Please try again." });
    }
    if (record.code !== String(code).trim()) {
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }
    await prisma.otp.delete({ where: { email: record.email } });
    const verifyToken = jwt.sign({ email: normalized, purpose: "email-verify" }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.json({ message: "Email verified successfully", verifyToken });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !validateEmail(email)) return res.status(400).json({ error: "A valid email is required" });
    const normalized = String(email).trim().toLowerCase();
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otp.upsert({
      where: { email: normalized },
      update: { code, name: name || null, password: null, expiresAt, createdAt: new Date() },
      create: { email: normalized, code, name: name || null, password: null, expiresAt },
    });
    await sendOTPEmail(normalized, code, name);
    res.json({ message: `OTP sent to ${normalized}` });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
