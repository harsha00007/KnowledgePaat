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
    <div
      className={`
        flex flex-col items-center justify-center text-center
        rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)]
        bg-[var(--color-bg-subtle)] p-12
        animate-in fade-in duration-300
        ${className}
      `}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="mb-5 max-w-xs text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}