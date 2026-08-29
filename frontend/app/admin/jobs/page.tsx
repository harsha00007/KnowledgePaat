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
  Briefcase,
  Building2,
  MapPin,
  Clock,
  IndianRupee,
  ExternalLink,
  Lock,
  UploadCloud
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizePlanId } from '@/config/plans';

type Job = {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  title: string;
  category: string;
  short_description: string;
  full_description: string;
  responsibilities: string[];
  required_skills: string[];
  experience: string;
  salary: string | null;
  location: string;
  work_mode: string;
  employment_type: string;
  apply_url: string;
  application_deadline: string | null;
  status: string;
  posted_at: string;
  updated_at: string;
  minimum_plan?: string;
  access_type?: string;
};

const initialJobForm: Partial<Job> = {
  company_name: '',
  title: '',
  category: 'Software Development',
  short_description: '',
  full_description: '',
  responsibilities: [],
  required_skills: [],
  experience: 'Fresher',
  salary: '',
  location: '',
  work_mode: 'Remote',
  employment_type: 'Full-time',
  apply_url: '',
  status: 'Active',
  company_logo_url: '',
  minimum_plan: 'free'
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Bulk Selection & Deletion State
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);

  // Modals
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Job>>(initialJobForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [totalCount, setTotalCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchJobs();
  }, [currentPage, statusFilter, expFilter, modeFilter, planFilter, searchQuery]);

  const fetchJobs = async () => {
    setIsFetching(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (modeFilter) {
        query = query.eq('work_mode', modeFilter);
      }
      if (expFilter) {
        query = query.ilike('experience', `%${expFilter}%`);
      }
      if (planFilter) {
        query = query.or(`minimum_plan.eq.${planFilter},access_type.eq.${planFilter}`);
      }
      if (searchQuery.trim()) {
        const q = `%${searchQuery.trim()}%`;
        query = query.or(`title.ilike.${q},company_name.ilike.${q},location.ilike.${q}`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error } = await query
        .order('posted_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (data) setJobs(data as Job[]);
      if (typeof count === 'number') setTotalCount(count);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Pagination Variables
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const filteredJobs = jobs;
  const paginatedJobs = jobs;

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setExpFilter('');
    setModeFilter('');
    setPlanFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData(initialJobForm);
    setFormErrors({});
    setSelectedJob(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (job: Job) => {
    setFormData({
      ...job,
      minimum_plan: normalizePlanId(job.minimum_plan || job.access_type)
    });
    setFormErrors({});
    setSelectedJob(job);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (skillInput.trim() && !(formData.required_skills || []).includes(skillInput.trim())) {
      setFormData(prev => ({ ...prev, required_skills: [...(prev.required_skills || []), skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({ ...prev, required_skills: (prev.required_skills || []).filter(s => s !== skillToRemove) }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.company_name?.trim()) errors.company_name = "Company Name is required.";
    if (!formData.title?.trim()) errors.title = "Job Title is required.";
    if (!formData.location?.trim()) errors.location = "Location is required.";
    if (!formData.apply_url?.trim()) errors.apply_url = "Apply URL is required.";
    else if (!formData.apply_url.startsWith('http://') && !formData.apply_url.startsWith('https://')) {
      errors.apply_url = "Please enter a valid URL (https://...).";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      const payload = {
        company_name: formData.company_name,
        company_logo_url: formData.company_logo_url,
        title: formData.title,
        category: formData.category || 'Software Development',
        short_description: formData.short_description || formData.full_description?.slice(0, 150) || '',
        full_description: formData.full_description || formData.short_description || '',
        responsibilities: formData.responsibilities || [],
        required_skills: formData.required_skills || [],
        experience: formData.experience || 'Fresher',
        salary: formData.salary || null,
        location: formData.location,
        work_mode: formData.work_mode || 'Remote',
        employment_type: formData.employment_type || 'Full-time',
        apply_url: formData.apply_url,
        status: formData.status || 'Active',
        minimum_plan: formData.minimum_plan || 'free',
        access_type: formData.minimum_plan === 'free' ? 'Free' : 'Premium'
      };

      if (selectedJob) {
        // Update
        const { error } = await supabase.from('jobs').update(payload).eq('id', selectedJob.id);
        if (error) throw error;
        setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...payload } as Job : j));
      } else {
        // Create
        const { data, error } = await supabase.from('jobs').insert(payload).select().single();
        if (error) throw error;
        if (data) setJobs(prev => [data as Job, ...prev]);
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Error saving job:", err);
      alert("Failed to save job details. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- ACTIONS ---------------- //
  const handleToggleStatus = async () => {
    if (!selectedJob) return;
    setIsProcessing(true);
    try {
      const newStatus = selectedJob.status === 'Active' ? 'Inactive' : 'Active';
      const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', selectedJob.id);
      if (error) throw error;
      setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, status: newStatus } : j));
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error toggling status:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', selectedJob.id);
      if (error) throw error;
      setJobs(prev => prev.filter(j => j.id !== selectedJob.id));
      setSelectedJobIds(prev => prev.filter(id => id !== selectedJob.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting job:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Selection & Deletion Helpers
  const isAllVisibleJobsSelected = paginatedJobs.length > 0 && paginatedJobs.every(j => selectedJobIds.includes(j.id));

  const handleToggleSelectAllJobs = () => {
    if (isAllVisibleJobsSelected) {
      const visibleIds = new Set(paginatedJobs.map(j => j.id));
      setSelectedJobIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedJobIds, ...paginatedJobs.map(j => j.id)]);
      setSelectedJobIds(Array.from(newIds));
    }
  };

  const handleToggleSelectJob = (id: string) => {
    setSelectedJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteJobs = async () => {
    if (selectedJobIds.length === 0) return;
    setIsProcessing(true);
    setBulkErrorMsg(null);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .in('id', selectedJobIds);

      if (error) throw error;

      const deletedCount = selectedJobIds.length;
      setJobs(prev => prev.filter(j => !selectedJobIds.includes(j.id)));
      setSelectedJobIds([]);
      setIsBulkDeleteModalOpen(false);
      setBulkSuccessMsg(`✓ ${deletedCount} job posting${deletedCount > 1 ? 's' : ''} deleted successfully.`);
      setTimeout(() => setBulkSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Error bulk deleting jobs:", err);
      setBulkErrorMsg("Unable to delete the selected jobs. No changes were made.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset bulk selection when page, search, or filters change
  useEffect(() => {
    setSelectedJobIds([]);
  }, [searchQuery, statusFilter, expFilter, modeFilter, planFilter, currentPage]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Job Management</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Create, review, and maintain verified fresher job listings and minimum plan requirements.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/admin/jobs/import">
              <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1.5 border-[var(--color-border)]">
                <UploadCloud className="w-4 h-4 text-[var(--color-brand-600)]" /> Bulk Import
              </Button>
            </Link>
            <Button size="sm" onClick={openAddForm} className="shrink-0 text-xs">
              <Plus className="w-4 h-4 mr-1.5" /> Post New Job
            </Button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Company, Location or Skills..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
              value={modeFilter} onChange={e => { setModeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Modes</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            <select 
              value={expFilter} onChange={e => { setExpFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Experience</option>
              <option value="Fresher">Fresher</option>
              <option value="0-1">0-1 yrs</option>
              <option value="1-2">1-2 yrs</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar & Feedback Notifications */}
        {bulkSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--radius-lg)] text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{bulkSuccessMsg}</span>
            <button onClick={() => setBulkSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {selectedJobIds.length > 0 && (
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-[var(--radius-xl)] p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <span className="flex h-5 w-5 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-[11px]">
                {selectedJobIds.length}
              </span>
              <span>job{selectedJobIds.length > 1 ? 's' : ''} selected</span>
              <button 
                onClick={() => setSelectedJobIds([])}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline ml-2 cursor-pointer"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                disabled={isProcessing}
                className="text-xs shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected ({selectedJobIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* DATA TABLE CONTAINER */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No jobs found."
                description="Try clearing your filters or create a new job posting."
                action={<Button size="sm" onClick={openAddForm}>Post a Job</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={isAllVisibleJobsSelected}
                          onChange={handleToggleSelectAllJobs}
                          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                          title="Select all visible jobs on this page"
                        />
                      </th>
                      <th className="px-5 py-3.5">Company & Role</th>
                      <th className="px-5 py-3.5">Required Plan</th>
                      <th className="px-5 py-3.5">Location & Mode</th>
                      <th className="px-5 py-3.5">Experience</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedJobs.map(job => {
                      const isSelected = selectedJobIds.includes(job.id);
                      return (
                        <tr key={job.id} className={`hover:bg-[var(--color-bg-subtle)]/70 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                          <td className="px-5 py-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectJob(job.id)}
                              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[var(--color-text-primary)]">{job.title}</p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">{job.company_name}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <PremiumBadge minimumPlan={job.minimum_plan || job.access_type} showLockIfPaid={false} />
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">
                            {job.location} • <span className="text-[var(--color-text-tertiary)]">{job.work_mode}</span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">{job.experience}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              job.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                            <button onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditForm(job)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Job">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${job.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={job.status === 'Active' ? "Deactivate" : "Activate"}>
                              <Power className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Job">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedJobs.map(job => {
                  const isSelected = selectedJobIds.includes(job.id);
                  return (
                    <div key={job.id} className={`p-4 space-y-2.5 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectJob(job.id)}
                            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer mt-0.5"
                          />
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text-primary)]">{job.title}</p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">{job.company_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <PremiumBadge minimumPlan={job.minimum_plan || job.access_type} showLockIfPaid={false} />
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${job.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        <span>{job.location} ({job.work_mode})</span>
                        <span>•</span>
                        <span>{job.experience}</span>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }}>View</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => openEditForm(job)}>Edit</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }}>{job.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 text-red-600 hover:bg-red-50" onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }}>Delete</Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} jobs
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
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedJob ? "Edit Job Posting" : "Post New Job"} className="max-w-2xl">
        <div className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Company Name *</label>
              <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleFormChange} placeholder="e.g. Acme Corp" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.company_name && <p className="text-red-500 mt-1">{formErrors.company_name}</p>}
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Job Title *</label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleFormChange} placeholder="e.g. Associate Software Engineer" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Location *</label>
              <input type="text" name="location" value={formData.location || ''} onChange={handleFormChange} placeholder="e.g. Bangalore, India" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.location && <p className="text-red-500 mt-1">{formErrors.location}</p>}
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Work Mode</label>
              <select name="work_mode" value={formData.work_mode} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Experience Level</label>
              <select name="experience" value={formData.experience} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="Fresher (0 yrs)">Fresher (0 yrs)</option>
                <option value="0-1 yrs">0-1 yrs</option>
                <option value="1-2 yrs">1-2 yrs</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Employment Type</label>
              <select name="employment_type" value={formData.employment_type} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Compensation (Optional)</label>
              <input type="text" name="salary" value={formData.salary || ''} onChange={handleFormChange} placeholder="e.g. ₹6 - 8 LPA" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Official Apply URL *</label>
            <input type="text" name="apply_url" value={formData.apply_url || ''} onChange={handleFormChange} placeholder="https://careers.company.com/job/123" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            {formErrors.apply_url && <p className="text-red-500 mt-1">{formErrors.apply_url}</p>}
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Job Description</label>
            <textarea name="full_description" value={formData.full_description || ''} onChange={handleFormChange} rows={3} placeholder="Comprehensive description of the role..." className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
          </div>

          {/* Skill Tag Inputs */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Required Skills</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleAddSkill} placeholder="Type skill and press Enter..." className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" />
              <Button type="button" size="sm" onClick={handleAddSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(formData.required_skills || []).map(skill => (
                <span key={skill} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border border-[var(--color-brand-200)]">
                  {skill} <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Publishing Status</label>
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
              {isProcessing ? 'Saving...' : 'Save Job Posting'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Job Overview" className="max-w-xl">
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                  <PremiumBadge minimumPlan={selectedJob.minimum_plan || selectedJob.access_type} />
                </div>
                <p className="text-xs font-semibold text-[var(--color-brand-600)]">{selectedJob.company_name}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedJob.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <div><strong className="text-[var(--color-text-tertiary)]">Location:</strong> {selectedJob.location} ({selectedJob.work_mode})</div>
              <div><strong className="text-[var(--color-text-tertiary)]">Experience:</strong> {selectedJob.experience}</div>
              <div><strong className="text-[var(--color-text-tertiary)]">Type:</strong> {selectedJob.employment_type}</div>
              <div><strong className="text-[var(--color-text-tertiary)]">Compensation:</strong> {selectedJob.salary || 'Not specified'}</div>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Description</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedJob.full_description || selectedJob.short_description}</p>
            </div>

            {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Required Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedJob.required_skills.map(s => <span key={s} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2 py-0.5 rounded text-[10px] font-semibold border border-[var(--color-brand-200)]">{s}</span>)}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <a href={selectedJob.apply_url} target="_blank" rel="noreferrer" className="text-[var(--color-brand-600)] hover:underline flex items-center gap-1 font-semibold text-xs truncate max-w-[280px]">
                {selectedJob.apply_url} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedJob.status === 'Active' ? 'deactivate' : 'activate'}</strong> the job posting for <strong>{selectedJob.title}</strong> at {selectedJob.company_name}?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedJob.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedJob.status === 'Active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Job Posting">
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Warning: This action cannot be undone.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete the job posting for <strong>"{selectedJob.title}"</strong> at <strong>{selectedJob.company_name}</strong>?
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
                {isProcessing ? 'Deleting...' : 'Yes, Delete Job'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* BULK DELETE MODAL */}
      <Modal 
        isOpen={isBulkDeleteModalOpen} 
        onClose={() => !isProcessing && setIsBulkDeleteModalOpen(false)} 
        title={`Delete ${selectedJobIds.length} Job Posting${selectedJobIds.length > 1 ? 's' : ''}?`}
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Permanent Bulk Deletion Warning</p>
              <p className="mt-1 leading-relaxed text-red-900">
                This action will permanently remove <strong>{selectedJobIds.length}</strong> selected job posting{selectedJobIds.length > 1 ? 's' : ''} from the database. This action cannot be undone.
              </p>
            </div>
          </div>

          {bulkErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {bulkErrorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsBulkDeleteModalOpen(false)} 
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-red-600 hover:bg-red-700 border-transparent text-white"
              onClick={handleBulkDeleteJobs} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : `Delete ${selectedJobIds.length} Job${selectedJobIds.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

    </AdminLayout>
  );
}
