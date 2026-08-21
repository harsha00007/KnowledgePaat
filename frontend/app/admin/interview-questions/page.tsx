"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  BookOpen,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Lock,
  UploadCloud
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizePlanId } from '@/config/plans';

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
  minimum_plan?: string;
  access_type?: string;
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
  status: 'Active',
  minimum_plan: 'free'
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
  const [planFilter, setPlanFilter] = useState('');

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
        const mapped = qData.map((q: any) => ({ ...q, category: q.interview_categories })) as Question[];
        setQuestions(mapped);
      }
    } catch (err) {
      console.error("Error fetching interview questions:", err);
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
    
    const itemPlan = normalizePlanId(q.minimum_plan || q.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesStatus && matchesCat && matchesDiff && matchesPlan;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setDiffFilter('');
    setPlanFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData({ ...initialForm, category_id: categories.length > 0 ? categories[0].id : '', minimum_plan: 'free' });
    setFormErrors({});
    setSelectedQuestion(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (q: Question) => {
    setFormData({
      ...q,
      minimum_plan: normalizePlanId(q.minimum_plan || q.access_type)
    });
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
    if (!formData.answer?.trim()) errors.answer = "Ideal Answer is required.";
    if (!formData.difficulty) errors.difficulty = "Difficulty level is required.";
    
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
        status: formData.status,
        minimum_plan: formData.minimum_plan || 'free',
        access_type: formData.minimum_plan === 'free' ? 'Free' : 'Premium'
      };

      if (selectedQuestion) {
        // Update
        const { error } = await supabase.from('interview_questions').update(payload).eq('id', selectedQuestion.id);
        if (error) throw error;
        await fetchData();
      } else {
        // Insert
        const { error } = await supabase.from('interview_questions').insert(payload);
        if (error) throw error;
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
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Interview Questions</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Manage curated interview questions, difficulty ratings, and minimum plan requirements.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/admin/interview-questions/import">
              <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1.5 border-[var(--color-border)]">
                <UploadCloud className="w-4 h-4 text-[var(--color-brand-600)]" /> Bulk Import
              </Button>
            </Link>
            <Button size="sm" onClick={openAddForm} className="shrink-0 text-xs">
              <Plus className="w-4 h-4 mr-1.5" /> Add Question
            </Button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Question, Category, Tech or Company..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <select 
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              value={diffFilter} onChange={e => { setDiffFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
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
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No interview questions found."
                description="Try adjusting your search criteria or create a new question."
                action={<Button size="sm" onClick={openAddForm}>Add Question</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5 w-2/5">Question Title</th>
                      <th className="px-5 py-3.5">Required Plan</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Difficulty</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedQuestions.map(q => (
                      <tr key={q.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)] line-clamp-2 leading-snug">{q.title}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{new Date(q.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <PremiumBadge minimumPlan={q.minimum_plan || q.access_type} showLockIfPaid={false} />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">{q.category?.name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            q.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => { setSelectedQuestion(q); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(q)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedQuestion(q); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${q.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={q.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedQuestion(q); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
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
                {paginatedQuestions.map(q => (
                  <div key={q.id} className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] leading-snug">{q.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PremiumBadge minimumPlan={q.minimum_plan || q.access_type} showLockIfPaid={false} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${q.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {q.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded text-[11px] font-medium text-[var(--color-text-secondary)]">{q.category?.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedQuestion(q); setIsViewModalOpen(true); }}>View</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => openEditForm(q)}>Edit</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedQuestion(q); setIsStatusModalOpen(true); }}>{q.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 text-red-600 hover:bg-red-50" onClick={() => { setSelectedQuestion(q); setIsDeleteModalOpen(true); }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
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
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedQuestion ? "Edit Question" : "Add Interview Question"} className="max-w-3xl">
        <div className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Question Title *</label>
            <input type="text" name="title" value={formData.title || ''} onChange={handleFormChange} placeholder="e.g. What is the difference between SQL and NoSQL?" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category *</label>
              <select name="category_id" value={formData.category_id} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formErrors.category_id && <p className="text-red-500 mt-1">{formErrors.category_id}</p>}
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Difficulty *</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
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
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Detailed Answer *</label>
            <textarea 
              name="answer" 
              value={formData.answer || ''} 
              onChange={handleFormChange} 
              rows={5}
              placeholder="Comprehensive model answer..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
            />
            {formErrors.answer && <p className="text-red-500 mt-1">{formErrors.answer}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Pro Tips (Optional)</label>
              <textarea 
                name="tips" 
                value={formData.tips || ''} 
                onChange={handleFormChange} 
                rows={2}
                placeholder="e.g. Always structure your answer using STAR method."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Common Pitfalls (Optional)</label>
              <textarea 
                name="common_mistakes" 
                value={formData.common_mistakes || ''} 
                onChange={handleFormChange} 
                rows={2}
                placeholder="e.g. Giving one-word answers or not explaining trade-offs."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Technology Tags</label>
              <div className="flex gap-2 mb-1.5">
                <input type="text" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={(e) => handleArrayAdd(e, techInput, setTechInput, 'technology_tags')} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" placeholder="e.g. React, SQL" />
                <Button type="button" size="sm" onClick={(e) => handleArrayAdd(e, techInput, setTechInput, 'technology_tags')}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(formData.technology_tags || []).map(t => (
                  <span key={t} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-[var(--color-brand-200)]">
                    {t} <button type="button" onClick={() => handleArrayRemove(t, 'technology_tags')} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Company Tags</label>
              <div className="flex gap-2 mb-1.5">
                <input type="text" value={compInput} onChange={e => setCompInput(e.target.value)} onKeyDown={(e) => handleArrayAdd(e, compInput, setCompInput, 'company_tags')} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" placeholder="e.g. Google, TCS" />
                <Button type="button" size="sm" onClick={(e) => handleArrayAdd(e, compInput, setCompInput, 'company_tags')}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(formData.company_tags || []).map(c => (
                  <span key={c} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-[var(--color-border)]">
                    {c} <button type="button" onClick={() => handleArrayRemove(c, 'company_tags')} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Visibility Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="Active" checked={formData.status === 'Active'} onChange={handleFormChange} />
                <span>Active (Visible to Students)</span>
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
              {isProcessing ? 'Saving...' : 'Save Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW QUESTION MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Question Preview" className="max-w-2xl">
        {selectedQuestion && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-snug">{selectedQuestion.title}</h2>
                </div>
                <PremiumBadge minimumPlan={selectedQuestion.minimum_plan || selectedQuestion.access_type} />
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${selectedQuestion.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {selectedQuestion.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[var(--color-brand-600)]" /> {selectedQuestion.category?.name}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                selectedQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                selectedQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                {selectedQuestion.difficulty}
              </span>
            </div>

            <div className="bg-[var(--color-bg-subtle)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <h4 className="font-bold text-[var(--color-brand-700)] mb-1.5 uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Ideal Answer
              </h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedQuestion.answer}</p>
            </div>

            {selectedQuestion.tips && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-[var(--radius-lg)]">
                <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Interview Tips
                </h4>
                <p className="text-emerald-950 leading-relaxed">{selectedQuestion.tips}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedQuestion && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedQuestion.status === 'Active' ? 'deactivate' : 'activate'}</strong> this question?
            </p>
            {selectedQuestion.status === 'Active' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--radius-lg)] text-amber-900 font-medium">
                Deactivating this question will immediately hide it from student interview preparation sessions.
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedQuestion.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
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
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Warning: This action cannot be undone.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to completely delete the question <strong>"{selectedQuestion.title}"</strong>? Associated student completion records will also be removed.
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
                {isProcessing ? 'Deleting...' : 'Yes, Delete Question'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
