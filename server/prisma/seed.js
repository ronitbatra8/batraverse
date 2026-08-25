const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const PASSWORD = "password123";

const PRODUCTS = [
  { id: "p-chandelier", name: "Antique Brass Chandelier", brand: "Aatman Living", category: "Lighting", price: 42500, originalPrice: 52000, badge: "Bestseller", rating: 4.8, reviewCount: 42 },
  { id: "p-rug", name: "Handwoven Silk Rug", brand: "Vanya Home", category: "Rugs & Flooring", price: 12800, originalPrice: 16000, rating: 4.6, reviewCount: 28 },
  { id: "p-lamp", name: "Marble Table Lamp", brand: "Aatman Living", category: "Lighting", price: 8600, badge: "New", rating: 4.7, reviewCount: 15 },
  { id: "p-armchair", name: "Velvet Accent Armchair", brand: "Rudra Creations", category: "Furniture", price: 21500, originalPrice: 26000, rating: 4.5, reviewCount: 19 },
  { id: "p-vase", name: "Carved Brass Vase", brand: "Neelam Crafts", category: "Decor", price: 5400, rating: 4.9, reviewCount: 33 },
  { id: "p-sconce", name: "Crystal Wall Sconce", brand: "Aatman Living", category: "Lighting", price: 9800, rating: 4.4, reviewCount: 11 },
  { id: "p-coffeetable", name: "Teak Wood Coffee Table", brand: "Rudra Creations", category: "Furniture", price: 32000, originalPrice: 38000, badge: "Sale", rating: 4.7, reviewCount: 24 },
  { id: "p-bedspread", name: "Linen Bedspread Set", brand: "Arya & Co", category: "Textiles", price: 7200, rating: 4.3, reviewCount: 17 },
  { id: "p-candles", name: "Brass Candle Holders (Set of 3)", brand: "Neelam Crafts", category: "Decor", price: 3100, rating: 4.6, reviewCount: 40 },
  { id: "p-dinnerware", name: "Ceramic Dinner Set (48 pc)", brand: "Arya & Co", category: "Tableware", price: 15600, rating: 4.5, reviewCount: 22 },
  { id: "p-lounge", name: "Rattan Lounge Chair", brand: "Rudra Creations", category: "Furniture", price: 18900, originalPrice: 22000, rating: 4.4, reviewCount: 9 },
  { id: "p-pillows", name: "Silk Throw Pillows (Set of 2)", brand: "Vanya Home", category: "Textiles", price: 4600, rating: 4.8, reviewCount: 31 },
];

const USERS = [
  { id: "usr-1", name: "Aarav Mehta", email: "aarav@example.com", phone: "+91 98200 12345", role: "USER", orders: 58, address: { address: "24 Marine Drive, Apt 7B", city: "Mumbai", state: "Maharashtra", pincode: "400020" } },
  { id: "usr-2", name: "Ishita Kapoor", email: "ishita@example.com", phone: "+91 98765 43210", role: "USER", orders: 12, address: { address: "12 Lodi Estate", city: "New Delhi", state: "Delhi", pincode: "110003" } },
  { id: "usr-3", name: "Dev Malhotra", email: "dev@example.com", phone: "+91 97890 11223", role: "USER", orders: 36, address: { address: "7 Golf Course Road", city: "Gurugram", state: "Haryana", pincode: "122002" } },
  { id: "usr-4", name: "Priya Shah", email: "priya@example.com", phone: "+91 98111 23456", role: "USER", orders: 24, address: { address: "12 Ring Road", city: "Ahmedabad", state: "Gujarat", pincode: "380001" } },
  { id: "usr-5", name: "Rohan Sharma", email: "rohan@example.com", phone: "+91 90040 11223", role: "DELIVERY", orders: 0, address: { address: "8 Kalbadevi Road", city: "Mumbai", state: "Maharashtra", pincode: "400002" } },
  { id: "usr-6", name: "Meera Joshi", email: "meera@example.com", phone: "+91 98989 00909", role: "SELLER", orders: 0, address: { address: "22 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" } },
  { id: "usr-7", name: "Vikram Malhotra", email: "vikram@example.com", phone: "+91 98800 11223", role: "USER", orders: 1, address: { address: "55 Banjara Hills", city: "Hyderabad", state: "Telangana", pincode: "500034" } },
  { id: "usr-8", name: "Ananya Iyer", email: "ananya@example.com", phone: "+91 96666 54321", role: "USER", orders: 8, address: { address: "19 Anna Nagar", city: "Chennai", state: "Tamil Nadu", pincode: "600040" } },
  { id: "usr-9", name: "Kabir Anand", email: "kabir@example.com", phone: "+91 99887 76655", role: "USER", orders: 10, address: { address: "88 Residency Road", city: "Bengaluru", state: "Karnataka", pincode: "560025" } },
  { id: "usr-10", name: "Riya Nair", email: "riya@example.com", phone: "+91 91234 56789", role: "USER", orders: 16, address: { address: "41 Fort Kochi Road", city: "Kochi", state: "Kerala", pincode: "682001" } },
  { id: "usr-11", name: "Neha Gupta", email: "neha@example.com", phone: "+91 97000 11223", role: "USER", orders: 20, address: { address: "3 Golf Links", city: "New Delhi", state: "Delhi", pincode: "110003" } },
  { id: "usr-12", name: "Arjun Reddy", email: "arjun@example.com", phone: "+91 96789 01234", role: "USER", orders: 27, address: { address: "8 Jubilee Hills", city: "Hyderabad", state: "Telangana", pincode: "500033" } },
  { id: "usr-13", name: "Sneha Kulkarni", email: "sneha@example.com", phone: "+91 96555 44556", role: "USER", orders: 30, address: { address: "27 Koregaon Park", city: "Pune", state: "Maharashtra", pincode: "411001" } },
  { id: "usr-14", name: "Rahul Verma", email: "rahul@example.com", phone: "+91 96444 88990", role: "USER", orders: 45, address: { address: "12 Civil Lines", city: "Jaipur", state: "Rajasthan", pincode: "302006" } },
  { id: "usr-15", name: "Sara Khan", email: "sara@example.com", phone: "+91 96333 22110", role: "USER", orders: 50, address: { address: "6 Carter Road", city: "Mumbai", state: "Maharashtra", pincode: "400050" } },
  { id: "usr-16", name: "Aditya Rao", email: "aditya@example.com", phone: "+91 96222 33445", role: "USER", orders: 85, address: { address: "21 Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" } },
  { id: "usr-17", name: "Kavita Deshmukh", email: "kavita@example.com", phone: "+91 96111 55667", role: "USER", orders: 120, address: { address: "15 Marine Drive", city: "Mumbai", state: "Maharashtra", pincode: "400020" } },
];

const SIGNATURE_ORDERS = [
  { id: "ORD-8F3K2M1", userId: "usr-1", shippingName: "Aarav Mehta", items: [{ productId: "p-chandelier", name: "Antique Brass Chandelier", image: "", quantity: 1, price: 42500 }], totalAmount: 42500, status: "delivered", paymentMethod: "CARD", paymentStatus: "APPROVED", createdAt: "2026-08-15T10:24:00.000Z" },
  { id: "ORD-5T9QX2A", userId: "usr-2", shippingName: "Ishita Kapoor", items: [{ productId: "p-rug", name: "Handwoven Silk Rug", image: "", quantity: 2, price: 12800 }], totalAmount: 25600, status: "confirmed", paymentMethod: "UPI", paymentStatus: "APPROVED", createdAt: "2026-08-16T08:02:00.000Z" },
  { id: "ORD-7B1L4W9", userId: "usr-9", shippingName: "Kabir Anand", items: [{ productId: "p-lamp", name: "Marble Table Lamp", image: "", quantity: 1, price: 8600 }], totalAmount: 8600, status: "out_for_delivery", paymentMethod: "COD", paymentStatus: "APPROVED", createdAt: "2026-08-15T18:45:00.000Z" },
  { id: "ORD-2Z8M6P3", userId: "usr-10", shippingName: "Riya Nair", items: [{ productId: "p-armchair", name: "Velvet Accent Armchair", image: "", quantity: 1, price: 21500 }], totalAmount: 21500, status: "pending", paymentMethod: "CARD", paymentStatus: "PENDING", createdAt: "2026-08-16T11:30:00.000Z" },
  { id: "ORD-9V4C1H7", userId: "usr-3", shippingName: "Dev Malhotra", items: [{ productId: "p-vase", name: "Carved Brass Vase", image: "", quantity: 1, price: 5400 }], totalAmount: 5400, status: "return_requested", paymentMethod: "CARD", paymentStatus: "APPROVED", createdAt: "2026-08-14T21:10:00.000Z" },
];

const rng = (seed) => {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

function randomItems(rand, count) {
  const picked = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rand() * PRODUCTS.length);
    while (used.has(idx)) idx = Math.floor(rand() * PRODUCTS.length);
    used.add(idx);
    const p = PRODUCTS[idx];
    picked.push({ productId: p.id, name: p.name, image: "", quantity: 1 + Math.floor(rand() * 2), price: p.price });
  }
  return picked;
}

function paymentFor(status) {
  if (status === "pending") return "PENDING";
  if (status === "cancelled") return "FAILED";
  return "APPROVED";
}

function statusFor(rand) {
  const r = rand();
  if (r < 0.6) return "delivered";
  if (r < 0.7) return "confirmed";
  if (r < 0.8) return "shipped";
  if (r < 0.88) return "out_for_delivery";
  if (r < 0.95) return "cancelled";
  if (r < 0.98) return "return_requested";
  return "returned";
}

async function seedVisits() {
  const pages = [
    { page: "/", weight: 8 },
    { page: "/store", weight: 5 },
    { page: "/products/antique-brass-chandelier", weight: 3 },
    { page: "/products/handwoven-silk-rug", weight: 2 },
    { page: "/search", weight: 2 },
    { page: "/cart", weight: 2 },
    { page: "/about", weight: 1 },
  ];
  const weighted = pages.flatMap((p) => Array(p.weight).fill(p.page));
  const rows = [];
  const rand = rng(2026);
  const now = new Date("2026-08-16T12:00:00.000Z");

  for (let d = 0; d < 60; d++) {
    const base = d < 7 ? 90 + Math.floor(rand() * 130) : 20 + Math.floor(rand() * 40);
    const dayStart = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    for (let i = 0; i < base; i++) {
      const page = weighted[Math.floor(rand() * weighted.length)];
      rows.push({
        visitorId: `vis-${Math.floor(rand() * 2000)}`,
        page,
        referrer: rand() < 0.3 ? "https://www.google.com" : null,
        userAgent: null,
        ip: `103.21.58.${Math.floor(rand() * 254)}`,
        duration: rand() < 0.7 ? 20 + Math.floor(rand() * 240) : null,
        createdAt: new Date(dayStart.getTime() - Math.floor(rand() * 24 * 60 * 60 * 1000)),
      });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.visit.createMany({ data: rows.slice(i, i + 500) });
  }
  console.log(`Seeded ${rows.length} visits`);
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.visit.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.message.deleteMany(),
    prisma.newsletter.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.review.deleteMany(),
    prisma.address.deleteMany(),
    prisma.order.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log("Seeding users...");
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        approved: true,
        passwordHash: hash,
        createdAt: new Date(u.id === "usr-17" ? "2024-01-25T11:40:00.000Z" : u.id === "usr-16" ? "2024-05-08T14:25:00.000Z" : u.id === "usr-15" ? "2024-09-01T16:10:00.000Z" : u.id === "usr-14" ? "2024-11-19T09:55:00.000Z" : u.id === "usr-13" ? "2025-04-02T12:00:00.000Z" : u.id === "usr-12" ? "2025-05-22T18:45:00.000Z" : u.id === "usr-11" ? "2025-08-15T10:20:00.000Z" : u.id === "usr-10" ? "2025-10-30T13:15:00.000Z" : u.id === "usr-9" ? "2026-01-05T17:30:00.000Z" : u.id === "usr-8" ? "2026-03-11T09:40:00.000Z" : u.id === "usr-7" ? "2026-07-20T11:05:00.000Z" : u.id === "usr-6" ? "2025-12-05T16:22:00.000Z" : u.id === "usr-5" ? "2025-09-10T10:00:00.000Z" : u.id === "usr-4" ? "2025-08-22T18:02:00.000Z" : u.id === "usr-3" ? "2025-06-14T21:10:00.000Z" : u.id === "usr-2" ? "2026-01-18T14:40:00.000Z" : "2025-11-02T09:12:00.000Z"),
        savedAddresses: {
          create: { address: u.address.address, city: u.address.city, state: u.address.state, pincode: u.address.pincode, isDefault: true },
        },
      },
    });
  }

  console.log("Seeding products...");
  await prisma.product.createMany({
    data: PRODUCTS.map((p) => ({
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      price: p.price, originalPrice: p.originalPrice ?? null,
      description: `Premium ${p.category.toLowerCase()} piece crafted for the BATRAVERSE collection.`,
      images: [], inStock: true, badge: p.badge ?? null, rating: p.rating, reviewCount: p.reviewCount,
    })),
  });

  console.log("Seeding orders...");
  const rand = rng(42);
  const now = new Date("2026-08-16T12:00:00.000Z");

  for (const sig of SIGNATURE_ORDERS) {
    const user = USERS.find((u) => u.id === sig.userId);
    await prisma.order.create({
      data: {
        id: sig.id,
        userId: sig.userId,
        items: sig.items,
        totalAmount: sig.totalAmount,
        status: sig.status,
        paymentMethod: sig.paymentMethod,
        paymentStatus: sig.paymentStatus,
        shippingName: sig.shippingName,
        shippingPhone: user.phone,
        shippingAddress: user.address.address,
        shippingCity: user.address.city,
        shippingState: user.address.state,
        shippingPincode: user.address.pincode,
        createdAt: new Date(sig.createdAt),
        ...(sig.status === "return_requested" ? { returnRequestedAt: new Date("2026-08-16T09:00:00.000Z"), returnReason: "Product arrived damaged" } : {}),
        ...(sig.paymentStatus === "APPROVED" && sig.status !== "pending" ? { paymentApprovedAt: new Date(sig.createdAt) } : {}),
      },
    });
  }

  for (const u of USERS) {
    const extra = u.orders - (SIGNATURE_ORDERS.some((s) => s.userId === u.id) ? 1 : 0);
    if (extra <= 0) continue;
    const batch = [];
    for (let i = 0; i < extra; i++) {
      const status = statusFor(rand);
      const items = randomItems(rand, 1 + Math.floor(rand() * 2));
      const totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const daysAgo = 8 + Math.floor(rand() * 540);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(rand() * 86400000));
      batch.push({
        userId: u.id,
        items,
        totalAmount,
        status,
        paymentMethod: ["CARD", "UPI", "COD", "NETBANKING"][Math.floor(rand() * 4)],
        paymentStatus: paymentFor(status),
        shippingName: u.name,
        shippingPhone: u.phone,
        shippingAddress: u.address.address,
        shippingCity: u.address.city,
        shippingState: u.address.state,
        shippingPincode: u.address.pincode,
        createdAt,
        ...(status === "return_requested" || status === "returned" ? { returnRequestedAt: createdAt, returnReason: "Changed my mind" } : {}),
        ...(status === "cancelled" ? { cancelledAt: createdAt, cancelReason: "Customer requested cancellation" } : {}),
        ...(status !== "pending" && status !== "cancelled" ? { paymentApprovedAt: new Date(createdAt.getTime() + 86400000) } : {}),
      });
    }
    for (let i = 0; i < batch.length; i += 500) {
      await prisma.order.createMany({ data: batch.slice(i, i + 500) });
    }
  }
  console.log("Orders seeded");

  console.log("Seeding reviews & wishlists...");
  await prisma.review.createMany({
    data: [
      { userId: "usr-1", productId: "p-chandelier", rating: 5, comment: "Stunning piece, lights up the whole hall.", createdAt: new Date("2026-07-02T10:00:00.000Z") },
      { userId: "usr-2", productId: "p-rug", rating: 4, comment: "Premium quality silk.", createdAt: new Date("2026-06-11T15:00:00.000Z") },
      { userId: "usr-3", productId: "p-vase", rating: 5, comment: "Exquisite craftsmanship.", createdAt: new Date("2026-05-20T12:00:00.000Z") },
      { userId: "usr-8", productId: "p-lamp", rating: 4, comment: "Love the finish.", createdAt: new Date("2026-04-03T09:00:00.000Z") },
      { userId: "usr-9", productId: "p-lamp", rating: 5, comment: "Elegant and heavy.", createdAt: new Date("2026-03-22T18:00:00.000Z") },
      { userId: "usr-10", productId: "p-armchair", rating: 5, comment: "Fits the living room perfectly.", createdAt: new Date("2026-02-14T11:00:00.000Z") },
      { userId: "usr-11", productId: "p-rug", rating: 5, comment: "Beautiful weave.", createdAt: new Date("2026-01-30T16:00:00.000Z") },
      { userId: "usr-12", productId: "p-vase", rating: 5, comment: "Centerpiece of our hall.", createdAt: new Date("2025-12-05T14:00:00.000Z") },
      { userId: "usr-13", productId: "p-chandelier", rating: 5, comment: "Gorgeous craftsmanship.", createdAt: new Date("2025-11-18T13:00:00.000Z") },
      { userId: "usr-14", productId: "p-armchair", rating: 5, comment: "Royal look.", createdAt: new Date("2025-10-02T10:00:00.000Z") },
      { userId: "usr-15", productId: "p-chandelier", rating: 5, comment: "Timeless.", createdAt: new Date("2025-09-12T17:00:00.000Z") },
      { userId: "usr-16", productId: "p-rug", rating: 5, comment: "Exceptional quality.", createdAt: new Date("2025-08-01T12:00:00.000Z") },
      { userId: "usr-17", productId: "p-armchair", rating: 5, comment: "Best purchase yet.", createdAt: new Date("2025-07-15T09:00:00.000Z") },
    ],
  });
  await prisma.wishlist.createMany({
    data: [
      { userId: "usr-1", productId: "p-coffeetable", createdAt: new Date("2026-08-01T10:00:00.000Z") },
      { userId: "usr-2", productId: "p-lounge", createdAt: new Date("2026-07-20T15:00:00.000Z") },
      { userId: "usr-3", productId: "p-sconce", createdAt: new Date("2026-06-10T12:00:00.000Z") },
      { userId: "usr-9", productId: "p-dinnerware", createdAt: new Date("2026-05-05T09:00:00.000Z") },
      { userId: "usr-10", productId: "p-pillows", createdAt: new Date("2026-04-22T18:00:00.000Z") },
    ],
  });

  console.log("Seeding messages...");
  await prisma.message.create({
    data: {
      id: "msg-1", userId: "usr-1", name: "Aarav Mehta", email: "aarav@example.com",
      subject: "Delivery query", message: "When will my chandelier arrive?", status: "pending", read: false,
      createdAt: new Date("2026-08-16T09:12:00.000Z"),
    },
  });
  await prisma.message.create({
    data: {
      id: "msg-2", userId: "usr-9", name: "Kabir Anand", email: "kabir@example.com",
      subject: "Change delivery address", message: "Please deliver to my office instead.", status: "pending", read: false,
      createdAt: new Date("2026-08-15T19:40:00.000Z"),
    },
  });
  await prisma.message.create({
    data: {
      id: "msg-3", userId: "usr-10", name: "Riya Nair", email: "riya@example.com",
      subject: "Invoice copy", message: "Could you share a GST invoice?", status: "resolved", read: true,
      replyMessage: "Shared via email, thanks!", repliedAt: new Date("2026-08-14T15:30:00.000Z"),
      createdAt: new Date("2026-08-14T13:05:00.000Z"),
    },
  });

  console.log("Seeding newsletter...");
  await prisma.newsletter.createMany({
    data: [
      { id: "sub-1", email: "aarav@example.com", name: "Aarav Mehta", active: true, createdAt: new Date("2025-11-02T09:12:00.000Z") },
      { id: "sub-2", email: "ishita@example.com", name: "Ishita Kapoor", active: true, createdAt: new Date("2026-01-18T14:40:00.000Z") },
      { id: "sub-3", email: "dev@example.com", name: "Dev Malhotra", active: true, createdAt: new Date("2026-03-09T11:20:00.000Z") },
      { id: "sub-4", email: "priya@example.com", name: "Priya Shah", active: false, createdAt: new Date("2026-06-22T18:02:00.000Z") },
    ],
  });

  console.log("Seeding password resets...");
  await prisma.passwordReset.create({
    data: {
      id: "pr-1", userId: "usr-1", method: "email", status: "completed",
      ipAddress: "103.21.58.111", requestedAt: new Date("2026-08-16T08:30:00.000Z"),
      verifiedAt: new Date("2026-08-16T08:32:00.000Z"), completedAt: new Date("2026-08-16T08:35:00.000Z"),
      createdAt: new Date("2026-08-16T08:30:00.000Z"),
    },
  });
  await prisma.passwordReset.create({
    data: {
      id: "pr-2", userId: "usr-2", method: "sms", status: "failed",
      failReason: "Invalid OTP three times", ipAddress: "157.32.90.44",
      requestedAt: new Date("2026-08-15T22:14:00.000Z"), createdAt: new Date("2026-08-15T22:14:00.000Z"),
    },
  });
  await prisma.passwordReset.create({
    data: {
      id: "pr-3", userId: "usr-4", method: "email", status: "requested",
      ipAddress: "45.118.76.3", requestedAt: new Date("2026-08-15T12:02:00.000Z"),
      createdAt: new Date("2026-08-15T12:02:00.000Z"),
    },
  });

  await seedVisits();

  console.log("Seeding owner & test accounts...");
  const ownerHash = await bcrypt.hash("password123", 10);
  const testHash = await bcrypt.hash("test123", 10);
  
  const SPECIAL_ACCOUNTS = [
    { id: "usr-owner", name: "Ronit Batra", email: "owner@batraverse.com", phone: "+91 90000 00001", role: "ADMIN", passwordHash: ownerHash, cardNumber: "ronit-batra-08-11", cardLevel: "founder" },
    { id: "usr-test-delivery", name: "Test Delivery", email: "test-delivery@batraverse.com", phone: "+91 90000 00002", role: "DELIVERY", passwordHash: testHash, cardNumber: "SV-TEST-1001", cardLevel: "gold" },
    { id: "usr-test-seller", name: "Test Seller", email: "test-seller@batraverse.com", phone: "+91 90000 00003", role: "SELLER", passwordHash: testHash, cardNumber: "GL-SELL-1002", cardLevel: "gold" },
    { id: "usr-test-cards", name: "Test Cards", email: "test-cards@batraverse.com", phone: "+91 90000 00004", role: "USER", passwordHash: testHash, cardNumber: "BK-TEST-1003", cardLevel: "black" },
    { id: "usr-test-customer", name: "Test Customer", email: "test-customer@batraverse.com", phone: "+91 90000 00005", role: "USER", passwordHash: testHash, cardNumber: "BV-CUST-1004" },
  ];

  for (const acc of SPECIAL_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { id: acc.id } }).catch(() => null);
    if (!existing) {
      await prisma.user.create({
        data: {
          id: acc.id,
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
          role: acc.role,
          approved: true,
          passwordHash: acc.passwordHash,
          cardNumber: acc.cardNumber || null,
          cardLevel: acc.cardLevel || null,
        },
      });
    }
  }

  console.log("Seeding card upgrade pricing...");
  const LEVELS_ARR = ["none", "bronze", "silver", "gold", "platinum", "diamond", "black"];
  const DURATIONS = ["ONE_MONTH", "THREE_MONTH", "SIX_MONTH"];
  const BASE_PRICES = {
    "none-bronze": 199, "none-silver": 499, "none-gold": 999, "none-platinum": 1999, "none-diamond": 3499, "none-black": 5999,
    "bronze-silver": 299, "bronze-gold": 799, "bronze-platinum": 1799, "bronze-diamond": 3299, "bronze-black": 5799,
    "silver-gold": 499, "silver-platinum": 1499, "silver-diamond": 2999, "silver-black": 5499,
    "gold-platinum": 999, "gold-diamond": 2499, "gold-black": 4999,
    "platinum-diamond": 1499, "platinum-black": 3999,
    "diamond-black": 2499,
  };
  const DURATION_MULT = { ONE_MONTH: 1, THREE_MONTH: 2.5, SIX_MONTH: 5 };

  const pricingData = [];
  for (const [pair, base] of Object.entries(BASE_PRICES)) {
    const [from, to] = pair.split("-");
    for (const dur of DURATIONS) {
      pricingData.push({
        fromLevel: from,
        toLevel: to,
        duration: dur,
        price: Math.round(base * DURATION_MULT[dur]),
        active: true,
      });
    }
  }

  for (const p of pricingData) {
    await prisma.cardUpgradePricing.upsert({
      where: { fromLevel_toLevel_duration: { fromLevel: p.fromLevel, toLevel: p.toLevel, duration: p.duration } },
      update: { price: p.price, active: p.active },
      create: p,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
