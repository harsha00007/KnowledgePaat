"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { MediaCardConfig, MediaSlide } from '@/types/ebook';

export interface MediaCardProps {
  config?: MediaCardConfig | null;
  className?: string;
  isAdminPreview?: boolean;
}

const DEFAULT_SLIDE: MediaSlide = {
  id: 'default-launch-slide',
  type: 'image',
  heading: 'Architect Your Engineering Career',
  description:
    'Comprehensive technical guides on System Design, Cloud Architecture, and DevOps written by industry practitioners. Read online instantly or take DRM-free PDF editions offline.',
  cta_label: 'Explore Technical Guides',
  cta_url: '#catalogue',
  media_url: '/brand/knowledgepaat_icon.png',
  poster_url: null,
  alt_text: 'KnowledgePaat Engineering Guides',
  is_active: true,
  order: 0,
};

export function MediaCard({ config, className = '', isAdminPreview = false }: MediaCardProps) {
  // If explicitly hidden by admin and not in admin preview mode, do not render
  if (config && config.is_visible === false && !isAdminPreview) {
    return null;
  }

  const rawSlides = config?.slides && config.slides.length > 0 ? config.slides : [DEFAULT_SLIDE];
  const activeSlides = rawSlides
    .filter((s) => s.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const slides = activeSlides.length > 0 ? activeSlides : [DEFAULT_SLIDE];
  const totalSlides = slides.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mediaError, setMediaError] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Safely clamp index if slides change
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  // Pause playing video whenever current slide changes
  const pauseCurrentVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      pauseCurrentVideo();
      const nextIndex = (index + totalSlides) % totalSlides;
      setCurrentIndex(nextIndex);
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

  const currentSlide = slides[currentIndex] || slides[0];

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

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Media Card"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`relative w-full rounded-2xl sm:rounded-3xl bg-white border border-[#E8E5F5] shadow-[0_4px_24px_-2px_rgba(29,24,85,0.06)] overflow-hidden font-ebook transition-all motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#6F42DD]/40 ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[320px] sm:min-h-[380px]">
        {/* ── LEFT COLUMN: Text Content & Optional CTA ── */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6F42DD]/10 text-[#6F42DD] border border-[#6F42DD]/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Technical Spotlight</span>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#18143F] leading-tight tracking-tight font-ebook">
              {currentSlide.heading}
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#4D4775] leading-relaxed max-w-xl font-normal">
              {currentSlide.description}
            </p>
          </div>

          {/* Action Row & Carousel Indicators */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            {/* Optional CTA Button */}
            {currentSlide.cta_label && currentSlide.cta_url ? (
              currentSlide.cta_url.startsWith('#') ? (
                <a
                  href={currentSlide.cta_url}
                  className="btn-gold inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <span>{currentSlide.cta_label}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              ) : (
                <Link
                  href={currentSlide.cta_url}
                  className="btn-gold inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <span>{currentSlide.cta_label}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              )
            ) : (
              <div />
            )}

            {/* Carousel Indicators (Only if > 1 slide) */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-2" aria-label="Slide indicators">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id || `dot-${idx}`}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={currentIndex === idx ? 'true' : 'false'}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      currentIndex === idx
                        ? 'w-7 bg-[#6F42DD] shadow-xs'
                        : 'w-2.5 bg-[#E8E5F5] hover:bg-[#6F42DD]/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Media (Image or Video) ── */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-[#1D1855]/5 via-[#6F42DD]/5 to-[#F8F7FF] flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[240px] sm:min-h-[280px] border-t lg:border-t-0 lg:border-l border-[#E8E5F5]">
          <div className="relative w-full aspect-video sm:aspect-[4/3] lg:aspect-auto lg:h-full max-h-[340px] rounded-2xl overflow-hidden shadow-sm border border-[#E8E5F5] bg-[#1D1855] flex items-center justify-center">
            {currentSlide.type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
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
                {!isVideoPlaying && !mediaError[currentSlide.id] && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <button
                      type="button"
                      onClick={handleStartPlayback}
                      className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFCB35] hover:bg-[#F5A000] text-[#18143F] shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#FFCB35]/50"
                      aria-label="Play presentation video"
                    >
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
                    </button>
                    <span className="text-xs font-bold text-white uppercase tracking-wider drop-shadow-sm font-ebook">
                      Watch Preview
                    </span>
                  </div>
                )}

                {/* Broken Video Fallback */}
                {mediaError[currentSlide.id] && (
                  <div className="w-full h-full bg-gradient-to-br from-[#1D1855] to-[#6F42DD] p-6 text-white flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-10 h-10 text-[#FFCB35] mb-2" />
                    <p className="text-sm font-bold">{currentSlide.heading}</p>
                    <p className="text-xs text-indigo-200 mt-1">KnowledgePaat Technical Video</p>
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
                  <div className="w-full h-full bg-gradient-to-br from-[#1D1855] via-[#2D1656] to-[#6F42DD] p-6 text-white flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                      <BookOpen className="w-7 h-7 text-[#FFCB35]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#FFCB35] uppercase tracking-wider">
                      KnowledgePaat Technical
                    </span>
                    <p className="text-sm font-bold mt-1 line-clamp-2 max-w-xs">{currentSlide.heading}</p>
                  </div>
                )}
              </div>
            )}

            {/* Subtle Gradient Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* ── CAROUSEL PREV / NEXT ARROWS (Hidden if only 1 slide) ── */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous media slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-[#18143F] hover:text-[#6F42DD] border border-[#E8E5F5] shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6F42DD]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next media slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-[#18143F] hover:text-[#6F42DD] border border-[#E8E5F5] shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6F42DD]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
