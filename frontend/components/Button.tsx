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
      // Solid Growth Blue — primary CTA
      primary:
        'bg-[#2563EB] text-white hover:bg-[#1d4ed8] shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:bg-[#1e40af]',

      // Neutral White — secondary actions (Deep Navy text + crisp border)
      secondary:
        'bg-white text-[#0B1D3A] border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',

      // Outlined — tertiary actions (high-contrast Deep Navy text on white surface)
      outline:
        'bg-white text-[#0B1D3A] border border-slate-300 hover:bg-slate-50 hover:text-[#2563EB] hover:border-[#2563EB] shadow-2xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-blue-400',

      // Ghost — navigation / inline actions
      ghost:
        'bg-transparent text-[#475569] hover:bg-slate-100 hover:text-[#0B1D3A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',

      // Danger — destructive actions
      danger:
        'bg-[var(--color-error)] text-white hover:opacity-90 shadow-sm',
    };

    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5 font-medium',
      md: 'h-10 px-4 text-sm rounded-xl gap-2 font-semibold',
      lg: 'h-11 px-6 text-sm rounded-xl gap-2 font-semibold',
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