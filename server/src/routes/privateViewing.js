const express = require("express");
const prisma = require("../db");
const { adminAuth } = require("../middleware/auth");
const { safeErrorMessage, PRIVATE_VIEWING_STATUSES } = require("../utils/helpers");

const router = express.Router();

router.get("/status", async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json({ hasPendingRequest: false });
    const normalized = String(phone).trim();
    const pending = await prisma.privateViewing.findFirst({
      where: { phone: normalized, status: "requested" },
    });
    res.json({ hasPendingRequest: !!pending });
  } catch (err) {
    res.json({ hasPendingRequest: false });
  }
});

router.post("/request", async (req, res) => {
  try {
    const { name, phone, note } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!phone || !/^[\d+\-\s()]{6,20}$/.test(String(phone))) {
      return res.status(400).json({ error: "A valid phone number is required" });
    }
    await prisma.privateViewing.create({
      data: {
        name: name.trim(),
        phone: String(phone).trim(),
        note: note ? String(note).trim().slice(0, 1000) : null,
      },
    });
    res.json({ message: "Request received! We will call you shortly." });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/list", adminAuth, async (req, res) => {
  try {
    const requests = await prisma.privateViewing.findMany({
      orderBy: { createdAt: "desc" },
    });
    const unread = requests.filter((r) => !r.read).length;
    res.json({ total: requests.length, unread, requests });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !PRIVATE_VIEWING_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${PRIVATE_VIEWING_STATUSES.join(", ")}` });
    }
    const existing = await prisma.privateViewing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Request not found" });
    const updated = await prisma.privateViewing.update({
      where: { id: req.params.id },
      data: { status, read: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/read", adminAuth, async (req, res) => {
  try {
    const existing = await prisma.privateViewing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Request not found" });
    const updated = await prisma.privateViewing.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

router.get("/my", async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.json({ requests: [] });
    const normalized = String(phone).trim();
    const requests = await prisma.privateViewing.findMany({
      where: { phone: normalized },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, note: true, reply: true, status: true, createdAt: true, updatedAt: true },
    });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/reply", adminAuth, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !String(reply).trim()) {
      return res.status(400).json({ error: "Reply text is required" });
    }
    const existing = await prisma.privateViewing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Request not found" });
    const updated = await prisma.privateViewing.update({
      where: { id: req.params.id },
      data: { reply: String(reply).trim().slice(0, 2000), status: "completed", read: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const existing = await prisma.privateViewing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Request not found" });
    await prisma.privateViewing.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

module.exports = router;
