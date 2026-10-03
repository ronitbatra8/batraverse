const express = require("express");
const prisma = require("../db");
const { safeErrorMessage } = require("../utils/helpers");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

const SOURCES = ["store", "mart"];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Public read. Only active rows, source filtered, sorted for display.
router.get("/", async (req, res) => {
  try {
    const { source } = req.query;
    if (source && !SOURCES.includes(source)) return res.status(400).json({ error: "source must be store or mart" });
    const sections = await prisma.categorySection.findMany({
      where: { active: true, ...(source ? { source } : {}) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.set("Cache-Control", "no-store");
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Admin read of the section only (never the category system).
router.get("/admin", adminAuth, async (_req, res) => {
  try {
    const sections = await prisma.categorySection.findMany({
      orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Add an existing category (by slug) to the section.
router.post("/", adminAuth, async (req, res) => {
  try {
    const { categorySlug, image, name } = req.body;
    if (!categorySlug) return res.status(400).json({ error: "categorySlug is required" });

    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return res.status(404).json({ error: "Category not found" });

    const existing = await prisma.categorySection.findUnique({ where: { categorySlug } });
    if (existing) return res.status(400).json({ error: "Category is already in the section" });

    const maxOrder = await prisma.categorySection.aggregate({
      where: { source: category.source },
      _max: { sortOrder: true },
    });

    const section = await prisma.categorySection.create({
      data: {
        categorySlug,
        source: category.source,
        name: name || category.name,
        image: image || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Create a brand new category in the category system AND add it to the section.
// The category itself is created by the category system route, so this stays
// the single source of truth for categories; the section only links to it.
router.post("/with-category", adminAuth, async (req, res) => {
  try {
    const { name, source, image } = req.body;
    if (!name || !source) return res.status(400).json({ error: "Name and source are required" });
    if (!SOURCES.includes(source)) return res.status(400).json({ error: "Source must be store or mart" });

    const slug = slugify(name);
    if (!slug) return res.status(400).json({ error: "Name is required" });

    const existing = await prisma.category.findFirst({ where: { slug, source } });
    if (existing) return res.status(400).json({ error: "Category already exists" });

    const maxOrder = await prisma.category.aggregate({ where: { source }, _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: { name, slug, source, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });

    const secMax = await prisma.categorySection.aggregate({ where: { source }, _max: { sortOrder: true } });
    const section = await prisma.categorySection.create({
      data: {
        categorySlug: slug,
        source,
        name,
        image: image || null,
        sortOrder: (secMax._max.sortOrder || 0) + 1,
      },
    });

    res.status(201).json({ section, category });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Edit only the section. image/name/order/active.
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { image, name, active, sortOrder } = req.body;
    const data = {};
    if (image !== undefined) data.image = image || null;
    if (name !== undefined) data.name = name;
    if (active !== undefined) data.active = Boolean(active);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    const section = await prisma.categorySection.update({ where: { id: req.params.id }, data });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/reorder", adminAuth, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.categorySection.update({ where: { id }, data: { sortOrder: index + 1 } })
      )
    );
    const sections = await prisma.categorySection.findMany({ orderBy: [{ sortOrder: "asc" }] });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Remove from section only. The category itself is untouched and becomes
// available again on the dashboard "not added" list.
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await prisma.categorySection.delete({ where: { id: req.params.id } });
    res.json({ message: "Removed from section" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* ------------------------------------------------------------------ *
 * Subcategory sections — rendered on a category's dedicated page.
 * Fully independent of CategorySection and of the category system.
 * ------------------------------------------------------------------ */

// Public read for one category page.
router.get("/sub", async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: "category is required" });
    const items = await prisma.subcategorySection.findMany({
      where: { parentSlug: String(category), active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.set("Cache-Control", "no-store");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/sub/admin", adminAuth, async (_req, res) => {
  try {
    const items = await prisma.subcategorySection.findMany({
      orderBy: [{ parentSlug: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Add an existing subcategory into its parent category's section.
router.post("/sub", adminAuth, async (req, res) => {
  try {
    const { parentSlug, subcategorySlug, image, name } = req.body;
    if (!parentSlug || !subcategorySlug) {
      return res.status(400).json({ error: "parentSlug and subcategorySlug are required" });
    }

    const parent = await prisma.category.findUnique({ where: { slug: parentSlug } });
    if (!parent) return res.status(404).json({ error: "Parent category not found" });

    const sub = await prisma.subcategory.findFirst({
      where: { slug: subcategorySlug, categoryId: parent.id },
    });
    if (!sub) return res.status(404).json({ error: "Subcategory not found" });

    const existing = await prisma.subcategorySection.findUnique({
      where: { parentSlug_subcategorySlug: { parentSlug, subcategorySlug } },
    });
    if (existing) return res.status(400).json({ error: "Subcategory is already in the section" });

    const maxOrder = await prisma.subcategorySection.aggregate({
      where: { parentSlug },
      _max: { sortOrder: true },
    });

    const row = await prisma.subcategorySection.create({
      data: {
        parentSlug,
        subcategorySlug,
        source: parent.source,
        name: name || sub.name,
        image: image || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Create a brand new subcategory in the category system AND add it to the
// parent category's section.
router.post("/sub/with-subcategory", adminAuth, async (req, res) => {
  try {
    const { parentSlug, name, image } = req.body;
    if (!parentSlug || !name) return res.status(400).json({ error: "parentSlug and name are required" });

    const parent = await prisma.category.findUnique({ where: { slug: parentSlug } });
    if (!parent) return res.status(404).json({ error: "Parent category not found" });

    const slug = slugify(name);
    if (!slug) return res.status(400).json({ error: "Name is required" });

    const existing = await prisma.subcategory.findFirst({
      where: { slug, categoryId: parent.id },
    });
    if (existing) return res.status(400).json({ error: "Subcategory already exists in this category" });

    const maxOrder = await prisma.subcategory.aggregate({
      where: { categoryId: parent.id },
      _max: { sortOrder: true },
    });
    const sub = await prisma.subcategory.create({
      data: { name, slug, categoryId: parent.id, sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });

    const secMax = await prisma.subcategorySection.aggregate({
      where: { parentSlug },
      _max: { sortOrder: true },
    });
    const row = await prisma.subcategorySection.create({
      data: {
        parentSlug,
        subcategorySlug: slug,
        source: parent.source,
        name,
        image: image || null,
        sortOrder: (secMax._max.sortOrder || 0) + 1,
      },
    });

    res.status(201).json({ section: row, subcategory: sub });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/sub/:id", adminAuth, async (req, res) => {
  try {
    const { image, name, active, sortOrder } = req.body;
    const data = {};
    if (image !== undefined) data.image = image || null;
    if (name !== undefined) data.name = name;
    if (active !== undefined) data.active = Boolean(active);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    const row = await prisma.subcategorySection.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

// Remove from section only. The subcategory stays in the category system.
router.delete("/sub/:id", adminAuth, async (req, res) => {
  try {
    await prisma.subcategorySection.delete({ where: { id: req.params.id } });
    res.json({ message: "Removed from section" });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;