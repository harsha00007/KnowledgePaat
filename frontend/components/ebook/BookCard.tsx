"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Sparkles, ArrowRight, ShoppingCart, Check, FileText } from 'lucide-react';
import { Button } from '@/components/Button';
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
  } | null;
}

export interface BookCardProps {
  book: BookCardData;
  onOpenSample?: (book: BookCardData) => void;
  onQuickAdd?: (book: BookCardData) => void;
}

export function BookCard({ book, onOpenSample, onQuickAdd }: BookCardProps) {
  const { hasBook, getBookPlan } = useEBookCart();
  const inCart = hasBook(book.id);
  const selectedPlan = getBookPlan(book.id);

  const formattedMinPrice = formatPaise(book.min_price_paise);
  const detailHref = `/e-books/${encodeURIComponent(book.slug || book.id)}`;

  return (
    <article
      className="group relative flex flex-col sm:flex-row bg-white rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200 overflow-hidden"
      aria-labelledby={`book-title-${book.id}`}
    >
      {/* ── LEFT: Book Cover Presentation ── */}
      <div className="sm:w-48 sm:shrink-0 bg-gradient-to-br from-[#1C1037]/5 to-purple-100/40 relative flex items-center justify-center p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-purple-100/70">
        <Link href={detailHref} className="block w-full max-w-[140px] sm:max-w-none transition-transform duration-200 group-hover:scale-[1.03]">
          <div className="aspect-[3/4] relative rounded-xl overflow-hidden shadow-sm border border-purple-200/60 bg-[#1B0E36]">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={`Cover of ${book.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              // Styled deep purple typographic fallback cover
              <div className="w-full h-full bg-gradient-to-br from-[#130B24] via-[#241447] to-[#3D256E] text-white p-3.5 flex flex-col justify-between select-none">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-[#FBBF24] uppercase font-display">
                    {book.category}
                  </span>
                  <p className="text-xs font-bold leading-snug line-clamp-3 font-serif text-white">
                    {book.title}
                  </p>
                </div>
                <div className="border-t border-purple-400/20 pt-2">
                  <p className="text-[10px] text-purple-200 truncate">{book.author}</p>
                  <p className="text-[8px] text-[#FBBF24] tracking-wider uppercase mt-0.5 font-display">KnowledgePaat</p>
                </div>
              </div>
            )}
            {/* Spine lighting effect */}
            <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
          </div>
        </Link>
      </div>

      {/* ── RIGHT: Book Details & Actions ── */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
              {book.category}
            </span>

            {book.current_edition && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-purple-900/70">
                Ed. {book.current_edition.edition_number}
              </span>
            )}

            {book.has_free_sample && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-800 border border-amber-400/30">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Sample Available
              </span>
            )}
          </div>

          {/* Title & Author */}
          <div>
            <h2 id={`book-title-${book.id}`} className="text-lg sm:text-xl font-bold text-[#130B24] font-serif leading-snug hover:text-purple-800 transition-colors">
              <Link href={detailHref}>
                {book.title}
              </Link>
            </h2>
            <p className="text-xs sm:text-sm text-purple-900/60 font-medium mt-0.5">
              by <span className="text-purple-950 font-semibold">{book.author}</span>
            </p>
          </div>

          {/* Short description */}
          <p className="text-xs sm:text-sm text-purple-950/75 line-clamp-2 leading-relaxed">
            {book.description}
          </p>

          {/* Chapters / metadata stats */}
          <div className="flex items-center gap-3 text-xs text-purple-400 pt-1">
            {book.total_chapter_count !== undefined && book.total_chapter_count > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-400" /> {book.total_chapter_count} chapters
              </span>
            )}
            {book.current_edition?.page_count ? (
              <span>• {book.current_edition.page_count} pages</span>
            ) : null}
          </div>
        </div>

        {/* Pricing & Call to Actions */}
        <div className="mt-5 pt-4 border-t border-purple-50 flex flex-wrap items-center justify-between gap-3">
          {/* Price pill */}
          <div>
            <span className="text-[11px] font-medium text-purple-600/70 uppercase tracking-wide">Starting from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#130B24] font-display">
                {formattedMinPrice}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {book.has_free_sample && onOpenSample && (
              <button
                type="button"
                onClick={() => onOpenSample(book)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1 text-purple-600" />
                <span>Free Sample</span>
              </button>
            )}

            <Link href={detailHref}>
              <button
                type="button"
                className="btn-gold inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

