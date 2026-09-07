const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ROLE_PREFIX = {
  ADMIN: "OW",
  SELLER: "GL",
  DELIVERY: "SV",
  USER: "BV",
};

function generateCardNumber(name) {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const parts = (name || "").trim().split(/\s+/);
  let prefix;
  if (parts.length >= 2) prefix = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  else if (parts.length === 1 && parts[0].length >= 2) prefix = parts[0].slice(0, 2).toUpperCase();
  else prefix = "BV";
  if (!/^[A-Z]{2}$/.test(prefix)) prefix = "BV";
  const randAlpha = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  const randNum = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}-${randAlpha(4)}-${randNum(4)}`;
}

async function main() {
  console.log("Wiping all data...");

  // Delete in correct order to respect foreign keys
  await prisma.cardUpgradeRequest.deleteMany();
  await prisma.cardUpgradePricing.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.privateViewing.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.message.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.categoryRequest.deleteMany();
  await prisma.spotlightAd.deleteMany();
  await prisma.user.deleteMany();

  console.log("DB wiped. Creating accounts...");

  const ownerHash = await bcrypt.hash("batraverseronit0811", 10);
  const ownerPinHash = await bcrypt.hash("0811", 10);
  const sellerHash = await bcrypt.hash("seller123", 10);
  const customerHash = await bcrypt.hash("customer123", 10);
  const deliveryHash = await bcrypt.hash("delivery123", 10);

  const accounts = [
    {
      name: "Ronit",
      email: "ronit_batra_08_11@gmail.com",
      phone: "9000000001",
      role: "ADMIN",
      approved: true,
      cardLevel: "owner",
    },
    {
      name: "Seller",
      email: "batraverse@seller.com",
      phone: "9000000002",
      role: "SELLER",
      approved: true,
      cardLevel: null,
    },
    {
      name: "Customer",
      email: "batraverse@customer.com",
      phone: "9000000003",
      role: "USER",
      approved: true,
      cardLevel: null,
    },
    {
      name: "Delivery",
      email: "batraverse@delivery.com",
      phone: "9000000004",
      role: "DELIVERY",
      approved: true,
      cardLevel: null,
    },
  ];

  const hashMap = { ADMIN: ownerHash, SELLER: sellerHash, USER: customerHash, DELIVERY: deliveryHash };

  for (const acct of accounts) {
    let cardNumber;
    let ok = false;
    while (!ok) {
      cardNumber = generateCardNumber(acct.name);
      const exists = await prisma.user.findUnique({ where: { cardNumber } });
      if (!exists) ok = true;
    }
    await prisma.user.create({
      data: {
        name: acct.name,
        email: acct.email,
        phone: acct.phone,
        passwordHash: hashMap[acct.role] || sellerHash,
        role: acct.role,
        approved: acct.approved,
        cardNumber: acct.role === "ADMIN" ? "ronit-batra-08-11" : cardNumber,
        cardLevel: acct.cardLevel,
        ...(acct.role === "ADMIN" ? { cardPinHash: ownerPinHash } : {}),
      },
    });
    console.log(`  Created: ${acct.name} (${acct.role}) — ${acct.role === "ADMIN" ? "ronit-batra-08-11" : cardNumber}`);
  }

  console.log("Done. Owner: batraverseronit0811 (PIN: 0811) | Seller: seller123 | Customer: customer123 | Delivery: delivery123");

  console.log("Seeding categories...");
  const storeCategories = [
    { name: "Watches", slug: "watches", source: "store", icon: "watch", sortOrder: 1 },
    { name: "Fashion", slug: "fashion", source: "store", icon: "shirt", sortOrder: 2 },
    { name: "Accessories", slug: "accessories", source: "store", icon: "gem", sortOrder: 3 },
    { name: "Footwear", slug: "footwear", source: "store", icon: "footprints", sortOrder: 4 },
    { name: "Tech", slug: "tech", source: "store", icon: "cpu", sortOrder: 5 },
    { name: "Lifestyle", slug: "lifestyle", source: "store", icon: "sparkles", sortOrder: 6 },
    { name: "Limited Edition", slug: "limited", source: "store", icon: "crown", sortOrder: 7 },
  ];
  const martCategories = [
    { name: "Fruits & Vegetables", slug: "fruits", source: "mart", icon: "apple", sortOrder: 1 },
    { name: "Dairy & Eggs", slug: "dairy", source: "mart", icon: "egg", sortOrder: 2 },
    { name: "Snacks", slug: "snacks", source: "mart", icon: "cookie", sortOrder: 3 },
    { name: "Beverages", slug: "beverages", source: "mart", icon: "coffee", sortOrder: 4 },
    { name: "Instant Food", slug: "instant", source: "mart", icon: "flame", sortOrder: 5 },
    { name: "Personal Care", slug: "personal", source: "mart", icon: "heart", sortOrder: 6 },
    { name: "Cleaning", slug: "cleaning", source: "mart", icon: "sparkles", sortOrder: 7 },
    { name: "Bakery", slug: "bakery", source: "mart", icon: "croissant", sortOrder: 8 },
  ];
  for (const c of [...storeCategories, ...martCategories]) {
    await prisma.category.create({ data: c });
  }
  console.log(`  Seeded ${storeCategories.length + martCategories.length} categories`);

  console.log("Seeding card upgrade pricing...");
  const LEVELS_ARR = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
  const LEVEL_THRESHOLD = {
    bronze: 100, silver: 500, gold: 1500, platinum: 5000, diamond: 15000, black: 30000,
  };
  const ORDER = Object.fromEntries(LEVELS_ARR.map((l, i) => [l, i]));
  for (const fromLevel of LEVELS_ARR) {
    for (const toLevel of LEVELS_ARR) {
      if (ORDER[toLevel] <= ORDER[fromLevel]) continue;
      const price = LEVEL_THRESHOLD[toLevel];
      await prisma.cardUpgradePricing.upsert({
        where: { fromLevel_toLevel: { fromLevel, toLevel } },
        update: { price, active: true },
        create: { fromLevel, toLevel, price, active: true },
      });
    }
  }
  console.log("  Card upgrade pricing seeded");

  console.log("Seeding spotlight ads...");
  const defaultAds = [
    { img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=1080&fit=crop", tagline: "The Fall Edit", line: "Where light meets fabric — a season cast in shadow and gold.", href: "/store", page: "home", sortOrder: 1 },
    { img: "https://images.unsplash.com/photo-1521334884684-d80222895322?w=1920&h=1080&fit=crop", tagline: "Fine Watches", line: "Hand-finished calibers for those who measure their days in moments, not minutes.", href: "/store", page: "home", sortOrder: 2 },
    { img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1920&h=1080&fit=crop", tagline: "Heritage Leather", line: "Full-grain hides, tanned over seasons and made to outlive them.", href: "/store", page: "home", sortOrder: 3 },
  ];
  for (const ad of defaultAds) {
    await prisma.spotlightAd.create({ data: ad });
  }
  console.log(`  Seeded ${defaultAds.length} spotlight ads`);

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
