/* Card level helpers shared across routes.

   Rule: the owner's card is permanently OWNER — there is exactly one owner
   (role ADMIN) and it can never be downgraded by money or by admin action.
   Everyone else is purely money-driven: the level is the tier of the higher
   of the peak lifetime wallet balance and the current wallet balance. A credit
   that crosses a threshold auto-advances the level; spending does not drop it
   because the lifetime peak holds the level. "none" is stored as null. */

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
  if (user.role === "ADMIN" || user.cardLevel === "owner") return "owner";
  const peak = typeof user.peakWalletBalance === "number" ? user.peakWalletBalance : 0;
  const bal = typeof user.walletBalance === "number" ? user.walletBalance : 0;
  return levelFromBalance(Math.max(peak, bal));
}

module.exports = { getEffectiveCardLevel, levelFromBalance, LEVEL_ORDER, VALID_LEVELS };