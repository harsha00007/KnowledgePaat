import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'An unexpected error occurred. Please try again later.', 
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-red-100 bg-red-50 p-8 text-center ${className}`}>
      <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-6 text-sm text-gray-600 max-w-sm">{message}</p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="bg-white">
          Try Again
        </Button>
      )}
    </div>
  );
}