const prisma = require("./db");

const pricingData = [
  { fromLevel: "silver", toLevel: "gold", duration: "MONTHLY", price: 199 },
  { fromLevel: "silver", toLevel: "gold", duration: "QUARTERLY", price: 499 },
  { fromLevel: "silver", toLevel: "gold", duration: "YEARLY", price: 1499 },
  { fromLevel: "silver", toLevel: "platinum", duration: "MONTHLY", price: 399 },
  { fromLevel: "silver", toLevel: "platinum", duration: "QUARTERLY", price: 999 },
  { fromLevel: "silver", toLevel: "platinum", duration: "YEARLY", price: 2999 },
  { fromLevel: "silver", toLevel: "diamond", duration: "MONTHLY", price: 599 },
  { fromLevel: "silver", toLevel: "diamond", duration: "QUARTERLY", price: 1499 },
  { fromLevel: "silver", toLevel: "diamond", duration: "YEARLY", price: 4499 },
  { fromLevel: "silver", toLevel: "black", duration: "MONTHLY", price: 799 },
  { fromLevel: "silver", toLevel: "black", duration: "QUARTERLY", price: 1999 },
  { fromLevel: "silver", toLevel: "black", duration: "YEARLY", price: 5999 },
  { fromLevel: "gold", toLevel: "platinum", duration: "MONTHLY", price: 249 },
  { fromLevel: "gold", toLevel: "platinum", duration: "QUARTERLY", price: 649 },
  { fromLevel: "gold", toLevel: "platinum", duration: "YEARLY", price: 1999 },
  { fromLevel: "gold", toLevel: "diamond", duration: "MONTHLY", price: 449 },
  { fromLevel: "gold", toLevel: "diamond", duration: "QUARTERLY", price: 1149 },
  { fromLevel: "gold", toLevel: "diamond", duration: "YEARLY", price: 3499 },
  { fromLevel: "gold", toLevel: "black", duration: "MONTHLY", price: 649 },
  { fromLevel: "gold", toLevel: "black", duration: "QUARTERLY", price: 1649 },
  { fromLevel: "gold", toLevel: "black", duration: "YEARLY", price: 4999 },
  { fromLevel: "platinum", toLevel: "diamond", duration: "MONTHLY", price: 299 },
  { fromLevel: "platinum", toLevel: "diamond", duration: "QUARTERLY", price: 799 },
  { fromLevel: "platinum", toLevel: "diamond", duration: "YEARLY", price: 2499 },
  { fromLevel: "platinum", toLevel: "black", duration: "MONTHLY", price: 499 },
  { fromLevel: "platinum", toLevel: "black", duration: "QUARTERLY", price: 1299 },
  { fromLevel: "platinum", toLevel: "black", duration: "YEARLY", price: 3999 },
  { fromLevel: "diamond", toLevel: "black", duration: "MONTHLY", price: 349 },
  { fromLevel: "diamond", toLevel: "black", duration: "QUARTERLY", price: 899 },
  { fromLevel: "diamond", toLevel: "black", duration: "YEARLY", price: 2999 },
];

const DURATION_DAYS = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 };

async function seed() {
  for (const row of pricingData) {
    await prisma.cardUpgradePricing.upsert({
      where: { fromLevel_toLevel_duration: { fromLevel: row.fromLevel, toLevel: row.toLevel, duration: row.duration } },
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
