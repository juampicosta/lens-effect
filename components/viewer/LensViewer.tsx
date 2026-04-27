'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLens } from '@/hooks/useLens';
import { useMousePosition } from '@/hooks/useMousePosition';
import { PdfViewer } from './PdfViewer';
import { LensOverlay } from './LensOverlay';
import { Toolbar } from '@/components/ui/Toolbar';

export function LensViewer() {
  const lens = useLens();
  const mouseRef = useMousePosition();
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isWide, setIsWide] = useState(true);

  useEffect(() => {
    fetch('/portfolio.pdf', { method: 'HEAD' })
      .then(r => { if (r.ok) setPdfUrl('/portfolio.pdf'); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    pdfCanvasRef.current = canvas;
  }, []);

  const handleFileChange = useCallback((file: File) => {
    setPdfUrl(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCurrentPage(1);
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]"
      style={{ cursor: lens.state.active ? 'none' : 'default' }}
    >
      <PdfViewer
        url={pdfUrl}
        page={currentPage}
        spread={isWide}
        onPageCount={setPageCount}
        onCanvasReady={handleCanvasReady}
      />

      <LensOverlay
        mouseRef={mouseRef}
        pdfCanvasRef={pdfCanvasRef}
        lens={lens.state}
      />

      <Toolbar
        lens={lens}
        pageCount={pageCount}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onFileChange={handleFileChange}
        spreadMode={isWide}
      />
    </div>
  );
}
