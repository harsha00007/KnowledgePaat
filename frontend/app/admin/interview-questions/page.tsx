"use client";

import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Code,
  Building,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Category = {
  id: string;
  name: string;
};

type Question = {
  id: string;
  category_id: string;
  title: string;
  answer: string;
  tips: string | null;
  common_mistakes: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_time: string;
  company_tags: string[];
  technology_tags: string[];
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  category?: { name: string };
};

const initialForm: Partial<Question> = {
  title: '',
  category_id: '',
  answer: '',
  tips: '',
  common_mistakes: '',
  difficulty: 'Medium',
  estimated_time: '5 mins',
  company_tags: [],
  technology_tags: [],
  tags: [],
  status: 'Active'
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');

  // Modals
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Question>>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [techInput, setTechInput] = useState('');
  const [compInput, setCompInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('interview_categories')
        .select('id, name')
        .order('order_index', { ascending: true });
      if (catError) throw catError;
      if (catData) setCategories(catData as Category[]);

      // Fetch questions
      const { data: qData, error: qError } = await supabase
        .from('interview_questions')
        .select(`
          *,
          interview_categories(name)
        `)
        .order('created_at', { ascending: false });

      if (qError) throw qError;
      if (qData) {
        // Map relationship
        const mapped = qData.map(q => ({ ...q, category: q.interview_categories })) as Question[];
        setQuestions(mapped);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredQuestions = questions.filter(q => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      q.title.toLowerCase().includes(query) || 
      (q.category?.name || '').toLowerCase().includes(query) || 
      (q.technology_tags && q.technology_tags.some(t => t.toLowerCase().includes(query))) ||
      (q.company_tags && q.company_tags.some(c => c.toLowerCase().includes(query)));

    const matchesStatus = statusFilter === '' || q.status === statusFilter;
    const matchesCat = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDiff = diffFilter === '' || q.difficulty === diffFilter;

    return matchesSearch && matchesStatus && matchesCat && matchesDiff;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setDiffFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData({ ...initialForm, category_id: categories.length > 0 ? categories[0].id : '' });
    setFormErrors({});
    setSelectedQuestion(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (q: Question) => {
    setFormData(q);
    setFormErrors({});
    setSelectedQuestion(q);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleArrayAdd = (
    e: React.KeyboardEvent | React.MouseEvent, 
    inputVal: string, 
    setInputVal: any, 
    field: 'technology_tags' | 'company_tags' | 'tags'
  ) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (inputVal.trim() && !(formData[field] || []).includes(inputVal.trim())) {
      setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), inputVal.trim()] }));
      setInputVal('');
    }
  };

  const handleArrayRemove = (val: string, field: 'technology_tags' | 'company_tags' | 'tags') => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] || []).filter(item => item !== val) }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Question Title is required.";
    if (!formData.category_id) errors.category_id = "Category is required.";
    if (!formData.answer?.trim()) errors.answer = "Answer is required.";
    if (!formData.difficulty) errors.difficulty = "Difficulty is required.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      const payload = {
        title: formData.title,
        category_id: formData.category_id,
        answer: formData.answer,
        tips: formData.tips,
        common_mistakes: formData.common_mistakes,
        difficulty: formData.difficulty,
        estimated_time: formData.estimated_time || '5 mins',
        company_tags: formData.company_tags || [],
        technology_tags: formData.technology_tags || [],
        tags: formData.tags || [],
        status: formData.status
      };

      if (selectedQuestion) {
        // Update
        const { error } = await supabase.from('interview_questions').update(payload).eq('id', selectedQuestion.id);
        if (error) throw error;
        // Refresh full list to get relations correct
        await fetchData();
      } else {
        // Insert
        const { error } = await supabase.from('interview_questions').insert(payload);
        if (error) throw error;
        // Refresh full list to get relations correct
        await fetchData();
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Error saving question:", err);
      alert("Failed to save question.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- ACTIONS ---------------- //
  const handleToggleStatus = async () => {
    if (!selectedQuestion) return;
    setIsProcessing(true);
    try {
      const newStatus = selectedQuestion.status === 'Active' ? 'Inactive' : 'Active';
      const { error } = await supabase.from('interview_questions').update({ status: newStatus }).eq('id', selectedQuestion.id);
      if (error) throw error;
      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? { ...q, status: newStatus } : q));
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('interview_questions').delete().eq('id', selectedQuestion.id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting question:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview Questions Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage interview preparation content for students.</p>
          </div>
          <Button onClick={openAddForm} className="shrink-0 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Question, Category, Tech or Company..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select 
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              value={diffFilter} onChange={e => { setDiffFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
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
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No interview questions found."
                description="Try adjusting your search criteria or add a new question."
                action={<Button onClick={openAddForm}>Add Question</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-6 py-4 w-1/3">Question Title</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Difficulty</th>
                      <th className="px-6 py-4">Tags</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedQuestions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 line-clamp-2">{q.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{new Date(q.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{q.category?.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' : 
                            q.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {q.technology_tags.slice(0, 2).map(t => <span key={t} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{t}</span>)}
                            {q.company_tags.slice(0, 2).map(c => <span key={c} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">{c}</span>)}
                            {(q.technology_tags.length + q.company_tags.length > 4) && <span className="text-[10px] text-slate-500">+{q.technology_tags.length + q.company_tags.length - 4}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            q.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button onClick={() => { setSelectedQuestion(q); setIsViewModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(q)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedQuestion(q); setIsStatusModalOpen(true); }} className={`p-1.5 rounded ${q.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={q.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedQuestion(q); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
                {paginatedQuestions.map(q => (
                  <div key={q.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-900 leading-snug pr-2">{q.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${q.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'}`}>
                        {q.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{q.category?.name}</span>
                      <span className={`px-2 py-0.5 rounded font-medium border ${
                        q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' : 
                        q.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedQuestion(q); setIsViewModalOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => openEditForm(q)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedQuestion(q); setIsStatusModalOpen(true); }}><Power className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedQuestion(q); setIsDeleteModalOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
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
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedQuestion ? "Edit Question" : "Add New Question"} className="max-w-4xl">
        <div className="space-y-6">
          
          <div className="space-y-4">
            <Input label="Question Title *" name="title" value={formData.title} onChange={handleFormChange} error={formErrors.title} placeholder="e.g. What is the Virtual DOM?" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select name="category_id" value={formData.category_id} onChange={handleFormChange} className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${formErrors.category_id ? 'border-red-300' : 'border-slate-300'}`}>
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.category_id && <p className="text-red-500 text-xs mt-1">{formErrors.category_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty *</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleFormChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Answer *</label>
              <textarea 
                name="answer" 
                value={formData.answer} 
                onChange={handleFormChange} 
                rows={6}
                placeholder="Provide a comprehensive answer..."
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${formErrors.answer ? 'border-red-300' : 'border-slate-300'}`}
              />
              {formErrors.answer && <p className="text-red-500 text-xs mt-1">{formErrors.answer}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Tips (Optional)</label>
              <textarea 
                name="tips" 
                value={formData.tips || ''} 
                onChange={handleFormChange} 
                rows={2}
                placeholder="e.g. Always mention time complexity."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Technology Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Technology Tags</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={(e) => handleArrayAdd(e, techInput, setTechInput, 'technology_tags')} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g. React" />
                  <Button type="button" onClick={(e) => handleArrayAdd(e, techInput, setTechInput, 'technology_tags')} className="px-3 py-1.5">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.technology_tags || []).map(t => (
                    <span key={t} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      {t} <button type="button" onClick={() => handleArrayRemove(t, 'technology_tags')} className="hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Company Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Tags</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={compInput} onChange={e => setCompInput(e.target.value)} onKeyDown={(e) => handleArrayAdd(e, compInput, setCompInput, 'company_tags')} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g. Google" />
                  <Button type="button" onClick={(e) => handleArrayAdd(e, compInput, setCompInput, 'company_tags')} className="px-3 py-1.5">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.company_tags || []).map(c => (
                    <span key={c} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      {c} <button type="button" onClick={() => handleArrayRemove(c, 'company_tags')} className="hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
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
              {isProcessing ? 'Saving...' : 'Save Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW QUESTION MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Question Preview" className="max-w-3xl">
        {selectedQuestion && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{selectedQuestion.title}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${selectedQuestion.status === 'Active' ? 'bg-[var(--color-success-50)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-700'}`}>
                {selectedQuestion.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5"/> {selectedQuestion.category?.name}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${
                selectedQuestion.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' : 
                selectedQuestion.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                <AlertCircle className="w-3.5 h-3.5"/> {selectedQuestion.difficulty}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600"/> Correct Answer
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedQuestion.answer}
              </div>
            </div>

            {selectedQuestion.tips && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600"/> Interview Tips
                </h3>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                  {selectedQuestion.tips}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Technologies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuestion.technology_tags && selectedQuestion.technology_tags.length > 0 ? (
                    selectedQuestion.technology_tags.map(t => <span key={t} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{t}</span>)
                  ) : <span className="text-xs text-slate-400">None</span>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Companies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuestion.company_tags && selectedQuestion.company_tags.length > 0 ? (
                    selectedQuestion.company_tags.map(c => <span key={c} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{c}</span>)
                  ) : <span className="text-xs text-slate-400">None</span>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close Preview</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedQuestion && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{selectedQuestion.status === 'Active' ? 'deactivate' : 'activate'}</strong> this question?
            </p>
            {selectedQuestion.status === 'Active' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800">
                Deactivating this question will immediately hide it from students during their interview prep.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                className={selectedQuestion.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedQuestion.status === 'Active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Question">
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Warning: This action is permanent.</p>
                <p className="text-sm mt-1">
                  Are you sure you want to completely delete the question <strong>"{selectedQuestion.title}"</strong>? All student progress associated with this question will also be destroyed.
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
                {isProcessing ? 'Deleting...' : 'Yes, Delete Question'}
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
