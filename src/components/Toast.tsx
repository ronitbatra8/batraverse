"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastLayer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const { theme } = useTheme();
  const light = theme === "light";

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        const isErr = t.variant === "error";
        const isOk = t.variant === "success";
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-md w-full",
              light
                ? isErr
                  ? "border-red-200 bg-white/95 shadow-red-500/10"
                  : isOk
                    ? "border-emerald-200 bg-white/95 shadow-emerald-500/10"
                    : "border-dark-200 bg-white/95 shadow-dark-500/10"
                : isErr
                  ? "border-red-500/20 bg-graphite/95 shadow-red-500/10"
                  : isOk
                    ? "border-emerald-500/20 bg-graphite/95 shadow-emerald-500/10"
                    : "border-white/10 bg-graphite/95 shadow-black/20"
            )}
          >
            {isErr ? (
              <AlertCircle size={18} className="shrink-0 text-red-500" />
            ) : isOk ? (
              <CheckCircle size={18} className="shrink-0 text-emerald-500" />
            ) : (
              <Info size={18} className={cn(light ? "text-sapphire" : "text-gold")} />
            )}
            <p className={cn("flex-1 text-sm font-medium", light ? "text-dark-900" : "text-cream")}>
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className={cn("shrink-0 rounded-lg p-1 transition-colors", light ? "hover:bg-dark-100 text-dark-400" : "hover:bg-white/10 text-cream-dim/50")}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
