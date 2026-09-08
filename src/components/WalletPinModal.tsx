"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { apiFetch } from "@/lib/api";
import OtpInput from "@/components/OtpInput";

interface PendingOrderRequest {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    qty: number;
    color?: string;
    colorHex?: string;
    size?: string | null;
    source: string;
  }>;
  shipping: Record<string, string>;
  paymentMethod: string;
  source: string;
  deliveryMode: string;
  deliveryAmount: number;
  expressAmount: number;
}

export default function WalletPinModal({
  open,
  onClose,
  amount,
  pendingOrderData,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  pendingOrderData: { orderRequests: PendingOrderRequest[]; total: number };
  onSuccess: (createdOrderIds: string) => void;
}) {
  const { theme } = useTheme();
  const light = theme === "light";

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [noPin, setNoPin] = useState(false);

  const reset = () => {
    setPin("");
    setError("");
    setNoPin(false);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError("Enter your 6-digit card PIN");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSubmitting(true);
    setError("");
    setNoPin(false);
    try {
      const verify = await apiFetch("/auth/me/card-pin/verify", { method: "POST", body: JSON.stringify({ pin }) });
      if (!verify?.valid) throw new Error("Unable to verify card PIN");
      const { orderRequests } = pendingOrderData;
      const results = await Promise.all(
        orderRequests.map((r) =>
          apiFetch("/orders", { method: "POST", body: JSON.stringify({ ...r, cardPin: pin }) })
        )
      );
      const createdIds = (results as Array<{ orderId?: string; id: string }>).map((r) => r.orderId || r.id).join(", ");
      onSuccess(createdIds);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to place order";
      setError(message);
      setNoPin(message.toLowerCase().includes("no card pin"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl",
        light ? "border-dark-200/60 bg-white" : "border-white/10 bg-dark-900"
      )}>
        <button onClick={onClose} className={cn("absolute right-4 top-4 rounded-full p-1.5 transition-colors",
          light ? "hover:bg-dark-100 text-dark-400" : "hover:bg-white/10 text-cream-dim/50"
        )}>
          <X size={16} />
        </button>

        <div className="space-y-6">
          <div className="text-center">
            <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
              light ? "bg-sapphire/10" : "bg-gold/10"
            )}>
              <Wallet size={20} className={light ? "text-sapphire" : "text-gold"} />
            </div>
            <h3 className={cn("text-sm font-bold", light ? "text-dark-900" : "text-cream")}>
              Pay ₹{amount.toFixed(2)} with Card Wallet
            </h3>
            <p className={cn("text-[10px] mt-1", light ? "text-dark-400" : "text-cream-dim/50")}>
              Enter your 6-digit card PIN to verify — just like a UPI PIN
            </p>
          </div>

          <div className="flex justify-center">
            <OtpInput value={pin} onChange={setPin} length={6} autoFocus disabled={submitting} />
          </div>

          {error && (
            <div className="space-y-1">
              <p className="text-xs text-red-500 text-center">{error}</p>
              {noPin && (
                <p className="text-center">
                  <Link href="/cards" className="text-[11px] underline text-sapphire dark:text-gold hover:text-sapphire-light">
                    Set card PIN from your Card page
                  </Link>
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || pin.length !== 6}
            className={cn("w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
              submitting || pin.length !== 6 ? "opacity-40 cursor-not-allowed" : "",
              light ? "bg-sapphire text-white hover:bg-sapphire-light hover:shadow-[0_0_30px_rgba(30,58,138,0.3)]" : "bg-gold text-abyss hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            )}
          >
            {submitting ? <><Lock size={12} className="animate-pulse" /> Placing Order...</> : <><Lock size={12} /> Verify & Place Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}