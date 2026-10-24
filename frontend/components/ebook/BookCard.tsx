"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Check, FileText } from 'lucide-react';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { formatPaise } from '@/lib/ebook/pricingShared';

export interface BookCardData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  author: string;
  description: string;
  category: string;
  reader_role?: string | null;
  cover_image_url?: string | null;
  min_price_paise: number;
  has_discount?: boolean;
  has_free_sample: boolean;
  sample_chapter_count?: number;
  total_chapter_count?: number;
  current_edition?: {
    id: string;
    edition_number: number;
    version_name: string;
    page_count?: number | null;
    price_read_online_paise: number;
    price_read_download_paise: number;
    pricing?: {
      online_original_price_paise?: number;
      online_price_paise?: number;
      online_discount_type?: string;
      download_original_price_paise?: number;
      download_price_paise?: number;
      download_discount_type?: string;
    } | null;
  } | null;
}

export interface BookCardProps {
  book: BookCardData;
  isOwned?: boolean;
  ownedPlan?: 'online' | 'full';
  onOpenSample?: (book: BookCardData) => void;
  onQuickAdd?: (book: BookCardData) => void;
}

export function cleanBookTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\(p\d+_[^)]+\)/gi, '')
    .replace(/\s*\([a-z0-9_]{6,}\)/gi, '')
    .replace(/\s+p\d+_[a-z0-9_]+/gi, '')
    .replace(/\s+p\d+_\d+_[a-f0-9]+/gi, '')
    .replace(/\s+[a-f0-9]{6,}\b/gi, '')
    .trim();
}

export function BookCard({ book, isOwned = false, ownedPlan, onOpenSample }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const { hasBook } = useEBookCart();
  const inCart = hasBook(book.id);

  const displayTitle = cleanBookTitle(book.title);
  const formattedMinPrice = formatPaise(book.min_price_paise);
  const detailHref = `/e-books/${encodeURIComponent(book.slug || book.id)}`;
  const readHref = `/read/${encodeURIComponent(book.slug || book.id)}`;

  // Determine authoritative price labeling
  const onlinePrice = book.current_edition?.price_read_online_paise;
  const downloadPrice = book.current_edition?.price_read_download_paise;
  const hasDownloadPlan = Boolean(downloadPrice && downloadPrice > 0);

  let priceLabel = 'Starting from';
  if (book.min_price_paise === 0) {
    priceLabel = 'Free access';
  } else if (onlinePrice !== undefined && book.min_price_paise === onlinePrice) {
    priceLabel = 'Read online from';
  } else if (hasDownloadPlan && book.min_price_paise === downloadPrice) {
    priceLabel = 'Complete edition from';
  }

  return (
    <article
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-[#E8E5F5] shadow-xs hover:shadow-md hover:border-[#6F42DD]/30 transition-all duration-200 p-3.5 sm:p-4 font-ebook"
      aria-labelledby={`book-title-${book.id}`}
    >
      {/* ── UPPER ROW: Cover (left) + Metadata & Description (right) ── */}
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        {/* Book cover: 80–88px on phones (w-[84px]), 96–112px on desktop (sm:w-24 md:w-28), shrink-0 */}
        <div className="w-[84px] sm:w-24 md:w-28 shrink-0">
          <Link
            href={isOwned ? readHref : detailHref}
            className="block w-full transition-transform duration-200 group-hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F42DD] rounded-xl"
            aria-label={`View ${displayTitle}`}
            tabIndex={-1}
          >
            <div className="aspect-[2/3] w-full relative rounded-xl overflow-hidden shadow-xs border border-[#E8E5F5] bg-[#1D1855]">
              {book.cover_image_url && !imgError ? (
                <img
                  src={book.cover_image_url}
                  alt={`Cover of ${displayTitle}`}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                /* Generated Fallback Cover: Simple Navy-and-Gold Design */
                <div className="w-full h-full bg-gradient-to-br from-[#1D1855] via-[#241E66] to-[#141040] p-2 sm:p-2.5 flex flex-col justify-between select-none relative">
                  {/* Subtle top gold accent bar */}
                  <div className="w-full flex items-center justify-between pb-1 border-b border-[#FFCB35]/20">
                    <BookOpen className="w-3.5 h-3.5 text-[#FFCB35]" aria-hidden="true" />
                    <span className="text-[9px] font-bold tracking-widest text-[#FFCB35] uppercase font-ebook">
                      KP
                    </span>
                  </div>

                  {/* Title with sensible word wrapping, no oversized category text, no baked-in ellipsis */}
                  <div className="my-auto py-1">
                    <p className="text-[11px] sm:text-xs font-bold leading-tight font-ebook text-white break-words">
                      {displayTitle}
                    </p>
                  </div>

                  {/* Footer: subtle author info */}
                  <div className="pt-1 border-t border-white/10">
                    <p className="text-[9px] sm:text-[10px] text-indigo-200 font-medium truncate">
                      {book.author}
                    </p>
                  </div>

                  {/* Spine shadow effect */}
                  <div className="absolute inset-y-0 left-0 w-1.5 sm:w-2 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Right column: Category, Title, Author & Chapter count */}
        <div className="flex-1 min-w-0">
          {/* Subtle Category Label (Edition badges removed from catalogue cards) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#6F42DD] uppercase tracking-wider truncate max-w-full">
              {book.category}
            </span>
            {isOwned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-2.5 h-2.5 text-emerald-600" /> Owned
              </span>
            )}
          </div>

          {/* Book Title: approx 16px semibold navy text, 2-3 lines wrapping */}
          <h2
            id={`book-title-${book.id}`}
            className="text-sm sm:text-base font-semibold text-[#18143F] font-ebook leading-snug line-clamp-2 sm:line-clamp-3 mt-1 hover:text-[#6F42DD] transition-colors break-words"
          >
            <Link
              href={isOwned ? readHref : detailHref}
              className="focus:outline-none focus-visible:underline"
            >
              {displayTitle}
            </Link>
          </h2>

          {/* Author: smaller, visually secondary */}
          <p className="text-xs text-[#756F99] mt-1 truncate">
            by <span className="text-[#4D4775] font-medium">{book.author}</span>
          </p>

          {/* Chapters / Page count (cleanly omitted when unavailable) */}
          {(Boolean(book.total_chapter_count && book.total_chapter_count > 0) || Boolean(book.current_edition?.page_count)) && (
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#756F99] mt-1.5 font-medium flex-wrap">
              {book.total_chapter_count !== undefined && book.total_chapter_count > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#6F42DD]" aria-hidden="true" />
                  {book.total_chapter_count} {book.total_chapter_count === 1 ? 'chapter' : 'chapters'}
                </span>
              )}
              {book.current_edition?.page_count ? (
                <span>
                  {book.total_chapter_count && book.total_chapter_count > 0 ? '• ' : ''}
                  {book.current_edition.page_count} pages
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW: Starting Price (left) + Primary Action (right) ── */}
      {/* Spans the full card width beneath cover and description */}
      <div className="mt-3.5 pt-3 border-t border-[#E8E5F5] flex items-center justify-between gap-3 min-w-0">
        {/* Plan-specific starting price on the left */}
        <div className="min-w-0">
          {isOwned ? (
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-emerald-700">
                Licensed
              </span>
              <span className="text-xs font-medium text-[#4D4775] truncate">
                {ownedPlan === 'full' ? 'Complete (PDF)' : 'Online Reader'}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[11px] text-[#756F99] font-medium block leading-tight">
                {priceLabel}
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg lg:text-xl font-bold text-[#18143F] font-ebook leading-tight">
                  {formattedMinPrice}
                </span>
                {hasDownloadPlan && (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#6F42DD] hidden xs:inline">
                    • PDF included
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary action on the right */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sample button if available */}
          {!isOwned && onOpenSample && book.has_free_sample && (
            <button
              type="button"
              onClick={() => onOpenSample(book)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] text-xs font-semibold text-[#18143F] hover:bg-white hover:border-[#6F42DD]/40 hover:text-[#6F42DD] transition-all cursor-pointer shadow-2xs touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F42DD]"
              title="Read Free Sample"
              aria-label={`Read free sample of ${displayTitle}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#6F42DD] mr-1" aria-hidden="true" />
              <span>Sample</span>
            </button>
          )}

          {/* Main CTA */}
          {isOwned ? (
            <Link href={readHref} tabIndex={-1}>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[44px] px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-[#6F42DD] hover:bg-[#5b33be] text-white transition-all cursor-pointer shadow-xs active:scale-[0.98] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F42DD]"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                <span>Continue reading</span>
              </button>
            </Link>
          ) : (
            <Link href={detailHref} tabIndex={-1}>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[44px] px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-[#6F42DD] hover:bg-[#5b33be] text-white transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-[0.98] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6F42DD]"
              >
                <span>{inCart ? 'In Cart' : 'View book'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
