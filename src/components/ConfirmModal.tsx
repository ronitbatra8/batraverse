"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "default", requireInput, inputLabel, inputPlaceholder, inputValue, onInputChange,
  onConfirm, onCancel, loading,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-dark-900 border border-dark-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors"><X size={18} /></button>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-dark-400 text-sm mb-5">{message}</p>
        {requireInput && (
          <div className="mb-5">
            {inputLabel && <label className="text-xs text-dark-500 mb-1.5 block">{inputLabel}</label>}
            <textarea value={inputValue || ""} onChange={e => onInputChange?.(e.target.value)} placeholder={inputPlaceholder} rows={3} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500 transition-colors resize-none" />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 bg-dark-800 hover:bg-dark-700 text-dark-300 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{cancelLabel}</button>
          <button onClick={onConfirm} disabled={loading || (requireInput && !inputValue?.trim())} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${variant === "danger" ? "bg-red-500 hover:bg-red-400 text-white" : "bg-gold-500 hover:bg-gold-400 text-dark-950"}`}>
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
