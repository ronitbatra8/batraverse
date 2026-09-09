/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Store, PackageCheck, ClipboardList, Coins } from "lucide-react";
import SellersTab from "./SellersTab";
import ProductApprovalsTab from "./ProductApprovalsTab";
import SellerRequestsTab from "./SellerRequestsTab";
import SellerPayoutsTab from "./SellerPayoutsTab";

type SellerSystemSub = "sellers" | "productapprovals" | "sellerrequests" | "payouts";

const SUB_TABS: { key: SellerSystemSub; label: string; icon: any }[] = [
  { key: "sellers", label: "Sellers", icon: Store },
  { key: "productapprovals", label: "Products Approval", icon: PackageCheck },
  { key: "sellerrequests", label: "Seller Requests", icon: ClipboardList },
  { key: "payouts", label: "Payouts", icon: Coins },
];

export default function SellerSystemTab({ adminKey, onCount }: { adminKey: string; onCount?: (n: number) => void }) {
  const [sub, setSub] = useState<SellerSystemSub>("sellers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-white flex items-center gap-3">
          <Store className="text-gold-400" /> Seller System
        </h2>
      </div>

      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-xl w-fit">
        {SUB_TABS.map((st) => (
          <button
            key={st.key}
            onClick={() => setSub(st.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sub === st.key
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                : "text-dark-400 hover:text-white border border-transparent"
            }`}
          >
            <st.icon size={15} />
            {st.label}
          </button>
        ))}
      </div>

      {sub === "sellers" && <SellersTab adminKey={adminKey} />}
      {sub === "productapprovals" && <ProductApprovalsTab adminKey={adminKey} onCount={onCount} />}
      {sub === "sellerrequests" && <SellerRequestsTab adminKey={adminKey} />}
      {sub === "payouts" && <SellerPayoutsTab adminKey={adminKey} />}
    </div>
  );
}