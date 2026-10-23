"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { 
  Home, 
  ArrowLeft, 
  Save, 
  Upload, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  Sparkles, 
  ExternalLink,
  RefreshCw,
  Sliders,
  Megaphone,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  History,
  Film,
  Video,
  Image as ImageIcon,
  PlayCircle,
  Smartphone,
  Monitor
} from 'lucide-react';
import { MediaCard } from '@/components/ebook/MediaCard';
import { DEFAULT_MEDIA_CARD, MediaCardConfig, MediaSlide } from '@/types/ebook';

interface CatalogBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  cover_image_url: string | null;
}

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

export default function AdminEBooksHomepagePage() {
  const [activeTab, setActiveTab] = useState<'media_card' | 'hero' | 'featured' | 'categories' | 'banner' | 'testimonials' | 'visibility' | 'preview'>('media_card');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 0. Media Card state
  const [mediaCard, setMediaCard] = useState<MediaCardConfig>(DEFAULT_MEDIA_CARD);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<{ index: number; field: 'media_url' | 'poster_url' } | null>(null);

  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // Publication metadata
  const [publishedVersion, setPublishedVersion] = useState<number>(1);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishedBy, setPublishedBy] = useState<string | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [draftUpdatedBy, setDraftUpdatedBy] = useState<string | null>(null);

  // 1. Hero states
  const [heroEyebrow, setHeroEyebrow] = useState('Engineering & System Design eBooks');
  const [heroHeading, setHeroHeading] = useState('Master Modern Software Engineering');
  const [heroHighlightedText, setHeroHighlightedText] = useState('From First Principles');
  const [heroDescription, setHeroDescription] = useState('Comprehensive, in-depth architectural guides written for engineers who want to build resilient distributed systems.');
  const [heroArtworkUrl, setHeroArtworkUrl] = useState('');
  const [heroArtworkAlt, setHeroArtworkAlt] = useState('KnowledgePaat eBook Library');
  const [primaryBtnLabel, setPrimaryBtnLabel] = useState('Explore Library');
  const [primaryBtnUrl, setPrimaryBtnUrl] = useState('/e-books');
  const [secondaryBtnLabel, setSecondaryBtnLabel] = useState('Free Sample Chapters');
  const [secondaryBtnUrl, setSecondaryBtnUrl] = useState('/e-books?filter=sample');

  // 2. Featured Books & Highlighting
  const [featuredBookIds, setFeaturedBookIds] = useState<string[]>([]);
  const [highlightedBookId, setHighlightedBookId] = useState<string>('');

  // 3. Category Ordering
  const [categoryOrder, setCategoryOrder] = useState<string[]>([
    'Engineering', 'System Design', 'Career Prep', 'DevOps & Cloud', 'Quality Assurance', 'Frontend & Mobile'
  ]);

  // 4. Promotional Banner
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // 5. Section Visibility
  const [visibility, setVisibility] = useState({
    hero: true,
    featured: true,
    categories: true,
    banner: false,
    testimonials: true,
  });

  // 6. Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const fetchHomepageData = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/ebooks/homepage');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load homepage configuration.');
      }

      setCatalogBooks(data.catalog_books || []);
      setAuditHistory(data.audit_history || []);

      const draft = data.draft || data.published || {};
      const pub = data.published || {};

      setPublishedVersion(pub.version || 1);
      setPublishedAt(pub.published_at || null);
      setPublishedBy(pub.publisher_name || null);

      setDraftUpdatedAt(draft.updated_at || null);
      setDraftUpdatedBy(draft.updater_name || null);

      // Populate draft fields
      setHeroEyebrow(draft.hero_eyebrow || 'Engineering & System Design eBooks');
      setHeroHeading(draft.hero_heading || 'Master Modern Software Engineering');
      setHeroHighlightedText(draft.hero_highlighted_text || 'From First Principles');
      setHeroDescription(draft.hero_description || '');
      setHeroArtworkUrl(draft.hero_artwork_url || '');
      setHeroArtworkAlt(draft.hero_artwork_alt || 'KnowledgePaat eBook Library');
      setPrimaryBtnLabel(draft.primary_button_label || 'Explore Library');
      setPrimaryBtnUrl(draft.primary_button_url || '/e-books');
      setSecondaryBtnLabel(draft.secondary_button_label || 'Free Sample Chapters');
      setSecondaryBtnUrl(draft.secondary_button_url || '/e-books?filter=sample');

      setFeaturedBookIds(Array.isArray(draft.featured_book_ids) ? draft.featured_book_ids : []);
      setHighlightedBookId(draft.highlighted_book_id || '');
      setCategoryOrder(Array.isArray(draft.category_order) ? draft.category_order : [
        'Engineering', 'System Design', 'Career Prep', 'DevOps & Cloud', 'Quality Assurance', 'Frontend & Mobile'
      ]);

      const banner = draft.promotional_banner || {};
      setBannerActive(Boolean(banner.is_active));
      setBannerText(banner.text || '');
      setBannerLink(banner.link || '');

      const vis = draft.section_visibility || {};
      setVisibility({
        hero: vis.hero ?? true,
        featured: vis.featured ?? true,
        categories: vis.categories ?? true,
        banner: vis.banner ?? false,
        testimonials: vis.testimonials ?? true,
      });

      setTestimonials(Array.isArray(draft.testimonials) ? draft.testimonials : []);

      if (draft.media_card && typeof draft.media_card === 'object') {
        setMediaCard({
          is_visible: typeof draft.media_card.is_visible === 'boolean' ? draft.media_card.is_visible : true,
          slides: Array.isArray(draft.media_card.slides) && draft.media_card.slides.length > 0
            ? draft.media_card.slides
            : DEFAULT_MEDIA_CARD.slides,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error loading homepage settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomepageData();
  }, []);

  const buildPayload = () => ({
    hero_eyebrow: heroEyebrow.trim(),
    hero_heading: heroHeading.trim(),
    hero_highlighted_text: heroHighlightedText.trim(),
    hero_description: heroDescription.trim(),
    hero_artwork_url: heroArtworkUrl.trim() || null,
    hero_artwork_alt: heroArtworkAlt.trim(),
    primary_button_label: primaryBtnLabel.trim(),
    primary_button_url: primaryBtnUrl.trim(),
    secondary_button_label: secondaryBtnLabel.trim(),
    secondary_button_url: secondaryBtnUrl.trim(),
    featured_book_ids: featuredBookIds,
    highlighted_book_id: highlightedBookId || null,
    category_order: categoryOrder,
    promotional_banner: {
      is_active: bannerActive,
      text: bannerText.trim(),
      link: bannerLink.trim(),
    },
    section_visibility: visibility,
    media_card: mediaCard,
    testimonials,
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/ebooks/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_draft',
          content: buildPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save draft.');
      }

      setFeedback({ type: 'success', message: 'Homepage draft saved successfully.' });
      fetchHomepageData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving draft.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this homepage configuration to the live bookstore? This will immediately update the public storefront.')) {
      return;
    }

    setIsPublishing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/ebooks/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          content: buildPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish homepage.');
      }

      setFeedback({ type: 'success', message: data.message || 'Homepage published successfully.' });
      fetchHomepageData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error publishing homepage.' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Reorder helpers for featured books
  const moveFeaturedBook = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= featuredBookIds.length) return;
    const copy = [...featuredBookIds];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    setFeaturedBookIds(copy);
  };

  const removeFeaturedBook = (bookId: string) => {
    setFeaturedBookIds(prev => prev.filter(id => id !== bookId));
  };

  const addFeaturedBook = (bookId: string) => {
    if (!bookId || featuredBookIds.includes(bookId)) return;
    setFeaturedBookIds(prev => [...prev, bookId]);
  };

  // Category reordering
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categoryOrder.length) return;
    const copy = [...categoryOrder];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    setCategoryOrder(copy);
  };

  // Media Card Slide Management Helpers
  const handleAddSlide = () => {
    setMediaCard(prev => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: `slide-${Date.now()}`,
          type: 'image',
          media_url: '',
          poster_url: null,
          heading: 'New Promotional Title',
          description: 'Highlight an architectural topic, new release, or publication milestone.',
          cta_label: 'Explore Technical Guides',
          cta_url: '#catalogue',
          is_active: true,
          order: prev.slides.length,
          alt_text: 'KnowledgePaat Technical Guide',
        }
      ]
    }));
  };

  const handleRemoveSlide = (index: number) => {
    setMediaCard(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index).map((s, idx) => ({ ...s, order: idx })),
    }));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= mediaCard.slides.length) return;
    setMediaCard(prev => {
      const copy = [...prev.slides];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, moved);
      return {
        ...prev,
        slides: copy.map((s, idx) => ({ ...s, order: idx })),
      };
    });
  };

  const handleUpdateSlide = (index: number, updates: Partial<MediaSlide>) => {
    setMediaCard(prev => {
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], ...updates };
      return { ...prev, slides };
    });
  };

  const handleSlideFileUpload = async (
    slideIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'media_url' | 'poster_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlideIndex({ index: slideIndex, field: targetField });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/ebooks/homepage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload promotional file.');
      }

      setMediaCard(prev => {
        const slides = [...prev.slides];
        slides[slideIndex] = {
          ...slides[slideIndex],
          [targetField]: data.url,
          ...(targetField === 'media_url' && { type: data.type }),
        };
        return { ...prev, slides };
      });

      setFeedback({
        type: 'success',
        message: `Uploaded "${file.name}" successfully.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error uploading promotional media.'
      });
    } finally {
      setUploadingSlideIndex(null);
      e.target.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20 font-ebook">
        
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/e-books"
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-navy">eBook Storefront Content Editor</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold font-mono">
                  Live v{publishedVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage hero messaging, featured titles, promotional banners, and section visibility.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || isPublishing}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Saving Draft...' : 'Save Draft'}
            </Button>

            <Link
              href="/e-books?preview=true"
              target="_blank"
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Preview Draft <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              {isPublishing ? 'Publishing...' : 'Publish to Store'}
            </Button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline hover:opacity-80 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* METADATA BAR */}
        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              <strong>Draft status:</strong> {draftUpdatedAt ? `Saved ${new Date(draftUpdatedAt).toLocaleString()}` : 'Unchanged'}
              {draftUpdatedBy ? ` by ${draftUpdatedBy}` : ''}
            </span>
            <span>•</span>
            <span>
              <strong>Published:</strong> {publishedAt ? `${new Date(publishedAt).toLocaleString()}` : 'Not yet'}
              {publishedBy ? ` by ${publishedBy}` : ''}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Isolated Draft & Verified Atomic Publication
          </span>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('media_card')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'media_card' ? 'border-[#6F42DD] text-[#6F42DD] font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Film className="w-4 h-4" /> Media Card ({mediaCard.slides.length})
            {mediaCard.is_visible && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
          </button>

          <button
            onClick={() => setActiveTab('hero')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'hero' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Hero Section
          </button>

          <button
            onClick={() => setActiveTab('featured')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'featured' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Featured & Highlighted ({featuredBookIds.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'categories' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" /> Category Order ({categoryOrder.length})
          </button>

          <button
            onClick={() => setActiveTab('banner')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'banner' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Promotional Banner {bannerActive && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
          </button>

          <button
            onClick={() => setActiveTab('visibility')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'visibility' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" /> Section Visibility
          </button>

          <button
            onClick={() => setActiveTab('testimonials')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'testimonials' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Testimonials ({testimonials.length})
          </button>
        </div>

        {/* TAB 0: MEDIA CARD (PROMOTIONAL CAROUSEL) */}
        {activeTab === 'media_card' && (
          <div className="space-y-6">
            {/* Master Control & Live Preview Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Admin-Managed Media Card
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls the primary hero promotional media carousel positioned directly below navigation on the eBook storefront.
                  </p>
                </div>

                {/* Master Visibility Switch */}
                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={mediaCard.is_visible}
                    onChange={(e) => setMediaCard(prev => ({ ...prev, is_visible: e.target.checked }))}
                    className="w-4 h-4 text-[#6F42DD] rounded border-slate-300 focus:ring-[#6F42DD]"
                  />
                  <div>
                    <span className="text-xs font-bold text-navy block">Display on Storefront</span>
                    <span className="text-[10px] text-slate-500">
                      {mediaCard.is_visible ? 'Visible to visitors' : 'Hidden from storefront'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Live Preview Container */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">Live Preview</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      (Includes visitor-initiated video playback and poster overlays)
                    </span>
                  </div>

                  {/* Device Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        previewDevice === 'desktop'
                          ? 'bg-white text-navy shadow-xs'
                          : 'text-slate-500 hover:text-navy'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        previewDevice === 'mobile'
                          ? 'bg-white text-navy shadow-xs'
                          : 'text-slate-500 hover:text-navy'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-[#F8F7FF] rounded-2xl border border-[#E8E5F5] overflow-hidden">
                  <div className={previewDevice === 'mobile' ? 'max-w-sm mx-auto transition-all' : 'w-full transition-all'}>
                    <MediaCard config={mediaCard} isAdminPreview={true} />
                  </div>
                </div>
              </div>
            </div>

            {/* Slides Manager */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Carousel Slides ({mediaCard.slides.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reorder slides, configure image or video media, set video posters, and customize action links.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddSlide}
                  className="bg-[#6F42DD] hover:bg-[#5b33be] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slide
                </Button>
              </div>

              {mediaCard.slides.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No slides configured</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Add at least one promotional image or video slide to activate the media card.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddSlide}
                    className="mt-4"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create First Slide
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {mediaCard.slides.map((slide, index) => {
                    const isUploadingMedia = uploadingSlideIndex?.index === index && uploadingSlideIndex?.field === 'media_url';
                    const isUploadingPoster = uploadingSlideIndex?.index === index && uploadingSlideIndex?.field === 'poster_url';

                    return (
                      <div
                        key={slide.id || index}
                        className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative"
                      >
                        {/* Slide Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-[#1D1855] text-white text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-xs font-bold text-navy">
                              {slide.heading || `Slide #${index + 1}`}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              slide.type === 'video'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {slide.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Active Slide Toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              <input
                                type="checkbox"
                                checked={slide.is_active !== false}
                                onChange={(e) => handleUpdateSlide(index, { is_active: e.target.checked })}
                                className="w-3.5 h-3.5 text-[#6F42DD] rounded border-slate-300 focus:ring-[#6F42DD]"
                              />
                              <span>Active</span>
                            </label>

                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveSlide(index, 'up')}
                              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-navy disabled:opacity-40"
                              title="Move Slide Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={index === mediaCard.slides.length - 1}
                              onClick={() => handleMoveSlide(index, 'down')}
                              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-navy disabled:opacity-40"
                              title="Move Slide Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Slide */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSlide(index)}
                              className="p-1 rounded bg-white border border-slate-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Remove Slide"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Slide Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Slide Media Type */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Media Type
                            </label>
                            <select
                              value={slide.type}
                              onChange={(e) => handleUpdateSlide(index, { type: e.target.value as 'image' | 'video' })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-navy bg-white"
                            >
                              <option value="image">Image (JPG, PNG, WEBP)</option>
                              <option value="video">Video (MP4, WEBM with visitor playback)</option>
                            </select>
                          </div>

                          {/* Media URL & File Upload */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              {slide.type === 'video' ? 'Video File / URL' : 'Image File / URL'}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.media_url}
                                onChange={(e) => handleUpdateSlide(index, { media_url: e.target.value })}
                                placeholder={slide.type === 'video' ? 'https://.../promo.mp4' : 'https://.../promo.jpg'}
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 bg-white"
                              />
                              <label className="px-3 py-1.5 bg-[#6F42DD] hover:bg-[#5b33be] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                                <Upload className={`w-3.5 h-3.5 ${isUploadingMedia ? 'animate-spin' : ''}`} />
                                <span>{isUploadingMedia ? 'Uploading...' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept={slide.type === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
                                  onChange={(e) => handleSlideFileUpload(index, e, 'media_url')}
                                  className="hidden"
                                  disabled={isUploadingMedia}
                                />
                              </label>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {slide.type === 'video' ? 'Max 50MB (MP4, WEBM)' : 'Max 5MB (JPG, PNG, WEBP)'}
                            </span>
                          </div>

                          {/* Video Poster URL & Upload (Only for videos) */}
                          {slide.type === 'video' && (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Video Poster Image (Recommended for visitor-initiated playback)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={slide.poster_url || ''}
                                  onChange={(e) => handleUpdateSlide(index, { poster_url: e.target.value })}
                                  placeholder="https://.../poster.jpg"
                                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 bg-white"
                                />
                                <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                                  <Upload className={`w-3.5 h-3.5 ${isUploadingPoster ? 'animate-spin' : ''}`} />
                                  <span>{isUploadingPoster ? 'Uploading...' : 'Upload Poster'}</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handleSlideFileUpload(index, e, 'poster_url')}
                                    className="hidden"
                                    disabled={isUploadingPoster}
                                  />
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Slide Heading */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Slide Heading *
                            </label>
                            <input
                              type="text"
                              value={slide.heading}
                              onChange={(e) => handleUpdateSlide(index, { heading: e.target.value })}
                              placeholder="e.g. Master Practical Software Engineering"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-navy bg-white"
                              required
                            />
                          </div>

                          {/* Slide Description */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Slide Description
                            </label>
                            <textarea
                              rows={2}
                              value={slide.description}
                              onChange={(e) => handleUpdateSlide(index, { description: e.target.value })}
                              placeholder="e.g. Production-ready architectures, system design principles, and career insights."
                              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                            />
                          </div>

                          {/* CTA Label */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              CTA Button Label (Optional)
                            </label>
                            <input
                              type="text"
                              value={slide.cta_label || ''}
                              onChange={(e) => handleUpdateSlide(index, { cta_label: e.target.value })}
                              placeholder="e.g. Explore Technical Guides"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                            />
                          </div>

                          {/* CTA URL */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              CTA Target URL (Optional)
                            </label>
                            <input
                              type="text"
                              value={slide.cta_url || ''}
                              onChange={(e) => handleUpdateSlide(index, { cta_url: e.target.value })}
                              placeholder="e.g. #catalogue or /e-books/system-design"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 bg-white"
                            />
                          </div>

                          {/* Alt Text */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Accessibility Alt Text
                            </label>
                            <input
                              type="text"
                              value={slide.alt_text || ''}
                              onChange={(e) => handleUpdateSlide(index, { alt_text: e.target.value })}
                              placeholder="e.g. KnowledgePaat Distributed Systems Preview"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: HERO SECTION */}
        {activeTab === 'hero' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Hero Section Messaging & Artwork</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Eyebrow Text</label>
                <input
                  type="text"
                  value={heroEyebrow}
                  onChange={(e) => setHeroEyebrow(e.target.value)}
                  placeholder="Engineering & System Design eBooks"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Main Heading *</label>
                <input
                  type="text"
                  value={heroHeading}
                  onChange={(e) => setHeroHeading(e.target.value)}
                  placeholder="Master Modern Software Engineering"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Highlighted Accent Text</label>
                <input
                  type="text"
                  value={heroHighlightedText}
                  onChange={(e) => setHeroHighlightedText(e.target.value)}
                  placeholder="From First Principles"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-blue-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Description</label>
                <textarea
                  rows={3}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  placeholder="Comprehensive, in-depth architectural guides written for engineers who want to build resilient distributed systems."
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Artwork Image URL (Optional)</label>
                <input
                  type="text"
                  value={heroArtworkUrl}
                  onChange={(e) => setHeroArtworkUrl(e.target.value)}
                  placeholder="https://... or /assets/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Artwork Alternative Text (Accessibility)</label>
                <input
                  type="text"
                  value={heroArtworkAlt}
                  onChange={(e) => setHeroArtworkAlt(e.target.value)}
                  placeholder="KnowledgePaat eBook Library"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Call-To-Action Buttons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-blue-700 block">Primary Action Button</span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={primaryBtnLabel}
                      onChange={(e) => setPrimaryBtnLabel(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination URL</label>
                    <input
                      type="text"
                      value={primaryBtnUrl}
                      onChange={(e) => setPrimaryBtnUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Secondary Action Button</span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={secondaryBtnLabel}
                      onChange={(e) => setSecondaryBtnLabel(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination URL</label>
                    <input
                      type="text"
                      value={secondaryBtnUrl}
                      onChange={(e) => setSecondaryBtnUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEATURED & HIGHLIGHTED BOOKS */}
        {activeTab === 'featured' && (
          <div className="space-y-6">
            {/* HIGHLIGHTED BOOK CARD */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Highlighted Showcase Title</h2>
                <p className="text-xs text-slate-500 mt-0.5">Featured prominently at the top of the bookstore storefront.</p>
              </div>

              <select
                value={highlightedBookId}
                onChange={(e) => setHighlightedBookId(e.target.value)}
                className="w-full md:w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-navy bg-white"
              >
                <option value="">— None (Show Hero Only) —</option>
                {catalogBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} — by {b.author} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            {/* ORDERED FEATURED BOOKS LIST */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Featured Books Showcase Sequence</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select and arrange titles in display sequence.</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="addBookSelect"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addFeaturedBook(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-navy bg-white"
                  >
                    <option value="" disabled>+ Add Book to Showcase...</option>
                    {catalogBooks.filter(b => !featuredBookIds.includes(b.id)).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {featuredBookIds.length === 0 ? (
                <div className="p-8 border border-dashed rounded-xl text-center text-slate-400 text-xs">
                  No featured books configured. The bookstore will default to all published catalogue titles.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {featuredBookIds.map((bId, idx) => {
                    const book = catalogBooks.find(b => b.id === bId);
                    return (
                      <div key={bId} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-navy">{book ? book.title : `Unknown Book (${bId})`}</div>
                            <div className="text-xs text-slate-400">{book ? `${book.author} • ${book.category}` : 'Unavailable or unpublished'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveFeaturedBook(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFeaturedBook(idx, 'down')}
                            disabled={idx === featuredBookIds.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFeaturedBook(bId)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 ml-2"
                            title="Remove from featured"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORY ORDERING */}
        {activeTab === 'categories' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Category Tab Ordering</h2>
              <p className="text-xs text-slate-500 mt-0.5">Controls category filter tabs displayed on the bookstore storefront.</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-w-lg">
              {categoryOrder.map((cat, idx) => (
                <div key={cat} className="p-3 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-navy">{cat}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, 'down')}
                      disabled={idx === categoryOrder.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PROMOTIONAL BANNER */}
        {activeTab === 'banner' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Promotional Alert Banner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Appears at the very top of the eBook bookstore.</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Active Banner</span>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Text Message</label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="🔥 Special Launch Offer: Get 20% off all engineering guides with code ARCH20"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Destination Link (Optional)</label>
                <input
                  type="text"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="/e-books or https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
                />
              </div>

              {bannerActive && bannerText && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>Preview: <strong>{bannerText}</strong></span>
                  {bannerLink && <span className="font-semibold underline">Link: {bannerLink}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SECTION VISIBILITY */}
        {activeTab === 'visibility' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 max-w-xl">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Section Visibility Controls</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toggle display of sections on the storefront.</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {[
                { key: 'hero', label: 'Hero Header & Headline Section' },
                { key: 'featured', label: 'Featured Books Showcase Carousel' },
                { key: 'categories', label: 'Category Filter Navigation Bar' },
                { key: 'banner', label: 'Promotional Top Alert Banner' },
                { key: 'testimonials', label: 'Customer Reviews & Testimonials Section' },
              ].map(({ key, label }) => (
                <div key={key} className="p-3.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean((visibility as any)[key])}
                      onChange={(e) => setVisibility(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: TESTIMONIALS */}
        {activeTab === 'testimonials' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Genuine Customer Testimonials</h2>
                <p className="text-xs text-slate-500 mt-0.5">Verified feedback from senior engineers and engineering students.</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTestimonials(prev => [
                    ...prev,
                    { name: 'Reader Name', role: 'Software Engineer', quote: 'Exceptional architectural guide.', rating: 5 }
                  ]);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Testimonial
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testimonials.map((t, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => setTestimonials(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                    title="Remove Testimonial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pr-6">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Customer Name</label>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTestimonials(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                        }}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-navy bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Role / Title</label>
                      <input
                        type="text"
                        value={t.role}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTestimonials(prev => prev.map((item, i) => i === idx ? { ...item, role: val } : item));
                        }}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Quote / Feedback</label>
                    <textarea
                      rows={2}
                      value={t.quote}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTestimonials(prev => prev.map((item, i) => i === idx ? { ...item, quote: val } : item));
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT LOG TABLE */}
        {auditHistory.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Homepage Modification & Publication History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Event Action</th>
                    <th className="py-2 px-3">Administrator</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-semibold text-navy">
                        {item.action === 'homepage_published' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">PUBLISHED</span>
                        ) : (
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">DRAFT SAVED</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700">
                        {item.actor_name}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {item.metadata?.version ? `Version v${item.metadata.version} • ` : ''}
                        Featured: {item.metadata?.featured_count ?? 0} titles
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
