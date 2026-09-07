"use client";

import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

const UPI_ID = "ronit.batra@ptyes";

function buildUpiLink(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: "BatraVerse",
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export default function CardUpgradeUpiModal({
  open,
  onClose,
  amount,
  note,
  onSubmit,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  note?: string;
  onSubmit: (txnId: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const { theme } = useTheme();
  const light = theme === "light";

  const [txnId, setTxnId] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"pay" | "txnId">("pay");

  const upiLink = buildUpiLink(amount, note || "BatraVerse Payment");

  const copyUpiId = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleTxnSubmit = useCallback(async () => {
    if (!txnId.trim() || txnId.trim().length < 6) {
      setError("Enter a valid UPI transaction ID (min 6 characters)");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(txnId.trim());
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }, [txnId, onSubmit, onSuccess]);

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

        {step === "pay" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className={cn("text-sm font-bold", light ? "text-dark-900" : "text-cream")}>
                Pay ₹{amount.toFixed(2)}
              </h3>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className={cn("rounded-2xl border p-5", light ? "border-dark-200/60 bg-dark-50/30" : "border-white/10 bg-graphite")}>
                <QRCodeSVG
                  value={upiLink}
                  size={180}
                  bgColor="transparent"
                  fgColor={light ? "#1a1a2e" : "#d4af37"}
                  level="M"
                />
              </div>

              <div className="text-center">
                <p className={cn("text-[10px] font-semibold", light ? "text-dark-600" : "text-cream-dim/70")}>
                  Scan with any UPI app
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className={cn("font-mono text-sm font-bold tracking-wider", light ? "text-dark-900" : "text-gold")}>
                    {UPI_ID}
                  </span>
                  <button onClick={copyUpiId} className={cn("rounded-lg p-1 transition-colors",
                    light ? "hover:bg-dark-100" : "hover:bg-white/10"
                  )}>
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className={light ? "text-dark-400" : "text-cream-dim/50"} />}
                  </button>
                </div>
              </div>

              <div className={cn("w-full rounded-xl border px-4 py-3 text-center text-xs leading-relaxed",
                light ? "border-dark-200/60 bg-dark-50/30 text-dark-500" : "border-white/10 bg-graphite text-cream-dim/50"
              )}>
                Or open your UPI app and pay manually to<br />
                <span className={cn("font-mono font-bold", light ? "text-dark-900" : "text-gold")}>{UPI_ID}</span>
                <span className={cn("font-bold", light ? "text-sapphire" : "text-gold-light")}> — ₹{amount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setStep("txnId")}
              className={cn("w-full rounded-2xl border px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim/60 hover:border-gold hover:text-gold-light"
              )}
            >
              I have paid — Enter Transaction ID
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                light ? "bg-emerald-50" : "bg-emerald-500/10"
              )}>
                <Check size={20} className="text-emerald-500" />
              </div>
              <h3 className={cn("text-sm font-bold", light ? "text-dark-900" : "text-cream")}>
                Enter Transaction ID
              </h3>
              <p className={cn("text-[10px] mt-1", light ? "text-dark-400" : "text-cream-dim/50")}>
                Find it in your UPI app after payment
              </p>
            </div>

            <div>
              <label className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2 block",
                light ? "text-dark-400" : "text-cream-dim/50"
              )}>
                UPI Transaction ID
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => { setTxnId(e.target.value); setError(""); }}
                placeholder="e.g. 412345678901"
                autoFocus
                className={cn("w-full rounded-xl border px-4 py-3 text-sm font-mono transition-colors",
                  light ? "border-dark-200 bg-dark-50/30 text-dark-900 placeholder:text-dark-400/40 focus:border-sapphire" : "border-white/10 bg-graphite text-cream placeholder:text-cream-dim/30 focus:border-gold"
                )}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("pay")}
                className={cn("flex-1 rounded-xl border px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-all",
                  light ? "border-dark-200 text-dark-500 hover:border-sapphire hover:text-sapphire" : "border-white/10 text-cream-dim/60 hover:border-gold hover:text-gold-light"
                )}
              >
                Back
              </button>
              <button
                onClick={handleTxnSubmit}
                disabled={submitting || !txnId.trim()}
                className={cn("flex-1 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-all",
                  submitting || !txnId.trim() ? "opacity-40 cursor-not-allowed" : "",
                  light ? "bg-sapphire text-white hover:bg-sapphire-light" : "bg-gold text-abyss hover:bg-gold-light"
                )}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}