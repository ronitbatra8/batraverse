const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

(async () => {
  const hash = await bcrypt.hash("test123", 10);
  const emails = [
    "test-delivery@batraverse.com",
    "test-seller@batraverse.com",
    "test-cards@batraverse.com",
    "test-customer@batraverse.com",
  ];
  for (const e of emails) {
    await prisma.user.update({ where: { email: e }, data: { passwordHash: hash } });
    console.log("Done:", e);
  }
  await prisma.$disconnect();
})();
