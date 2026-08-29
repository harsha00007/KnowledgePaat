"use client";

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { usePathname } from 'next/navigation';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', size = 'md', showLabel = false }: ThemeToggleProps) {
  const { isFeatureEnabled, theme, toggleTheme, isLoading } = useTheme();
  const pathname = usePathname();

  // CRITICAL REQUIREMENT: Not applicable on Home/Public page, or if Admin disabled theme support
  if (pathname === '/' || !isFeatureEnabled || isLoading) {
    return null;
  }

  const isDark = theme === 'dark';

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizes = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)]
        text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        hover:bg-[var(--color-bg-muted)]
        border border-transparent hover:border-[var(--color-border)]
        transition-all duration-150 focus-ring select-none
        ${buttonSizes[size]}
        ${className}
      `}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      <span className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className={`${iconSizes[size]} text-amber-400 animate-in spin-in-180 duration-200`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-slate-600 animate-in spin-in-180 duration-200`} />
        )}
      </span>
      {showLabel && (
        <span className="font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
