"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MockInterviewsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/mock-interview');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-600)] border-t-transparent"></div>
    </div>
  );
}
