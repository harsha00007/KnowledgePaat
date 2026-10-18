import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getVerifiedCustomer } from '@/lib/ebook/customerAuth';
import { getAuthorizedChapterContent, getReadingPreferences } from '@/lib/ebook/reader';
import { ReaderClient } from './ReaderClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ bookId: string; chapterId: string }>;
  searchParams: Promise<{ editionId?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId, chapterId } = await params;
  return {
    title: `Reader | KnowledgePaat`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ReaderPage({ params, searchParams }: PageProps) {
  const { bookId, chapterId } = await params;
  const { editionId } = await searchParams;

  // 1. Authoritative verification of customer
  const authResult = await getVerifiedCustomer();
  if (!authResult.success) {
    if (authResult.status === 401) {
      redirect(`/login?redirectTo=/read/${bookId}/${chapterId}`);
    }
    return (
      <ReaderClient
        initialError={{
          status: authResult.status,
          message: authResult.message,
          code: authResult.code,
        }}
        bookId={bookId}
        chapterId={chapterId}
      />
    );
  }

  const customer = authResult.customer;

  // 2. Load chapter content & preferences
  const [chapterResult, preferences] = await Promise.all([
    getAuthorizedChapterContent(customer.userId, bookId, chapterId, editionId),
    getReadingPreferences(customer.userId),
  ]);

  if (!chapterResult.authorized) {
    return (
      <ReaderClient
        initialError={{
          status: chapterResult.status,
          message: chapterResult.error || 'Access to this chapter is not authorized.',
        }}
        bookId={bookId}
        chapterId={chapterId}
      />
    );
  }

  return (
    <ReaderClient
      initialData={{
        book: chapterResult.book!,
        edition: chapterResult.edition!,
        chapter: chapterResult.chapter!,
        navigation: chapterResult.navigation!,
        progress: chapterResult.progress || null,
        ownedEditions: chapterResult.ownedEditions || [],
        preferences,
        entitlement: chapterResult.entitlement || null,
      }}
      bookId={bookId}
      chapterId={chapterId}
      currentUserId={customer.userId}
    />
  );
}
