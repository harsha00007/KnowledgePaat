import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { EBookLayout } from '@/layouts/EBookLayout';
import { BookstoreClient } from './BookstoreClient';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'eBooks Bookstore — Engineering, Architecture & Career Guides | KnowledgePaat',
  description:
    'Browse our curated library of engineering, system design, and career preparation eBooks. Read free sample chapters online or download comprehensive PDF editions.',
  alternates: {
    canonical: 'https://knowledgepaat.com/e-books',
  },
  openGraph: {
    title: 'eBooks Bookstore — KnowledgePaat',
    description:
      'Curated engineering and career eBooks with instant online reading and downloadable editions.',
    url: 'https://knowledgepaat.com/e-books',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
};

export default function EBooksPage() {
  return (
    <EBookLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            <p className="text-sm font-semibold">Loading KnowledgePaat Bookstore...</p>
          </div>
        }
      >
        <BookstoreClient />
      </Suspense>
    </EBookLayout>
  );
}
