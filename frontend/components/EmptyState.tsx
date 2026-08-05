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
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}