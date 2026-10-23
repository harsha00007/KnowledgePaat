"use client";

import React from 'react';
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

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Engineering': 'from-[#1D1855] via-[#2D2175] to-[#6F42DD]',
  'System Design': 'from-[#0B1D3A] via-[#153463] to-[#0284C7]',
  'Career Prep': 'from-[#281144] via-[#481E7B] to-[#B45309]',
  'Quality Assurance': 'from-[#062822] via-[#0C4E43] to-[#059669]',
  'DevOps & Cloud': 'from-[#111827] via-[#1E293B] to-[#4338CA]',
  'Frontend & Mobile': 'from-[#1A1640] via-[#35256D] to-[#9333EA]',
};

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

export function BookCard({ book, isOwned = false, ownedPlan, onOpenSample, onQuickAdd: _onQuickAdd }: BookCardProps) {
  const { hasBook } = useEBookCart();
  const inCart = hasBook(book.id);

  const displayTitle = cleanBookTitle(book.title);
  const formattedMinPrice = formatPaise(book.min_price_paise);
  const detailHref = `/e-books/${encodeURIComponent(book.slug || book.id)}`;
  const readHref = `/read/${encodeURIComponent(book.slug || book.id)}`;

  const fallbackGradient = CATEGORY_GRADIENTS[book.category] || 'from-[#1D1855] via-[#241E66] to-[#392E8E]';

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
      className="group relative flex flex-row items-stretch bg-white rounded-xl sm:rounded-2xl border border-[#E8E5F5] shadow-[0_4px_20px_-2px_rgba(29,24,85,0.05)] hover:shadow-md hover:border-[#6F42DD]/30 transition-all duration-200 overflow-hidden font-ebook"
      aria-labelledby={`book-title-${book.id}`}
    >
      {/* ── LEFT: Book Cover Presentation (Compact 72-96px on phone, scaling up on tablet/desktop) ── */}
      <div className="w-20 xs:w-24 sm:w-32 md:w-36 lg:w-44 shrink-0 bg-gradient-to-br from-[#1D1855]/5 to-[#6F42DD]/5 relative flex items-center justify-center p-2 xs:p-2.5 sm:p-4 lg:p-5 border-r border-[#E8E5F5]">
        <Link
          href={isOwned ? readHref : detailHref}
          className="block w-full transition-transform duration-200 group-hover:scale-[1.03]"
          aria-label={`View ${displayTitle}`}
        >
          <div className="aspect-[3/4] relative rounded-lg sm:rounded-xl overflow-hidden shadow-xs border border-[#E8E5F5] bg-[#1D1855]">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={`Cover of ${displayTitle}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              // Styled category-themed typographic fallback cover
              <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient} text-white p-2 sm:p-3.5 flex flex-col justify-between select-none`}>
                <div className="space-y-0.5 sm:space-y-1">
                  <span className="text-[11px] font-bold tracking-wide text-[#FFCB35] font-ebook uppercase">
                    {book.category}
                  </span>
                  <p className="text-xs sm:text-sm font-bold leading-tight sm:leading-snug font-ebook text-white break-words">
                    {displayTitle}
                  </p>
                </div>
                <div className="border-t border-white/20 pt-1.5 sm:pt-2">
                  <p
                    className="text-xs text-indigo-100 font-medium line-clamp-2 leading-tight break-words"
                    title={book.author}
                  >
                    {book.author}
                  </p>
                  <p className="text-xs text-[#FFCB35] tracking-wide mt-0.5 font-ebook hidden xs:block">
                    KnowledgePaat
                  </p>
                </div>
              </div>
            )}
            {/* Spine lighting effect */}
            <div className="absolute inset-y-0 left-0 w-2 sm:w-2.5 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
          </div>
        </Link>
      </div>

      {/* ── RIGHT: Book Details & Actions ── */}
      <div className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0 flex flex-col justify-between">
        <div>
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F8F7FF] text-[#6F42DD] border border-[#E8E5F5] truncate max-w-[120px] sm:max-w-none">
              {book.category}
            </span>

            {book.current_edition && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-[#4D4775]">
                Ed. {book.current_edition.edition_number}
              </span>
            )}

            {isOwned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Owned
              </span>
            )}
          </div>

          {/* Title & Author */}
          <div className="mt-1 sm:mt-1.5">
            <h2
              id={`book-title-${book.id}`}
              className="text-sm sm:text-base lg:text-lg font-bold text-[#18143F] font-ebook leading-snug line-clamp-2 hover:text-[#6F42DD] transition-colors"
            >
              <Link href={isOwned ? readHref : detailHref}>
                {displayTitle}
              </Link>
            </h2>
            <p className="text-xs sm:text-sm text-[#4D4775] font-medium truncate mt-0.5">
              by <span className="text-[#18143F] font-semibold">{book.author}</span>
            </p>
          </div>

          {/* Short description - condensed on mobile */}
          <p className="text-xs sm:text-sm text-[#4D4775] line-clamp-2 leading-relaxed mt-1 hidden xs:line-clamp-2">
            {book.description}
          </p>

          {/* Supporting metadata: Chapters and page count (omit cleanly if unavailable, no placeholder text) */}
          {(Boolean(book.total_chapter_count && book.total_chapter_count > 0) || Boolean(book.current_edition?.page_count)) && (
            <div className="flex items-center gap-2 text-xs text-[#756F99] mt-1 font-medium">
              {book.total_chapter_count !== undefined && book.total_chapter_count > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#6F42DD]" aria-hidden="true" />
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

        {/* Pricing & Call to Actions */}
        <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-[#E8E5F5] flex flex-wrap items-end justify-between gap-2 pb-0.5">
          {/* Price pill */}
          <div className="min-w-0">
            {isOwned ? (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-emerald-700">
                  Licensed
                </span>
                <span className="text-xs sm:text-sm font-medium text-[#4D4775] truncate">
                  {ownedPlan === 'full' ? 'Complete (PDF)' : 'Online Reader'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs text-[#4D4775] font-medium block">
                  {priceLabel}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-xl lg:text-2xl font-black text-[#18143F] font-ebook leading-none">
                    {formattedMinPrice}
                  </span>
                  {hasDownloadPlan && (
                    <span className="text-[11px] font-semibold text-[#6F42DD] hidden sm:inline">
                      • PDF included
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isOwned ? (
              <Link href={readHref}>
                <button
                  type="button"
                  className="btn-ebook-violet inline-flex items-center min-h-[44px] px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl cursor-pointer touch-manipulation"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  <span>Continue reading</span>
                </button>
              </Link>
            ) : (
              <>
                {onOpenSample && book.has_free_sample && (
                  <button
                    type="button"
                    onClick={() => onOpenSample(book)}
                    className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] text-xs font-semibold text-[#18143F] hover:bg-white hover:border-[#6F42DD]/40 hover:text-[#6F42DD] transition-all cursor-pointer shadow-2xs touch-manipulation"
                    title="Read Free Sample"
                    aria-label={`Read free sample of ${displayTitle}`}
                  >
                    <BookOpen className="w-4 h-4 text-[#6F42DD] mr-1.5" aria-hidden="true" />
                    <span>Sample</span>
                  </button>
                )}

                <Link href={detailHref}>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center min-h-[44px] px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-[#6F42DD] hover:bg-[#5b33be] text-white transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-[0.98] touch-manipulation"
                  >
                    <span>{inCart ? 'In Cart' : 'View book'}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
