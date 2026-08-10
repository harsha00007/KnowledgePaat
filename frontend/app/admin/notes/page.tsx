"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
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
  Upload,
  FileText,
  Download,
  CheckCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  'Aptitude',
  'HR Interview',
  'Technical Interview',
  'Programming',
  'Resume Tips',
  'Career Guidance'
];

const initialForm: Partial<Note> = {
  title: '',
  category: '',
  technology: '',
  description: '',
  tags: [],
  status: 'Active'
};

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

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
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .order('updated_at', { ascending: false });

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
      n.category.toLowerCase().includes(query) || 
      (n.technology || '').toLowerCase().includes(query) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(query))) ||
      (n.description || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === '' || n.status === statusFilter;
    const matchesCat = categoryFilter === '' || n.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCat;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData(initialForm);
    setFormErrors({});
    setSelectedNote(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);
  };

  const openEditForm = (note: Note) => {
    setFormData(note);
    setFormErrors({});
    setSelectedNote(note);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleArrayAdd = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (tagInput.trim() && !(formData.tags || []).includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleArrayRemove = (val: string) => {
    setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(item => item !== val) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormErrors(prev => ({ ...prev, file: 'Only PDF files are allowed.' }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check size (10 MB = 10 * 1024 * 1024 bytes)
    if (file.size > 10485760) {
      setFormErrors(prev => ({ ...prev, file: 'File size must be less than 10MB.' }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFormErrors(prev => { const next = { ...prev }; delete next.file; return next; });
    setSelectedFile(file);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Title is required.";
    if (!formData.category) errors.category = "Category is required.";
    if (!formData.description?.trim()) errors.description = "Description is required.";
    
    // Require file only if adding a new note
    if (!selectedNote && !selectedFile) {
      errors.file = "Please upload a PDF file.";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      let fileUrl = selectedNote ? selectedNote.file_url : '';
      let fileSize = selectedNote ? selectedNote.file_size : '';

      // Upload file if selected
      if (selectedFile) {
        const fileExt = 'pdf';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('notes')
          .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        fileUrl = filePath;
        fileSize = formatBytes(selectedFile.size);

        // Delete old file if updating
        if (selectedNote && selectedNote.file_url) {
          await supabase.storage.from('notes').remove([selectedNote.file_url]);
        }
      }

      const payload = {
        title: formData.title,
        category: formData.category,
        technology: formData.technology || null,
        description: formData.description,
        tags: formData.tags || [],
        status: formData.status,
        file_url: fileUrl,
        file_size: fileSize
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
      alert("Failed to save note.");
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
      // First try to delete file from storage
      if (selectedNote.file_url) {
        await supabase.storage.from('notes').remove([selectedNote.file_url]);
      }
      // Delete from db
      const { error } = await supabase.from('notes').delete().eq('id', selectedNote.id);
      if (error) throw error;
      
      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("Failed to delete note.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = async (note: Note) => {
    try {
      const { data, error } = await supabase.storage.from('notes').createSignedUrl(note.file_url, 60);
      if (error) throw error;
      if (data && data.signedUrl) {
        // Create an invisible link to trigger download
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.target = '_blank';
        a.download = note.title + '.pdf'; // attempt to force download attribute
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error generating download link:", err);
      alert("Failed to download file.");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notes Management</h1>
            <p className="text-sm text-slate-500 mt-1">Upload and manage study materials for students.</p>
          </div>
          <Button onClick={openAddForm} className="shrink-0 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white">
            <Upload className="w-4 h-4 mr-2" /> Upload Note
          </Button>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Category, Tech or Keyword..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select 
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No notes available."
                description="Upload study materials to help students prepare."
                action={<Button onClick={openAddForm}>Upload Note</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-6 py-4 w-1/3">Title & Category</th>
                      <th className="px-6 py-4">File Details</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Updated Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedNotes.map(n => (
                      <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-50 text-red-500 rounded mt-0.5 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{n.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                            {n.file_size}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            n.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(n.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button onClick={() => { setSelectedNote(n); setIsViewModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(n)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedNote(n); setIsStatusModalOpen(true); }} className={`p-1.5 rounded ${n.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={n.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedNote(n); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {paginatedNotes.map(n => (
                  <div key={n.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="p-2 bg-red-50 text-red-500 rounded mt-0.5 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-snug">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.category}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span className="font-medium">{n.file_size}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${n.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'}`}>
                        {n.status}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedNote(n); setIsViewModalOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => openEditForm(n)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedNote(n); setIsStatusModalOpen(true); }}><Power className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedNote(n); setIsDeleteModalOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredNotes.length)} of {filteredNotes.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" className="p-2" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" className="p-2" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </Card>

      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedNote ? "Edit Note" : "Upload New Note"} className="max-w-2xl">
        <div className="space-y-6">
          
          <div className="space-y-4">
            <Input label="Note Title *" name="title" value={formData.title} onChange={handleFormChange} error={formErrors.title} placeholder="e.g. Master React in 10 Days" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select name="category" value={formData.category} onChange={handleFormChange} className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${formErrors.category ? 'border-red-300' : 'border-slate-300'}`}>
                  <option value="" disabled>Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
              </div>
              <Input label="Technology (Optional)" name="technology" value={formData.technology} onChange={handleFormChange} placeholder="e.g. React, Python" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleFormChange} 
                rows={4}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${formErrors.description ? 'border-red-300' : 'border-slate-300'}`}
              />
              {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PDF File *</label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${formErrors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}`}>
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-10 w-10 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">PDF up to 10MB</p>
                </div>
              </div>
              
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                  <span>{formatBytes(selectedFile.size)}</span>
                </div>
              )}

              {!selectedFile && selectedNote && (
                <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium truncate">Current File Preserved</span>
                  </div>
                  <span>{selectedNote.file_size}</span>
                </div>
              )}

              {formErrors.file && <p className="text-red-500 text-xs mt-1">{formErrors.file}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tags (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleArrayAdd} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g. Hooks, CheatSheet" />
                <Button type="button" onClick={handleArrayAdd} className="px-3 py-1.5">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.tags || []).map(t => (
                  <span key={t} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 border border-slate-200">
                    {t} <button type="button" onClick={() => handleArrayRemove(t)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Visibility Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="radio" name="status" value="Active" checked={formData.status === 'Active'} onChange={handleFormChange} className="text-blue-600 focus:ring-[var(--color-brand-500)]" />
                  Active (Visible to Students)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="radio" name="status" value="Inactive" checked={formData.status === 'Inactive'} onChange={handleFormChange} className="text-blue-600 focus:ring-[var(--color-brand-500)]" />
                  Inactive (Hidden)
                </label>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW NOTE MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Note Details" className="max-w-xl">
        {selectedNote && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{selectedNote.title}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">{selectedNote.category}</span>
                  {selectedNote.technology && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">{selectedNote.technology}</span>}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${selectedNote.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'}`}>
                {selectedNote.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedNote.description}
              </div>
            </div>

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNote.tags.map(t => <span key={t} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700 border border-slate-200">{t}</span>)}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">PDF Document</p>
                  <p className="text-xs text-slate-500">{selectedNote.file_size}</p>
                </div>
              </div>
              <Button onClick={() => downloadFile(selectedNote)} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedNote && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{selectedNote.status === 'Active' ? 'deactivate' : 'activate'}</strong> this note?
            </p>
            {selectedNote.status === 'Active' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800">
                Deactivating this note will instantly remove it from the Student Portal.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                className={selectedNote.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
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
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Warning: This action is permanent.</p>
                <p className="text-sm mt-1">
                  Are you sure you want to completely delete the note <strong>"{selectedNote.title}"</strong>? This will permanently erase the database record and delete the associated PDF file from storage.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
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

function Input({ label, name, value, onChange, error, placeholder }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${error ? 'border-red-300' : 'border-slate-300'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
