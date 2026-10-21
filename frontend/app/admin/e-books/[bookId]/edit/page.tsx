"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { 
  BookOpen, 
  ArrowLeft, 
  Save, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Plus, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  ExternalLink,
  Sparkles,
  Info,
  Archive,
  Lock,
  Unlock,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { EBook, EBookEdition, EBookChapter, EBookPublicationChecklist } from '@/types/ebook';
import { renderSafeMarkdown } from '@/lib/ebook/markdownSanitizer';
import { validatePublicationPrerequisites } from '@/lib/ebook/validation';
import { PricingTab } from './PricingTab';

type TabKey = 'details' | 'chapters' | 'editions' | 'pricing' | 'publication' | 'preview';

export default function AdminEditEBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const router = useRouter();
  const { bookId } = use(params);

  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [book, setBook] = useState<EBook | null>(null);
  const [editions, setEditions] = useState<EBookEdition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [chapters, setChapters] = useState<EBookChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Book Details
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [readerRole, setReaderRole] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // File upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Chapter editing state
  const [chTitle, setChTitle] = useState('');
  const [chSlug, setChSlug] = useState('');
  const [chBody, setChBody] = useState('');
  const [chStatus, setChStatus] = useState<'draft' | 'ready'>('draft');
  const [chIsSample, setChIsSample] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Chapter deletion modal
  const [chapterToDelete, setChapterToDelete] = useState<EBookChapter | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);

  const activeEdition = editions.find(e => e.id === selectedEditionId) || editions[0] || null;

  const isEditionLocked = Boolean(
    activeEdition && (
      activeEdition.status === 'published' ||
      activeEdition.status === 'archived' ||
      Boolean(activeEdition.published_at)
    )
  );

  const checklist = useMemo(() => {
    if (!book || !activeEdition) return null;
    return validatePublicationPrerequisites(book, activeEdition, chapters);
  }, [book, activeEdition, chapters]);

  const fetchBookData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load eBook.');
      }

      const b = data.book;
      setBook(b);
      setTitle(b.title || '');
      setAuthor(b.author || '');
      setSlug(b.slug || '');
      setSubtitle(b.subtitle || '');
      setCategory(b.category || 'Engineering');
      setReaderRole(b.reader_role || '');
      setLanguage(b.language || 'en');
      setDescription(b.description || '');
      setCoverUrl(b.cover_image_url || null);

      const edList = b.editions || [];
      setEditions(edList);

      const currentEd = edList.find((e: any) => e.is_current_edition) || edList[0];
      if (currentEd) {
        setSelectedEditionId(currentEd.id);
        const chs = currentEd.chapters || [];
        setChapters(chs);
        if (chs.length > 0 && !selectedChapterId) {
          selectChapter(chs[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching book:', err);
      setFeedback({ type: 'error', message: err.message || 'Error loading eBook.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bookId) {
      fetchBookData();
    }
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab') as TabKey;
      if (tabParam && ['details', 'chapters', 'editions', 'pricing', 'publication', 'preview'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [bookId]);

  const selectChapter = (ch: EBookChapter) => {
    setSelectedChapterId(ch.id);
    setChTitle(ch.title || '');
    setChSlug(ch.slug || '');
    setChBody(ch.content_body || '');
    setChStatus(ch.status || 'draft');
    setChIsSample(Boolean(ch.is_free_sample));
  };

  // Switch edition
  const handleEditionChange = async (edId: string) => {
    setSelectedEditionId(edId);
    const chosen = editions.find(e => e.id === edId);
    if (chosen) {
      try {
        const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${edId}/chapters`);
        const data = await res.json();
        if (res.ok && data.success) {
          setChapters(data.chapters || []);
          if (data.chapters?.length > 0) {
            selectChapter(data.chapters[0]);
          } else {
            setSelectedChapterId(null);
          }
        }
      } catch (err) {
        console.error('Failed to load edition chapters:', err);
      }
    }
  };

  // 1. SAVE BOOK DETAILS
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          slug,
          subtitle: subtitle || null,
          category,
          reader_role: readerRole || null,
          language,
          description,
          cover_image_url: coverUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save book details.');
      }

      setBook(data.book);
      setFeedback({ type: 'success', message: 'Book details updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update details.' });
    } finally {
      setIsSavingDetails(false);
    }
  };

  // 2. UPLOAD COVER
  const handleUploadCover = async () => {
    if (!coverFile) return;
    setIsUploadingCover(true);
    setFeedback(null);

    try {
      const fd = new FormData();
      fd.append('file', coverFile);
      fd.append('kind', 'cover');

      const res = await fetch(`/api/admin/ebooks/${bookId}/upload`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload cover.');
      }

      setCoverUrl(data.coverUrl);
      setCoverFile(null);
      setFeedback({ type: 'success', message: 'Cover image uploaded and attached successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error uploading cover.' });
    } finally {
      setIsUploadingCover(false);
    }
  };

  // 3. UPLOAD PRIVATE PDF
  const handleUploadPdf = async () => {
    if (!pdfFile || !selectedEditionId) return;
    setIsUploadingPdf(true);
    setFeedback(null);

    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      fd.append('kind', 'pdf');
      fd.append('editionId', selectedEditionId);

      const res = await fetch(`/api/admin/ebooks/${bookId}/upload`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload publication PDF.');
      }

      setPdfFile(null);
      setFeedback({ type: 'success', message: 'Publication PDF uploaded to private storage successfully.' });
      fetchBookData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error uploading publication PDF.' });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // 4. CREATE NEW CHAPTER
  const handleCreateNewChapter = async () => {
    if (!selectedEditionId) return;
    const nextNum = chapters.length + 1;
    const defaultTitle = `Chapter ${nextNum}: New Topic`;
    const defaultSlug = `chapter-${nextNum}`;

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: defaultTitle,
          slug: defaultSlug,
          content_body: `# ${defaultTitle}\n\nStart writing chapter content here...`,
          status: 'draft',
          is_free_sample: chapters.length === 0 // Default first chapter to free sample
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedList = [...chapters, data.chapter];
        setChapters(updatedList);
        selectChapter(data.chapter);
        setFeedback({ type: 'success', message: 'New chapter added.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to add chapter.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error adding chapter.' });
    }
  };

  // 5. SAVE CHAPTER CONTENT
  const handleSaveChapter = async () => {
    if (!selectedChapterId || !selectedEditionId) return;
    setIsSavingChapter(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/chapters/${selectedChapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: chTitle,
          slug: chSlug,
          content_body: chBody,
          status: chStatus,
          is_free_sample: chIsSample
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save chapter.');
      }

      setChapters(prev => prev.map(c => c.id === selectedChapterId ? data.chapter : c));
      setFeedback({ type: 'success', message: `Chapter "${chTitle}" saved.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving chapter.' });
    } finally {
      setIsSavingChapter(false);
    }
  };

  // 6. REORDER CHAPTERS
  const handleMoveChapter = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setChapters(reordered);
    setIsReordering(true);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/chapters/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedChapterIds: reordered.map(c => c.id)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reorder chapters.');
      }
      setChapters(data.chapters);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving chapter order.' });
      fetchBookData(); // Revert on failure
    } finally {
      setIsReordering(false);
    }
  };

  // 7. SAFE DELETE CHAPTER
  const confirmDeleteChapter = async () => {
    if (!chapterToDelete || !selectedEditionId) return;
    setIsDeletingChapter(true);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/chapters/${chapterToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete chapter.');
      }

      setFeedback({ type: 'success', message: data.message });
      setChapterToDelete(null);
      // Reload chapters
      const chRes = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/chapters`);
      const chData = await chRes.json();
      if (chRes.ok && chData.success) {
        setChapters(chData.chapters || []);
        if (chData.chapters?.length > 0) {
          selectChapter(chData.chapters[0]);
        } else {
          setSelectedChapterId(null);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error deleting chapter.' });
    } finally {
      setIsDeletingChapter(false);
    }
  };

  // 8. PUBLISH / WITHDRAW
  const handlePublishToggle = async (action: 'publish' | 'unpublish' | 'withdraw') => {
    if (!selectedEditionId) return;
    setIsPublishing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/editions/${selectedEditionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update publication status.');
      }

      setFeedback({ type: 'success', message: data.message });
      fetchBookData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Publication error.' });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading eBook workspace...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!book) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-navy">eBook Not Found</h2>
          <Link href="/admin/e-books" className="mt-4 inline-block">
            <Button size="sm">Back to Catalog</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/e-books">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-navy truncate max-w-xl">
                  {book.title}
                </h1>
                {book.status === 'published' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                By {book.author} • Slug: <code className="text-slate-400">{book.slug}</code>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Reader Preview
            </button>
            <button
              onClick={() => setActiveTab('publication')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Publication Checklist
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span>{feedback.message}</span>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Book Details & Cover
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'chapters'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Website Chapters ({chapters.length})
          </button>

          <button
            onClick={() => setActiveTab('editions')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'editions'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" /> Editions & PDF Files
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'pricing'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Pricing & Discounts
          </button>

          <button
            onClick={() => setActiveTab('publication')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'publication'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Publication Checklist
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" /> Reader Preview
          </button>
        </div>

        {/* TAB CONTENT */}

        {/* =================================================================== */}
        {/* TAB 1: BOOK DETAILS & COVER */}
        {/* =================================================================== */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT 2 COLS: METADATA FORM */}
            <form onSubmit={handleSaveDetails} className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Core Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Reader Role</label>
                  <input
                    type="text"
                    value={readerRole}
                    onChange={(e) => setReaderRole(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                  <textarea
                    rows={5}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSavingDetails}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSavingDetails ? 'Saving...' : 'Save Book Details'}
                </Button>
              </div>
            </form>

            {/* RIGHT COL: COVER UPLOADER */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Cover Image (Public)
              </h2>

              <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Book Cover"
                    className="w-36 h-52 object-cover rounded shadow-md border border-slate-300"
                  />
                ) : (
                  <div className="w-36 h-52 bg-slate-200 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 p-2 text-center text-xs">
                    <BookOpen className="w-8 h-8 mb-2" />
                    No cover image uploaded yet
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">
                  Select new image (JPEG, PNG, WebP — max 2MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <Button
                  onClick={handleUploadCover}
                  disabled={!coverFile || isUploadingCover}
                  size="sm"
                  className="w-full mt-2"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {isUploadingCover ? 'Uploading...' : 'Upload Cover'}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: WEBSITE CHAPTERS AUTHORING */}
        {/* =================================================================== */}
        {activeTab === 'chapters' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LOCKED WARNING BANNER */}
            {isEditionLocked && (
              <div className="lg:col-span-12 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Edition Content Locked:</strong> Edition #{activeEdition?.edition_number} is published and immutable to preserve purchased reader access. Chapters and PDFs cannot be modified.
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('editions')} className="text-xs bg-white text-navy font-semibold self-start sm:self-auto">
                  Create New Draft Revision
                </Button>
              </div>
            )}

            {/* LEFT 4 COLS: CHAPTER LIST */}
            <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-navy">Chapters</h2>
                  <p className="text-[11px] text-slate-400">Sequential website reading order</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleCreateNewChapter} 
                  disabled={isEditionLocked}
                  className="text-xs h-7 disabled:opacity-40"
                  title={isEditionLocked ? 'Cannot add chapters to a locked published edition' : undefined}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>

              {chapters.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  No chapters authored yet. Click &quot;+ Add&quot; to create Chapter 1.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {chapters.map((ch, idx) => (
                    <div
                      key={ch.id}
                      onClick={() => selectChapter(ch)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        selectedChapterId === ch.id
                          ? 'border-blue-500 bg-blue-50/50 font-medium text-navy shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-slate-400 text-[10px]">#{ch.chapter_index}</span>
                          <span className="truncate">{ch.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span>{ch.word_count || 0} words</span>
                          <span>•</span>
                          {ch.is_free_sample && (
                            <span className="text-emerald-600 font-semibold">Free Sample</span>
                          )}
                          <span>•</span>
                          <span className={ch.status === 'ready' ? 'text-blue-600 font-semibold' : 'text-amber-600'}>
                            {ch.status}
                          </span>
                        </div>
                      </div>

                      {/* Reorder Up/Down */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={idx === 0 || isReordering || isEditionLocked}
                          onClick={() => handleMoveChapter(idx, 'up')}
                          title={isEditionLocked ? 'Reordering disabled on locked edition' : 'Move up'}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          disabled={idx === chapters.length - 1 || isReordering || isEditionLocked}
                          onClick={() => handleMoveChapter(idx, 'down')}
                          title={isEditionLocked ? 'Reordering disabled on locked edition' : 'Move down'}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT 8 COLS: CHAPTER EDITOR */}
            <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              {selectedChapterId ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-navy">Edit Chapter Content</h2>
                      <p className="text-xs text-slate-400">
                        Markdown-formatted website text. HTML is strictly escaped against XSS.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isEditionLocked}
                        onClick={() => {
                          const ch = chapters.find(c => c.id === selectedChapterId);
                          if (ch) setChapterToDelete(ch);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        title={isEditionLocked ? 'Deletion blocked on locked edition' : undefined}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveChapter}
                        disabled={isSavingChapter || isEditionLocked}
                        className="text-xs disabled:opacity-40"
                        title={isEditionLocked ? 'Editing blocked on locked edition' : undefined}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        {isSavingChapter ? 'Saving...' : 'Save Chapter'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Chapter Title *</label>
                      <input
                        type="text"
                        disabled={isEditionLocked}
                        value={chTitle}
                        onChange={(e) => setChTitle(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Slug *</label>
                      <input
                        type="text"
                        disabled={isEditionLocked}
                        value={chSlug}
                        onChange={(e) => setChSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-4 sm:col-span-2 pt-1 pb-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isEditionLocked}
                          checked={chIsSample}
                          onChange={(e) => setChIsSample(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50"
                        />
                        <span>Designate as Free Sample (Accessible to public visitors without login)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isEditionLocked}
                          checked={chStatus === 'ready'}
                          onChange={(e) => setChStatus(e.target.checked ? 'ready' : 'draft')}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50"
                        />
                        <span>Ready for Publication</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Chapter Body (Markdown)</span>
                      <span className="text-slate-400 font-mono">
                        {chBody.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      rows={14}
                      disabled={isEditionLocked}
                      value={chBody}
                      onChange={(e) => setChBody(e.target.value)}
                      placeholder="# Chapter Heading&#10;&#10;Write comprehensive educational content using Markdown headers, lists, code blocks, and blockquotes..."
                      className="w-full p-3.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 text-sm">
                  Select a chapter on the left to edit its content, or click &quot;+ Add&quot; to create one.
                </div>
              )}
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: EDITIONS, FILES & PRICING */}
        {/* =================================================================== */}
        {activeTab === 'editions' && (
          <div className="space-y-6">
            
            {/* EDITION PICKER & NEW EDITION */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Edition:</span>
                <select
                  value={selectedEditionId}
                  onChange={(e) => handleEditionChange(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-navy bg-white"
                >
                  {editions.map(ed => (
                    <option key={ed.id} value={ed.id}>
                      Edition #{ed.edition_number} ({ed.version_name}) — {ed.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const versionName = prompt('Enter name for the new edition revision:', `Edition ${editions.length + 1}`);
                  if (!versionName) return;
                  try {
                    const res = await fetch(`/api/admin/ebooks/${bookId}/editions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        version_name: versionName,
                        cloneFromEditionId: activeEdition?.id
                      })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setFeedback({ 
                        type: 'success', 
                        message: `New draft edition revision created${data.chaptersCloned ? ` with ${data.chaptersCloned} chapters cloned` : ''}.` 
                      });
                      fetchBookData();
                    }
                  } catch (err) {
                    setFeedback({ type: 'error', message: 'Failed to create edition revision.' });
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create New Edition Revision
              </Button>
            </div>

            {/* PRIVATE PDF FILE MANAGEMENT */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Publication PDF Document (Strictly Private)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uploaded directly to the private bucket (`ebook-pdfs`). Accessible strictly via 60s signed URLs for verified Read + Download customers.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-500" /> Private Storage
                </span>
              </div>

              {activeEdition?.pdf_storage_path ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-sm text-emerald-900">
                        {activeEdition.pdf_original_filename || 'publication.pdf'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Path: {activeEdition.pdf_storage_path} • Size: {activeEdition.pdf_file_size_bytes ? (activeEdition.pdf_file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold self-start sm:self-auto">
                    Verified Attachment
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No publication PDF attached yet. Read + Download purchases will be blocked until a verified PDF is uploaded.</span>
                </div>
              )}

              {/* UPLOAD / REPLACE PDF */}
              {isEditionLocked ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Publication PDF is locked for published editions. To upload a revised publication PDF, create a new draft edition revision.</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {activeEdition?.pdf_storage_path ? 'Replace Publication PDF' : 'Upload Publication PDF'} (PDF format — Max 100MB)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <Button
                      onClick={handleUploadPdf}
                      disabled={!pdfFile || isUploadingPdf}
                      size="sm"
                      className="shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      {isUploadingPdf ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* PRICING SETTINGS */}
            {activeEdition && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Edition Pricing (Stored in Paise Minor Units)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-xl bg-slate-50/50">
                    <span className="text-xs font-semibold text-navy block mb-1">Read Online</span>
                    <div className="text-xl font-bold text-navy">
                      ₹{activeEdition.price_read_online_paise / 100}
                    </div>
                    <span className="text-[11px] text-slate-400">{activeEdition.price_read_online_paise} paise</span>
                  </div>

                  <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/30">
                    <span className="text-xs font-semibold text-blue-900 block mb-1">Read + Download</span>
                    <div className="text-xl font-bold text-blue-900">
                      ₹{activeEdition.price_read_download_paise / 100}
                    </div>
                    <span className="text-[11px] text-slate-400">{activeEdition.price_read_download_paise} paise</span>
                  </div>

                  <div className="p-4 border rounded-xl bg-slate-50/50">
                    <span className="text-xs font-semibold text-navy block mb-1">PDF Upgrade Delta</span>
                    <div className="text-xl font-bold text-navy">
                      ₹{activeEdition.price_upgrade_pdf_paise / 100}
                    </div>
                    <span className="text-[11px] text-slate-400">{activeEdition.price_upgrade_pdf_paise} paise</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('pricing')}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" /> Configure Dynamic Pricing & Discounts
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: DYNAMIC PRICING & DISCOUNTS */}
        {/* =================================================================== */}
        {activeTab === 'pricing' && (
          <PricingTab
            bookId={bookId}
            editions={editions}
            activeEditionId={selectedEditionId || activeEdition?.id || ''}
            onEditionChange={(edId) => {
              setSelectedEditionId(edId);
            }}
            onPricingSaved={() => {
              fetchBookData();
            }}
          />
        )}

        {/* =================================================================== */}
        {/* TAB 4: PUBLICATION CHECKLIST & LAUNCH */}
        {/* =================================================================== */}
        {activeTab === 'publication' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-navy">Publication Verification & Launch</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every prerequisite must be satisfied before this edition can be published to the public bookstore.
              </p>
            </div>

            {/* CHECKLIST ITEMS */}
            <div className="space-y-3">
              {/* 1. Core Book Metadata */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasRequiredMetadata ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Book Title & Author</div>
                    <div className="text-xs text-slate-500">Required metadata fields configured</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasRequiredMetadata ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasRequiredMetadata ? 'PASS' : 'INCOMPLETE'}
                </span>
              </div>

              {/* 2. Cover Image */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasCoverImage ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Book Cover Asset</div>
                    <div className="text-xs text-slate-500">Public cover image asset uploaded</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasCoverImage ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasCoverImage ? 'PASS' : 'MISSING'}
                </span>
              </div>

              {/* 3. Approved Pricing Tiers */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasValidPrices ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Approved Pricing Tiers</div>
                    <div className="text-xs text-slate-500">₹49 Online (4900p) • ₹99 Download (9900p) • ₹50 Upgrade (5000p)</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasValidPrices ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasValidPrices ? 'PASS' : 'INVALID'}
                </span>
              </div>

              {/* 4. Ready Website Chapters */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasAtLeastOneReadyChapter ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Ready Website Chapters</div>
                    <div className="text-xs text-slate-500">
                      {chapters.filter(c => c.status === 'ready').length} of {chapters.length} chapters marked as ready
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasAtLeastOneReadyChapter ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasAtLeastOneReadyChapter ? 'PASS' : 'ZERO READY'}
                </span>
              </div>

              {/* 5. All Included Chapters Ready */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.allChaptersReady ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">All Included Chapters Ready</div>
                    <div className="text-xs text-slate-500">Every authored chapter in this edition must be ready (no drafts)</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.allChaptersReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.allChaptersReady ? 'PASS' : 'DRAFTS EXIST'}
                </span>
              </div>

              {/* 6. Designated Ready Free Sample */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasIntentionalFreeSample ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Designated Ready Free Sample</div>
                    <div className="text-xs text-slate-500">At least one ready chapter marked as free preview sample</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasIntentionalFreeSample ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasIntentionalFreeSample ? 'PASS' : 'NONE SELECTED'}
                </span>
              </div>

              {/* 7. Private Publication PDF */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {checklist?.hasPrivatePdfForDownload ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-navy">Private Publication PDF</div>
                    <div className="text-xs text-slate-500">Full book PDF uploaded to private storage for download tier</div>
                  </div>
                </div>
                <span className={`text-xs font-bold ${checklist?.hasPrivatePdfForDownload ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {checklist?.hasPrivatePdfForDownload ? 'PASS' : 'MISSING PDF'}
                </span>
              </div>
            </div>

            {/* BLOCKING REASONS (IF ANY) */}
            {checklist && checklist.blockingReasons.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Publication is currently blocked by {checklist.blockingReasons.length} prerequisite(s):
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {checklist.blockingReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* LAUNCH ACTIONS */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Current Edition Status:</span>
                <span className="ml-2 font-bold text-sm text-navy uppercase">{activeEdition?.status}</span>
              </div>

              <div className="flex items-center gap-2">
                {activeEdition?.status === 'published' ? (
                  <Button
                    variant="outline"
                    onClick={() => handlePublishToggle('withdraw')}
                    disabled={isPublishing}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                    title="Withdraw this edition from active sale. Historical content remains protected for existing purchasers."
                  >
                    Withdraw from Sale
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePublishToggle('publish')}
                    disabled={isPublishing || !checklist?.isEligibleForPublication}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!checklist?.isEligibleForPublication ? 'Resolve blocking prerequisites above to enable publishing' : undefined}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {isPublishing ? 'Publishing...' : 'Publish Edition to Bookstore'}
                  </Button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: READER PREVIEW */}
        {/* =================================================================== */}
        {activeTab === 'preview' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Administrator Preview</span>
                <h2 className="text-xl font-bold text-navy mt-0.5">{book.title}</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                {chapters.length} Chapters in Edition #{activeEdition?.edition_number}
              </span>
            </div>

            {chapters.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No chapters exist to preview.
              </div>
            ) : (
              <div className="space-y-8">
                {chapters.map(ch => (
                  <div key={ch.id} className="border-b border-slate-100 pb-8 last:border-b-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        Chapter {ch.chapter_index} {ch.is_free_sample && '• Free Sample'}
                      </span>
                      <span className="text-xs text-slate-400">{ch.word_count} words</span>
                    </div>
                    <div 
                      className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(ch.content_body) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAFE DELETE CHAPTER CONFIRMATION MODAL */}
        <Modal
          isOpen={Boolean(chapterToDelete)}
          onClose={() => setChapterToDelete(null)}
          title="Safe Chapter Deletion"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete chapter <strong>&quot;{chapterToDelete?.title}&quot;</strong>?
            </p>
            {activeEdition?.status === 'published' ? (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                🚨 <strong>Deletion Blocked:</strong> This edition is published. To modify chapters of a published edition, create a new draft edition revision.
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Remaining chapters will be automatically re-sequenced sequentially so that no index gaps exist.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setChapterToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteChapter}
                disabled={isDeletingChapter || activeEdition?.status === 'published'}
              >
                {isDeletingChapter ? 'Deleting...' : 'Delete Chapter'}
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </AdminLayout>
  );
}
