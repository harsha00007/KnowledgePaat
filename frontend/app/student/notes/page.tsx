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
  File,
  Code,
  Users,
  Briefcase,
  BookOpen
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
  { name: 'Aptitude', icon: <BookOpen className="w-5 h-5" /> },
  { name: 'HR Interview', icon: <Users className="w-5 h-5" /> },
  { name: 'Technical Interview', icon: <FileText className="w-5 h-5" /> },
  { name: 'Programming', icon: <Code className="w-5 h-5" /> },
  { name: 'Resume Tips', icon: <File className="w-5 h-5" /> },
  { name: 'Career Guidance', icon: <Briefcase className="w-5 h-5" /> },
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
        // Trigger download programmatically
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = note.file_url.split('/').pop() || 'download.pdf';
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

  // Filter Logic
  const filteredNotes = notes.filter(n => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      searchQuery === '' || 
      n.title.toLowerCase().includes(searchLower) ||
      n.category.toLowerCase().includes(searchLower) ||
      n.tags.some(t => t.toLowerCase().includes(searchLower));

    const matchesCategory = categoryFilter === '' || n.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const openNoteDetails = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Notes</h1>
          <p className="text-sm text-slate-500 mt-1">Access interview preparation notes, programming guides, aptitude material, and career resources.</p>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-slate-200 shadow-sm shadow-sm flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Category, Technology, or Keyword..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm"
            />
          </div>

          <div className="w-full sm:w-auto flex gap-3">
            <Button variant="outline" onClick={resetFilters} className="text-sm w-full sm:w-auto">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* CATEGORY CARDS */}
        {!categoryFilter && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(cat => (
              <Card 
                key={cat.name} 
                className="p-4 border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 group"
                onClick={() => setCategoryFilter(cat.name)}
              >
                <div className="h-10 w-10 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {cat.icon}
                </div>
                <h3 className="font-medium text-slate-900 text-sm">{cat.name}</h3>
              </Card>
            ))}
          </div>
        )}

        {/* NOTES GRID */}
        <div>
          {categoryFilter && (
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {categoryFilter} Notes
              </h2>
              <span className="text-sm text-slate-500">({filteredNotes.length} found)</span>
            </div>
          )}
          
          {isFetching ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyState 
              title="No notes available."
              description="We couldn't find any notes matching your criteria."
              action={<Button onClick={resetFilters}>Clear Filters</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map(note => {
                const isSaved = savedNoteIds.has(note.id);
                
                return (
                  <Card key={note.id} className="border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col h-full bg-white">
                    {/* Card Top */}
                    <div className="p-5 flex-1 cursor-pointer" onClick={() => openNoteDetails(note)}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {note.category}
                        </span>
                        <button 
                          onClick={(e) => handleToggleSave(note.id, e)}
                          className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-[var(--color-brand-600)] bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={isSaved ? "Remove Saved Note" : "Save Note"}
                        >
                          {isSaved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{note.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                        {note.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-auto">
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </span>
                        <span className="bg-gray-50 px-2 py-1 rounded">
                          {note.file_size}
                        </span>
                        <span className="bg-gray-50 px-2 py-1 rounded">
                          Updated {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 border-t border-gray-100">
                      <button 
                        onClick={() => handlePreview(note)}
                        className="py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[var(--color-brand-600)] flex items-center justify-center gap-2 border-r border-gray-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button 
                        onClick={() => handleDownload(note)}
                        className="py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[var(--color-brand-600)] flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* NOTE DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Note Details" className="max-w-2xl">
        {selectedNote && (
          <div className="space-y-6">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedNote.category}
                </span>
                <span className="text-xs text-slate-500">
                  Last Updated: {new Date(selectedNote.updated_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedNote.title}</h2>
            </div>

            {/* Tags */}
            {selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium text-slate-600 bg-gray-100 px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="bg-gray-50 border border-slate-200 shadow-sm rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {selectedNote.description}
              </p>
            </div>

            {/* File Info */}
            <div className="flex items-center gap-6 p-4 border border-slate-200 shadow-sm rounded-xl">
              <div className="h-12 w-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">PDF Document</h4>
                <p className="text-sm text-slate-500">Size: {selectedNote.file_size}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button 
                variant={savedNoteIds.has(selectedNote.id) ? "outline" : "outline"} 
                className="w-full sm:w-auto"
                onClick={() => handleToggleSave(selectedNote.id)}
              >
                {savedNoteIds.has(selectedNote.id) ? (
                  <><BookmarkCheck className="w-4 h-4 mr-2" /> Saved</>
                ) : (
                  <><Bookmark className="w-4 h-4 mr-2" /> Save Note</>
                )}
              </Button>
              <Button 
                variant="outline"
                className="w-full sm:w-auto text-gray-700 border-gray-300 hover:bg-gray-50"
                onClick={() => handlePreview(selectedNote)}
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              <Button 
                variant="primary"
                className="w-full sm:w-auto bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white"
                onClick={() => handleDownload(selectedNote)}
              >
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* TOAST NOTIFICATION */}
      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-red-700 p-1 rounded-full"><FileText className="w-4 h-4" /></div>
          <p className="text-sm font-medium">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-2 text-red-200 hover:text-white">✕</button>
        </div>
      )}

    </StudentLayout>
  );
}
