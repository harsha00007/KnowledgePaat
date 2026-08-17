"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
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
  Briefcase,
  Building2,
  MapPin,
  Clock,
  IndianRupee,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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
  company_logo_url: ''
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

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
  const [respInput, setRespInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false });

      if (error) throw error;
      if (data) setJobs(data as Job[]);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      job.title.toLowerCase().includes(query) || 
      job.company_name.toLowerCase().includes(query) || 
      job.location.toLowerCase().includes(query) ||
      (job.required_skills && job.required_skills.some(s => s.toLowerCase().includes(query)));

    const matchesStatus = statusFilter === '' || job.status === statusFilter;
    const matchesExp = expFilter === '' || job.experience === expFilter;
    const matchesLocation = locationFilter === '' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesMode = modeFilter === '' || job.work_mode === modeFilter;

    return matchesSearch && matchesStatus && matchesExp && matchesLocation && matchesMode;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setExpFilter('');
    setLocationFilter('');
    setModeFilter('');
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
    setFormData(job);
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

  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (skillInput.trim() && !(formData.required_skills || []).includes(skillInput.trim())) {
      setFormData(prev => ({ ...prev, required_skills: [...(prev.required_skills || []), skillInput.trim()] }));
      setSkillInput('');
      setFormErrors(prev => { const next = { ...prev }; delete next.required_skills; return next; });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, required_skills: (prev.required_skills || []).filter(s => s !== skill) }));
  };

  const addResp = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (respInput.trim()) {
      setFormData(prev => ({ ...prev, responsibilities: [...(prev.responsibilities || []), respInput.trim()] }));
      setRespInput('');
    }
  };

  const removeResp = (resp: string) => {
    setFormData(prev => ({ ...prev, responsibilities: (prev.responsibilities || []).filter(r => r !== resp) }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.company_name?.trim()) errors.company_name = "Company Name is required.";
    if (!formData.title?.trim()) errors.title = "Job Title is required.";
    if (!formData.location?.trim()) errors.location = "Location is required.";
    if (!formData.short_description?.trim()) errors.short_description = "Short summary is required.";
    if (!formData.full_description?.trim()) errors.full_description = "Job Description is required.";
    if (!formData.required_skills || formData.required_skills.length === 0) errors.required_skills = "At least one skill tag is required.";
    if (!formData.apply_url?.trim()) errors.apply_url = "Apply URL is required.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveJob = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      if (selectedJob) {
        // Update
        const { error } = await supabase.from('jobs').update(formData).eq('id', selectedJob.id);
        if (error) throw error;
        setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...formData } as Job : j));
      } else {
        // Insert
        const { data, error } = await supabase.from('jobs').insert(formData).select().single();
        if (error) throw error;
        if (data) setJobs(prev => [data as Job, ...prev]);
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Error saving job:", err);
      alert("Failed to save job.");
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
      console.error("Error updating status:", err);
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
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting job:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const uniqueLocations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean)));
  const uniqueExperiences = Array.from(new Set(jobs.map(j => j.experience).filter(Boolean)));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Job Management</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Create, edit, and publish verified employment opportunities for students.
            </p>
          </div>
          <Button size="sm" onClick={openAddForm} className="shrink-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Add New Job
          </Button>
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

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            
            <select 
              value={expFilter} onChange={e => { setExpFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Experience</option>
              {uniqueExperiences.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <select 
              value={modeFilter} onChange={e => { setModeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Work Modes</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
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
          ) : filteredJobs.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No jobs available."
                description="Try adjusting your filter criteria or post a new job."
                action={<Button size="sm" onClick={openAddForm}>Add Job</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5">Company & Title</th>
                      <th className="px-5 py-3.5">Location</th>
                      <th className="px-5 py-3.5">Experience</th>
                      <th className="px-5 py-3.5">Work Mode</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Posted</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedJobs.map(job => (
                      <tr key={job.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)]">{job.title}</p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">{job.company_name}</p>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">{job.location}</td>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">{job.experience}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                            {job.work_mode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            job.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-text-tertiary)] font-medium">
                          {new Date(job.posted_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(job)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${job.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={job.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
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
                {paginatedJobs.map(job => (
                  <div key={job.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{job.title}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)]">{job.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${job.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" /> <span className="truncate">{job.location}</span></div>
                      <div className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" /> <span className="truncate">{job.experience}</span></div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }}>View</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => openEditForm(job)}>Edit</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }}>{job.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 text-red-600 hover:bg-red-50" onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
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
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedJob ? "Edit Job Posting" : "Add New Job"} className="max-w-3xl">
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Company Name *</label>
              <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleFormChange} placeholder="e.g. Google, Infosys" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.company_name && <p className="text-red-500 mt-1">{formErrors.company_name}</p>}
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Job Title *</label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleFormChange} placeholder="e.g. Software Engineer - Fresher" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Location *</label>
              <input type="text" name="location" value={formData.location || ''} onChange={handleFormChange} placeholder="e.g. Bengaluru, Hyderabad" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.location && <p className="text-red-500 mt-1">{formErrors.location}</p>}
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Experience *</label>
              <input type="text" name="experience" value={formData.experience || ''} onChange={handleFormChange} placeholder="e.g. Fresher / 0-1 Years" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
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
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Employment Type</label>
              <select name="employment_type" value={formData.employment_type} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Salary (Optional)</label>
              <input type="text" name="salary" value={formData.salary || ''} onChange={handleFormChange} placeholder="e.g. ₹6,00,000 - ₹8,00,000 / year" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Official Apply URL *</label>
              <input type="text" name="apply_url" value={formData.apply_url || ''} onChange={handleFormChange} placeholder="https://careers.company.com/job/123" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.apply_url && <p className="text-red-500 mt-1">{formErrors.apply_url}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Short Description *</label>
              <textarea name="short_description" value={formData.short_description || ''} onChange={handleFormChange} rows={2} placeholder="One sentence summary of the opportunity..." className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.short_description && <p className="text-red-500 mt-1">{formErrors.short_description}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Full Description *</label>
              <textarea name="full_description" value={formData.full_description || ''} onChange={handleFormChange} rows={4} placeholder="Full details, qualifications, and role summary..." className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.full_description && <p className="text-red-500 mt-1">{formErrors.full_description}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Required Skills *</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill} placeholder="Type a skill and press Enter or Add" className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" />
                <Button type="button" size="sm" onClick={addSkill}>Add Skill</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(formData.required_skills || []).map(skill => (
                  <span key={skill} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    {skill} <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
              {formErrors.required_skills && <p className="text-red-500 mt-1">{formErrors.required_skills}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Key Responsibilities (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={respInput} onChange={e => setRespInput(e.target.value)} onKeyDown={addResp} placeholder="Type responsibility and press Enter" className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none" />
                <Button type="button" size="sm" variant="outline" onClick={addResp}>Add</Button>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--color-text-secondary)]">
                {(formData.responsibilities || []).map(resp => (
                  <li key={resp}>
                    {resp} <button type="button" onClick={() => removeResp(resp)} className="text-red-500 ml-1.5">&times;</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Status</label>
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

          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveJob} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Job'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW JOB MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Job Overview" className="max-w-2xl">
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] mt-0.5">{selectedJob.company_name}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedJob.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <div>
                <span className="text-[var(--color-text-tertiary)]">Location:</span>
                <p className="font-semibold text-[var(--color-text-primary)]">{selectedJob.location}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)]">Experience:</span>
                <p className="font-semibold text-[var(--color-text-primary)]">{selectedJob.experience}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)]">Mode:</span>
                <p className="font-semibold text-[var(--color-text-primary)]">{selectedJob.work_mode}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-tertiary)]">Salary:</span>
                <p className="font-semibold text-[var(--color-text-primary)]">{selectedJob.salary || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Full Description</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedJob.full_description}</p>
            </div>

            {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Key Responsibilities</h4>
                <ul className="list-disc pl-4 space-y-1 text-[var(--color-text-secondary)]">
                  {selectedJob.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1.5">Required Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.required_skills.map(s => (
                  <span key={s} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] px-2 py-0.5 rounded-full font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <a href={selectedJob.apply_url} target="_blank" rel="noreferrer" className="text-[var(--color-brand-600)] font-semibold hover:underline flex items-center gap-1">
                Official Apply Link <ExternalLink className="w-3.5 h-3.5" />
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
              Are you sure you want to <strong>{selectedJob.status === 'Active' ? 'deactivate' : 'activate'}</strong> this job?
            </p>
            {selectedJob.status === 'Active' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--radius-lg)] text-amber-900 font-medium">
                Deactivating this job will immediately hide it from student listings and search results.
              </div>
            )}
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
                <p className="font-bold text-red-950">Warning: This action is permanent.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete <strong>{selectedJob.title}</strong> at <strong>{selectedJob.company_name}</strong>?
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

    </AdminLayout>
  );
}
