"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
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
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId, PlanId } from '@/config/plans';

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(new Set());
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

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
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
          .select('product_id')
          .eq('student_id', user.id);

        if (purchasesData) {
          setOwnedProductIds(new Set(purchasesData.map(p => p.product_id)));
        }
      }

      // Fetch active Notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      if (notesData) setNotes(notesData as Note[]);

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
    // Subscription access OR owned bundles/packs
    if (userAccess.hasAccess(reqPlan)) return true;
    if (ownedProductIds.size > 0) return true; // Digital notes bundle unlocks all notes
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
    
    // Access Control check
    const isUnlocked = checkNoteAccess(note);
    if (!isUnlocked) {
      setModalRequiredPlan(note.minimum_plan || note.access_type || 'free');
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('notes')
        .createSignedUrl(note.file_url, 60);

      if (error) throw error;
      
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.target = '_blank';
        a.download = `${note.title}.pdf`;
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
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isSaved = savedNoteIds.has(note.id);
              const reqPlan = note.minimum_plan || note.access_type || 'free';
              const isUnlocked = isContentAccessible(reqPlan, userAccess);
              const planMeta = PLANS[normalizePlanId(reqPlan)];

              return (
                <div 
                  key={note.id}
                  onClick={() => handleOpenNote(note)}
                  className={`rounded-[var(--radius-xl)] border p-5 transition-all cursor-pointer flex flex-col justify-between group ${
                    !isUnlocked 
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
                        <PremiumBadge minimumPlan={reqPlan} />
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
                  <PremiumBadge minimumPlan={selectedNote.minimum_plan || selectedNote.access_type} />
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
                <Button size="sm" onClick={() => handleDownload(selectedNote)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                </Button>
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
