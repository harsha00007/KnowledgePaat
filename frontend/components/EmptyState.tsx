import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-slate-300 bg-slate-50 p-12 text-center animate-in fade-in slide-in-from-bottom-2 ${className}`}>
      {icon && (
        <div className="mb-4 text-slate-400 bg-white p-4 rounded-full shadow-sm border border-slate-100">
          {icon}
        </div>
      )}
      <h3 className="mb-1.5 text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mb-5 text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}