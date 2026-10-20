"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Sparkles,
  Download,
  Laptop,
  CheckCircle2,
  ShoppingCart,
  Check,
  ChevronRight,
  FileText,
  Clock,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/Button';
import { FreeSampleDrawer } from '@/components/ebook/FreeSampleDrawer';
import { useEBookCart, EBookPlan } from '@/lib/ebook/cartContext';
import { formatPaise } from '@/lib/ebook/pricingShared';

interface BookDetailClientProps {
  book: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    author: string;
    description: string;
    category: string;
    reader_role?: string | null;
    language: string;
    cover_image_url?: string | null;
    updated_at: string;
  };
  edition: {
    id: string;
    edition_number: number;
    version_name: string;
    page_count?: number | null;
    price_read_online_paise: number;
    price_read_download_paise: number;
    price_upgrade_pdf_paise: number;
    currency: string;
    published_at?: string | null;
    pricing?: {
      online_original_price_paise?: number;
      online_discount_type?: string;
      online_discount_value?: number;
      online_price_paise?: number;
      download_original_price_paise?: number;
      download_discount_type?: string;
      download_discount_value?: number;
      download_price_paise?: number;
      upgrade_original_price_paise?: number;
      upgrade_discount_type?: string;
      upgrade_discount_value?: number;
      upgrade_price_paise?: number;
    } | null;
  };
  tableOfContents: Array<{
    id: string;
    chapter_index: number;
    title: string;
    slug: string;
    word_count: number;
    is_free_sample: boolean;
  }>;
  firstSampleChapterId: string | null;
}

export function BookDetailClient({
  book,
  edition,
  tableOfContents,
  firstSampleChapterId,
}: BookDetailClientProps) {
  const router = useRouter();
  const { addToCart, hasBook, getBookPlan } = useEBookCart();

  const [selectedPlan, setSelectedPlan] = useState<EBookPlan>(
    (getBookPlan(book.id) as EBookPlan) || 'read_download'
  );
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Sample Drawer state
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);
  const [selectedSampleChapterId, setSelectedSampleChapterId] = useState<string | null>(firstSampleChapterId);

  const onlinePricing = edition.pricing;
  const hasOnlineDiscount = Boolean(
    onlinePricing && 
    onlinePricing.online_discount_type !== 'none' && 
    (onlinePricing.online_original_price_paise || 0) > edition.price_read_online_paise
  );
  const onlineOriginalRupees = hasOnlineDiscount && (onlinePricing?.online_original_price_paise || 0) > edition.price_read_online_paise
    ? formatPaise(onlinePricing!.online_original_price_paise!, edition.currency) 
    : null;

  const hasDownloadDiscount = Boolean(
    onlinePricing && 
    onlinePricing.download_discount_type !== 'none' && 
    (onlinePricing.download_original_price_paise || 0) > edition.price_read_download_paise
  );
  const downloadOriginalRupees = hasDownloadDiscount && (onlinePricing?.download_original_price_paise || 0) > edition.price_read_download_paise
    ? formatPaise(onlinePricing!.download_original_price_paise!, edition.currency) 
    : null;

  const priceOnline = formatPaise(edition.price_read_online_paise, edition.currency);
  const priceDownload = formatPaise(edition.price_read_download_paise, edition.currency);
  const priceUpgrade = formatPaise(edition.price_upgrade_pdf_paise, edition.currency);

  const inCart = hasBook(book.id);
  const currentCartPlan = getBookPlan(book.id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    await addToCart(book.id, selectedPlan);
    setIsAdding(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  };

  const handleOpenSampleChapter = (chapterId: string) => {
    setSelectedSampleChapterId(chapterId);
    setSampleDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#130B24] pb-24">
      {/* ── BREADCRUMB ────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-purple-100 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 text-xs font-semibold text-purple-900/60 font-display">
            <li>
              <Link href="/" className="hover:text-purple-900 transition-colors">Home</Link>
            </li>
            <ChevronRight className="w-3.5 h-3.5 text-purple-300" />
            <li>
              <Link href="/e-books" className="hover:text-purple-900 transition-colors">eBooks</Link>
            </li>
            <ChevronRight className="w-3.5 h-3.5 text-purple-300" />
            <li className="text-[#130B24] font-bold truncate max-w-xs sm:max-w-md" aria-current="page">
              {book.title}
            </li>
          </ol>
        </div>
      </nav>

      {/* ── MAIN PRODUCT HEADER & PURCHASING SECTION ──────────────── */}
      <section className="bg-white border-b border-purple-100 pt-8 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Cover Presentation (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-none">
                <div className="aspect-[3/4] relative rounded-2xl overflow-hidden shadow-lg border border-slate-300/80 bg-white">
                  {book.cover_image_url ? (
                    <img
                      src={book.cover_image_url}
                      alt={`Cover of ${book.title}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0B1D3A] via-[#163668] to-[#2563EB] text-white p-6 flex flex-col justify-between select-none">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold tracking-widest text-[#00C2CB] uppercase font-display">
                          {book.category}
                        </span>
                        <h2 className="text-xl font-bold leading-snug font-display">
                          {book.title}
                        </h2>
                      </div>
                      <div className="border-t border-white/20 pt-3">
                        <p className="text-xs text-slate-200 font-semibold">{book.author}</p>
                        <p className="text-[9px] text-white/60 tracking-wider uppercase mt-1">KnowledgePaat Technical Library</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Free Sample Button below cover */}
                {firstSampleChapterId && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleOpenSampleChapter(firstSampleChapterId)}
                    className="w-full mt-4 font-semibold text-xs sm:text-sm shadow-2xs hover:border-[#2563EB] hover:bg-blue-50/50"
                  >
                    <BookOpen className="w-4 h-4 mr-2 text-[#2563EB]" />
                    Read Free Sample Chapter
                  </Button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Book Metadata & Access Plans (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200 uppercase tracking-wider font-display">
                  {book.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  Edition {edition.edition_number} ({edition.version_name})
                </span>
                {edition.page_count && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {edition.page_count} Pages
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 uppercase">
                  {book.language}
                </span>
              </div>

              {/* Title & Author */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-[#130B24] tracking-tight leading-tight">
                  {book.title}
                </h1>
                {book.subtitle && (
                  <p className="text-base sm:text-lg text-purple-900/70 font-medium font-sans">
                    {book.subtitle}
                  </p>
                )}
                <p className="text-sm sm:text-base text-purple-900/60 pt-1">
                  Authored by <strong className="text-[#130B24] font-bold">{book.author}</strong>
                </p>
              </div>

              {/* Intended Audience */}
              {book.reader_role && (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs sm:text-sm text-purple-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#130B24]">Intended Audience: </span>
                    <span>{book.reader_role}</span>
                  </div>
                </div>
              )}

              {/* Short summary */}
              <p className="text-sm sm:text-base text-purple-950/80 leading-relaxed font-sans">
                {book.description}
              </p>

              {/* ── ACCESS PLAN SELECTION BOX ──────────────────────── */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-50/50 via-white to-amber-50/30 border border-purple-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-[#130B24] font-display flex items-center gap-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-purple-600" />
                    Choose Your Access Plan
                  </h3>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Lifetime Access
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* OPTION 1: Read Online Only */}
                  <label
                    className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === 'read_online'
                        ? 'border-purple-500 bg-white shadow-sm ring-1 ring-purple-300'
                        : 'border-purple-100 bg-white/70 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_plan"
                      value="read_online"
                      checked={selectedPlan === 'read_online'}
                      onChange={() => setSelectedPlan('read_online')}
                      className="sr-only"
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 font-display">
                          Online Reader
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'read_online' ? 'border-purple-600 bg-purple-600' : 'border-purple-200'
                        }`}>
                          {selectedPlan === 'read_online' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        {onlineOriginalRupees && (
                          <span className="text-sm font-semibold text-purple-400 line-through">
                            {onlineOriginalRupees}
                          </span>
                        )}
                        <span className="text-2xl font-black text-[#130B24] font-display">{priceOnline}</span>
                        {hasOnlineDiscount && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {onlinePricing?.online_discount_type === 'percentage' 
                              ? `${onlinePricing.online_discount_value}% OFF`
                              : `SAVE ${formatPaise(onlinePricing?.online_discount_value || 0, edition.currency)}`}
                          </span>
                        )}
                        <span className="text-xs text-purple-400 font-medium">one-time</span>
                      </div>
                      <p className="text-xs text-purple-900/70 leading-snug">
                        Website online reading on any device. Note: Does not include PDF download.
                      </p>
                    </div>
                  </label>

                  {/* OPTION 2: Read + Download (Recommended) */}
                  <label
                    className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === 'read_download'
                        ? 'border-amber-400 bg-white shadow-md ring-2 ring-amber-300/40'
                        : 'border-purple-100 bg-white/70 hover:border-amber-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_plan"
                      value="read_download"
                      checked={selectedPlan === 'read_download'}
                      onChange={() => setSelectedPlan('read_download')}
                      className="sr-only"
                    />
                    {/* Value Badge */}
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-[#130B24] shadow-xs font-display uppercase tracking-wider">
                      Most Popular
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 font-display">
                          Read + Download
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'read_download' ? 'border-amber-500 bg-amber-500' : 'border-purple-200'
                        }`}>
                          {selectedPlan === 'read_download' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        {downloadOriginalRupees && (
                          <span className="text-sm font-semibold text-purple-400 line-through">
                            {downloadOriginalRupees}
                          </span>
                        )}
                        <span className="text-2xl font-black text-amber-950 font-display">{priceDownload}</span>
                        {hasDownloadDiscount && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {onlinePricing?.download_discount_type === 'percentage'
                              ? `${onlinePricing.download_discount_value}% OFF`
                              : `SAVE ${formatPaise(onlinePricing?.download_discount_value || 0, edition.currency)}`}
                          </span>
                        )}
                        <span className="text-xs text-purple-400 font-medium">one-time</span>
                      </div>
                      <p className="text-xs text-purple-900/70 leading-snug">
                        Website online reading PLUS downloadable, complete PDF edition for offline studying.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Upgrade explanation */}
                <p className="text-xs text-purple-700/70 flex items-center gap-1.5 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span>
                    Online buyers can add offline PDF access at any time later for <strong>+{priceUpgrade}</strong>.
                  </span>
                </p>

                {/* Actions: Add to Cart & View Cart */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={handleAddToCart}
                    className="btn-gold w-full sm:w-auto px-8 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Cart!</span>
                      </>
                    ) : inCart ? (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Update Cart Plan ({selectedPlan === 'read_download' ? priceDownload : priceOnline})</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Add to Cart — {selectedPlan === 'read_download' ? priceDownload : priceOnline}</span>
                      </>
                    )}
                  </button>

                  {inCart && (
                    <Link href="/cart" className="w-full sm:w-auto">
                      <button
                        type="button"
                        className="w-full px-6 py-3 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-900 font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>View in Cart</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── TABLE OF CONTENTS SECTION ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B1D3A] font-display">
                Table of Contents
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                {tableOfContents.length} verified chapters in Edition {edition.edition_number}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {tableOfContents.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 font-display">
                    {ch.chapter_index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1D3A] truncate font-display">
                      {ch.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{ch.word_count} words</span>
                      <span>•</span>
                      <span>~{Math.max(1, Math.ceil(ch.word_count / 200))} min</span>
                    </div>
                  </div>
                </div>

                {ch.is_free_sample ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSampleChapter(ch.id)}
                    className="shrink-0 text-xs font-semibold text-[#2563EB] border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    Read Free Sample
                  </Button>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-lg bg-slate-50">
                    Purchasers Only
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Sample Drawer Modal */}
      <FreeSampleDrawer
        isOpen={sampleDrawerOpen}
        onClose={() => setSampleDrawerOpen(false)}
        bookId={book.slug || book.id}
        initialChapterId={selectedSampleChapterId}
        bookTitle={book.title}
        onSelectPlan={async (plan) => {
          setSelectedPlan(plan);
          await addToCart(book.id, plan);
          router.push('/cart');
        }}
      />
    </div>
  );
}
