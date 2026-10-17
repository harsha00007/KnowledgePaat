"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock
} from 'lucide-react';

export interface CareerOption {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  category?: string;
  difficulty?: string;
  estimated_duration?: string;
}

export interface TargetCareerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCareerId?: string | null;
  onCareerSelected: (career: CareerOption) => Promise<void> | void;
}

interface ApiCareerItem {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimated_duration?: string;
}

interface ApiCareersResponse {
  items?: ApiCareerItem[];
  total?: number;
}

function TargetCareerModalContent({
  onClose,
  currentCareerId,
  onCareerSelected,
}: {
  onClose: () => void;
  currentCareerId?: string | null;
  onCareerSelected: (career: CareerOption) => Promise<void> | void;
}) {
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentCareerId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadCatalog() {
      try {
        const res = await fetch('/api/careers?limit=100');
        if (!res.ok) throw new Error('Failed to load career catalog.');
        const data: ApiCareersResponse = await res.json();
        if (isSubscribed) {
          const items: CareerOption[] = (data.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            short_description: item.short_description || item.description || '',
            category: item.category,
            difficulty: item.difficulty,
            estimated_duration: item.estimated_duration,
          }));
          setCareers(items);
        }
      } catch (err) {
        if (isSubscribed) {
          const msg = err instanceof Error ? err.message : 'Unable to load available career paths.';
          setErrorMessage(msg);
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingCatalog(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const filteredCareers = useMemo(() => {
    if (!searchQuery.trim()) return careers;
    const q = searchQuery.toLowerCase().trim();
    return careers.filter((c) => 
      c.name.toLowerCase().includes(q) ||
      (c.short_description && c.short_description.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q))
    );
  }, [careers, searchQuery]);

  const selectedCareer = useMemo(() => {
    return careers.find((c) => c.id === selectedId) || null;
  }, [careers, selectedId]);

  const handleConfirm = async () => {
    if (!selectedCareer) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/student/target-career', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCareerId: selectedCareer.id }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(errorData.error || errorData.message || 'Failed to update target career.');
      }

      await onCareerSelected(selectedCareer);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save your career goal. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Select your target role. KnowledgePaat will map your current skills against the canonical
        career requirements and determine your highest-priority next action.
      </p>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search career paths (e.g., Python Developer, Frontend Developer)..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all"
          aria-label="Search career paths"
          disabled={isLoadingCatalog}
        />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)] animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Career List */}
      <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 divide-y-0">
        {isLoadingCatalog ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)]">
            <Loader size="md" />
            <span className="text-xs font-medium">Loading career catalog...</span>
          </div>
        ) : filteredCareers.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            <p className="text-sm font-medium">No careers match &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Try searching for a different title or keyword.
            </p>
          </div>
        ) : (
          filteredCareers.map((career) => {
            const isSelected = career.id === selectedId;
            return (
              <div
                key={career.id}
                onClick={() => setSelectedId(career.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setSelectedId(career.id);
                  }
                }}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                className={`
                  p-3.5 rounded-[var(--radius-lg)] border transition-all cursor-pointer select-none text-left flex items-start gap-3
                  ${
                    isSelected
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]/40 ring-1 ring-[var(--color-brand-500)] shadow-xs'
                      : 'border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-slate-50/60'
                  }
                `}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                        : 'border-[var(--color-border)] bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      {career.name}
                    </span>
                    {career.difficulty && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-700">
                        {career.difficulty}
                      </span>
                    )}
                    {career.category && (
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {career.category}
                      </span>
                    )}
                  </div>

                  {career.short_description && (
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                      {career.short_description}
                    </p>
                  )}

                  {career.estimated_duration && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-[var(--color-text-tertiary)] font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Estimated duration: {career.estimated_duration}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] mt-4">
        <div className="text-xs text-[var(--color-text-tertiary)] font-medium">
          {selectedCareer ? (
            <span>Selected: <strong className="text-[var(--color-text-primary)]">{selectedCareer.name}</strong></span>
          ) : (
            <span>Select a career path to proceed</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={!selectedId || isSaving || isLoadingCatalog}
          >
            {isSaving ? (
              <>
                <Loader size="sm" className="mr-1.5" />
                Saving Goal...
              </>
            ) : (
              'Confirm Career Goal'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TargetCareerModal({
  isOpen,
  onClose,
  currentCareerId,
  onCareerSelected,
}: TargetCareerModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Career Goal"
      className="max-w-2xl"
    >
      <TargetCareerModalContent
        onClose={onClose}
        currentCareerId={currentCareerId}
        onCareerSelected={onCareerSelected}
      />
    </Modal>
  );
}
