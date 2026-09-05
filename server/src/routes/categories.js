const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { adminAuth } = require("../middleware/auth");
const { SLIM_SELECT, FULL_SELECT, slimProduct } = require("../utils/products");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: { subcategories: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    const store = categories.filter((c) => c.source === "store");
    const mart = categories.filter((c) => c.source === "mart");
    res.set("Cache-Control", "public, max-age=30");
    res.json({ store, mart, all: categories });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/all", adminAuth, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, source, icon } = req.body;
    if (!name || !source) return res.status(400).json({ error: "Name and source are required" });
    if (!["store", "mart"].includes(source)) return res.status(400).json({ error: "Source must be store or mart" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = await prisma.category.findFirst({ where: { slug, source } });
    if (existing) return res.status(400).json({ error: "Category already exists" });
    const maxOrder = await prisma.category.aggregate({ where: { source }, _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: { name, slug, source, icon: icon || null, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { name, icon, active, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
    if (icon !== undefined) data.icon = icon;
    if (active !== undefined) data.active = active;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.post("/:id/subcategories", adminAuth, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Subcategory name is required" });
    const parent = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!parent) return res.status(404).json({ error: "Category not found" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = await prisma.subcategory.findFirst({ where: { categoryId: parent.id, slug } });
    if (existing) return res.status(400).json({ error: "Subcategory already exists" });
    const maxOrder = await prisma.subcategory.aggregate({ where: { categoryId: parent.id }, _max: { sortOrder: true } });
    const sub = await prisma.subcategory.create({
      data: { name, slug, icon: icon || null, categoryId: parent.id, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/subcategories/:subId", adminAuth, async (req, res) => {
  try {
    const { name, icon, active, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
    if (icon !== undefined) data.icon = icon;
    if (active !== undefined) data.active = active;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const sub = await prisma.subcategory.update({ where: { id: req.params.subId }, data });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.delete("/subcategories/:subId", adminAuth, async (req, res) => {
  try {
    await prisma.subcategory.delete({ where: { id: req.params.subId } });
    res.json({ message: "Subcategory deleted" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/products/:source", async (req, res) => {
  try {
    const { source } = req.params;
    if (source !== "store" && source !== "mart") return res.status(400).json({ error: "source must be store or mart" });
    const full = req.query.mode === "full";
    const products = await prisma.product.findMany({
      where: { source, status: "approved" },
      orderBy: { name: "asc" },
      select: full ? FULL_SELECT : SLIM_SELECT,
    });
    res.set("Cache-Control", "public, max-age=300");
    res.json(full ? products : products.map(slimProduct));
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
