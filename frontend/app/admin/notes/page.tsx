"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Power, 
  Trash2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Download,
  Upload,
  BookOpen,
  Calendar,
  Lock
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizePlanId } from '@/config/plans';

type Note = {
  id: string;
  title: string;
  category: string;
  technology: string | null;
  description: string;
  file_url: string;
  file_size: string;
  tags: string[];
  status: string;
  minimum_plan?: string;
  access_type?: string;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  'Aptitude',
  'HR Interview',
  'Technical Interview',
  'Programming',
  'Career Guidance'
];

const initialForm: Partial<Note> = {
  title: '',
  category: 'Technical Interview',
  technology: '',
  description: '',
  file_url: '',
  file_size: '',
  tags: [],
  status: 'Active',
  minimum_plan: 'free'
};

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Modals
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Note>>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setNotes(data as Note[]);
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredNotes = notes.filter(n => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      n.title.toLowerCase().includes(query) || 
      (n.technology && n.technology.toLowerCase().includes(query)) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(query)));

    const matchesStatus = statusFilter === '' || n.status === statusFilter;
    const matchesCat = categoryFilter === '' || n.category === categoryFilter;
    
    const itemPlan = normalizePlanId(n.minimum_plan || n.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesStatus && matchesCat && matchesPlan;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setPlanFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData(initialForm);
    setSelectedFile(null);
    setFormErrors({});
    setSelectedNote(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (note: Note) => {
    setFormData({
      ...note,
      minimum_plan: normalizePlanId(note.minimum_plan || note.access_type)
    });
    setSelectedFile(null);
    setFormErrors({});
    setSelectedNote(note);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (tagInput.trim() && !(formData.tags || []).includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setFormErrors(prev => ({ ...prev, file: "Only PDF files are supported." }));
        return;
      }
      setSelectedFile(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFormData(prev => ({ ...prev, file_size: `${sizeMb} MB` }));
      if (formErrors.file) {
        setFormErrors(prev => { const next = { ...prev }; delete next.file; return next; });
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Title is required.";
    if (!formData.category) errors.category = "Category is required.";
    if (!formData.description?.trim()) errors.description = "Summary is required.";
    if (!selectedNote && !selectedFile && !formData.file_url) errors.file = "PDF file is required.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      let finalFileUrl = formData.file_url || '';
      let finalFileSize = formData.file_size || '1.0 MB';

      // Handle PDF Upload if a new file is picked
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const cleanName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `notes/${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('notes')
          .upload(filePath, selectedFile, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) throw uploadError;

        finalFileUrl = filePath;
        finalFileSize = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
      }

      const payload = {
        title: formData.title,
        category: formData.category,
        technology: formData.technology || null,
        description: formData.description,
        file_url: finalFileUrl,
        file_size: finalFileSize,
        tags: formData.tags || [],
        status: formData.status || 'Active',
        minimum_plan: formData.minimum_plan || 'free',
        access_type: formData.minimum_plan === 'free' ? 'Free' : 'Premium'
      };

      if (selectedNote) {
        // Update
        const { error } = await supabase.from('notes').update(payload).eq('id', selectedNote.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('notes').insert(payload);
        if (error) throw error;
      }

      await fetchNotes();
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Failed to save note. Please check Supabase Storage permissions.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- ACTIONS ---------------- //
  const handleToggleStatus = async () => {
    if (!selectedNote) return;
    setIsProcessing(true);
    try {
      const newStatus = selectedNote.status === 'Active' ? 'Inactive' : 'Active';
      const { error } = await supabase.from('notes').update({ status: newStatus }).eq('id', selectedNote.id);
      if (error) throw error;
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, status: newStatus } : n));
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    setIsProcessing(true);
    try {
      // 1. Delete from database
      const { error } = await supabase.from('notes').delete().eq('id', selectedNote.id);
      if (error) throw error;

      // 2. Cleanup Storage file
      if (selectedNote.file_url) {
        await supabase.storage.from('notes').remove([selectedNote.file_url]);
      }

      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting note:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPreview = async (note: Note) => {
    try {
      const { data, error } = await supabase.storage.from('notes').createSignedUrl(note.file_url, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error("Error generating signed download URL:", err);
      alert("Unable to open PDF.");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Study Notes Management</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Upload, organize, and manage downloadable revision notes, formula sheets, and minimum plan requirements.
            </p>
          </div>
          <Button size="sm" onClick={openAddForm} className="shrink-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Upload New Note
          </Button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Note Title, Topic or Tags..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select 
              value={planFilter} onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>

            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* DATA TABLE CONTAINER */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No study notes found."
                description="Try clearing your search query or upload a new PDF note."
                action={<Button size="sm" onClick={openAddForm}>Upload Note</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5 w-1/3">Title & Summary</th>
                      <th className="px-5 py-3.5">Required Plan</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">File Size</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedNotes.map(n => (
                      <tr key={n.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)] leading-snug">{n.title}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-xs">{n.description}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <PremiumBadge minimumPlan={n.minimum_plan || n.access_type} showLockIfPaid={false} />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">{n.category}</td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--color-text-tertiary)]">{n.file_size}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            n.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => handleDownloadPreview(n)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Download / Preview PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedNote(n); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(n)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Note">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedNote(n); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${n.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={n.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedNote(n); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Note">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedNotes.map(n => (
                  <div key={n.id} className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] leading-snug">{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PremiumBadge minimumPlan={n.minimum_plan || n.access_type} showLockIfPaid={false} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${n.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {n.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded text-[11px] font-medium text-[var(--color-text-secondary)]">{n.category}</span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">{n.file_size}</span>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2" onClick={() => handleDownloadPreview(n)}>PDF</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2" onClick={() => { setSelectedNote(n); setIsViewModalOpen(true); }}>View</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2" onClick={() => openEditForm(n)}>Edit</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2" onClick={() => { setSelectedNote(n); setIsStatusModalOpen(true); }}>{n.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2 text-red-600 hover:bg-red-50" onClick={() => { setSelectedNote(n); setIsDeleteModalOpen(true); }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredNotes.length)} of {filteredNotes.length} notes
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="p-1.5 h-8 w-8 justify-center" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" className="p-1.5 h-8 w-8 justify-center" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedNote ? "Edit Study Note" : "Upload Study Note"} className="max-w-2xl">
        <div className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Note Title *</label>
            <input type="text" name="title" value={formData.title || ''} onChange={handleFormChange} placeholder="e.g. Complete SQL Joins & Window Functions Guide" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category *</label>
              <select name="category" value={formData.category} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Minimum Required Plan</label>
              <select name="minimum_plan" value={formData.minimum_plan || 'free'} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white font-semibold text-[var(--color-brand-700)]">
                <option value="free">Free (All Students)</option>
                <option value="starter">Starter Plan (₹49+)</option>
                <option value="pro">Pro Plan (₹99+)</option>
                <option value="premium">Premium Plan (₹149)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Technology (Optional)</label>
              <input type="text" name="technology" value={formData.technology || ''} onChange={handleFormChange} placeholder="e.g. Python, DBMS" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            </div>
          </div>

          {/* PDF File Upload */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">PDF File Document *</label>
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 text-center hover:bg-[var(--color-bg-subtle)] transition-colors">
              <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdfUploadInput" />
              <label htmlFor="pdfUploadInput" className="cursor-pointer flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-[var(--color-brand-600)] mb-1" />
                <span className="text-xs font-semibold text-[var(--color-brand-600)]">
                  {selectedFile ? selectedFile.name : selectedNote?.file_url ? 'Replace existing PDF' : 'Click to select PDF document'}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Maximum size: 10MB • Format: .pdf</span>
              </label>
            </div>
            {formErrors.file && <p className="text-red-500 mt-1">{formErrors.file}</p>}
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Summary / Description *</label>
            <textarea name="description" value={formData.description || ''} onChange={handleFormChange} rows={3} placeholder="Brief summary of the concepts covered in this study guide..." className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            {formErrors.description && <p className="text-red-500 mt-1">{formErrors.description}</p>}
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Topic Tags</label>
            <div className="flex gap-2 mb-1.5">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Type tag and press Enter..." className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" />
              <Button type="button" size="sm" onClick={handleAddTag}>Add Tag</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(formData.tags || []).map(t => (
                <span key={t} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border border-[var(--color-brand-200)]">
                  #{t} <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Visibility Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="Active" checked={formData.status === 'Active'} onChange={handleFormChange} />
                <span>Active (Downloadable by Students)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="Inactive" checked={formData.status === 'Inactive'} onChange={handleFormChange} />
                <span>Inactive (Hidden)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Uploading & Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Study Guide Overview" className="max-w-xl">
        {selectedNote && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">{selectedNote.title}</h2>
                  <PremiumBadge minimumPlan={selectedNote.minimum_plan || selectedNote.access_type} />
                </div>
                <span className="text-xs font-semibold text-[var(--color-brand-600)]">{selectedNote.category}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedNote.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {selectedNote.status}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Summary</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedNote.description}</p>
            </div>

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Topic Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedNote.tags.map(t => <span key={t} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded text-xs font-medium">#{t}</span>)}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => handleDownloadPreview(selectedNote)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Open Signed PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedNote && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedNote.status === 'Active' ? 'deactivate' : 'activate'}</strong> "{selectedNote.title}"?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedNote.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedNote.status === 'Active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Note">
        {selectedNote && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Warning: This action cannot be undone.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete <strong>"{selectedNote.title}"</strong>? The PDF file in storage will also be deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className="bg-red-600 hover:bg-red-700 border-transparent text-white"
                onClick={handleDelete} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting...' : 'Yes, Delete Note'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
