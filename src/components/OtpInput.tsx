"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function OtpInput({ value, onChange, length = 6, autoFocus = false, disabled = false, className }: OtpInputProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusIdx = useCallback((i: number) => {
    const el = refs.current[i];
    if (el) { el.focus(); el.select(); }
  }, []);

  const handleChange = useCallback((i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    while (arr.length < length) arr.push("");
    arr[i] = digit;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (digit && i < length - 1) setTimeout(() => focusIdx(i + 1), 0);
  }, [value, length, onChange, focusIdx]);

  const handleKeyDown = useCallback((i: number, e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.split("");
      while (arr.length < length) arr.push("");
      if (arr[i]) { arr[i] = ""; onChange(arr.join("")); }
      else if (i > 0) { arr[i - 1] = ""; onChange(arr.join("")); setTimeout(() => focusIdx(i - 1), 0); }
    } else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); focusIdx(i - 1); }
    else if (e.key === "ArrowRight" && i < length - 1) { e.preventDefault(); focusIdx(i + 1); }
  }, [value, length, onChange, focusIdx]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (digits) { onChange(digits); setTimeout(() => focusIdx(Math.min(digits.length, length - 1)), 0); }
  }, [length, onChange, focusIdx]);

  const digits = value.split("");
  while (digits.length < length) digits.push("");

  const boxCls = cn(
    "w-10 h-12 sm:w-11 sm:h-13 rounded-lg border text-center text-base font-mono font-semibold transition-all duration-200 outline-none",
    light
      ? "border-dark-200 bg-white text-dark-900 focus:border-sapphire focus:ring-2 focus:ring-sapphire/20"
      : "border-white/10 bg-onyx text-cream focus:border-gold focus:ring-2 focus:ring-gold/20"
  );

  return (
    <div className={cn("flex items-center gap-2", className)} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={2}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={boxCls}
        />
      ))}
    </div>
  );
}
