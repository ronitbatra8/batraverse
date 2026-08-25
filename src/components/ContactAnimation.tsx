"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

export default function ContactAnimation() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create nodes
    const nodes: Node[] = [];
    const nodeCount = 50;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        size: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const isLight = theme === "light";
      const accent = isLight ? [30, 58, 138] : [212, 175, 55];
      const rgba = (a: number) => `rgba(${accent[0]},${accent[1]},${accent[2]},${a})`;

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        // Gentle orbital pull toward center
        const dx = 0.5 - n.x;
        const dy = 0.5 - n.y;
        n.vx += dx * 0.00002;
        n.vy += dy * 0.00002;
        // Damping
        n.vx *= 0.999;
        n.vy *= 0.999;
        // Wrap
        if (n.x < -0.05) n.x = 1.05;
        if (n.x > 1.05) n.x = -0.05;
        if (n.y < -0.05) n.y = 1.05;
        if (n.y > 1.05) n.y = -0.05;
      }

      // Draw connections
      const maxDist = 0.18;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy) / w;

          if (dist < maxDist) {
            const fade = 1 - dist / maxDist;
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + a.phase + b.phase);
            const alpha = fade * 0.15 * pulse;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.strokeStyle = rgba(alpha);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + n.phase);
        const alpha = 0.4 + 0.3 * pulse;
        const r = n.size * pulse;

        // Glow
        const glow = ctx.createRadialGradient(
          n.x * w, n.y * h, 0,
          n.x * w, n.y * h, r * 4
        );
        glow.addColorStop(0, rgba(alpha * 0.4));
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(n.x * w - r * 4, n.y * h - r * 4, r * 8, r * 8);

        // Core
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(alpha);
        ctx.fill();
      }

      // Central radial pulse
      const pulsePhase = Math.sin(t * 0.5) * 0.5 + 0.5;
      const ringGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 200 + pulsePhase * 60);
      ringGrad.addColorStop(0, rgba(0.05 + pulsePhase * 0.04));
      ringGrad.addColorStop(0.5, rgba(0.02));
      ringGrad.addColorStop(1, "transparent");
      ctx.fillStyle = ringGrad;
      ctx.fillRect(0, 0, w, h);

      // Concentric pulse rings
      for (let r = 0; r < 3; r++) {
        const ringT = (t * 0.3 + r * 2) % 6;
        const radius = ringT * 80;
        const ringAlpha = Math.max(0, 0.12 - ringT * 0.02);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ringAlpha);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      t += 0.016;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
