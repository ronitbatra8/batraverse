const express = require("express");
const prisma = require("../db");
const { adminAuth } = require("../middleware/auth");
const { safeErrorMessage } = require("../utils/helpers");

const router = express.Router();

router.post("/track", async (req, res) => {
  try {
    const { visitorId, page, referrer, userAgent, duration } = req.body;
    if (!visitorId || !page) return res.status(400).json({ error: "visitorId and page required" });
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    await prisma.visit.create({
      data: {
        visitorId,
        page,
        referrer: referrer || null,
        userAgent: userAgent || null,
        ip: ip ? String(ip).split(",")[0].trim() : null,
        duration: duration ? parseInt(duration, 10) : null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/stats", adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalVisits, totalUnique, dailyVisits, weeklyVisits, dailyUnique, weeklyUnique, pageViews, avgDuration, dailyLast7] = await Promise.all([
      prisma.visit.count(),
      prisma.visit.findMany({ select: { visitorId: true }, distinct: ["visitorId"] }).then((r) => r.length),
      prisma.visit.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.visit.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.visit.findMany({ where: { createdAt: { gte: todayStart } }, select: { visitorId: true }, distinct: ["visitorId"] }).then((r) => r.length),
      prisma.visit.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { visitorId: true }, distinct: ["visitorId"] }).then((r) => r.length),
      prisma.visit.groupBy({ by: ["page"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
      prisma.visit.aggregate({ _avg: { duration: true }, where: { duration: { not: null } } }),
      (async () => {
        const out = [];
        for (let d = 6; d >= 0; d--) {
          const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1);
          const visits = await prisma.visit.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } });
          const unique = await prisma.visit.findMany({ where: { createdAt: { gte: dayStart, lt: dayEnd } }, select: { visitorId: true }, distinct: ["visitorId"] }).then((r) => r.length);
          out.push({
            date: dayStart.toISOString().slice(0, 10),
            label: dayStart.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
            visits,
            unique,
          });
        }
        return out;
      })(),
    ]);

    res.json({
      today: { visits: dailyVisits, unique: dailyUnique },
      week: { visits: weeklyVisits, unique: weeklyUnique },
      overall: { visits: totalVisits, unique: totalUnique },
      avgDuration: avgDuration._avg.duration || 0,
      topPages: pageViews.map((p) => ({ page: p.page, visits: p._count.id })),
      dailyLast7,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

module.exports = router;
