'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf, renderPageToCanvas, renderSpreadToCanvas, calcScale } from '@/lib/pdf';

interface PdfViewerProps {
  url: string | null;
  page: number;
  spread?: boolean;
  onPageCount: (count: number) => void;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function PdfViewer({ url, page, spread = false, onPageCount, onCanvasReady }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const renderPage = useCallback(async (pdf: PDFDocumentProxy, pageNum: number) => {
    if (!canvasRef.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    try {
      if (spread) {
        const leftPage = await pdf.getPage(pageNum);
        const rightPage = pageNum + 1 <= pdf.numPages ? await pdf.getPage(pageNum + 1) : null;
        await renderSpreadToCanvas(leftPage, rightPage, canvasRef.current, width, height);
      } else {
        const pdfPage = await pdf.getPage(pageNum);
        const scale = calcScale(pdfPage, width, height);
        await renderPageToCanvas(pdfPage, canvasRef.current, scale);
      }
      onCanvasReady(canvasRef.current);
    } catch {
      setErrorMsg('Failed to render page');
    }
  }, [onCanvasReady, spread]);

  useEffect(() => {
    if (!url) {
      setLoadState('idle');
      pdfRef.current = null;
      onPageCount(0);
      onCanvasReady(null);
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    loadPdf(url)
      .then(pdf => {
        if (cancelled) return;
        pdfRef.current = pdf;
        onPageCount(pdf.numPages);
        setLoadState('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg(err?.message ?? 'Failed to load PDF');
        setLoadState('error');
      });

    return () => { cancelled = true; };
  }, [url, onPageCount, onCanvasReady]);

  useEffect(() => {
    if (loadState === 'ready' && pdfRef.current) {
      renderPage(pdfRef.current, page);
    }
  }, [loadState, page, renderPage]);

  useEffect(() => {
    if (loadState !== 'ready' || !pdfRef.current) return;
    const pdf = pdfRef.current;
    const ro = new ResizeObserver(() => renderPage(pdf, page));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [loadState, page, renderPage]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
      {loadState === 'idle' && (
        <div className="flex flex-col items-center gap-4 text-white/30">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-white/40">No PDF loaded</p>
            <p className="text-xs text-white/20 mt-1">Use the toolbar below to load a PDF</p>
          </div>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="flex flex-col items-center gap-3 text-white/40">
          <div className="w-8 h-8 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm">Loading PDF…</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="flex flex-col items-center gap-2 text-red-400/70">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full shadow-2xl shadow-black/60 transition-opacity duration-300 ${loadState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
