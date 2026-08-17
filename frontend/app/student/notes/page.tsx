"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
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
  Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Note = {
  id: string;
  title: string;
  category: string;
  description: string;
  file_url: string;
  file_size: string;
  tags: string[];
  updated_at: string;
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
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected Note for Modal
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      
      // Fetch Notes
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

  const handleToggleSave = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showError("You must be logged in to save notes.");

      const isSaved = savedNoteIds.has(noteId);

      if (isSaved) {
        await supabase
          .from('saved_notes')
          .delete()
          .eq('student_id', user.id)
          .eq('note_id', noteId);
        
        setSavedNoteIds(prev => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      } else {
        await supabase
          .from('saved_notes')
          .insert({ student_id: user.id, note_id: noteId });
          
        setSavedNoteIds(prev => {
          const next = new Set(prev);
          next.add(noteId);
          return next;
        });
      }
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const handlePreview = async (note: Note) => {
    try {
      const { data, error } = await supabase.storage
        .from('notes')
        .createSignedUrl(note.file_url, 60);
        
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error("Error previewing file:", err);
      showError(err.message || "Could not load preview. The file might be missing from storage.");
    }
  };

  const handleDownload = async (note: Note) => {
    try {
      const { data, error } = await supabase.storage
        .from('notes')
        .createSignedUrl(note.file_url, 60, { download: true });
        
      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = note.file_url.split('/').pop() || 'note.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error("Error downloading file:", err);
      showError(err.message || "Could not download. The file might be missing from storage.");
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
  };

  const filteredNotes = notes.filter(n => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      searchQuery === '' || 
      n.title.toLowerCase().includes(searchLower) ||
      n.category.toLowerCase().includes(searchLower) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(searchLower)));

    const matchesCategory = categoryFilter === '' || n.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const openNoteDetails = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Study Notes</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Browse and download concise revision materials, cheatsheets, and interview formulas.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Category, or Tag..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full sm:w-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-10 px-4">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* CATEGORY SELECTOR CARDS */}
        {!categoryFilter && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <div 
                  key={cat.name} 
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 group"
                  onClick={() => setCategoryFilter(cat.name)}
                >
                  <div className="h-10 w-10 bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] text-[var(--color-brand-600)] rounded-[var(--radius-md)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[var(--color-text-primary)] text-xs group-hover:text-[var(--color-brand-600)] transition-colors">{cat.name}</h3>
                </div>
              );
            })}
          </div>
        )}

        {/* NOTES GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {categoryFilter ? `${categoryFilter} Notes` : 'All Study Resources'} ({filteredNotes.length})
            </h2>
            {categoryFilter && (
              <button 
                onClick={() => setCategoryFilter('')} 
                className="text-xs text-[var(--color-brand-600)] hover:underline font-semibold"
              >
                Show All Categories
              </button>
            )}
          </div>
          
          {isFetching ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyState 
              title="No notes found."
              description="We couldn't find any resources matching your search query."
              action={<Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotes.map(note => {
                const isSaved = savedNoteIds.has(note.id);
                
                return (
                  <div 
                    key={note.id} 
                    className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] transition-all flex flex-col justify-between"
                  >
                    {/* Card Top */}
                    <div className="p-5 flex-1 cursor-pointer" onClick={() => openNoteDetails(note)}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {note.category}
                        </span>
                        <button 
                          onClick={(e) => handleToggleSave(note.id, e)}
                          className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-[var(--color-brand-600)] bg-[var(--color-brand-50)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]'}`}
                          title={isSaved ? "Remove from Saved" : "Save Note"}
                          aria-label={isSaved ? "Saved" : "Save"}
                        >
                          {isSaved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1.5 line-clamp-2 hover:text-[var(--color-brand-600)] transition-colors">
                        {note.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                        {note.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-tertiary)] font-medium mt-auto">
                        <span className="flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                          <FileText className="w-3 h-3" /> PDF
                        </span>
                        <span className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                          {note.file_size}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 border-t border-[var(--color-border)]">
                      <button 
                        onClick={() => handlePreview(note)}
                        className="py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 border-r border-[var(--color-border)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button 
                        onClick={() => handleDownload(note)}
                        className="py-2.5 text-xs font-semibold text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* NOTE DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Note Details" className="max-w-xl">
        {selectedNote && (
          <div className="space-y-4">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedNote.category}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(selectedNote.updated_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedNote.title}</h2>
            </div>

            {/* Tags */}
            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] mb-1">Description</h3>
              <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {selectedNote.description}
              </p>
            </div>

            {/* File Info */}
            <div className="flex items-center gap-3 p-3.5 border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-white">
              <div className="h-10 w-10 bg-red-50 text-red-600 border border-red-200 rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] truncate">PDF Document</h4>
                <p className="text-xs text-[var(--color-text-tertiary)]">Size: {selectedNote.file_size}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleToggleSave(selectedNote.id)}
              >
                {savedNoteIds.has(selectedNote.id) ? (
                  <><BookmarkCheck className="w-3.5 h-3.5 mr-1" /> Saved</>
                ) : (
                  <><Bookmark className="w-3.5 h-3.5 mr-1" /> Save Note</>
                )}
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handlePreview(selectedNote)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> Open Preview
              </Button>
              <Button 
                variant="primary"
                size="sm"
                onClick={() => handleDownload(selectedNote)}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download File
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* TOAST ERROR NOTIFICATION */}
      {actionError && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded-[var(--radius-lg)] shadow-lg z-50 flex items-center gap-2.5 animate-in fade-in">
          <FileText className="w-4 h-4" />
          <p className="text-xs font-semibold">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

    </StudentLayout>
  );
}
