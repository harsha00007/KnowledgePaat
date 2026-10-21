"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Info,
  Receipt,
  X,
  CreditCard,
  Lock,
  Smartphone,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { CustomerOwnedBook, EBookAccessPlan, EBookUpgradeQuote } from '@/types/ebook';
import {
  loadRazorpayCheckoutScript,
  openKnowledgePaatRazorpayCheckout,
  RAZORPAY_UPI_CHECKOUT_CONFIG,
} from '@/lib/razorpayClient';

export function MyBooksClient() {
  const router = useRouter();
  const { isFeatureEnabled } = useFeatureFlags();

  const [books, setBooks] = useState<CustomerOwnedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'all' | EBookAccessPlan>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [upgradeModalBook, setUpgradeModalBook] = useState<CustomerOwnedBook | null>(null);

  // Download state feedback
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ entitlementId: string; message: string } | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<{ entitlementId: string; filename: string } | null>(null);

  const fetchLibrary = async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch('/api/ebooks/my-books', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (res.status === 401) {
        router.push('/login?redirectTo=/my-books');
        return;
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load your digital library.');
        setErrorCode(json.code || null);
        return;
      }

      setBooks(json.books || []);
    } catch (err: any) {
      setError(err?.message || 'Network error while retrieving your library.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Filter books by plan and search query
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesPlan =
        selectedPlanFilter === 'all' ? true : book.plan === selectedPlanFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q);

      return matchesPlan && matchesSearch;
    });
  }, [books, selectedPlanFilter, searchQuery]);

  // Client-side / URL Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page when search or plan filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedBooks = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, safePage, PAGE_SIZE]);

  const readerEnabled = isFeatureEnabled('ebook_reader');
  const pdfDownloadEnabled = isFeatureEnabled('ebook_pdf_download');

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Authorised PDF Download Handler with duplicate prevention and error recovery
  const handleDownload = async (book: CustomerOwnedBook) => {
    if (downloadingId) return; // avoid duplicate requests
    setDownloadingId(book.entitlementId);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const res = await fetch(`/api/ebooks/${book.bookId}/download?editionId=${book.editionId}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.downloadUrl) {
        setDownloadError({
          entitlementId: book.entitlementId,
          message: data.error || 'Failed to generate secure download link. Please contact support.',
        });
        return;
      }

      // Trigger file download via temporary anchor
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename || `${book.slug || 'ebook'}-edition-${book.editionNumber}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess({
        entitlementId: book.entitlementId,
        filename: data.filename || 'PDF',
      });
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      setDownloadError({
        entitlementId: book.entitlementId,
        message: err.message || 'Network error initiating download.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Grid Skeleton (2 cards per row on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex gap-5 animate-pulse"
              >
                <div className="w-28 sm:w-32 aspect-[3/4] bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="h-8 w-full bg-slate-100 rounded-lg mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Unverified Email Warning State
  if (errorCode === 'EMAIL_NOT_VERIFIED') {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600 mb-5">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1D3A] mb-2 font-display">
            Email Verification Required
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Please verify your email address to access your eBook digital library and reading entitlements.
          </p>
          <div className="space-y-3">
            <Button
              onClick={fetchLibrary}
              variant="primary"
              className="w-full justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              I&apos;ve Verified My Email
            </Button>
            <Link href="/login?redirectTo=/my-books" className="block w-full">
              <Button variant="outline" className="w-full justify-center">
                Sign In With Another Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error State with Retry
  if (error) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600 mb-5">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1D3A] mb-2 font-display">
            Failed to Load Library
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error}
          </p>
          <Button
            onClick={fetchLibrary}
            variant="primary"
            className="w-full justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#FAF9FD] text-[#130B24] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-800 border border-amber-400/30 font-display">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                Customer Digital Shelf
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#130B24] tracking-tight">
              My Books
            </h1>
            <p className="text-xs sm:text-sm text-purple-900/60 mt-1">
              Your owned technical books, permanent reading access, and edition library.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOrdersModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-200 bg-white text-purple-900 hover:text-white hover:bg-purple-900 transition-colors shadow-2xs cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Order History</span>
            </button>
            <Link href="/e-books#catalogue">
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                <span>Browse Bookstore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Filter Bar & Search */}
        {books.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Plan Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedPlanFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap font-display ${
                  selectedPlanFilter === 'all'
                    ? 'bg-[#130B24] text-[#FBBF24] shadow-2xs border border-amber-400/30'
                    : 'text-purple-900/70 hover:bg-purple-50 hover:text-purple-950'
                }`}
              >
                All Books ({books.length})
              </button>
              <button
                onClick={() => setSelectedPlanFilter('read_online')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap font-display ${
                  selectedPlanFilter === 'read_online'
                    ? 'bg-[#130B24] text-[#FBBF24] shadow-2xs border border-amber-400/30'
                    : 'text-purple-900/70 hover:bg-purple-50 hover:text-purple-950'
                }`}
              >
                Read Online ({books.filter((b) => b.plan === 'read_online').length})
              </button>
              <button
                onClick={() => setSelectedPlanFilter('read_download')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap font-display ${
                  selectedPlanFilter === 'read_download'
                    ? 'bg-[#130B24] text-[#FBBF24] shadow-2xs border border-amber-400/30'
                    : 'text-purple-900/70 hover:bg-purple-50 hover:text-purple-950'
                }`}
              >
                Read + Download ({books.filter((b) => b.plan === 'read_download').length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-purple-50/40 text-[#130B24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FBBF24]/30 focus:border-[#FBBF24] transition-all"
              />
            </div>
          </div>
        )}

        {/* 4. Empty State: No Books Purchased */}
        {books.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-10 sm:p-16 text-center max-w-xl mx-auto shadow-2xs">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50/80 border border-blue-100 text-[#2563EB] mb-5">
              <BookOpen className="h-10 w-10 stroke-[1.8]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B1D3A] mb-2 font-display tracking-tight">
              Your Library is Empty
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t purchased any eBooks yet. Explore our curated technical collection to start reading and build your digital shelf.
            </p>
            <Link href="/e-books">
              <Button variant="primary" size="lg" className="shadow-brand">
                <span>Explore Technical Bookstore</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : filteredBooks.length === 0 ? (
          /* Empty Search Results */
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center max-w-md mx-auto shadow-2xs">
            <p className="text-sm text-slate-600 mb-4 font-medium">
              No books in your library match your current filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPlanFilter('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
          {/* 5. Library Grid: Exactly 2 cards per row on desktop (md:grid-cols-2), single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedBooks.map((book) => {
              const isDownload = book.plan === 'read_download';
              const isRevoked = !book.isActive;
              const hasHistoricalNotice = !book.isCurrentEdition || book.editionStatus !== 'published';

              return (
                <div
                  key={book.entitlementId}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col sm:flex-row gap-5 relative overflow-hidden group"
                >
                  {/* Left: Book Cover */}
                  <div className="w-full sm:w-32 aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl shrink-0 overflow-hidden relative border border-slate-200/80 flex items-center justify-center self-start">
                    {book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-1 stroke-[1.5]" />
                        <span className="text-[10px] text-slate-500 font-semibold line-clamp-2">
                          {book.title}
                        </span>
                      </div>
                    )}

                    {/* Historical Edition Label Overlay if applicable */}
                    {hasHistoricalNotice && (
                      <div className="absolute top-1.5 left-1.5 right-1.5 bg-amber-900/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center">
                        Historical Edition
                      </div>
                    )}
                  </div>

                  {/* Right: Metadata & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {/* Edition Badge */}
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {book.versionName}
                        </span>

                        {/* Plan Tier Badge */}
                        {isDownload ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            <Download className="w-3 h-3" />
                            Read + Download
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] border border-blue-200">
                            <BookOpen className="w-3 h-3" />
                            Read Online
                          </span>
                        )}

                        {/* Revoked Status Badge */}
                        {isRevoked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Access Revoked
                          </span>
                        )}

                        {/* Grant Type Badge if complimentary */}
                        {book.grantType === 'complimentary' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3 h-3" />
                            Complimentary
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-base sm:text-lg text-[#0B1D3A] tracking-tight line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
                        {book.title}
                      </h3>

                      {/* Author */}
                      <p className="text-xs text-slate-500 font-medium mt-0.5 mb-2">
                        By {book.author}
                      </p>

                      {/* Reading Progress: Only displayed if real progress records exist */}
                      {book.readingProgress && book.readingProgress.scrollPercent > 0 ? (
                        <div className="mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-slate-600 font-medium">Reading Progress</span>
                            <span className="font-bold text-[#2563EB]">
                              {Math.round(book.readingProgress.scrollPercent)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#2563EB] h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, book.readingProgress.scrollPercent))}%` }}
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* Purchase Attribution Date */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-4">
                        <Clock className="w-3 h-3" />
                        <span>Purchased {formatDate(book.purchasedAt)}</span>
                      </div>
                    </div>

                    {/* Action Buttons with Feature Flag Protection */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      {isRevoked ? (
                        <p className="text-xs text-rose-600 font-medium">
                          Access for this book has been revoked or refunded. Contact support for inquiries.
                        </p>
                      ) : (
                        <>
                          {/* Read Online Button */}
                          {readerEnabled ? (
                            <Link href={book.readingProgress?.lastChapterId ? `/read/${book.slug || book.bookId}/${book.readingProgress.lastChapterId}` : `/read/${book.slug || book.bookId}`}>
                              <Button variant="primary" size="sm" className="font-semibold text-xs">
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                {book.readingProgress && book.readingProgress.scrollPercent > 0
                                  ? 'Continue Reading'
                                  : 'Start Reading'}
                              </Button>
                            </Link>
                          ) : (
                            <div className="relative inline-block">
                              <Button
                                variant="primary"
                                size="sm"
                                disabled
                                className="font-semibold text-xs opacity-70 cursor-not-allowed"
                                onMouseEnter={() => setActiveTooltip(`reader-${book.entitlementId}`)}
                                onMouseLeave={() => setActiveTooltip(null)}
                              >
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                Read Online
                              </Button>
                              {activeTooltip === `reader-${book.entitlementId}` && (
                                <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-[#0B1D3A] text-white text-[11px] rounded-lg shadow-lg z-30 pointer-events-none animate-in fade-in zoom-in-95">
                                  Online reader will be available shortly. Your purchase and license are confirmed.
                                </div>
                              )}
                            </div>
                          )}

                          {/* PDF Download Button (Only for read_download tier) */}
                          {isDownload && (
                            pdfDownloadEnabled ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="font-semibold text-xs transition-all"
                                disabled={downloadingId === book.entitlementId}
                                onClick={() => handleDownload(book)}
                              >
                                {downloadingId === book.entitlementId ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Preparing PDF...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Download PDF
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="relative inline-block">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled
                                  className="font-semibold text-xs opacity-70 cursor-not-allowed"
                                  onMouseEnter={() => setActiveTooltip(`pdf-${book.entitlementId}`)}
                                  onMouseLeave={() => setActiveTooltip(null)}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  Download PDF
                                </Button>
                                {activeTooltip === `pdf-${book.entitlementId}` && (
                                  <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-[#0B1D3A] text-white text-[11px] rounded-lg shadow-lg z-30 pointer-events-none animate-in fade-in zoom-in-95">
                                    PDF downloads will be available shortly for your confirmed license.
                                  </div>
                                )}
                              </div>
                            )
                          )}

                          {/* Upgrade to PDF Notice (For read_online tier) */}
                          {!isDownload && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-semibold text-xs text-purple-700 border-purple-200 hover:bg-purple-50 transition-colors"
                              onClick={() => setUpgradeModalBook(book)}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-purple-600" />
                              Add PDF access — ₹50
                            </Button>
                          )}
                        </>
                      )}

                      {/* Download Feedback State */}
                      {downloadError?.entitlementId === book.entitlementId && (
                        <div className="w-full mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center justify-between animate-in fade-in">
                          <span className="truncate">{downloadError.message}</span>
                          <button
                            onClick={() => handleDownload(book)}
                            className="text-rose-800 font-bold underline ml-2 shrink-0 cursor-pointer hover:text-rose-950"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {downloadSuccess?.entitlementId === book.entitlementId && (
                        <div className="w-full mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5 animate-in fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Download ready: {downloadSuccess.filename}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accessible Library Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-[#0B1D3A]">{(safePage - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-semibold text-[#0B1D3A]">
                  {Math.min(safePage * PAGE_SIZE, filteredBooks.length)}
                </span> of{' '}
                <span className="font-semibold text-[#0B1D3A]">{filteredBooks.length}</span> titles
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="text-xs font-semibold"
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-600 font-medium px-2">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="text-xs font-semibold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Customer Order History Modal */}
      {isOrdersModalOpen && (
        <CustomerOrderHistoryModal onClose={() => setIsOrdersModalOpen(false)} />
      )}

      {/* eBook Upgrade Modal */}
      {upgradeModalBook && (
        <EBookUpgradeModal
          book={upgradeModalBook}
          onClose={() => setUpgradeModalBook(null)}
          onSuccess={() => {
            fetchLibrary();
          }}
        />
      )}
    </div>
  );
}

function CustomerOrderHistoryModal({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ebooks/orders', {
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setOrders(data.orders || []);
        } else {
          setError(data.error || 'Failed to load order history.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error loading orders.');
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-[#2563EB] rounded-lg">
              <Receipt className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              eBook Purchase History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2563EB]" />
              <p className="text-xs">Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No purchases found</p>
              <p className="text-xs text-slate-400">Your completed eBook orders will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{o.order_number}</span>
                        {o.order_type === 'upgrade' && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            PDF Upgrade
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {new Date(o.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-[#0B1D3A]">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: o.currency || 'INR',
                          maximumFractionDigits: 0,
                        }).format(o.total_amount_paise / 100)}
                      </span>
                      <div>
                        {o.refund_status === 'full' || o.payment_status === 'refunded' ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Fully Refunded (₹{((o.refunded_amount_paise || o.total_amount_paise) / 100).toFixed(0)})
                          </span>
                        ) : o.refund_status === 'partial' || o.payment_status === 'partially_refunded' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Partially Refunded (₹{((o.refunded_amount_paise || 0) / 100).toFixed(0)})
                          </span>
                        ) : o.refund_status === 'pending' ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Refund Pending Confirmation
                          </span>
                        ) : o.payment_status === 'paid' ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Paid & Fulfilled
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 capitalize">
                            {o.payment_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resulting Access and Refund Notes */}
                  {(o.refund_status === 'full' || o.payment_status === 'refunded') && (
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100 text-[11px] text-rose-800">
                      Access revoked upon completed refund.
                    </div>
                  )}
                  {(o.refund_status === 'partial' || o.payment_status === 'partially_refunded') && (
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-[11px] text-amber-800">
                      Partial refund processed. Your online reading access remains active.
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/70 space-y-1">
                    {o.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between items-center text-slate-700">
                        <span className="font-medium truncate max-w-xs">{it.title}</span>
                        <span className="text-[10px] font-medium shrink-0 ml-2">
                          {it.plan === 'upgrade_pdf' ? (
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                              PDF Upgrade (+₹50)
                            </span>
                          ) : it.plan === 'read_download' ? (
                            <span className="text-slate-500">Read + Download</span>
                          ) : (
                            <span className="text-slate-500">Read Online</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Refunds List if any */}
                  {o.refunds && o.refunds.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/50 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Refund History</span>
                      {o.refunds.map((rf: any) => (
                        <div key={rf.id} className="text-[10px] text-slate-600 flex justify-between">
                          <span>
                            {rf.status === 'processed' ? 'Refund Processed' : rf.status === 'pending' ? 'Pending Provider Confirmation' : 'Refund Failed'} ({rf.reason})
                          </span>
                          <span className="font-bold text-rose-600">₹{(rf.amount_paise / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive ₹50 Upgrade Modal with live Razorpay Test Mode integration
 */
function EBookUpgradeModal({
  book,
  onClose,
  onSuccess,
}: {
  book: CustomerOwnedBook;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quote, setQuote] = useState<EBookUpgradeQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      setIsLoadingQuote(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/ebooks/${book.bookId}/upgrade/quote?editionId=${book.editionId}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        if (res.ok && data.success && data.quote) {
          setQuote(data.quote);
        } else {
          setErrorMessage(data.error || 'Failed to retrieve upgrade quote.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Network error fetching upgrade eligibility.');
      } finally {
        setIsLoadingQuote(false);
      }
    }
    fetchQuote();
  }, [book.bookId, book.editionId]);

  const [activeUpgradeOrder, setActiveUpgradeOrder] = useState<any | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const launchUpgradeCheckout = async (orderData: any) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await openKnowledgePaatRazorpayCheckout({
        keyId: orderData.keyId,
        amountPaise: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        internalOrderId: orderData.orderId,
        razorpayOrderId: orderData.razorpayOrderId,
        description: `Upgrade to PDF Download — ${book.versionName || book.title}`,
        themeColor: '#0B1D3A',
        onSuccess: async (response) => {
          try {
            const verifyRes = await fetch('/api/ebooks/orders/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                internalOrderId: orderData.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            setSuccessMessage('Upgrade successful! You now have full PDF download access.');
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1800);
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.message || 'Payment verification encountered an issue.');
            setIsProcessing(false);
          }
        },
        onDismiss: () => {
          setIsProcessing(false);
          setRecoveryMessage('Checkout closed or switched to UPI app. If payment completed, click "Check Payment Status" below.');
        },
        onPaymentFailed: (failResp) => {
          setIsProcessing(false);
          setErrorMessage(failResp?.description || 'Payment was declined or failed.');
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open payment gateway.');
      setIsProcessing(false);
    }
  };

  const handlePayUpgrade = async () => {
    if (isProcessing) return;
    setErrorMessage(null);
    setRecoveryMessage(null);

    // Reuse existing active order if present
    if (activeUpgradeOrder) {
      await launchUpgradeCheckout(activeUpgradeOrder);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Server-Authoritative Upgrade Order
      const res = await fetch(`/api/ebooks/${book.bookId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId: book.editionId }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Could not initialize upgrade order.');
      }

      setActiveUpgradeOrder(orderData);
      await launchUpgradeCheckout(orderData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate checkout.');
      setIsProcessing(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!activeUpgradeOrder || isCheckingStatus) return;
    setIsCheckingStatus(true);
    setRecoveryMessage('Checking latest status with Razorpay Gateway...');
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/ebooks/orders/${activeUpgradeOrder.orderId}/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        if (data.paymentStatus === 'paid' || data.status === 'paid') {
          setSuccessMessage('Upgrade confirmed! Full PDF download access unlocked.');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1800);
          return;
        } else if (data.paymentStatus === 'authorized') {
          setRecoveryMessage('Payment authorized by your bank. Awaiting automatic capture confirmation...');
        } else if (data.paymentStatus === 'failed') {
          setErrorMessage(data.message || 'Payment attempt failed.');
          setRecoveryMessage(null);
        } else {
          setRecoveryMessage(
            data.message || 'Payment has not yet completed. If you approved in UPI app, please wait a few seconds and check again.'
          );
        }
      } else {
        setErrorMessage(data.error || 'Unable to check status from payment provider.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while checking status.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Upgrade to Read + Download
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoadingQuote ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600" />
            <p className="text-xs">Calculating upgrade eligibility...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Upgrade Unavailable</span>
            </div>
            <p>{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={onClose} className="w-full mt-2 text-xs">
              Close
            </Button>
          </div>
        ) : successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">PDF Access Unlocked!</h3>
            <p className="text-xs text-emerald-700">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Book & Edition Info */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Purchased: {book.versionName}
              </span>
              <h3 className="font-bold text-sm text-slate-900 line-clamp-2">
                {book.title}
              </h3>
              <p className="text-xs text-slate-500">By {book.author}</p>
            </div>

            {/* Access Comparison */}
            <div className="space-y-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Current Access:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Read Online Only (₹49)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Upgraded Access:</span>
                <span className="font-bold text-purple-700 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  Read + Download (Full)
                </span>
              </div>
            </div>

            {/* Preservation Reassurance */}
            <div className="flex items-start gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-900">
              <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>
                Your existing bookmarks, reading preferences, and saved progress are completely preserved and survive this upgrade.
              </span>
            </div>

            {/* Upgrade Price Box */}
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-200">
              <div>
                <span className="text-xs text-purple-900 font-semibold block">Upgrade Amount</span>
                <span className="text-[11px] text-purple-600">Authoritative Server Price</span>
              </div>
              <span className="text-xl font-black text-purple-900">
                ₹{quote?.upgradePriceRupees || 50}
              </span>
            </div>

            {/* Payment Methods Badges */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-semibold text-slate-700 text-[10px]">
                <span>Supported Channels</span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Standard Checkout</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-medium">
                  <CreditCard className="w-2.5 h-2.5 text-slate-600" />
                  Cards & Netbanking (Active)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                  <Smartphone className="w-2.5 h-2.5 text-purple-600" />
                  UPI Intent (Mobile)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                  <QrCode className="w-2.5 h-2.5 text-purple-600" />
                  UPI QR (Desktop)
                </span>
              </div>
            </div>

            {/* Pending Payment Recovery Banner */}
            {activeUpgradeOrder && (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 text-xs">Payment in Progress</p>
                    <p className="text-[11px] text-purple-800">
                      If you completed payment in your UPI app, click <strong>Check Status</strong> below to activate PDF access.
                    </p>
                    {recoveryMessage && (
                      <p className="text-[10px] font-semibold text-blue-700 bg-blue-50 p-1.5 rounded border border-blue-100">
                        {recoveryMessage}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isCheckingStatus || isProcessing}
                    onClick={handleCheckPaymentStatus}
                    className="flex-1 py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isCheckingStatus ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Check Status</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || isCheckingStatus}
                    onClick={() => launchUpgradeCheckout(activeUpgradeOrder)}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-purple-200 text-purple-900 font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePayUpgrade}
                disabled={isProcessing || isCheckingStatus}
                className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 border-purple-600"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Opening Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                    Pay ₹{quote?.upgradePriceRupees || 50}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
