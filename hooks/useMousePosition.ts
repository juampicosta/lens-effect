'use client';

import { useEffect, useRef } from 'react';

export interface MousePosition {
  x: number;
  y: number;
}

export function useMousePosition(): React.RefObject<MousePosition> {
  const posRef = useRef<MousePosition>({ x: -9999, y: -9999 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return posRef;
}
