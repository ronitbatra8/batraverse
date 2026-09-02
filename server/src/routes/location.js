const express = require("express");
const router = express.Router();

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

router.get("/reverse", async (req, res) => {
  const lat = Number(req.query.lat || req.query.latitude);
  const lon = Number(req.query.lon || req.query.longitude || req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Valid lat and lon are required" });
  }

  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "BatraVerse/1.0 (contact: support@batraverse.com)" },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return res.status(502).json({ error: "Reverse geocoding failed" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Reverse geocoding failed" });
  }
});

module.exports = router;
