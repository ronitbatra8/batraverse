"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignaturePad({
  onSign,
  onClear,
  light = false,
}: {
  onSign: (dataUrl: string) => void;
  onClear?: () => void;
  light?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = light ? "#1a1a1a" : "#ffffff";
  }, [light]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [drawing, getPos]);

  const stopDraw = useCallback(() => {
    setDrawing(false);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    onClear?.();
  }, [onClear]);

  const submit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSign(canvas.toDataURL("image/png"));
  }, [hasDrawn, onSign]);

  return (
    <div className="space-y-3">
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-dark-500" : "text-cream-dim/60")}>
        Draw your signature below
      </p>
      <div className={cn("relative rounded-xl border overflow-hidden", light ? "border-dark-200 bg-white" : "border-white/10 bg-onyx")}>
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className={cn("text-xs", light ? "text-dark-300" : "text-cream-dim/30")}>Sign here</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={clear}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all",
            light ? "border-dark-200 text-dark-500 hover:bg-dark-50" : "border-white/10 text-cream-dim/60 hover:bg-white/5")}
        >
          <Eraser size={10} /> Clear
        </button>
        <button
          onClick={submit}
          disabled={!hasDrawn}
          className="flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gold text-dark-950 hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  );
}
