"use client";

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Star, BookOpen, ArrowRight } from 'lucide-react';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { formatPaise } from '@/lib/ebook/pricingShared';

export interface FeaturedBookData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  author: string;
  description?: string | null;
  category: string;
  cover_image_url?: string | null;
  min_price_paise?: number;
  rating?: number | null;
  review_count?: number | null;
  pricing?: {
    online_original_price_paise?: number;
    online_price_paise?: number;
    download_original_price_paise?: number;
    download_price_paise?: number;
    currency?: string;
  } | null;
  has_discount?: boolean;
}

interface FeaturedBookCardProps {
  book: FeaturedBookData;
  isOwned?: boolean;
  onQuickAdd?: (book: FeaturedBookData) => void;
}

export function FeaturedBookCard({ book, isOwned = false, onQuickAdd }: FeaturedBookCardProps) {
  const { hasBook, addToCart } = useEBookCart();
  const inCart = hasBook(book.id);

  // Authoritative minimum selling price & original price calculation
  const currency = book.pricing?.currency || 'INR';
  const onlinePrice = book.pricing?.online_price_paise ?? book.min_price_paise ?? 0;
  const onlineOrig = book.pricing?.online_original_price_paise ?? onlinePrice;
  const hasDiscount = Boolean(onlineOrig > onlinePrice);

  const formattedPrice = formatPaise(onlinePrice, currency);
  const formattedOrigPrice = hasDiscount ? formatPaise(onlineOrig, currency) : null;
  const detailHref = `/e-books/${encodeURIComponent(book.slug || book.id)}`;

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart || isOwned) return;

    if (onQuickAdd) {
      onQuickAdd(book);
    } else {
      await addToCart(book.id, 'read_online');
    }
  };

  return (
    <article
      className="group relative flex flex-row items-center gap-3.5 p-3 sm:p-3.5 bg-white rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200 overflow-hidden font-ebook"
      aria-labelledby={`featured-book-${book.id}`}
    >
      {/* ── LEFT: Book Cover Thumbnail with 3D Treatment ── */}
      <Link
        href={detailHref}
        className="block shrink-0 w-16 h-22 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-[#1B0E36] relative shadow-sm border border-purple-200/60 transition-transform duration-200 group-hover:scale-[1.03]"
        aria-label={`View details for ${book.title}`}
      >
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          // Rich purple typographic book cover fallback
          <div className="w-full h-full bg-gradient-to-br from-[#130B24] via-[#241447] to-[#3D256E] text-white p-2 flex flex-col justify-between select-none">
            <span className="text-[7px] font-bold uppercase tracking-wider text-[#FBBF24] truncate">
              {book.category}
            </span>
            <p className="text-[9px] font-bold leading-tight line-clamp-3 text-white">
              {book.title}
            </p>
            <p className="text-[7px] text-purple-300 truncate">
              {book.author}
            </p>
          </div>
        )}

        {/* Subtle spine glare effect */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
      </Link>

      {/* ── RIGHT: Content, Author, Genuine Rating & Price ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        <div>
          {/* Category & Genuine Rating */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 truncate">
              {book.category}
            </span>

            {/* Display rating only if genuine data exists */}
            {typeof book.rating === 'number' && book.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{book.rating.toFixed(1)}</span>
                {typeof book.review_count === 'number' && book.review_count > 0 && (
                  <span className="text-[9px] text-purple-400">({book.review_count})</span>
                )}
              </span>
            )}
          </div>

          {/* Book Title */}
          <h3
            id={`featured-book-${book.id}`}
            className="text-xs sm:text-sm font-semibold text-[#130B24] leading-snug line-clamp-1 group-hover:text-purple-800 transition-colors"
          >
            <Link href={detailHref}>
              {book.title}
            </Link>
          </h3>

          {/* Author */}
          <p className="text-[11px] text-purple-900/60 font-medium truncate mt-0.5">
            by <span className="text-purple-950 font-semibold">{book.author}</span>
          </p>

          {/* Short description */}
          {book.description && (
            <p className="text-[11px] text-purple-950/70 line-clamp-2 leading-relaxed mt-1">
              {book.description}
            </p>
          )}
        </div>

        {/* Bottom: Authoritative Price + Cart Button */}
        <div className="mt-2.5 pt-2 border-t border-purple-50 flex items-center justify-between gap-2">
          {/* Price with strikethrough if discounted */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-[#130B24]">
              {formattedPrice}
            </span>
            {hasDiscount && formattedOrigPrice && (
              <span className="text-[10px] text-purple-400 line-through">
                {formattedOrigPrice}
              </span>
            )}
          </div>

          {/* Cart / Owned State Action */}
          <div>
            {isOwned ? (
              <Link
                href="/my-books"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200"
              >
                <BookOpen className="w-3 h-3" />
                <span>Read</span>
              </Link>
            ) : inCart ? (
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-300"
              >
                <Check className="w-3 h-3 text-amber-600" />
                <span>In Cart</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCartClick}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF5FF] hover:bg-[#F3E8FF] text-purple-800 border border-purple-200 text-[11px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                aria-label={`Add ${book.title} to cart`}
              >
                <ShoppingCart className="w-3 h-3 text-purple-600" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
