const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SEED_DATA = {
  store: {
    watches: ["Smart", "Analog", "Luxury", "Sport", "Pilot"],
    fashion: ["Jerseys", "Jackets", "T-Shirts", "Hoodies", "Bottoms", "Outerwear"],
    accessories: ["Bags", "Belts", "Hats", "Sunglasses", "Wallets", "Jewelry"],
    footwear: ["Sneakers", "Boots", "Formal", "Sandals"],
    tech: ["Audio", "Phones", "Tablets", "Wearables"],
    lifestyle: ["Fragrances", "Home", "Wellness", "Stationery"],
    limited: ["Drops", "Collabs", "Signed", "Numbered"],
  },
  mart: {
    fruits: ["Fruits", "Vegetables"],
    dairy: ["Milk", "Butter", "Paneer", "Curd", "Cheese", "Bread"],
    snacks: ["Chips", "Biscuits", "Namkeen", "Dry Fruits"],
    beverages: ["Cold Drinks", "Juices", "Water", "Tea", "Coffee"],
    instant: ["Noodles", "Ready to Eat", "Cereals"],
    personal: ["Oral Care", "Hair Care", "Bath", "Skincare"],
    cleaning: ["Laundry", "Bathroom", "Floor"],
  },
};

const MEDEVISE_NAMES = {
  wellness: "Wellness",
  fitness: "Fitness",
  healthcare: "Healthcare",
  nutrition: "Nutrition",
  beauty: "Beauty",
  sleep: "Sleep",
};

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [source, categories] of Object.entries(SEED_DATA)) {
    for (const [catSlug, subs] of Object.entries(categories)) {
      let cat = await prisma.category.findFirst({ where: { slug: catSlug, source } });
      if (!cat) {
        const maxOrder = await prisma.category.aggregate({ where: { source }, _max: { sortOrder: true } });
        const iconName = "tag";
        cat = await prisma.category.create({
          data: {
            name: MEDEVISE_NAMES[catSlug] || catSlug.charAt(0).toUpperCase() + catSlug.slice(1),
            slug: catSlug,
            source,
            icon: iconName,
            sortOrder: (maxOrder._max.sortOrder || 0) + 1,
          },
        });
        console.log(`  Created category: ${catSlug} (${source})`);
        created++;
      }

      for (const subName of subs) {
        const subSlug = subName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const existing = await prisma.subcategory.findFirst({
          where: { categoryId: cat.id, slug: subSlug },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const maxOrder = await prisma.subcategory.aggregate({
          where: { categoryId: cat.id },
          _max: { sortOrder: true },
        });

        await prisma.subcategory.create({
          data: {
            name: subName,
            slug: subSlug,
            categoryId: cat.id,
            sortOrder: (maxOrder._max.sortOrder || 0) + 1,
          },
        });
        created++;
        console.log(`  Created: ${catSlug}/${subName} (${source})`);
      }
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
