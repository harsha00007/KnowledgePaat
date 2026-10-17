"use client";

import React from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  ExternalLink,
  Star,
  Clock,
  Video,
  FileText,
  BookOpen,
  GraduationCap,
  Sparkles,
  BookMarked,
  FolderGit2,
  Code2,
} from 'lucide-react';
import type { CareerNodeResourceView, ResourceType } from '@/types/resource';

interface ResourceCardProps {
  resource: CareerNodeResourceView;
  featured?: boolean;
}

export function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case 'YOUTUBE':
      return <Video className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'DOCUMENTATION':
      return <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case 'ARTICLE':
      return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'UDEMY':
    case 'KNOWLEDGEPAAT_COURSE':
    case 'LIVE_COURSE':
      return <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case 'BOOK':
      return <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'PROJECT':
      return <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case 'PRACTICE':
      return <Code2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    default:
      return <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
  }
}

export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes >= 60) {
    const hours = (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1);
    return `${hours} hrs`;
  }
  return `${minutes} mins`;
}

export function ResourceCard({ resource, featured = false }: ResourceCardProps) {
  const isRecommended = resource.is_recommended;
  const durationText = formatDuration(resource.duration_minutes);

  // Validate URL protocol safety before rendering link
  const isSafeUrl =
    typeof resource.url === 'string' &&
    (resource.url.startsWith('https://') || resource.url.startsWith('http://'));

  return (
    <Card
      flat
      className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 border ${
        isRecommended || featured
          ? 'border-blue-500 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 dark:from-blue-950/30 dark:via-slate-900 dark:to-indigo-950/20 shadow-md shadow-blue-500/5'
          : 'border-[var(--color-border)] bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800'
      }`}
    >
      <div className="space-y-3">
        {/* Recommended Banner */}
        {isRecommended && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Recommended by KnowledgePaat</span>
          </div>
        )}

        {/* Header: Provider & Type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            {getResourceTypeIcon(resource.resource_type)}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {resource.provider}
            </span>
            <span className="text-[var(--color-text-tertiary)]">•</span>
            <span className="font-mono text-[10px] uppercase text-[var(--color-text-tertiary)]">
              {resource.resource_type.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {resource.rating && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {resource.rating.toFixed(1)}
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                resource.is_free
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
              }`}
            >
              {resource.is_free
                ? 'Free'
                : `${resource.currency || 'INR'} ${resource.price || ''}`}
            </span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
          {resource.title}
        </h4>

        {/* Description snippet */}
        {resource.description && (
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Metadata Footer & Action */}
        <div className="pt-2 flex items-center justify-between text-xs text-[var(--color-text-tertiary)] border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
              {resource.difficulty}
            </span>
            {durationText && (
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                {durationText}
              </span>
            )}
            {resource.language && resource.language !== 'English' && (
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                {resource.language}
              </span>
            )}
          </div>

          {isSafeUrl ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs focus-ring"
            >
              <span>{isRecommended ? 'Start Learning' : 'Open Resource'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-[var(--color-text-tertiary)] italic">
              Link unavailable
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
