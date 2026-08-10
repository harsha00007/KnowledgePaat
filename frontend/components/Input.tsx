import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`flex h-11 w-full rounded-[var(--radius-lg)] border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${
            error ? 'border-red-500 focus:ring-red-500' : 'hover:border-slate-400'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';