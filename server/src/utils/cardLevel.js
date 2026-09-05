/* Card level helpers shared across routes.

   Rule: an explicitly assigned card level (by the owner or a paid upgrade) is
   authoritative. Otherwise the level is derived from the peak lifetime wallet
   balance. "none" is stored as null, so a stored non-null cardLevel always
   means a real assigned level. */

const LEVEL_ORDER = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black", "owner"];

const VALID_LEVELS = new Set(LEVEL_ORDER);

const LEVEL_THRESHOLDS = [
  { level: "black", min: 30000 },
  { level: "diamond", min: 15000 },
  { level: "platinum", min: 5000 },
  { level: "gold", min: 1500 },
  { level: "silver", min: 500 },
  { level: "bronze", min: 100 },
  { level: "none", min: 0 },
];

function levelFromBalance(balance) {
  for (const t of LEVEL_THRESHOLDS) {
    if (balance >= t.min) return t.level;
  }
  return "none";
}

function getEffectiveCardLevel(user) {
  if (!user) return "none";
  const cl = user.cardLevel;
  if (cl && VALID_LEVELS.has(cl) && cl !== "none") return cl;
  const bal = typeof user.peakWalletBalance === "number"
    ? user.peakWalletBalance
    : typeof user.walletBalance === "number"
      ? user.walletBalance
      : 0;
  return levelFromBalance(bal);
}

module.exports = { getEffectiveCardLevel, levelFromBalance, LEVEL_ORDER, VALID_LEVELS };