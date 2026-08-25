const express = require("express");
const prisma = require("../db");
const { adminAuth } = require("../middleware/auth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

router.get("/status", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json({ subscribed: false });
    const normalized = String(email).toLowerCase();
    const sub = await prisma.newsletter.findUnique({ where: { email: normalized } });
    res.json({ subscribed: !!sub && sub.active });
  } catch (err) {
    res.json({ subscribed: false });
  }
});

router.post("/subscribe", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    const normalized = email.toLowerCase();
    const existing = await prisma.newsletter.findUnique({ where: { email: normalized } });
    if (existing) {
      if (existing.active) return res.json({ message: "Already subscribed!" });
      await prisma.newsletter.update({ where: { email: normalized }, data: { active: true, name: name || existing.name } });
      return res.json({ message: "Welcome back! You have been re-subscribed." });
    }
    await prisma.newsletter.create({ data: { email: normalized, name: name || null } });
    res.json({ message: "Subscribed successfully!" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/list", adminAuth, async (req, res) => {
  try {
    const [subscribers, active] = await Promise.all([
      prisma.newsletter.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.newsletter.count({ where: { active: true } }),
    ]);
    res.json({ total: subscribers.length, active, subscribers });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/toggle", adminAuth, async (req, res) => {
  try {
    const sub = await prisma.newsletter.findUnique({ where: { id: req.params.id } });
    if (!sub) return res.status(404).json({ error: "Subscriber not found" });
    const updated = await prisma.newsletter.update({ where: { id: req.params.id }, data: { active: !sub.active } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalized = email.toLowerCase();
    const existing = await prisma.newsletter.findUnique({ where: { email: normalized } });
    if (!existing || !existing.active) {
      return res.json({ message: "You are not currently subscribed." });
    }
    await prisma.newsletter.update({ where: { email: normalized }, data: { active: false } });
    res.json({ message: "You have been unsubscribed." });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await prisma.newsletter.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
