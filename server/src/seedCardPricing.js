const prisma = require("./db");

const LEVEL_THRESHOLD = {
  bronze: 100,
  silver: 500,
  gold: 1500,
  platinum: 5000,
  diamond: 15000,
  black: 30000,
};

const LEVELS_FORWARD = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
const ORDER = Object.fromEntries(LEVELS_FORWARD.map((l, i) => [l, i]));

const pricingData = [];
for (const fromLevel of LEVELS_FORWARD) {
  for (const toLevel of LEVELS_FORWARD) {
    if (ORDER[toLevel] <= ORDER[fromLevel]) continue;
    pricingData.push({ fromLevel, toLevel, price: LEVEL_THRESHOLD[toLevel] });
  }
}

async function seed() {
  for (const row of pricingData) {
    await prisma.cardUpgradePricing.upsert({
      where: { fromLevel_toLevel: { fromLevel: row.fromLevel, toLevel: row.toLevel } },
      update: { price: row.price, active: true },
      create: row,
    });
  }
  console.log(`Seeded ${pricingData.length} pricing rows.`);
  await prisma.$disconnect();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});