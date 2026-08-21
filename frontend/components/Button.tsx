import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-150 focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants: Record<string, string> = {
      // Solid indigo — primary CTA (Stitch: primary #7c3aed)
      primary:
        'bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] shadow-sm hover:shadow-md',

      // Neutral — secondary actions (Stitch: white + border)
      secondary:
        'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] shadow-xs',

      // Outlined — tertiary actions on light bg
      outline:
        'bg-transparent border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] hover:border-[var(--color-border-strong)]',

      // Ghost — navigation / inline actions
      ghost:
        'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',

      // Danger — destructive actions
      danger:
        'bg-[var(--color-error)] text-white hover:opacity-90 shadow-sm',
    };

    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-sm)] gap-2',
      lg: 'h-11 px-6 text-sm rounded-[var(--radius-sm)] gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="animate-spin -ml-0.5 h-4 w-4 text-current shrink-0" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';