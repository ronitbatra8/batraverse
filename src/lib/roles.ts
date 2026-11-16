export const ROLE_DASHBOARDS = {
  ADMIN: {
    label: "Owner Dashboard",
    short: "Owner",
    href: "/owner",
    desc: "Manage users, orders, inventory and everything else from the owner panel.",
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
