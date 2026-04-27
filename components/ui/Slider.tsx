'use client';

import { InputHTMLAttributes, useId } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  onChange,
  className = '',
  ...props
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs text-white/60 font-medium tracking-wide uppercase">
          {label}
        </label>
        <span className="text-xs text-white/80 font-mono tabular-nums">
          {displayValue ?? value}
        </span>
      </div>

      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="slider-input relative w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
      </div>
    </div>
  );
}
