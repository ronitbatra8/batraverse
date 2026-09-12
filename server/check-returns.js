const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const orders = await p.order.findMany({
    where: { status: "return_requested" },
    select: { id: true, orderId: true, items: true },
    take: 4,
  });
  for (const o of orders) {
    const pays = await p.sellerPayout.findMany({ where: { orderId: o.id } });
    console.log(JSON.stringify({ id: o.id, orderId: o.orderId, itemStatuses: o.items.map((i) => i.status), pays: pays.map((x) => ({ itemIdx: x.itemIdx, status: x.status, amount: x.amount })) }));
  }
  await p.$disconnect();
})();