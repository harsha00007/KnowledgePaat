"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Search,
  Settings2,
  Menu,
  X,
  Sun,
  Moon,
  Coffee,
  Type,
  Check,
  RotateCcw,
  AlertCircle,
  Copy,
  Clock,
  ExternalLink,
  Layers,
  Download,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/Button';
import {
  ChapterTocItem,
  ResolvedEdition,
  BookmarkItem,
  ReadingPreferences,
  DEFAULT_READING_PREFERENCES,
  SearchMatch
} from '@/types/ebook';

interface ReaderClientProps {
  initialData?: {
    book: {
      id: string;
      slug: string;
      title: string;
      author: string;
      coverImageUrl: string | null;
    };
    edition: ResolvedEdition;
    chapter: {
      id: string;
      chapterIndex: number;
      title: string;
      slug: string;
      wordCount: number;
      safeHtml: string;
      isFreeSample: boolean;
    };
    navigation: {
      previousChapter: ChapterTocItem | null;
      nextChapter: ChapterTocItem | null;
      tableOfContents: ChapterTocItem[];
    };
    progress: {
      scrollPercent: number;
      lastChapterId: string | null;
      completedAt: string | null;
    } | null;
    ownedEditions: ResolvedEdition[];
    preferences: ReadingPreferences;
    entitlement?: {
      id: string;
      plan: string;
      canReadOnline: boolean;
      canDownloadPdf: boolean;
      isActive: boolean;
    } | null;
  };
  initialError?: {
    status: number;
    message: string;
    code?: string;
  };
  bookId: string;
  chapterId: string;
  currentUserId?: string;
}

export function ReaderClient({
  initialData,
  initialError,
  bookId,
  chapterId,
  currentUserId,
}: ReaderClientProps) {
  // If initialError is present, render safe error view
  if (initialError || !initialData) {
    const isUnauth = initialError?.status === 401;
    const isForbidden = initialError?.status === 403;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isForbidden ? 'text-amber-500' : 'text-rose-500'}`} />
          <h1 className="text-xl font-bold text-[#0B1D3A] mb-2">
            {isUnauth ? 'Authentication Required' : isForbidden ? 'Access Restricted' : 'Chapter Unavailable'}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {initialError?.message || 'The requested chapter is not accessible.'}
          </p>
          <div className="flex flex-col gap-3">
            {isUnauth ? (
              <Link href={`/login?redirectTo=/read/${bookId}/${chapterId}`}>
                <Button variant="primary" className="w-full">Sign In to Continue</Button>
              </Link>
            ) : isForbidden ? (
              <Link href={`/e-books/${bookId}`}>
                <Button variant="primary" className="w-full">View in Bookstore</Button>
              </Link>
            ) : null}
            <Link href="/my-books">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to My Books
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReaderWorkspace
      data={initialData}
      bookId={bookId}
      chapterId={chapterId}
      currentUserId={currentUserId}
    />
  );
}

function ReaderWorkspace({
  data,
  bookId,
  chapterId,
  currentUserId: _currentUserId,
}: {
  data: NonNullable<ReaderClientProps['initialData']>;
  bookId: string;
  chapterId: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { book, edition, chapter, navigation, progress: initialProgress, ownedEditions, preferences: initialPrefs, entitlement } = data;

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  // PDF download state in reader
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [readerDownloadStatus, setReaderDownloadStatus] = useState<{
    type: 'loading' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Authorised PDF Download in Reader
  const handleReaderDownloadPdf = async () => {
    if (isDownloadingPdf || !book || !edition) return;
    setIsDownloadingPdf(true);
    setReaderDownloadStatus({ type: 'loading', message: 'Generating secure download link...' });

    try {
      const res = await fetch(`/api/ebooks/${book.id}/download?editionId=${edition.id}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.downloadUrl) {
        setReaderDownloadStatus({
          type: 'error',
          message: data.error || 'Failed to generate download link.',
        });
        setTimeout(() => setReaderDownloadStatus(null), 4000);
        return;
      }

      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename || `${book.slug || 'ebook'}-edition-${edition.editionNumber}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReaderDownloadStatus({
        type: 'success',
        message: `Download started: ${data.filename || 'PDF'}`,
      });
      setTimeout(() => setReaderDownloadStatus(null), 4000);
    } catch (err: unknown) {
      setReaderDownloadStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error initiating download.',
      });
      setTimeout(() => setReaderDownloadStatus(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Preferences State
  const [preferences, setPreferences] = useState<ReadingPreferences>(initialPrefs || DEFAULT_READING_PREFERENCES);

  // Progress & Saving States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentScrollPercent, setCurrentScrollPercent] = useState<number>(
    initialProgress?.lastChapterId === chapter.id ? initialProgress.scrollPercent : 0
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isCurrentChapterBookmarked, setIsCurrentChapterBookmarked] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Read Time
  const estimatedReadTime = Math.max(1, Math.ceil(chapter.wordCount / 200));

  // 1. Fetch Bookmarks for this edition
  const loadBookmarks = useCallback(async () => {
    try {
      const res = await fetch(`/api/ebooks/${book.id}/bookmarks?editionId=${edition.id}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.bookmarks)) {
        setBookmarks(json.bookmarks);
        const match = json.bookmarks.some((b: BookmarkItem) => b.chapterId === chapter.id);
        setIsCurrentChapterBookmarked(match);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingBookmarks(false);
    }
  }, [book.id, edition.id, chapter.id]);

  useEffect(() => {
    let ignore = false;
    async function fetchInitialBookmarks() {
      try {
        const res = await fetch(`/api/ebooks/${book.id}/bookmarks?editionId=${edition.id}`);
        const json = await res.json();
        if (!ignore && json.success && Array.isArray(json.bookmarks)) {
          setBookmarks(json.bookmarks);
          const match = json.bookmarks.some((b: BookmarkItem) => b.chapterId === chapter.id);
          setIsCurrentChapterBookmarked(match);
        }
      } catch {
        // Fallback
      }
    }
    fetchInitialBookmarks();
    return () => {
      ignore = true;
    };
  }, [book.id, edition.id, chapter.id]);

  // 2. Toggle Bookmark for Current Chapter
  const toggleBookmark = async () => {
    try {
      if (isCurrentChapterBookmarked) {
        const existing = bookmarks.find((b) => b.chapterId === chapter.id);
        if (existing) {
          const res = await fetch(`/api/ebooks/${book.id}/bookmarks/${existing.id}`, { method: 'DELETE' });
          if (res.ok) {
            setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
            setIsCurrentChapterBookmarked(false);
          } else {
            console.error('Failed to remove bookmark from server.');
          }
        }
      } else {
        const res = await fetch(`/api/ebooks/${book.id}/bookmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionId: edition.id,
            chapterId: chapter.id,
            scrollPercent: currentScrollPercent,
            title: chapter.title,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success && json.bookmark) {
          setBookmarks((prev) => [json.bookmark, ...prev]);
          setIsCurrentChapterBookmarked(true);
        } else {
          console.error('Failed to save bookmark to server:', json?.error);
        }
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    }
  };

  // 3. Debounced Reading Progress Save
  const persistProgress = useCallback(
    async (scroll: number) => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/ebooks/${book.id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionId: edition.id,
            chapterId: chapter.id,
            scrollPercent: scroll,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    },
    [book.id, edition.id, chapter.id]
  );

  // Scroll listener for reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const percent = Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100)));
      setCurrentScrollPercent(percent);

      // Debounce saving by 1.5 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(() => {
        persistProgress(percent);
      }, 1500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [persistProgress]);

  // Restore initial scroll position if returning to this chapter
  useEffect(() => {
    if (initialProgress?.lastChapterId === chapter.id && initialProgress.scrollPercent > 5) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const targetY = (initialProgress.scrollPercent / 100) * docHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  }, [chapter.id, initialProgress]);

  // 4. Update Reading Preferences
  const updatePreference = async <K extends keyof ReadingPreferences>(key: K, val: ReadingPreferences[K]) => {
    const previous = { ...preferences };
    const updated = { ...preferences, [key]: val };
    setPreferences(updated);
    try {
      const res = await fetch('/api/ebooks/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        console.error('Preferences save failed on server, reverting state:', json?.error);
        setPreferences(previous);
      }
    } catch (err) {
      console.error('Preferences network failure, reverting state:', err);
      setPreferences(previous);
    }
  };

  // 5. In-Book Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/ebooks/${book.id}/search?editionId=${edition.id}&q=${encodeURIComponent(searchQuery.trim())}`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSearchResults(json.results || []);
      } else {
        setSearchError(json.error || 'Search failed.');
      }
    } catch {
      setSearchError('Network error while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  // Navigate to another chapter
  const navigateToChapter = (targetChapterId: string) => {
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
    setIsBookmarksOpen(false);
    startTransition(() => {
      router.push(`/read/${book.slug || book.id}/${targetChapterId}`);
    });
  };

  // Switch edition if multiple editions owned
  const handleEditionChange = (newEditionId: string) => {
    startTransition(() => {
      router.push(`/read/${book.slug || book.id}?editionId=${newEditionId}`);
    });
  };

  // Copy code helper for pre code blocks
  useEffect(() => {
    const codeBlocks = document.querySelectorAll('.reader-content pre');
    codeBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-code-btn')) return;

      const btn = document.createElement('button');
      btn.className =
        'copy-code-btn absolute top-2 right-2 px-2 py-1 text-[11px] font-sans font-medium text-slate-400 bg-slate-800 hover:text-white rounded border border-slate-700 transition-colors flex items-center gap-1';
      btn.innerHTML = '<span>Copy</span>';

      btn.addEventListener('click', () => {
        const codeText = pre.querySelector('code')?.innerText || '';
        navigator.clipboard.writeText(codeText);
        btn.innerHTML = '<span>Copied!</span>';
        setTimeout(() => {
          btn.innerHTML = '<span>Copy</span>';
        }, 2000);
      });

      const wrapper = document.createElement('div');
      wrapper.className = 'relative my-4';
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });
  }, [chapter.id]);

  // Dynamic Theme Styling Classes
  const themeClasses = {
    light: 'bg-white text-slate-800',
    sepia: 'bg-[#FBF0D9] text-[#5F4B32]',
    dark: 'bg-[#0B1D3A] text-slate-100',
  }[preferences.theme];

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[preferences.fontFamily];

  const fontSizeClasses = {
    small: 'text-sm leading-relaxed',
    normal: 'text-base sm:text-lg leading-relaxed',
    large: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-relaxed',
  }[preferences.fontSize];

  const lineWidthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-3xl',
    wide: 'max-w-5xl',
  }[preferences.lineWidth];

  return (
    <div className={`min-h-screen transition-colors duration-200 font-ebook ${themeClasses}`}>
      {/* ── TOP NAV BAR ────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
        preferences.theme === 'dark'
          ? 'bg-[#0B1D3A]/90 border-slate-800'
          : preferences.theme === 'sepia'
          ? 'bg-[#FBF0D9]/90 border-[#E8DEC8]'
          : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Back & Table of Contents Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/my-books"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                preferences.theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Return to My Books"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">My Books</span>
            </Link>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                preferences.theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Table of Contents"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Contents</span>
            </button>
          </div>

          {/* Center: Book Title & Edition Badge */}
          <div className="flex-1 min-w-0 text-center px-2">
            <h1 className={`text-xs sm:text-sm font-bold truncate ${
              preferences.theme === 'dark' ? 'text-white' : 'text-[#0B1D3A]'
            }`}>
              {book.title}
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <span className="font-medium">{edition.versionName}</span>
              {edition.isHistorical && (
                <span className="bg-amber-900/40 text-amber-500 px-1 py-0.2 rounded font-bold">
                  Historical
                </span>
              )}
              <span>•</span>
              <span className="truncate">{chapter.title}</span>
            </div>
          </div>

          {/* Right: Controls & Saving Indicator */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Saving Status Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] px-2 py-1 rounded">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-teal-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={() => persistProgress(currentScrollPercent)}
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                  title="Progress save failed. Click to retry. Reading continues uninterrupted."
                >
                  <AlertCircle className="w-3 h-3" />
                  Save failed (Retry)
                </button>
              )}
            </div>

            {/* In-Book Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                preferences.theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Search Book Content"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Bookmark Toggle */}
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isCurrentChapterBookmarked
                  ? 'text-[#2563EB] bg-blue-50 dark:bg-blue-900/30'
                  : preferences.theme === 'dark'
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              title={isCurrentChapterBookmarked ? 'Bookmarked' : 'Add Bookmark'}
            >
              {isCurrentChapterBookmarked ? (
                <BookmarkCheck className="w-4 h-4 fill-current" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Bookmarks List Button */}
            <button
              onClick={() => setIsBookmarksOpen(true)}
              className={`p-2 rounded-lg transition-colors relative ${
                preferences.theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="View Bookmarks"
            >
              <Layers className="w-4 h-4" />
              {bookmarks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2563EB]" />
              )}
            </button>

            {/* Reading Preferences Toggle */}
            <button
              onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
              className={`p-2 rounded-lg transition-colors ${
                preferences.theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Reading Preferences"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* PDF Action: Download if entitled, or Upgrade Link if online-only */}
            {entitlement?.canDownloadPdf ? (
              <button
                onClick={handleReaderDownloadPdf}
                disabled={isDownloadingPdf}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  preferences.theme === 'dark'
                    ? 'hover:bg-slate-800 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-600'
                } ${isDownloadingPdf ? 'opacity-60 cursor-wait' : ''}`}
                title="Download Purchased Edition PDF"
              >
                {isDownloadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            ) : (
              <Link
                href="/my-books"
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold ${
                  preferences.theme === 'dark'
                    ? 'hover:bg-slate-800 text-purple-400 bg-purple-950/40'
                    : 'hover:bg-purple-100 text-purple-700 bg-purple-50'
                }`}
                title="Add PDF Access for ₹50 in My Books"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Add PDF (₹50)</span>
              </Link>
            )}
          </div>
        </div>

        {/* Reader Download Status Notification Toast */}
        {readerDownloadStatus && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
            <div className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border flex items-center gap-2 ${
              readerDownloadStatus.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : readerDownloadStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {readerDownloadStatus.type === 'loading' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {readerDownloadStatus.type === 'success' && <Check className="w-3.5 h-3.5" />}
              {readerDownloadStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
              <span>{readerDownloadStatus.message}</span>
            </div>
          </div>
        )}
      </header>

      {/* ── PREFERENCES POPOVER ────────────────────────────────────── */}
      {isPreferencesOpen && (
        <div className={`fixed top-14 right-4 z-40 w-72 p-4 rounded-2xl shadow-xl border transition-all animate-in fade-in zoom-in-95 ${
          preferences.theme === 'dark'
            ? 'bg-[#0B1D3A] border-slate-700 text-slate-100'
            : preferences.theme === 'sepia'
            ? 'bg-[#FBF0D9] border-[#E8DEC8] text-[#5F4B32]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Display Settings</h3>
            <button onClick={() => setIsPreferencesOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-1.5 block text-slate-500">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updatePreference('theme', 'light')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${
                  preferences.theme === 'light' ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              <button
                onClick={() => updatePreference('theme', 'sepia')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${
                  preferences.theme === 'sepia' ? 'border-[#5F4B32] bg-[#F4EFE6] text-[#5F4B32]' : 'border-slate-200 hover:bg-amber-50'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" /> Sepia
              </button>
              <button
                onClick={() => updatePreference('theme', 'dark')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${
                  preferences.theme === 'dark' ? 'border-blue-400 bg-slate-800 text-blue-400' : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-1.5 block text-slate-500">Text Size</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['small', 'normal', 'large', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updatePreference('fontSize', size)}
                  className={`py-1 rounded-lg border text-xs font-medium capitalize ${
                    preferences.fontSize === size
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] font-bold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-1.5 block text-slate-500">Typography</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updatePreference('fontFamily', 'sans')}
                className={`py-1.5 px-2 rounded-lg border text-xs reader-font-sans ${
                  preferences.fontFamily === 'sans' ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-slate-200'
                }`}
              >
                Sans
              </button>
              <button
                onClick={() => updatePreference('fontFamily', 'serif')}
                className={`py-1.5 px-2 rounded-lg border text-xs reader-font-serif ${
                  preferences.fontFamily === 'serif' ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-slate-200'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => updatePreference('fontFamily', 'mono')}
                className={`py-1.5 px-2 rounded-lg border text-xs reader-font-mono ${
                  preferences.fontFamily === 'mono' ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-slate-200'
                }`}
              >
                Mono
              </button>
            </div>
          </div>

          {/* Reading Line Width */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-500">Column Width</label>
            <div className="grid grid-cols-3 gap-2">
              {(['narrow', 'medium', 'wide'] as const).map((width) => (
                <button
                  key={width}
                  onClick={() => updatePreference('lineWidth', width)}
                  className={`py-1 rounded-lg border text-xs capitalize ${
                    preferences.lineWidth === width ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-slate-200'
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHAPTER SIDEBAR / DRAWER ──────────────────────────────── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Drawer Body */}
          <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200 ${
            preferences.theme === 'dark' ? 'bg-[#0B1D3A] text-white border-r border-slate-800' : 'bg-white text-slate-800 border-r border-slate-200'
          }`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-[#0B1D3A] dark:text-white line-clamp-1">{book.title}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Table of Contents</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multi-Edition Switcher if customer owns > 1 edition */}
            {ownedEditions.length > 1 && (
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/50">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                  Switch Purchased Edition
                </label>
                <select
                  value={edition.id}
                  onChange={(e) => handleEditionChange(e.target.value)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5"
                >
                  {ownedEditions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.versionName} {ed.isHistorical ? '(Historical)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navigation.tableOfContents.map((item) => {
                const isActive = item.id === chapter.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateToChapter(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 text-xs ${
                      isActive
                        ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                        : preferences.theme === 'dark'
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.chapterIndex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate leading-snug">{item.title}</p>
                      {item.isFreeSample && (
                        <span className={`text-[9px] font-semibold ${isActive ? 'text-blue-100' : 'text-emerald-600'}`}>
                          Free Sample
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200/50 text-center">
              <Link href="/my-books" className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center justify-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to My Books
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL ───────────────────────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsSearchOpen(false)} />
          <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border p-4 z-50 animate-in fade-in zoom-in-95 ${
            preferences.theme === 'dark' ? 'bg-[#0B1D3A] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-3">
              <h3 className="font-bold text-sm text-[#0B1D3A] dark:text-white flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#2563EB]" />
                Search in {edition.versionName}
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type words, concepts, or code to search..."
                  className="w-full text-sm pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <button
                  type="submit"
                  disabled={isSearching || searchQuery.trim().length < 2}
                  className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>
            </form>

            {searchError && (
              <p className="text-xs text-rose-500 mb-3">{searchError}</p>
            )}

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {searchResults.length === 0 && searchQuery && !isSearching && !searchError && (
                <p className="text-xs text-slate-400 text-center py-6">No matching sections found.</p>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.chapterId}
                  onClick={() => navigateToChapter(result.chapterId)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200/50 hover:border-[#2563EB] transition-colors group bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B1D3A] dark:text-blue-300 mb-1 group-hover:text-[#2563EB]">
                    <span>Chapter {result.chapterIndex}: {result.chapterTitle}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{result.matchCount} match{result.matchCount > 1 ? 'es' : ''}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {result.snippet}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOOKMARKS DRAWER ───────────────────────────────────────── */}
      {isBookmarksOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsBookmarksOpen(false)} />
          <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl p-4 z-50 flex flex-col animate-in slide-in-from-right duration-200 ${
            preferences.theme === 'dark' ? 'bg-[#0B1D3A] text-white border-l border-slate-800' : 'bg-white text-slate-800 border-l border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-3">
              <h3 className="font-bold text-sm text-[#0B1D3A] dark:text-white flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#2563EB]" />
                Saved Bookmarks ({bookmarks.length})
              </h3>
              <button onClick={() => setIsBookmarksOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {bookmarks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No bookmarks saved in this edition yet.
                </div>
              ) : (
                bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-2"
                  >
                    <button
                      onClick={() => navigateToChapter(b.chapterId)}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs font-bold text-[#0B1D3A] dark:text-blue-300 hover:text-[#2563EB] line-clamp-1">
                        {b.chapterTitle || 'Chapter Bookmark'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Position: {Math.round(b.scrollPercent)}% • {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/ebooks/${book.id}/bookmarks/${b.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setBookmarks((prev) => prev.filter((item) => item.id !== b.id));
                          if (b.chapterId === chapter.id) setIsCurrentChapterBookmarked(false);
                        } else {
                          console.error('Failed to remove bookmark from server.');
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Remove Bookmark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN READING CANVAS ────────────────────────────────────── */}
      <main className={`mx-auto px-4 sm:px-8 py-8 sm:py-12 ${lineWidthClasses}`}>
        {/* Chapter Header Info */}
        <div className="mb-8 pb-6 border-b border-slate-200/50">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Chapter {chapter.chapterIndex}
            </span>
            {chapter.isFreeSample && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Free Sample
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{estimatedReadTime} min read ({chapter.wordCount} words)
            </span>
          </div>

          <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
            preferences.theme === 'dark' ? 'text-white' : 'text-[#0B1D3A]'
          }`}>
            {chapter.title}
          </h1>
        </div>

        {/* Authored Content Body (Sanitized HTML) */}
        <article
          className={`reader-content prose prose-slate max-w-none ${fontClasses} ${fontSizeClasses}`}
          dangerouslySetInnerHTML={{ __html: chapter.safeHtml }}
        />

        {/* ── CHAPTER BOTTOM NAVIGATION ────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          {navigation.previousChapter ? (
            <button
              onClick={() => navigateToChapter(navigation.previousChapter!.id)}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                preferences.theme === 'dark'
                  ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-normal">Previous Chapter</span>
                <span className="truncate block max-w-xs">{navigation.previousChapter.title}</span>
              </div>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {navigation.nextChapter ? (
            <button
              onClick={() => navigateToChapter(navigation.nextChapter!.id)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-end gap-2 shadow-sm transition-all"
            >
              <div className="text-right">
                <span className="text-[10px] text-blue-200 block font-normal">Next Chapter</span>
                <span className="truncate block max-w-xs">{navigation.nextChapter.title}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center sm:text-right">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Check className="w-4 h-4" /> You have completed this book!
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
