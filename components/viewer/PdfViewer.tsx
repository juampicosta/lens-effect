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
        const total = pdf.numPages;
        const isAlone = pageNum === 1 || pageNum === total;
        const rightNum = (!isAlone && pageNum + 1 < total) ? pageNum + 1 : null;
        const leftPage = await pdf.getPage(pageNum);
        const rightPage = rightNum ? await pdf.getPage(rightNum) : null;
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
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => renderPage(pdf, page), 250);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, [loadState, page, renderPage]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] pb-24 md:pb-0 md:pl-72">
      {loadState === 'idle' && (
        <div className="flex flex-col items-center gap-6 select-none">
          <div className="flex flex-col items-center gap-3 text-white/50">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-lg font-semibold text-white/70">Cargá tu PDF para comenzar</p>
            <p className="text-sm text-white/30">Usá el panel de la izquierda → <span className="text-white/50 font-medium">Cargar PDF</span></p>
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
