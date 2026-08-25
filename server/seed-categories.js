const { PrismaClient } = require("D:/sites/BATRAVERSE/server/node_modules/.prisma/client");
const prisma = new PrismaClient();

const STORE_CATEGORIES = [
  { name: "Watches", slug: "watches", subcategories: ["Smart", "Analog", "Luxury", "Sport", "Pilot"] },
  { name: "Fashion", slug: "fashion", subcategories: ["T-Shirts", "Shirts", "Jerseys", "Jackets", "Dresses", "Ethnic"] },
  { name: "Accessories", slug: "accessories", subcategories: ["Bags", "Belts", "Sunglasses", "Hats", "Wallets"] },
  { name: "Footwear", slug: "footwear", subcategories: ["Sneakers", "Formal", "Sandals", "Boots", "Sports"] },
  { name: "Tech", slug: "tech", subcategories: ["Headphones", "Speakers", "Cameras", "Wearables", "Gadgets"] },
  { name: "Lifestyle", slug: "lifestyle", subcategories: ["Home Decor", "Fragrances", "Stationery", "Fitness"] },
  { name: "Limited", slug: "limited", subcategories: ["Collector Edition", "Collabs", "Rare Finds"] },
];

const MART_CATEGORIES = [
  { name: "Fruits & Veggies", slug: "fruits", subcategories: ["Fruits", "Veggies", "Exotic"] },
  { name: "Dairy & Bakery", slug: "dairy", subcategories: ["Milk", "Butter", "Paneer", "Curd", "Cheese", "Bread"] },
  { name: "Snacks", slug: "snacks", subcategories: ["Chips", "Biscuits", "Namkeen", "Dry Fruits", "Chocolate"] },
  { name: "Beverages", slug: "beverages", subcategories: ["Juices", "Tea", "Coffee", "Soft Drinks", "Water"] },
  { name: "Instant Food", slug: "instant", subcategories: ["Noodles", "Pasta", "Ready to Eat", "Breakfast"] },
  { name: "Personal Care", slug: "personal", subcategories: ["Hair Care", "Skin Care", "Oral Care", "Bath", "Deodorants"] },
  { name: "Cleaning", slug: "cleaning", subcategories: ["Detergent", "Dishwash", "Floor Cleaner", "Freshener"] },
  { name: "Bakery", slug: "bakery", subcategories: ["Cakes", "Cookies", "Breads", "Pastries"] },
];

async function seed() {
  let order = 1;
  for (const cat of STORE_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { slug: cat.slug, source: "store" } });
    if (!existing) {
      const created = await prisma.category.create({
        data: { name: cat.name, slug: cat.slug, source: "store", sortOrder: order },
      });
      let subOrder = 1;
      for (const sub of cat.subcategories) {
        const subSlug = sub.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await prisma.subcategory.create({
          data: { name: sub, slug: subSlug, categoryId: created.id, sortOrder: subOrder },
        });
        subOrder++;
      }
      console.log(`Created store category: ${cat.name} with ${cat.subcategories.length} subcategories`);
    } else {
      console.log(`Store category already exists: ${cat.name}`);
    }
    order++;
  }

  order = 1;
  for (const cat of MART_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { slug: cat.slug, source: "mart" } });
    if (!existing) {
      const created = await prisma.category.create({
        data: { name: cat.name, slug: cat.slug, source: "mart", sortOrder: order },
      });
      let subOrder = 1;
      for (const sub of cat.subcategories) {
        const subSlug = sub.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await prisma.subcategory.create({
          data: { name: sub, slug: subSlug, categoryId: created.id, sortOrder: subOrder },
        });
        subOrder++;
      }
      console.log(`Created mart category: ${cat.name} with ${cat.subcategories.length} subcategories`);
    } else {
      console.log(`Mart category already exists: ${cat.name}`);
    }
    order++;
  }

  console.log("Category seed complete.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
