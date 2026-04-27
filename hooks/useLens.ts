'use client';

import { useState } from 'react';

export type FilterType = 'red' | 'cyan';

export interface LensState {
  active: boolean;
  size: number;
  filterType: FilterType;
}

export interface LensControls {
  state: LensState;
  toggle: () => void;
  setSize: (size: number) => void;
  setFilterType: (t: FilterType) => void;
}

const DEFAULTS: LensState = {
  active: true,
  size: 220,
  filterType: 'red',
};

export function useLens(): LensControls {
  const [state, setState] = useState<LensState>(DEFAULTS);

  return {
    state,
    toggle: () => setState(s => ({ ...s, active: !s.active })),
    setSize: size => setState(s => ({ ...s, size })),
    setFilterType: filterType => setState(s => ({ ...s, filterType })),
  };
}
