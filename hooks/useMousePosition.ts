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
    const handleTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) posRef.current = { x: t.clientX, y: t.clientY };
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, []);

  return posRef;
}
