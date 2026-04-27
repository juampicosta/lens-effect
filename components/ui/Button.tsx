'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'active' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40';

    const variants = {
      default:
        'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-white/30 active:scale-95',
      active:
        'bg-violet-500/80 hover:bg-violet-400/80 text-white border border-violet-400/40 active:scale-95 shadow-lg shadow-violet-500/20',
      ghost:
        'bg-transparent hover:bg-white/10 text-white/70 hover:text-white active:scale-95',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
