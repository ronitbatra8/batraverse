const express = require("express");
const prisma = require("../db");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

router.get("/", userAuth, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/", userAuth, async (req, res) => {
  try {
    const { address, apartment, city, state, pincode, alternatePhone, isDefault } = req.body;
    if (!address || !address.trim()) return res.status(400).json({ error: "Address is required" });
    if (!city || !city.trim()) return res.status(400).json({ error: "City is required" });

    let makeDefault = !!isDefault;
    if (makeDefault) {
      await prisma.address.updateMany({ where: { userId: req.userId, isDefault: true }, data: { isDefault: false } });
    } else {
      const existing = await prisma.address.count({ where: { userId: req.userId } });
      if (existing === 0) makeDefault = true;
    }

    const created = await prisma.address.create({
      data: {
        userId: req.userId,
        address: address.trim(),
        apartment: apartment ? apartment.trim() : null,
        city: city.trim(),
        state: state ? String(state).trim() : null,
        pincode: pincode ? String(pincode).trim() : null,
        alternatePhone: alternatePhone ? alternatePhone.trim() : null,
        isDefault: makeDefault,
      },
    });
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id", userAuth, async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Address not found" });
    const { address, city, state, pincode, isDefault } = req.body;
    const updated = await prisma.address.update({
      where: { id: req.params.id },
      data: {
        address: address !== undefined ? address.trim() : existing.address,
        city: city !== undefined ? city.trim() : existing.city,
        state: state !== undefined ? (state ? String(state).trim() : null) : existing.state,
        pincode: pincode !== undefined ? (pincode ? String(pincode).trim() : null) : existing.pincode,
        isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/default", userAuth, async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Address not found" });
    await prisma.address.updateMany({ where: { userId: req.userId, isDefault: true }, data: { isDefault: false } });
    const updated = await prisma.address.update({ where: { id: req.params.id }, data: { isDefault: true } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/:id", userAuth, async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Address not found" });
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
