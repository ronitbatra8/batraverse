"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function AboutAnimation() {
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

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const isLight = theme === "light";
      const accent = isLight ? [30, 58, 138] : [212, 175, 55];
      const rgba = (a: number) => `rgba(${accent[0]},${accent[1]},${accent[2]},${a})`;

      const cx = w / 2;
      const cy = h / 2;
      const helixRadius = Math.min(w, h) * 0.18;
      const helixHeight = h * 0.6;
      const turns = 2.5;
      const pointsPerStrand = 120;
      const strandCount = 2;
      const rotation = t * 0.5;

      // Draw two intertwined helix strands
      for (let strand = 0; strand < strandCount; strand++) {
        const offset = strand * Math.PI;
        const points: [number, number, number][] = [];

        for (let i = 0; i <= pointsPerStrand; i++) {
          const frac = i / pointsPerStrand;
          const angle = frac * turns * Math.PI * 2 + rotation + offset;
          const y = cy - helixHeight / 2 + frac * helixHeight;

          // 3D projection
          const x3d = Math.cos(angle) * helixRadius;
          const z3d = Math.sin(angle) * helixRadius;
          const perspective = 300 / (300 + z3d);
          const x = cx + x3d * perspective;
          const yProj = y * perspective + (1 - perspective) * cy;

          points.push([x, yProj, z3d]);
        }

        // Draw strand line
        for (let i = 0; i < points.length - 1; i++) {
          const [x1, y1, z1] = points[i];
          const [x2, y2] = points[i + 1];
          const depthFade = 0.3 + 0.7 * ((z1 + helixRadius) / (helixRadius * 2));
          const wave = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.1);
          const alpha = depthFade * (0.25 + 0.15 * wave);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = rgba(alpha);
          ctx.lineWidth = 1.2 * depthFade;
          ctx.stroke();
        }

        // Draw connecting nodes on strand
        for (let i = 0; i <= pointsPerStrand; i += 4) {
          const [x, y, z] = points[i];
          const depthFade = 0.3 + 0.7 * ((z + helixRadius) / (helixRadius * 2));
          const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + i * 0.15);
          const r = 1.5 * depthFade * pulse;

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = rgba(depthFade * 0.6);
          ctx.fill();
        }
      }

      // Cross-links between strands (the rungs of the ladder)
      const rungCount = 30;
      for (let i = 0; i < rungCount; i++) {
        const frac = (i + 0.5) / rungCount;
        const angle1 = frac * turns * Math.PI * 2 + rotation;
        const angle2 = angle1 + Math.PI;
        const y = cy - helixHeight / 2 + frac * helixHeight;

        const x1_3d = Math.cos(angle1) * helixRadius;
        const z1_3d = Math.sin(angle1) * helixRadius;
        const p1 = 300 / (300 + z1_3d);
        const x1 = cx + x1_3d * p1;
        const y1 = y * p1 + (1 - p1) * cy;

        const x2_3d = Math.cos(angle2) * helixRadius;
        const z2_3d = Math.sin(angle2) * helixRadius;
        const p2 = 300 / (300 + z2_3d);
        const x2 = cx + x2_3d * p2;
        const y2 = y * p2 + (1 - p2) * cy;

        const avgZ = (z1_3d + z2_3d) / 2;
        const depthFade = 0.2 + 0.8 * ((avgZ + helixRadius) / (helixRadius * 2));
        const wave = 0.5 + 0.5 * Math.sin(t * 1.0 + i * 0.5);
        const alpha = depthFade * 0.12 * wave;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rgba(alpha);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Central glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, helixRadius * 1.5);
      glow.addColorStop(0, rgba(isLight ? 0.04 : 0.06));
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

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
