import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist';

export type { PDFDocumentProxy, PDFPageProxy, PageViewport };

let initialized = false;

export async function initPdfWorker() {
  if (initialized) return;
  initialized = true;
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function loadPdf(url: string): Promise<PDFDocumentProxy> {
  await initPdfWorker();
  const pdfjsLib = await import('pdfjs-dist');
  const loadingTask = pdfjsLib.getDocument({
    url,
    cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });
  return loadingTask.promise;
}

function getDpr(): number {
  return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
}

export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const dpr = getDpr();
  const viewport = page.getViewport({ scale: scale * dpr });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
}

export function calcScale(
  page: PDFPageProxy,
  containerWidth: number,
  containerHeight: number
): number {
  const viewport = page.getViewport({ scale: 1 });
  return Math.min(containerWidth / viewport.width, containerHeight / viewport.height);
}

export async function renderSpreadToCanvas(
  leftPage: PDFPageProxy | null,
  rightPage: PDFPageProxy | null,
  canvas: HTMLCanvasElement,
  containerWidth: number,
  containerHeight: number
): Promise<void> {
  const dpr = getDpr();
  const refPage = (leftPage ?? rightPage)!;
  const refVp = refPage.getViewport({ scale: 1 });
  const hasBoth = !!(leftPage && rightPage);
  const gap = hasBoth ? 4 : 0;
  const totalNaturalW = refVp.width * (hasBoth ? 2 : 1) + gap;
  // Logical scale fits in container; multiply by DPR for crisp pixels.
  const scale = Math.min(containerWidth / totalNaturalW, containerHeight / refVp.height) * dpr;
  const scaledW = Math.round(refVp.width * scale);
  const scaledH = Math.round(refVp.height * scale);
  const scaledGap = Math.round(gap * scale);

  canvas.width = hasBoth ? scaledW * 2 + scaledGap : scaledW;
  canvas.height = scaledH;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderOne = async (page: PDFPageProxy, offsetX: number) => {
    const vp = page.getViewport({ scale });
    const off = document.createElement('canvas');
    off.width = Math.round(vp.width);
    off.height = Math.round(vp.height);
    await page.render({ canvas: off, viewport: vp }).promise;
    ctx.drawImage(off, offsetX, 0);
  };

  const tasks: Promise<void>[] = [];
  if (leftPage) tasks.push(renderOne(leftPage, 0));
  if (rightPage) tasks.push(renderOne(rightPage, hasBoth ? scaledW + scaledGap : 0));
  await Promise.all(tasks);
}
