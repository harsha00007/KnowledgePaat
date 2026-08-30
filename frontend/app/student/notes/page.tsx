"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { UpgradeModal } from '@/components/UpgradeModal';
import { 
  Search, 
  Bookmark, 
  BookmarkCheck, 
  FileText, 
  Download, 
  Eye, 
  Filter, 
  Code, 
  Users, 
  Briefcase, 
  BookOpen,
  Calendar,
  Lock,
  Sparkles,
  CheckCircle2,
  Layers,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId, PlanId } from '@/config/plans';
import { getStudentPurchasedNoteIds } from '@/lib/store';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { fetchWithSWR } from '@/lib/clientQueryCache';

type Note = {
  id: string;
  title: string;
  category: string;
  technology: string | null;
  description: string;
  file_url: string;
  file_size: string;
  tags: string[];
  updated_at: string;
  minimum_plan?: string;
  access_type?: string;
};

const CATEGORIES = [
  { name: 'Aptitude', icon: BookOpen },
  { name: 'HR Interview', icon: Users },
  { name: 'Technical Interview', icon: FileText },
  { name: 'Programming', icon: Code },
  { name: 'Career Guidance', icon: Briefcase },
];

export default function NotesPage() {
  return (
    <Suspense fallback={
      <StudentLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent" />
        </div>
      </StudentLayout>
    }>
      <NotesContent />
    </Suspense>
  );
}

function NotesContent() {
  const { isModuleEnabled } = useFeatureFlags();
  const isNotesEnabled = isModuleEnabled('student_notes');

  const searchParams = useSearchParams();
  const noteIdParam = searchParams.get('noteId');
  const bundleIdParam = searchParams.get('bundleId') || searchParams.get('productId');

  const [notes, setNotes] = useState<Note[]>([]);
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(new Set());
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [ownedNoteIds, setOwnedNoteIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [bundleFilter, setBundleFilter] = useState<{ id: string; title: string; noteIds: Set<string> } | null>(null);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Selected Note for Modal
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('starter');
  const [actionError, setActionError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  const supabase = createClient();

  useEffect(() => {
    if (isNotesEnabled) {
      fetchData();
    }
  }, [noteIdParam, bundleIdParam, isNotesEnabled, currentPage, categoryFilter, searchQuery]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentOwnedNoteIds = new Set<string>();
      let currentOwnedProductIds = new Set<string>();
      
      let purchasedProductsList: any[] = [];
      
      // Fetch user subscription and purchased products for access control
      if (user) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setUserAccess(calculateUserAccess(subData));

        const { data: purchasesData } = await supabase
          .from('student_purchases')
          .select('product_id, product:product_id (*)')
          .eq('student_id', user.id);

        if (purchasesData) {
          currentOwnedProductIds = new Set(purchasesData.map(p => p.product_id).filter(Boolean));
          setOwnedProductIds(currentOwnedProductIds);
          purchasedProductsList = purchasesData.map(p => p.product).filter(Boolean);
        }

        currentOwnedNoteIds = await getStudentPurchasedNoteIds(supabase, user.id);
        // Also add direct purchased product IDs to owned note IDs
        currentOwnedProductIds.forEach(pid => currentOwnedNoteIds.add(pid));
        setOwnedNoteIds(currentOwnedNoteIds);
      }

      // Build SWR Paginated Notes Query
      const cacheKey = `notes:${currentPage}:${categoryFilter}:${searchQuery.trim()}`;

      const { data: cachedOrFresh } = await fetchWithSWR(
        cacheKey,
        async () => {
          let query = supabase
            .from('notes')
            .select('*', { count: 'exact' })
            .eq('status', 'Active');

          if (categoryFilter) {
            query = query.eq('category', categoryFilter);
          }
          if (searchQuery.trim()) {
            const q = `%${searchQuery.trim()}%`;
            query = query.or(`title.ilike.${q},description.ilike.${q},technology.ilike.${q}`);
          }

          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;

          const { data: notesData, count, error: notesError } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

          if (notesError) throw notesError;
          return {
            notes: (notesData || []) as Note[],
            count: typeof count === 'number' ? count : 0,
          };
        },
        {
          staleTimeMs: 60000,
          onRevalidate: (fresh) => {
            setTotalCount(fresh.count);
          },
        }
      );

      const loadedNotes = cachedOrFresh ? [...cachedOrFresh.notes] : [];
      if (cachedOrFresh) setTotalCount(cachedOrFresh.count);

      // Guarantee that all purchased products appear in the Notes Library
      if (purchasedProductsList.length > 0) {
        for (const prod of purchasedProductsList) {
          const alreadyPresent = loadedNotes.some(n => 
            n.id === prod.id || 
            n.id === prod.item_reference_id ||
            n.title.toLowerCase().trim() === prod.title.toLowerCase().trim()
          );

          if (!alreadyPresent) {
            const synthesizedNote: Note = {
              id: prod.id,
              title: prod.title,
              category: prod.category || 'Technical Interview',
              technology: prod.technology || null,
              description: prod.description || 'Purchased Study Guide & Revision Material.',
              file_url: prod.thumbnail_url || prod.item_reference_id || '',
              file_size: prod.file_size || 'PDF • Available',
              tags: ['Purchased', 'Store'],
              updated_at: prod.updated_at || prod.created_at || new Date().toISOString(),
              minimum_plan: 'free',
              access_type: 'free',
            };
            loadedNotes.unshift(synthesizedNote);
            currentOwnedNoteIds.add(prod.id);
          }
        }
      }

      setNotes(loadedNotes);

      // Handle direct noteId query parameter navigation from Purchases
      if (noteIdParam && loadedNotes.length > 0) {
        let targetNote = loadedNotes.find(n => n.id === noteIdParam);

        if (!targetNote) {
          // Check if noteIdParam is a store_product id with an item_reference_id or attached note
          const { data: prod } = await supabase
            .from('store_products')
            .select('id, title, item_reference_id')
            .eq('id', noteIdParam)
            .maybeSingle();

          if (prod?.item_reference_id) {
            targetNote = loadedNotes.find(n => n.id === prod.item_reference_id);
          }

          if (!targetNote) {
            const { data: bn } = await supabase
              .from('store_product_notes')
              .select('note_id')
              .eq('product_id', noteIdParam)
              .maybeSingle();

            if (bn?.note_id) {
              targetNote = loadedNotes.find(n => n.id === bn.note_id);
            }
          }

          if (!targetNote && prod?.title) {
            targetNote = loadedNotes.find(n => 
              n.title.toLowerCase().trim() === prod.title.toLowerCase().trim() ||
              n.title.toLowerCase().includes(prod.title.toLowerCase()) ||
              prod.title.toLowerCase().includes(n.title.toLowerCase())
            );
          }
        }

        if (targetNote) {
          setSelectedNote(targetNote);
          setIsModalOpen(true);
          setHighlightedNoteId(targetNote.id);
        }
      }

      // Handle bundleId query parameter navigation from Purchases
      if (bundleIdParam) {
        const { data: prodData } = await supabase
          .from('store_products')
          .select('title')
          .eq('id', bundleIdParam)
          .maybeSingle();

        const { data: bundleNotes } = await supabase
          .from('store_product_notes')
          .select('note_id')
          .eq('product_id', bundleIdParam);

        if (bundleNotes && bundleNotes.length > 0) {
          const bundleNoteIds = new Set(bundleNotes.map((bn: any) => bn.note_id));
          setBundleFilter({
            id: bundleIdParam,
            title: prodData?.title || 'Purchased Bundle',
            noteIds: bundleNoteIds,
          });
        }
      }

      // Fetch Saved Notes
      if (user) {
        const { data: savedData, error: savedError } = await supabase
          .from('saved_notes')
          .select('note_id')
          .eq('student_id', user.id);

        if (savedError) throw savedError;
        
        if (savedData) {
          setSavedNoteIds(new Set(savedData.map(s => s.note_id)));
        }
      }
    } catch (err) {
      console.error("Error fetching notes data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const checkNoteAccess = (note: Note) => {
    const reqPlan = note.minimum_plan || note.access_type || 'free';
    // Subscription access OR specific purchased note / note bundle OR owned product
    if (userAccess.hasAccess(reqPlan)) return true;
    if (ownedNoteIds.has(note.id)) return true;
    if (ownedProductIds.has(note.id)) return true;
    return false;
  };

  const handleToggleSave = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isSaved = savedNoteIds.has(noteId);
      
      setSavedNoteIds(prev => {
        const next = new Set(prev);
        if (isSaved) next.delete(noteId);
        else next.add(noteId);
        return next;
      });

      if (isSaved) {
        await supabase
          .from('saved_notes')
          .delete()
          .eq('student_id', user.id)
          .eq('note_id', noteId);
      } else {
        await supabase
          .from('saved_notes')
          .insert({ student_id: user.id, note_id: noteId });
      }
    } catch (err) {
      console.error("Error toggling saved note:", err);
    }
  };

  const handleOpenNote = (note: Note) => {
    const isUnlocked = checkNoteAccess(note);
    if (!isUnlocked) {
      setModalRequiredPlan(note.minimum_plan || note.access_type || 'free');
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const handleDownload = async (note: Note, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Client-side access control check (UI guard)
    const isUnlocked = checkNoteAccess(note);
    if (!isUnlocked) {
      setModalRequiredPlan(note.minimum_plan || note.access_type || 'free');
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      if (!note.file_url) {
        window.print();
        return;
      }

      // Server-side authorized download — entitlement verified on backend
      const res = await fetch('/api/student/notes/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Download request failed.' }));
        if (res.status === 401) {
          showError('Please sign in to download notes.');
        } else if (res.status === 403) {
          setModalRequiredPlan(note.minimum_plan || note.access_type || 'free');
          setIsUpgradeModalOpen(true);
        } else {
          showError(errData.error || 'Could not download file. Please try again.');
        }
        return;
      }

      const { signedUrl, title } = await res.json();

      if (signedUrl) {
        const a = document.createElement('a');
        a.href = signedUrl;
        a.target = '_blank';
        a.download = `${title || note.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error("Error downloading note:", err);
      showError("Could not download file. Please try again.");
    }
  };

  // Filtering
  const filteredNotes = notes.filter(note => {
    // If viewing a specific purchased bundle
    if (bundleFilter && !bundleFilter.noteIds.has(note.id)) {
      return false;
    }

    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      note.title.toLowerCase().includes(query) || 
      note.category.toLowerCase().includes(query) ||
      (note.technology && note.technology.toLowerCase().includes(query)) ||
      (note.tags && note.tags.some(t => t.toLowerCase().includes(query)));

    const matchesCategory = categoryFilter === '' || note.category === categoryFilter;
    const itemPlan = normalizePlanId(note.minimum_plan || note.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesCategory && matchesPlan;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setPlanFilter('');
    setBundleFilter(null);
  };

  if (!isNotesEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Study Notes & Guides Coming Soon"
          description="High-yield revision cheatsheets, aptitude formula booklets, and technical interview guides are currently being prepared for rollout."
          icon={FileText}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  const userPlanConfig = PLANS[userAccess.effectivePlan];

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Study Notes & Revision Guides</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              High-yield revision cheatsheets, aptitude formula booklets, and technical interview guides.
            </p>
          </div>

          {/* User Plan Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs shrink-0 self-start sm:self-center">
            <span className="text-[var(--color-text-tertiary)]">Your Plan:</span>
            <span className={`font-bold ${userPlanConfig.badgeTextColor}`}>
              {userPlanConfig.name} Member
            </span>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-md)] text-xs font-semibold">
            {actionError}
          </div>
        )}

        {/* BUNDLE ACTIVE BANNER */}
        {bundleFilter && (
          <div className="p-4 rounded-[var(--radius-xl)] bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Purchased Bundle</span>
                  <h3 className="text-sm font-bold text-[#0B1D3A]">{bundleFilter.title}</h3>
                </div>
                <p className="text-xs text-slate-600">Showing all {bundleFilter.noteIds.size} study guides included in your purchased bundle.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setBundleFilter(null)} className="text-xs shrink-0">
              <X className="w-3.5 h-3.5 mr-1" /> View All Notes
            </Button>
          </div>
        )}

        {/* CATEGORY SELECTOR CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <button 
            onClick={() => setCategoryFilter('')} 
            className={`p-3 rounded-[var(--radius-xl)] border text-left transition-all ${
              categoryFilter === '' 
                ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">All Notes</span>
              <BookOpen className={`w-3.5 h-3.5 ${categoryFilter === '' ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)]">{notes.length} Guides</p>
          </button>

          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = notes.filter(n => n.category === cat.name).length;
            const isSelected = categoryFilter === cat.name;

            return (
              <button 
                key={cat.name} 
                onClick={() => setCategoryFilter(cat.name)}
                className={`p-3 rounded-[var(--radius-xl)] border text-left transition-all ${
                  isSelected 
                    ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                    : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{cat.name}</span>
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{count} Guides</p>
              </button>
            );
          })}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search notes by title, topic, or keyword (e.g. React, SQL, Aptitude)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors bg-white"
            />
          </div>

          <div className="w-full sm:w-auto flex gap-2.5">
            <select 
              value={planFilter} 
              onChange={e => setPlanFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plan Tiers</option>
              <option value="free">Free Notes</option>
              <option value="starter">Starter Notes</option>
              <option value="pro">Pro Notes</option>
              <option value="premium">Premium Notes</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* NOTES GRID */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState 
            title="No study notes found"
            description="Try searching with different keywords or clearing your category filters."
            action={<Button variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Button>}
          />
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isSaved = savedNoteIds.has(note.id);
              const reqPlan = note.minimum_plan || note.access_type || 'free';
              const isUnlocked = checkNoteAccess(note);
              const isPurchased = ownedNoteIds.has(note.id);
              const isHighlighted = highlightedNoteId === note.id;
              const planMeta = PLANS[normalizePlanId(reqPlan)];

              return (
                <div 
                  key={note.id}
                  onClick={() => handleOpenNote(note)}
                  className={`rounded-[var(--radius-xl)] border p-5 transition-all cursor-pointer flex flex-col justify-between group ${
                    isHighlighted
                      ? 'ring-2 ring-[#2563EB] border-[#2563EB] bg-blue-50/20 shadow-md'
                      : !isUnlocked 
                      ? 'bg-slate-50/70 border-[var(--color-border)] hover:border-[var(--color-brand-300)]' 
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-sm)]'
                  }`}
                >
                  <div>
                    {/* Header: Icon, Plan Badge & Bookmark */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">{note.category}</span>
                          <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] transition-colors leading-snug line-clamp-1">
                            {note.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPurchased ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Purchased
                          </span>
                        ) : (
                          <PremiumBadge minimumPlan={reqPlan} />
                        )}
                        <button 
                          onClick={(e) => handleToggleSave(note.id, e)}
                          className="p-1.5 rounded-full hover:bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                          title={isSaved ? "Unsave Note" : "Save Note"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[var(--color-brand-600)] fill-[var(--color-brand-50)]" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                      {note.description}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.2 rounded text-[10px] font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer metadata and download action */}
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium">
                      PDF • {note.file_size}
                    </span>

                    {!isUnlocked ? (
                      <Button variant="outline" size="sm" className="text-xs h-7.5 px-3 text-[var(--color-brand-600)] border-[var(--color-brand-200)] hover:bg-[var(--color-brand-50)]">
                        <Lock className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> {planMeta.name} Required
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7.5 px-3"
                        onClick={(e) => handleDownload(note, e)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Bar */}
          {totalCount > itemsPerPage && (
            <div className="mt-6 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] flex items-center justify-between bg-white text-xs">
              <span className="font-medium text-[var(--color-text-secondary)]">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} notes
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1.5 h-8 px-3 text-xs flex items-center gap-1"
                  disabled={currentPage === 1 || isFetching}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <span className="px-2 text-xs font-semibold text-[var(--color-text-primary)]">
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1.5 h-8 px-3 text-xs flex items-center gap-1"
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage) || isFetching}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}

      </div>

      {/* NOTE PREVIEW MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Study Guide Overview" className="max-w-xl">
        {selectedNote && (
          <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
            
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-600)] bg-[var(--color-brand-50)] px-2 py-0.2 rounded border border-[var(--color-brand-200)]">{selectedNote.category}</span>
                  {ownedNoteIds.has(selectedNote.id) ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Purchased
                    </span>
                  ) : (
                    <PremiumBadge minimumPlan={selectedNote.minimum_plan || selectedNote.access_type} />
                  )}
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">{selectedNote.title}</h2>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2.5 py-1 rounded border border-[var(--color-border)]">
                {selectedNote.file_size}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-xs uppercase tracking-wide">Summary</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedNote.description}</p>
            </div>

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-xs uppercase tracking-wide">Topics Covered</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedNote.tags.map(t => (
                    <span key={t} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                Updated {new Date(selectedNote.updated_at).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                {checkNoteAccess(selectedNote) ? (
                  <Button size="sm" onClick={() => handleDownload(selectedNote)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => {
                    setModalRequiredPlan(selectedNote.minimum_plan || selectedNote.access_type || 'free');
                    setIsUpgradeModalOpen(true);
                  }}>
                    <Lock className="w-3.5 h-3.5 mr-1" /> Unlock to Download
                  </Button>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* UPGRADE PROMPT MODAL */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle="this exclusive study guide"
      />

    </StudentLayout>
  );
}
