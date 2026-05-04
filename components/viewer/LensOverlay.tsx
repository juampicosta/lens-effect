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

function applyChannelFilter(data: Uint8ClampedArray, filter: FilterType): void {
  for (let i = 0; i < data.length; i += 4) {
    if (filter === 'cyan') {
      data[i] = 0; // r = 0
    } else {
      data[i + 1] = 0; // g = 0
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
  rect: DOMRect
): void {
  const lensCanvas = ctx.canvas;
  ctx.clearRect(0, 0, lensCanvas.width, lensCanvas.height);

  if (rect.width === 0 || rect.height === 0) return;

  const r = lensSize / 2;
  const scaleX = pdfCanvas.width / rect.width;
  const scaleY = pdfCanvas.height / rect.height;

  const srcX = Math.round((mx - rect.left - r) * scaleX);
  const srcY = Math.round((my - rect.top - r) * scaleY);
  const srcW = Math.round(lensSize * scaleX);
  const srcH = Math.round(lensSize * scaleY);

  const temp = getTempCanvas(srcW, srcH);
  const tctx = temp.getContext('2d', { willReadFrequently: true })!;
  tctx.clearRect(0, 0, srcW, srcH);
  tctx.drawImage(pdfCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  const imageData = tctx.getImageData(0, 0, srcW, srcH);
  applyChannelFilter(imageData.data, filter);
  tctx.putImageData(imageData, 0, 0);

  // Clip + draw filtered region (single save/restore for the clip)
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(temp, mx - r, my - r, lensSize, lensSize);
  ctx.restore();

  // Outer glow ring
  const glow = ctx.createRadialGradient(mx, my, r - 1, mx, my, r + 14);
  glow.addColorStop(0, filter === 'red' ? 'rgba(255,80,80,0.2)' : 'rgba(0,220,220,0.2)');
  glow.addColorStop(1, filter === 'red' ? 'rgba(255,60,60,0)' : 'rgba(0,200,200,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mx, my, r + 14, 0, Math.PI * 2);
  ctx.fill();

  // Crisp rim
  ctx.strokeStyle = filter === 'red' ? 'rgba(255, 80, 80, 0.55)' : 'rgba(0, 220, 220, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.stroke();

  // Specular highlight arc (top-left)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mx, my, r - 2, -Math.PI * 0.82, -Math.PI * 0.18);
  ctx.stroke();
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

    // Cached bounding rect — invalidated on resize, lazily refreshed when needed.
    let cachedRect: DOMRect | null = null;

    const syncSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cachedRect = null;
    };
    syncSize();
    window.addEventListener('resize', syncSize);

    let rafId: number;
    let lastX = -1, lastY = -1, lastSize = -1, lastFilter: FilterType | '' = '', lastActive = false;

    const loop = () => {
      const { active, size, filterType } = lensRef.current;
      const pdfCanvas = pdfCanvasRef.current;
      const { x, y } = mouseRef.current;

      if (active && pdfCanvas && pdfCanvas.width > 0) {
        const changed = x !== lastX || y !== lastY || size !== lastSize ||
          filterType !== lastFilter || !lastActive;

        if (changed) {
          if (!cachedRect) cachedRect = pdfCanvas.getBoundingClientRect();
          lastX = x; lastY = y; lastSize = size; lastFilter = filterType; lastActive = true;
          drawFrame(ctx, pdfCanvas, x, y, size, filterType, cachedRect);
        }
      } else if (lastActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lastActive = false;
        lastX = -1; // force redraw when lens reactivates
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
