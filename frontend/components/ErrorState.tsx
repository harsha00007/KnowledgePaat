import React from 'react';
import { Button } from './Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        rounded-[var(--radius-lg)] border border-[var(--color-error)]/20
        bg-red-50 p-12
        animate-in fade-in duration-300
        ${className}
      `}
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[var(--color-error)]">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mb-5 max-w-xs text-sm text-[var(--color-text-secondary)] leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}