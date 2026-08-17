import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
  label?: string;
}

export function Loader({ size = 'md', className = '', fullScreen = false, label }: LoaderProps) {
  const sizes: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const spinner = (
    <Loader2
      className={`animate-spin text-[var(--color-brand-500)] ${sizes[size]} ${className}`}
      aria-hidden="true"
    />
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-[2px] animate-in fade-in duration-150"
        role="status"
        aria-label={label || 'Loading'}
      >
        {spinner}
        {label && (
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
        )}
      </div>
    );
  }

  return (
    <span role="status" aria-label={label || 'Loading'}>
      {spinner}
    </span>
  );
}