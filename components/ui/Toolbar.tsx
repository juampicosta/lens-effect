'use client';

import { useState } from 'react';
import { LensControls, FilterType } from '@/hooks/useLens';
import { Button } from './Button';
import { Slider } from './Slider';

interface ToolbarProps {
  lens: LensControls;
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onFileChange: (file: File) => void;
  spreadMode?: boolean;
}

const FILTERS: { value: FilterType; label: string; color: string }[] = [
  { value: 'red',  label: 'Rosado', color: 'rgb(220,50,150)' },
  { value: 'cyan', label: 'Cian',  color: 'rgb(0,200,200)'  },
];

export function Toolbar({
  lens,
  pageCount,
  currentPage,
  onPageChange,
  onFileChange,
  spreadMode = false,
}: ToolbarProps) {
  const { state, toggle, setSize, setFilterType } = lens;
  const [open, setOpen] = useState(true);

  const activeColor = state.filterType === 'red' ? 'rgb(240,60,60)' : 'rgb(0,210,210)';
  const activeShadow = state.filterType === 'red'
    ? '0 0 8px rgba(240,60,60,0.5)'
    : '0 0 8px rgba(0,210,210,0.5)';

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex items-start gap-2 select-none">

      {/* ── Panel ─────────────────────────────────────────────────────── */}
      <div
        className={`
          flex flex-col gap-4 overflow-hidden
          bg-black/65 backdrop-blur-2xl
          border border-white/10
          shadow-2xl shadow-black/60
          rounded-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'w-64 px-5 py-5 opacity-100' : 'w-0 px-0 py-0 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full transition-all duration-300 shrink-0"
              style={{
                background: state.active ? activeColor : 'rgba(255,255,255,0.2)',
                boxShadow: state.active ? activeShadow : 'none',
              }}
            />
            <span className="text-sm font-semibold text-white/90 tracking-tight whitespace-nowrap">
              Filtro de Color
            </span>
          </div>

          <Button
            variant={state.active ? 'active' : 'default'}
            size="sm"
            onClick={toggle}
          >
            {state.active ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5C6.5 5 2 12 2 12s4.5 7 10 7 10-7 10-7-4.5-7-10-7z" />
                </svg>
                Activo
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="2" y1="2" x2="22" y2="22" />
                  <path d="M6.7 6.7C4.2 8.3 2 12 2 12s4.5 7 10 7a10 10 0 0 0 5.3-1.7" />
                </svg>
                Off
              </>
            )}
          </Button>
        </div>

        {/* Filter type */}
        <div className={`flex gap-2 transition-opacity duration-200 ${state.active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          {FILTERS.map(f => {
            const isActive = state.filterType === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`
                  flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150 border whitespace-nowrap
                  ${isActive ? '' : 'text-white/40 hover:text-white/70 bg-white/5 border-transparent hover:border-white/10'}
                `}
                style={isActive ? {
                  background: `${f.color}20`,
                  borderColor: `${f.color}50`,
                  color: f.color,
                  boxShadow: `0 0 10px ${f.color}18`,
                } : {}}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className={`text-[11px] leading-relaxed text-white/30 transition-opacity duration-200 ${state.active ? 'opacity-100' : 'opacity-40'}`}>
          {state.filterType === 'cyan'
            ? <>Lente <span style={{ color: 'rgb(0,200,200)' }}>cian</span> — texto cian desaparece</>
            : <>Lente <span style={{ color: 'rgb(220,80,80)' }}>rosado</span> — texto rosado desaparece</>
          }
        </p>

        {/* Size slider */}
        <div className={`transition-opacity duration-200 ${state.active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <Slider
            label="Tamaño"
            value={state.size}
            min={80}
            max={400}
            step={10}
            displayValue={`${state.size}px`}
            onChange={setSize}
          />
        </div>

        <div className="h-px bg-white/8" />

        {/* Page nav + file upload */}
        <div className="flex flex-col gap-2">
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost" size="sm"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(Math.max(1, currentPage - (spreadMode ? 2 : 1)))}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Button>
              <span className="text-xs text-white/50 font-mono tabular-nums px-2">
                {spreadMode
                  ? `${currentPage}–${Math.min(currentPage + 1, pageCount)} / ${pageCount}`
                  : `${currentPage} / ${pageCount}`
                }
              </span>
              <Button
                variant="ghost" size="sm"
                disabled={currentPage >= (spreadMode ? pageCount - 1 : pageCount)}
                onClick={() => onPageChange(Math.min(pageCount - (spreadMode ? 1 : 0), currentPage + (spreadMode ? 2 : 1)))}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </div>
          )}

          <label className="cursor-pointer w-full">
            <span className="
              flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs font-medium
              bg-white/8 hover:bg-white/15 text-white/60 hover:text-white
              border border-white/10 hover:border-white/25
              transition-all duration-200
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Cargar PDF
            </span>
            <input
              type="file"
              accept=".pdf"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onFileChange(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* ── Toggle button (always visible) ────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="
          mt-0 flex items-center justify-center
          w-8 h-8 rounded-xl
          bg-black/65 backdrop-blur-2xl
          border border-white/10
          text-white/50 hover:text-white
          shadow-lg shadow-black/40
          transition-all duration-200 hover:bg-white/10
          shrink-0
        "
        title={open ? 'Cerrar panel' : 'Abrir panel'}
      >
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  );
}
