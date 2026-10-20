"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, BookOpen, ChevronRight, ChevronLeft, Loader2, Sparkles, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/Button';
import { renderSafeMarkdown } from '@/lib/ebook/markdownSanitizer';

export interface FreeSampleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  initialChapterId: string | null;
  bookTitle: string;
  onSelectPlan?: (plan: 'read_online' | 'read_download') => void;
}

interface SampleChapterData {
  id: string;
  chapter_index: number;
  title: string;
  slug: string;
  word_count: number;
  content_body: string;
  safe_html: string;
  is_free_sample: boolean;
}

interface SampleNav {
  id: string;
  chapter_index: number;
  title: string;
  slug: string;
  is_current: boolean;
}

export function FreeSampleDrawer({
  isOpen,
  onClose,
  bookId,
  initialChapterId,
  bookTitle,
  onSelectPlan,
}: FreeSampleDrawerProps) {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterId);
  const [chapter, setChapter] = useState<SampleChapterData | null>(null);
  const [sampleNav, setSampleNav] = useState<SampleNav[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync initial chapter ID
  useEffect(() => {
    if (initialChapterId) {
      setActiveChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  // Fetch sample chapter content
  const loadChapter = useCallback(async (cId: string) => {
    if (!bookId || !cId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/ebooks/${encodeURIComponent(bookId)}/sample/${encodeURIComponent(cId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to load sample chapter.');
        setChapter(null);
        return;
      }

      setChapter(data.chapter);
      setSampleNav(data.sample_chapters_nav || []);
      setActiveChapterId(data.chapter.id);
    } catch (err: any) {
      console.error('Error fetching sample chapter:', err);
      setError('A network error occurred while loading the free sample.');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen && activeChapterId) {
      loadChapter(activeChapterId);
    }
  }, [isOpen, activeChapterId, loadChapter]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Remember previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentNavIndex = sampleNav.findIndex(s => s.id === activeChapterId);
  const prevChapter = currentNavIndex > 0 ? sampleNav[currentNavIndex - 1] : null;
  const nextChapter = currentNavIndex >= 0 && currentNavIndex < sampleNav.length - 1 ? sampleNav[currentNavIndex + 1] : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sample-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B1D3A]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full transform transition ease-in-out duration-300 animate-in slide-in-from-right"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" /> Free Sample
                  </span>
                  <p className="text-xs text-slate-500 truncate">{bookTitle}</p>
                </div>
                <h2
                  id="sample-drawer-title"
                  className="text-base sm:text-lg font-bold text-[#0B1D3A] truncate font-display"
                >
                  {chapter ? `Chapter ${chapter.chapter_index}: ${chapter.title}` : 'Reading Sample'}
                </h2>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#0B1D3A] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close sample reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multiple Sample Chapters Selector */}
          {sampleNav.length > 1 && (
            <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Samples:</span>
              <div className="flex gap-1.5">
                {sampleNav.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveChapterId(s.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      s.id === activeChapterId
                        ? 'bg-[#2563EB] text-white shadow-2xs font-semibold'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    Ch. {s.chapter_index}: {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 bg-white focus:outline-none">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#2563EB]" />
                <p className="text-sm font-medium">Loading free sample chapter...</p>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center my-8">
                <p className="text-sm font-semibold text-red-800 mb-2">{error}</p>
                <p className="text-xs text-red-600">
                  Only officially designated free sample chapters are accessible publicly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => initialChapterId && loadChapter(initialChapterId)}
                >
                  Retry Loading
                </Button>
              </div>
            ) : chapter ? (
              <article className="max-w-prose mx-auto">
                <header className="mb-8 pb-6 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-2 font-display">
                    Chapter {chapter.chapter_index}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1D3A] font-display leading-tight">
                    {chapter.title}
                  </h1>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>{chapter.word_count} words</span>
                    <span>•</span>
                    <span>~{Math.max(1, Math.ceil(chapter.word_count / 200))} min read</span>
                  </div>
                </header>

                {/* Sanitized HTML container */}
                <div
                  className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans text-sm sm:text-base selection:bg-blue-100 selection:text-blue-900"
                  dangerouslySetInnerHTML={{
                    __html: chapter.safe_html || renderSafeMarkdown(chapter.content_body || '')
                  }}
                />

                {/* Sample End Callout */}
                <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100/80 text-center space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#0B1D3A] font-display">
                    You have finished reading this free sample
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Unlock all remaining chapters and access interactive reading on the KnowledgePaat online reader.
                  </p>
                </div>
              </article>
            ) : null}
          </div>

          {/* Footer Controls */}
          <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Prev/Next Sample navigation */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              {prevChapter && (
                <button
                  onClick={() => setActiveChapterId(prevChapter.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2563EB] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev Sample
                </button>
              )}
              {nextChapter && (
                <button
                  onClick={() => setActiveChapterId(nextChapter.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2563EB] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ml-auto sm:ml-0"
                >
                  Next Sample <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Purchase CTA buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onSelectPlan && (
                <>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-bold text-purple-900 transition-colors"
                    onClick={() => {
                      onClose();
                      onSelectPlan('read_online');
                    }}
                  >
                    Unlock Read Online
                  </button>
                  <button
                    type="button"
                    className="btn-gold px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    onClick={() => {
                      onClose();
                      onSelectPlan('read_download');
                    }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Get Full Access (Online + PDF)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
