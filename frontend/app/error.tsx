"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled Client Route Error', error, {
      digest: error.digest,
      component: 'app/error.tsx',
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[var(--color-border)] p-8 text-center shadow-sm space-y-6">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            An unexpected error occurred while loading this page. Our telemetry has logged the issue.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              size="md"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
