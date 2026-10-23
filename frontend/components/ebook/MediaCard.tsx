"use client";

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { MediaCardConfig, MediaSlide } from '@/types/ebook';
import { BookCardData } from '@/components/ebook/BookCard';

export interface MediaCardProps {
  config?: MediaCardConfig | null;
  className?: string;
  isAdminPreview?: boolean;
  books?: BookCardData[];
  onOpenSample?: (book: BookCardData) => void;
}

const DEFAULT_SLIDE: MediaSlide = {
  id: 'default-launch-slide',
  type: 'image',
  heading: 'Master Practical Software Engineering',
  description:
    'Production-ready architectures, system design principles, and career-accelerating insights written by experienced practitioners.',
  cta_label: 'Explore Technical Guides',
  cta_url: '#catalogue',
  media_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80',
  poster_url: null,
  alt_text: 'KnowledgePaat Technical Library',
  is_active: true,
  order: 0,
};

export function MediaCard({
  config,
  className = '',
  isAdminPreview = false,
  books = [],
  onOpenSample,
}: MediaCardProps) {
  const rawSlides = config?.slides && config.slides.length > 0 ? config.slides : [DEFAULT_SLIDE];
  const activeSlides = rawSlides
    .filter((s) => s.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const slides = activeSlides.length > 0 ? activeSlides : [DEFAULT_SLIDE];
  const totalSlides = slides.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mediaError, setMediaError] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Derive safely clamped index without triggering cascading effect renders
  const safeIndex = currentIndex >= totalSlides ? 0 : currentIndex;

  // Pause playing video whenever current slide changes
  const pauseCurrentVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  }, [setIsVideoPlaying]);

  const goToSlide = useCallback(
    (index: number) => {
      pauseCurrentVideo();
      setIsFading(true);
      const timer = setTimeout(() => {
        const nextIndex = (index + totalSlides) % totalSlides;
        setCurrentIndex(nextIndex);
        setIsFading(false);
      }, 100);
      return () => clearTimeout(timer);
    },
    [totalSlides, pauseCurrentVideo]
  );

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Keyboard navigation when focused on container
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalSlides <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    },
    [totalSlides, prevSlide, nextSlide]
  );

  const currentSlide = slides[safeIndex] || slides[0];

  // Guard against missing/empty strings while respecting admin saved content
  const displayHeading =
    currentSlide.heading && currentSlide.heading.trim().length > 0 && currentSlide.heading !== 'New Promotional Title'
      ? currentSlide.heading
      : 'Master Practical Software Engineering';

  const displayDescription =
    currentSlide.description && currentSlide.description.trim().length > 0 && currentSlide.description !== 'Highlight an architectural topic, new release, or publication milestone.'
      ? currentSlide.description
      : 'Production-ready architectures, system design principles, and career-accelerating insights written by experienced practitioners.';

  // Resolve linked book if available
  let linkedBook: BookCardData | null = null;
  if (books && books.length > 0) {
    if (currentSlide.book_id) {
      linkedBook = (books as BookCardData[]).find((b) => b.id === currentSlide.book_id) || null;
    }
    if (!linkedBook && currentSlide.cta_url) {
      const match = currentSlide.cta_url.match(/\/e-books\/([^/?#]+)/);
      if (match) {
        const identifier = match[1];
        linkedBook = (books as BookCardData[]).find((b) => b.slug === identifier || b.id === identifier) || null;
      }
    }
  }

  const badgeText = currentSlide.badge_label || linkedBook?.category || 'Technical Spotlight';
  const canShowSample = Boolean(linkedBook?.has_free_sample && onOpenSample);

  const handleStartPlayback = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch((err) => console.error('Visitor-initiated video play failed:', err));
    }
  };

  const handleMediaError = (slideId: string) => {
    setMediaError((prev) => ({ ...prev, [slideId]: true }));
  };

  // If explicitly hidden by admin and not in admin preview mode, do not render
  if (config && config.is_visible === false && !isAdminPreview) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional Showcase"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`group relative w-full rounded-2xl sm:rounded-[24px] bg-gradient-to-br from-white via-[#FCFBFF] to-[#F8F7FF] border border-[#E8E5F5] shadow-[0_4px_24px_-2px_rgba(29,24,85,0.06)] overflow-hidden font-ebook transition-all motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#6F42DD]/40 ${className}`}
    >
      {/* ── DESKTOP COMPOSITION: ~53% Text on Left, ~47% Media on Right ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center p-5 sm:p-7 lg:p-8 xl:p-9 gap-5 sm:gap-6 lg:gap-8">
        {/* ── LEFT COLUMN: Text Content & Action Row (~53% on Desktop) ── */}
        <div
          className={`w-full lg:w-[53%] flex flex-col justify-center space-y-3 sm:space-y-4 transition-opacity duration-200 motion-reduce:transition-none ${
            isFading ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {/* Eyebrow / Category Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6F42DD]/10 text-[#6F42DD] border border-[#6F42DD]/20 text-xs font-bold w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#6F42DD]" aria-hidden="true" />
            <span>{badgeText}</span>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-[32px] font-extrabold text-[#18143F] leading-tight sm:leading-snug tracking-tight font-ebook">
            {displayHeading}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm lg:text-[15px] text-[#4D4775] leading-relaxed font-normal max-w-xl">
            {displayDescription}
          </p>

          {/* Optional Linked Book Metadata Row */}
          {linkedBook && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[#756F99] font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6F42DD]/5 text-[#6F42DD] font-semibold border border-[#6F42DD]/15">
                <BookOpen className="w-3 h-3" />
                {linkedBook.category}
              </span>
              {linkedBook.current_edition?.edition_number && (
                <span>• Ed. {linkedBook.current_edition.edition_number}</span>
              )}
              {linkedBook.total_chapter_count !== undefined && linkedBook.total_chapter_count > 0 && (
                <span>• {linkedBook.total_chapter_count} chapters</span>
              )}
              <span className="text-[#4D4775] font-semibold">• PDF & Online Reader</span>
            </div>
          )}

          {/* Action Row & Carousel Dots */}
          <div className="pt-1.5 sm:pt-2 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Primary CTA Button (Warm Gold #FFCB35 with Dark Navy text #18143F) */}
              {currentSlide.cta_label && currentSlide.cta_url ? (
                currentSlide.cta_url.startsWith('#') ? (
                  <a
                    href={currentSlide.cta_url}
                    className="btn-gold inline-flex items-center justify-center min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#18143F] shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                  >
                    <span>{currentSlide.cta_label}</span>
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    href={currentSlide.cta_url}
                    className="btn-gold inline-flex items-center justify-center min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#18143F] shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                  >
                    <span>{currentSlide.cta_label}</span>
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Link>
                )
              ) : null}

              {/* Secondary Action: Read Free Sample (Violet #6F42DD link) */}
              {canShowSample && (
                <button
                  type="button"
                  onClick={() => onOpenSample && linkedBook && onOpenSample(linkedBook)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#6F42DD] hover:text-[#5B33BE] hover:underline min-h-[44px] px-2.5 py-1 transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#6F42DD]/30 rounded-lg"
                >
                  <BookOpen className="w-4 h-4 text-[#6F42DD]" aria-hidden="true" />
                  <span>Read free sample</span>
                </button>
              )}
            </div>

            {/* Small Pagination Dots (Only if > 1 slide) */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2" aria-label="Slide indicators">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id || `dot-${idx}`}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={currentIndex === idx ? 'true' : 'false'}
                    className={`h-2 sm:h-2.5 rounded-full transition-all duration-200 cursor-pointer min-h-[32px] min-w-[20px] flex items-center justify-center p-0.5 touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#6F42DD]/40 ${
                      currentIndex === idx
                        ? 'w-6 sm:w-7 bg-[#6F42DD] shadow-xs'
                        : 'w-2 sm:w-2.5 bg-[#E8E5F5] hover:bg-[#6F42DD]/40'
                    }`}
                  >
                    <span className="sr-only">Slide {idx + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Media Preview (~47% on Desktop) ── */}
        <div className="w-full lg:w-[47%] shrink-0">
          <div
            className={`relative w-full aspect-[16/10] sm:aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs border border-[#E8E5F5] bg-[#1D1855] flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none ${
              isFading ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {currentSlide.type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {currentSlide.media_url && !mediaError[currentSlide.id] ? (
                  <>
                    <video
                      ref={videoRef}
                      src={currentSlide.media_url}
                      poster={currentSlide.poster_url || undefined}
                      preload="none"
                      playsInline
                      controls={isVideoPlaying}
                      onEnded={() => setIsVideoPlaying(false)}
                      onError={() => handleMediaError(currentSlide.id)}
                      className="w-full h-full object-cover"
                    />

                    {/* Visitor-Initiated Playback Overlay */}
                    {!isVideoPlaying && (
                      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <button
                          type="button"
                          onClick={handleStartPlayback}
                          className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FFCB35] hover:bg-[#F5A000] text-[#18143F] shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#FFCB35]/50 touch-manipulation"
                          aria-label="Play presentation video"
                        >
                          <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-current ml-0.5 sm:ml-1" />
                        </button>
                        <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm font-ebook">
                          Watch Preview
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Stylized Fallback when video media_url is missing or failed */
                  <div className="w-full h-full bg-gradient-to-br from-[#1D1855] via-[#2D1656] to-[#6F42DD] p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2 sm:mb-3">
                      <Play className="w-5 h-5 sm:w-7 sm:h-7 text-[#FFCB35] ml-0.5" />
                    </div>
                    <span className="text-xs font-bold text-[#FFCB35] tracking-wide">
                      KnowledgePaat Technical Video
                    </span>
                    <p className="text-xs sm:text-sm font-bold mt-1 line-clamp-2 max-w-xs">{currentSlide.heading}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Image Slide */
              <div className="relative w-full h-full flex items-center justify-center bg-[#1D1855]">
                {!mediaError[currentSlide.id] && currentSlide.media_url ? (
                  <img
                    src={currentSlide.media_url}
                    alt={currentSlide.alt_text || currentSlide.heading}
                    onError={() => handleMediaError(currentSlide.id)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  /* Stylized Fallback Art */
                  <div className="w-full h-full bg-gradient-to-br from-[#1D1855] via-[#2D1656] to-[#6F42DD] p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2 sm:mb-3">
                      <BookOpen className="w-5 h-5 sm:w-7 sm:h-7 text-[#FFCB35]" />
                    </div>
                    <span className="text-xs font-bold text-[#FFCB35] tracking-wide">
                      KnowledgePaat Technical
                    </span>
                    <p className="text-xs sm:text-sm font-bold mt-1 line-clamp-2 max-w-xs">{currentSlide.heading}</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtle Gradient Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-xl sm:rounded-2xl" />
          </div>
        </div>
      </div>

      {/* ── CAROUSEL PREV / NEXT ARROWS (Hidden if only 1 slide) ── */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/95 hover:bg-white text-[#18143F] hover:text-[#6F42DD] border border-[#E8E5F5] shadow-sm flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6F42DD] touch-manipulation z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/95 hover:bg-white text-[#18143F] hover:text-[#6F42DD] border border-[#E8E5F5] shadow-sm flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6F42DD] touch-manipulation z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
