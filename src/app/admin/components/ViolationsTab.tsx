"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Shield } from "lucide-react";
import { API, adminHeaders } from "./types";

interface Violation {
  id: string;
  orderId: string;
  reason: string;
  orderSource: string;
  createdAt: string;
  exec: { id: string; name: string; email: string; phone: string };
}

export default function ViolationsTab({ adminKey }: { adminKey: string }) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/admin/violations`, { headers: adminHeaders(adminKey) });
        if (res.ok) setViolations(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [adminKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-dark-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={18} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-white">Delivery Violations</h2>
          <p className="text-xs text-dark-400">{violations.length} violation{violations.length !== 1 ? "s" : ""} recorded</p>
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={40} className="mx-auto mb-3 text-dark-400" />
          <p className="text-sm text-dark-400">No violations recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <div key={v.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono font-medium text-gold-400">#{v.orderId.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-dark-400 mt-0.5">{v.reason}</p>
                </div>
                <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                  {v.orderSource === "mart" ? "Mart" : "Store"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-dark-500">
                <span>Exec: <span className="text-white">{v.exec.name}</span> ({v.exec.email})</span>
                <span>{new Date(v.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
