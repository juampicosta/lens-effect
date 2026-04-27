'use client';

import { useEffect, useRef } from 'react';
import type { MousePosition } from '@/hooks/useMousePosition';
import type { LensState, FilterType } from '@/hooks/useLens';

interface LensOverlayProps {
  mouseRef: React.RefObject<MousePosition>;
  pdfCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  lens: LensState;
}

// Offscreen canvas reused across frames to avoid GC pressure.
let _tempCanvas: OffscreenCanvas | null = null;
function getTempCanvas(w: number, h: number): OffscreenCanvas {
  if (!_tempCanvas || _tempCanvas.width !== w || _tempCanvas.height !== h) {
    _tempCanvas = new OffscreenCanvas(w, h);
  }
  return _tempCanvas;
}

// Pixel classification by dominant hue.
// Rosado/rojo:  r>g*4 && (r>80 || b>50) — catches pure (229,8,126) and anti-aliased edges
// Cian/celeste: r<80  && b>80 && (g+b)>r*3 — catches pure (26,157,217) and anti-aliased edges
// All other pixels (negro, blanco) left unchanged.
//
// Filtered pixels → (255,255,255) white, matching the PDF page background.
function applyChannelFilter(data: Uint8ClampedArray, filter: FilterType): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filter === 'cyan') {
      // Lente CIAN: cian desaparece, rosado permanece.
      const isCyan = r < 80 && b > 80 && (g + b) > r * 3;
      if (isCyan) {
        data[i]     = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    } else {
      // Lente ROSADO: rosado desaparece, cian permanece.
      const isMagenta = g < 50 && (r > 80 || b > 50) && (r + b) > g * 6;
      if (isMagenta) {
        data[i]     = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  pdfCanvas: HTMLCanvasElement,
  mx: number,
  my: number,
  lensSize: number,
  filter: FilterType,
  active: boolean
): void {
  const lensCanvas = ctx.canvas;
  ctx.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
  if (!active) return;

  const r = lensSize / 2;

  // Map screen coordinates → PDF canvas pixel space (handles CSS scaling).
  const rect = pdfCanvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const scaleX = pdfCanvas.width / rect.width;
  const scaleY = pdfCanvas.height / rect.height;

  // Source region on pdfCanvas that corresponds to the lens circle.
  // 1:1 scale — no zoom.
  const srcX = Math.round((mx - rect.left - r) * scaleX);
  const srcY = Math.round((my - rect.top - r) * scaleY);
  const srcW = Math.round(lensSize * scaleX);
  const srcH = Math.round(lensSize * scaleY);

  // ── 1. Copy lens region into an offscreen canvas ──────────────────────────
  const temp = getTempCanvas(srcW, srcH);
  const tctx = temp.getContext('2d', { willReadFrequently: true })!;
  tctx.clearRect(0, 0, srcW, srcH);
  tctx.drawImage(pdfCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  // ── 2. Apply channel filter per-pixel ─────────────────────────────────────
  const imageData = tctx.getImageData(0, 0, srcW, srcH);
  applyChannelFilter(imageData.data, filter);
  tctx.putImageData(imageData, 0, 0);

  // ── 3. Draw filtered region onto lens canvas, clipped to circle ───────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(temp, mx - r, my - r, lensSize, lensSize);
  ctx.restore();

  // ── 4. Lens border decorations ────────────────────────────────────────────
  const rimColor = filter === 'red'
    ? 'rgba(255, 80, 80, 0.55)'
    : 'rgba(0, 220, 220, 0.55)';
  const glowColor = filter === 'red'
    ? 'rgba(255, 60, 60, 0)'
    : 'rgba(0, 200, 200, 0)';

  // Outer glow ring
  ctx.save();
  const glow = ctx.createRadialGradient(mx, my, r - 1, mx, my, r + 14);
  glow.addColorStop(0, filter === 'red' ? 'rgba(255,80,80,0.2)' : 'rgba(0,220,220,0.2)');
  glow.addColorStop(1, glowColor);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mx, my, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Crisp rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Specular highlight arc (top-left)
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r - 2, -Math.PI * 0.82, -Math.PI * 0.18);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function LensOverlay({ mouseRef, pdfCanvasRef, lens }: LensOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef(lens);
  lensRef.current = lens;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    syncSize();
    window.addEventListener('resize', syncSize);

    let rafId: number;

    const loop = () => {
      const { active, size, filterType } = lensRef.current;
      const pdfCanvas = pdfCanvasRef.current;
      const { x, y } = mouseRef.current;

      if (active && pdfCanvas && pdfCanvas.width > 0) {
        drawFrame(ctx, pdfCanvas, x, y, size, filterType, true);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncSize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-30 pointer-events-none"
      aria-hidden
    />
  );
}
