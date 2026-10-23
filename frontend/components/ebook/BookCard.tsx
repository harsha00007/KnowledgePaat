"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, ArrowRight, Check, FileText } from 'lucide-react';
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

export function BookCard({ book, isOwned = false, ownedPlan, onOpenSample, onQuickAdd }: BookCardProps) {
  const { hasBook } = useEBookCart();
  const inCart = hasBook(book.id);

  const formattedMinPrice = formatPaise(book.min_price_paise);
  const detailHref = `/e-books/${encodeURIComponent(book.slug || book.id)}`;
  const readHref = `/read/${encodeURIComponent(book.slug || book.id)}`;

  // Determine if there is an active discount on the lowest price
  const pricing = book.current_edition?.pricing;
  const hasDiscount = Boolean(
    book.has_discount ||
    (pricing && (pricing.online_discount_type !== 'none' || pricing.download_discount_type !== 'none'))
  );

  return (
    <article
      className="group relative flex flex-col sm:flex-row bg-white rounded-2xl border border-[#E8E5F5] shadow-[0_4px_20px_-2px_rgba(29,24,85,0.05)] hover:shadow-md hover:border-[#6F42DD]/30 transition-all duration-200 overflow-hidden font-ebook"
      aria-labelledby={`book-title-${book.id}`}
    >
      {/* ── LEFT: Book Cover Presentation ── */}
      <div className="sm:w-44 lg:w-48 sm:shrink-0 bg-gradient-to-br from-[#1D1855]/5 to-[#6F42DD]/5 relative flex items-center justify-center p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-[#E8E5F5]">
        <Link
          href={isOwned ? readHref : detailHref}
          className="block w-full max-w-[130px] sm:max-w-none transition-transform duration-200 group-hover:scale-[1.03]"
        >
          <div className="aspect-[3/4] relative rounded-xl overflow-hidden shadow-sm border border-[#E8E5F5] bg-[#1D1855]">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={`Cover of ${book.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              // Styled deep indigo typographic fallback cover
              <div className="w-full h-full bg-gradient-to-br from-[#1D1855] via-[#241E66] to-[#392E8E] text-white p-3.5 flex flex-col justify-between select-none">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-[#FFCB35] uppercase font-ebook">
                    {book.category}
                  </span>
                  <p className="text-xs font-bold leading-snug line-clamp-3 font-ebook text-white">
                    {book.title}
                  </p>
                </div>
                <div className="border-t border-white/20 pt-2">
                  <p className="text-[10px] text-indigo-200 truncate">{book.author}</p>
                  <p className="text-[8px] text-[#FFCB35] tracking-wider uppercase mt-0.5 font-ebook">
                    KnowledgePaat
                  </p>
                </div>
              </div>
            )}
            {/* Spine lighting effect */}
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
          </div>
        </Link>
      </div>

      {/* ── RIGHT: Book Details & Actions ── */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F8F7FF] text-[#6F42DD] border border-[#E8E5F5]">
              {book.category}
            </span>

            {book.current_edition && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-[#4D4775]">
                Ed. {book.current_edition.edition_number}
              </span>
            )}

            {isOwned ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Owned
              </span>
            ) : book.has_free_sample ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFCB35]/15 text-[#18143F] border border-[#FFCB35]/40">
                <Sparkles className="w-2.5 h-2.5 text-[#F5A000]" /> Sample Available
              </span>
            ) : null}
          </div>

          {/* Title & Author */}
          <div>
            <h3
              id={`book-title-${book.id}`}
              className="text-base sm:text-lg font-bold text-[#18143F] font-ebook leading-snug hover:text-[#6F42DD] transition-colors"
            >
              <Link href={isOwned ? readHref : detailHref}>
                {book.title}
              </Link>
            </h3>
            <p className="text-xs sm:text-sm text-[#4D4775] font-medium mt-0.5">
              by <span className="text-[#18143F] font-semibold">{book.author}</span>
            </p>
          </div>

          {/* Short description */}
          <p className="text-xs sm:text-sm text-[#4D4775] line-clamp-2 leading-relaxed">
            {book.description}
          </p>

          {/* Chapters / metadata stats */}
          <div className="flex items-center gap-3 text-xs text-[#756F99] pt-1 font-medium">
            {book.total_chapter_count !== undefined && book.total_chapter_count > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#6F42DD]" /> {book.total_chapter_count} chapters
              </span>
            )}
            {book.current_edition?.page_count ? (
              <span>• {book.current_edition.page_count} pages</span>
            ) : null}
          </div>
        </div>

        {/* Pricing & Call to Actions */}
        <div className="mt-5 pt-4 border-t border-[#E8E5F5] flex flex-wrap items-center justify-between gap-3">
          {/* Price pill */}
          <div>
            {isOwned ? (
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                  Licensed to you
                </span>
                <span className="text-xs font-medium text-[#4D4775]">
                  {ownedPlan === 'full' ? 'Complete (Online + PDF)' : 'Online Reader Edition'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-medium text-[#4D4775] uppercase tracking-wide">
                  Starting from
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-[#18143F] font-ebook">
                    {formattedMinPrice}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isOwned ? (
              <Link href={readHref}>
                <button
                  type="button"
                  className="btn-ebook-violet inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  <span>Read Online</span>
                </button>
              </Link>
            ) : (
              <>
                {book.has_free_sample && onOpenSample && (
                  <button
                    type="button"
                    onClick={() => onOpenSample(book)}
                    className="inline-flex items-center px-3 py-2 rounded-xl border border-[#E8E5F5] bg-[#F8F7FF] text-xs font-semibold text-[#18143F] hover:bg-white hover:border-[#6F42DD]/40 hover:text-[#6F42DD] transition-all cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#6F42DD]" />
                    <span>Free Sample</span>
                  </button>
                )}

                <Link href={detailHref}>
                  <button
                    type="button"
                    className="btn-gold inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <span>{inCart ? 'In Cart' : 'View Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
