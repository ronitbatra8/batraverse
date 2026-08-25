export const ROLE_DASHBOARDS = {
  ADMIN: {
    label: "Owner Dashboard",
    short: "Owner",
    href: "/admin/orders",
    desc: "Manage users, orders, inventory and everything else from the owner panel.",
  },
  SELLER: {
    label: "Seller Dashboard",
    short: "Seller",
    href: "/seller",
    desc: "Manage your listings, inventory and orders. This page is under construction.",
  },
  DELIVERY: {
    label: "Delivery Dashboard",
    short: "Delivery",
    href: "/delivery",
    desc: "View assigned orders and delivery tasks. This page is under construction.",
  },
} as const;

export type RoleKey = keyof typeof ROLE_DASHBOARDS;

export function roleDashboard(role?: string) {
  if (!role) return null;
  return ROLE_DASHBOARDS[role as RoleKey] ?? null;
}

export function hasRoleDashboard(role?: string) {
  return roleDashboard(role) !== null;
}
