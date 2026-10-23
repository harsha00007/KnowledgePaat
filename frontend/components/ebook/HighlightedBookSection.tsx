"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  Laptop,
  Smartphone,
  Flame
} from 'lucide-react';
import { useEBookCart } from '@/lib/ebook/cartContext';
import { formatPaise } from '@/lib/ebook/pricingShared';

export interface HighlightedBookData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  author: string;
  category: string;
  reader_role?: string | null;
  cover_image_url?: string | null;
  edition_number?: number;
  version_name?: string;
  description?: string | null;
  pricing?: {
    online_original_price_paise?: number;
    online_price_paise?: number;
    download_original_price_paise?: number;
    download_price_paise?: number;
    currency?: string;
  } | null;
  min_price_paise?: number;
}

export interface HighlightedBookSectionProps {
  book: HighlightedBookData;
  ownership?: {
    isOwned: boolean;
    accessType?: 'online' | 'full' | null;
    editionId?: string;
  };
}

export function HighlightedBookSection({ book, ownership }: HighlightedBookSectionProps) {
  const router = useRouter();
  const { addToCart, hasBook, getBookPlan } = useEBookCart();
  const [selectedPlan, setSelectedPlan] = useState<'read_online' | 'read_download'>('read_download');
  const [isAdding, setIsAdding] = useState(false);

  const inCart = hasBook(book.id);
  const currentCartPlan = getBookPlan(book.id);

  // Authoritative prices
  const currency = book.pricing?.currency || 'INR';
  const onlinePrice = book.pricing?.online_price_paise ?? book.min_price_paise ?? 0;
  const onlineOrig = book.pricing?.online_original_price_paise ?? onlinePrice;
  const downloadPrice = book.pricing?.download_price_paise ?? Math.round(onlinePrice * 1.5);
  const downloadOrig = book.pricing?.download_original_price_paise ?? downloadPrice;

  const onlineHasDiscount = onlineOrig > onlinePrice;
  const downloadHasDiscount = downloadOrig > downloadPrice;

  const handlePlanSelect = async (plan: 'read_online' | 'read_download') => {
    setSelectedPlan(plan);
    setIsAdding(true);
    try {
      await addToCart(book.id, plan);
    } finally {
      setIsAdding(false);
    }
  };

  const isFullOwner = ownership?.isOwned && ownership.accessType === 'full';
  const isOnlineOwner = ownership?.isOwned && ownership.accessType === 'online';

  return (
    <section
      id="spotlight-publication"
      aria-label="Highlighted Publication"
      className="relative overflow-hidden py-14 sm:py-20 bg-gradient-to-b from-[#FAF9FD] via-[#F3EDFC]/60 to-[#FAF9FD] border-y border-purple-100 font-ebook"
    >
      {/* Decorative ambient violet glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header Eyebrow */}
        <div className="flex items-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/15 text-amber-800 border border-amber-300/60">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Spotlight Publication
          </span>
          <span className="text-xs font-semibold text-purple-900/60">
            Edition {book.edition_number || 1} • {book.category}
          </span>
        </div>

        {/* 3-Column Composition: [Large Cover] | [Title, Details & Benefits] | [Two Plan Cards] */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

          {/* ── LEFT: Large 3D Book Display (lg:col-span-4) ── */}
          <div className="lg:col-span-4 flex justify-center lg:justify-start">
            <div className="relative group max-w-[280px] sm:max-w-[320px] w-full">
              {/* Elliptical pedestal shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-8 bg-[#130B24]/20 rounded-full blur-md" />

              {/* 3D Book Container */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-200/80 bg-[#1B0E36] transition-transform duration-300 group-hover:scale-[1.02] aspect-[3/4]"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(19, 11, 36, 0.35), 0 0 0 1px rgba(147, 51, 234, 0.15)'
                }}
              >
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={`Cover of ${book.title}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Rich typographic cover fallback
                  <div className="w-full h-full bg-gradient-to-br from-[#130B24] via-[#241447] to-[#3D256E] p-6 text-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-purple-400/20 pb-3 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FBBF24]">
                          {book.category}
                        </span>
                        <span className="text-[10px] text-purple-300 font-semibold">
                          Ed. {book.edition_number || 1}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold leading-snug text-white">
                        {book.title}
                      </h3>
                      {book.subtitle && (
                        <p className="text-xs text-purple-200 mt-2 line-clamp-3">
                          {book.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-purple-400/20 pt-4">
                      <p className="text-xs font-semibold text-purple-200">{book.author}</p>
                      <p className="text-[10px] text-[#FBBF24] uppercase tracking-wider mt-1">KnowledgePaat Press</p>
                    </div>
                  </div>
                )}

                {/* Realistic spine reflection and page trim */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/15 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-white/30 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── CENTER: Title, Description & Benefits (lg:col-span-4) ── */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Featured Book
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#130B24] leading-tight mt-1">
                {book.title}
              </h2>
              <p className="text-xs sm:text-sm text-purple-900/60 font-medium mt-1">
                by <span className="text-purple-950 font-bold">{book.author}</span>
              </p>
            </div>

            <p className="text-xs sm:text-sm text-purple-950/80 leading-relaxed">
              {book.description ||
                'Comprehensive technical manual designed for real-world software engineers. Master architecture patterns, reliability engineering, and system fundamentals.'}
            </p>

            {/* Platform Benefits Checklist */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-900 font-medium leading-tight">
                  <strong className="text-[#130B24]">Instant Browser Reader:</strong> Clean typography, code syntax highlighting, and night mode.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-900 font-medium leading-tight">
                  <strong className="text-[#130B24]">Device Sync:</strong> Reading progress automatically synced across mobile and desktop.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-900 font-medium leading-tight">
                  <strong className="text-[#130B24]">Edition Revisions:</strong> Verified technical updates and revision errata for the purchased edition.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Access-Plan Cards (lg:col-span-4) ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Plan 1: Read Online */}
            <div
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white ${
                selectedPlan === 'read_online'
                  ? 'border-purple-400 ring-2 ring-purple-300/50 shadow-md'
                  : 'border-purple-100 hover:border-purple-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-[#130B24]">Read Online</h4>
                </div>
                {/* Authoritative Selling Price */}
                <div className="text-right">
                  <span className="text-base sm:text-lg font-bold text-[#130B24]">
                    {formatPaise(onlinePrice, currency)}
                  </span>
                  {onlineHasDiscount && (
                    <span className="block text-[10px] text-purple-400 line-through">
                      {formatPaise(onlineOrig, currency)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-purple-900/70 mb-3">
                Full access to our high-performance web reader with synchronized bookmarks.
              </p>

              {/* Action Button */}
              {isFullOwner || isOnlineOwner ? (
                <Link
                  href="/my-books"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Now In Browser</span>
                </Link>
              ) : inCart && currentCartPlan === 'read_online' ? (
                <Link
                  href="/cart"
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span>In Cart — Proceed to Checkout</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanSelect('read_online')}
                  disabled={isAdding}
                  className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                >
                  Select Read Online
                </button>
              )}
            </div>

            {/* Plan 2: Read + Download (Recommended Gold Treatment) */}
            <div
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white relative ${
                selectedPlan === 'read_download'
                  ? 'border-amber-400 ring-2 ring-amber-300/50 shadow-lg'
                  : 'border-purple-200 hover:border-amber-300 shadow-xs'
              }`}
            >
              {/* Gold "Recommended" badge */}
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#130B24] text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                <Flame className="w-3 h-3 fill-current" />
                <span>Recommended</span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#130B24]">Read + Download</h4>
                  </div>
                </div>
                {/* Authoritative Selling Price */}
                <div className="text-right">
                  <span className="text-base sm:text-lg font-bold text-amber-900">
                    {formatPaise(downloadPrice, currency)}
                  </span>
                  {downloadHasDiscount && (
                    <span className="block text-[10px] text-purple-400 line-through">
                      {formatPaise(downloadOrig, currency)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-purple-900/70 mb-3">
                Everything in Read Online plus watermarked offline PDF downloads and future edition revisions.
              </p>

              {/* Action Button */}
              {isFullOwner ? (
                <Link
                  href="/my-books"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (Owned)</span>
                </Link>
              ) : isOnlineOwner ? (
                <Link
                  href="/my-books"
                  className="btn-gold w-full py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <span>Upgrade to Download Edition</span>
                </Link>
              ) : inCart && currentCartPlan === 'read_download' ? (
                <Link
                  href="/cart"
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span>In Cart — Proceed to Checkout</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanSelect('read_download')}
                  disabled={isAdding}
                  className="btn-gold w-full py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Get Full Access (Online + PDF)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
