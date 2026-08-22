import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, hint, error, id, rightElement, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={`
              flex h-10 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2
              ${rightElement ? 'pr-10' : ''}
              text-sm text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              shadow-[var(--shadow-xs)]
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-0 focus:border-[var(--color-brand-500)]
              disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-muted)]
              ${error
                ? 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
              {rightElement}
            </div>
          )}
        </div>
        {hint && !error && (
          <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';