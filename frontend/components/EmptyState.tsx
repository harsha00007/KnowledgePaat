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
        bg-[var(--color-surface)] p-12 sm:p-16
        animate-in fade-in duration-200
        ${className}
      `}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-[var(--color-text-secondary)] leading-relaxed mt-1">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}