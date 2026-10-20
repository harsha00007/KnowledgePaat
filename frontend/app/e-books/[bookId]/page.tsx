import React from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { EBookLayout } from '@/layouts/EBookLayout';
import { BookDetailClient } from './BookDetailClient';
import { createClient } from '@/utils/supabase/server';
import { UUID_REGEX } from '@/lib/ebook/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface PageProps {
  params: Promise<{ bookId: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { bookId } = await params;
  if (!bookId) return { title: 'Book Not Found | KnowledgePaat' };

  const supabase = await createClient();
  const isUuid = UUID_REGEX.test(bookId);

  let query = supabase
    .from('ebooks')
    .select('id, slug, title, author, description, category, cover_image_url, status')
    .eq('status', 'published');

  if (isUuid) {
    query = query.eq('id', bookId);
  } else {
    query = query.eq('slug', bookId.toLowerCase().trim());
  }

  const { data: book } = await query.maybeSingle();

  if (!book) {
    return {
      title: 'eBook Unavailable | KnowledgePaat',
      description: 'The requested eBook is currently unavailable or does not exist.',
    };
  }

  const canonicalUrl = `https://knowledgepaat.com/e-books/${book.slug || book.id}`;

  return {
    title: `${book.title} by ${book.author} — Read Online & Download PDF | KnowledgePaat`,
    description: book.description ? book.description.slice(0, 160) : `Technical eBook: ${book.title}`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${book.title} — KnowledgePaat eBooks`,
      description: book.description ? book.description.slice(0, 160) : undefined,
      url: canonicalUrl,
      type: 'book',
      images: book.cover_image_url ? [{ url: book.cover_image_url, alt: book.title }] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { bookId } = await params;
  if (!bookId) notFound();

  const supabase = await createClient();
  const isUuid = UUID_REGEX.test(bookId);

  // 1. Fetch published book
  let bookQuery = supabase
    .from('ebooks')
    .select(`
      id,
      slug,
      title,
      subtitle,
      author,
      description,
      category,
      reader_role,
      language,
      cover_image_url,
      status,
      updated_at
    `)
    .eq('status', 'published');

  if (isUuid) {
    bookQuery = bookQuery.eq('id', bookId);
  } else {
    bookQuery = bookQuery.eq('slug', bookId.toLowerCase().trim());
  }

  const { data: book, error: bookError } = await bookQuery.maybeSingle();

  if (bookError || !book) {
    notFound();
  }

  // 2. Fetch published current edition
  const { data: edition, error: editionError } = await supabase
    .from('ebook_editions')
    .select(`
      id,
      edition_number,
      version_name,
      page_count,
      price_read_online_paise,
      price_read_download_paise,
      price_upgrade_pdf_paise,
      currency,
      published_at
    `)
    .eq('ebook_id', book.id)
    .eq('status', 'published')
    .eq('is_current_edition', true)
    .maybeSingle();

  if (editionError || !edition) {
    notFound();
  }

  // 3. Fetch public table of contents metadata (NEVER query content_body)
  const { data: chapters } = await supabase
    .from('ebook_chapters')
    .select(`
      id,
      chapter_index,
      title,
      slug,
      word_count,
      is_free_sample
    `)
    .eq('edition_id', edition.id)
    .eq('status', 'ready')
    .order('chapter_index', { ascending: true });

  const tableOfContents = (chapters || []).map((ch: any) => ({
    id: ch.id,
    chapter_index: ch.chapter_index,
    title: ch.title,
    slug: ch.slug,
    word_count: ch.word_count || 0,
    is_free_sample: Boolean(ch.is_free_sample),
  }));

  const sampleChapters = tableOfContents.filter((ch: any) => ch.is_free_sample);
  const firstSampleChapterId = sampleChapters.length > 0 ? sampleChapters[0].id : null;

  return (
    <EBookLayout>
      <BookDetailClient
        book={book}
        edition={edition}
        tableOfContents={tableOfContents}
        firstSampleChapterId={firstSampleChapterId}
      />
    </EBookLayout>
  );
}
