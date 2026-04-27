/**
 * Applies a per-pixel RGB channel misregistration to `dst`.
 *
 * Each output pixel samples its R, G, B channels from different horizontal
 * positions of the source canvas:
 *   R  →  source shifted left  by shiftX px  (and up   by shiftY px)
 *   G  →  source at center     (no shift)
 *   B  →  source shifted right by shiftX px  (and down by shiftY px)
 *
 * Result: text/edges appear with red fringe on one side, blue/cyan on the
 * other — the classic "channel misregistration" / RGB-split glitch effect.
 */
export function applyRGBSplit(
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
  shiftX: number,
  shiftY = 0
): void {
  const w = src.width;
  const h = src.height;

  dst.width = w;
  dst.height = h;

  const srcCtx = src.getContext('2d', { willReadFrequently: true });
  const dstCtx = dst.getContext('2d');
  if (!srcCtx || !dstCtx) return;

  const srcData = srcCtx.getImageData(0, 0, w, h);
  const dstData = dstCtx.createImageData(w, h);
  const s = srcData.data;
  const d = dstData.data;

  const cx = (v: number) => Math.max(0, Math.min(w - 1, v));
  const cy = (v: number) => Math.max(0, Math.min(h - 1, v));

  const sx = Math.round(shiftX);
  const sy = Math.round(shiftY);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      const ri = (cy(y - sy) * w + cx(x - sx)) * 4;
      const bi = (cy(y + sy) * w + cx(x + sx)) * 4;

      d[i + 0] = s[ri + 0]; // R  ← shifted left/up
      d[i + 1] = s[i + 1];  // G  ← center
      d[i + 2] = s[bi + 2]; // B  ← shifted right/down
      d[i + 3] = s[i + 3];  // A  ← center
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
}
