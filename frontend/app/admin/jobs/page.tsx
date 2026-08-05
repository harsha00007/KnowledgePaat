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
  Briefcase,
  Building,
  MapPin,
  Clock,
  DollarSign
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
    const matchesLocation = locationFilter === '' || job.location.includes(locationFilter);
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
    if (!formData.full_description?.trim()) errors.full_description = "Job Description is required.";
    if (!formData.required_skills || formData.required_skills.length === 0) errors.required_skills = "At least one skill is required.";
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

  // Extract unique locations for filter
  const uniqueLocations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean)));
  const uniqueExperiences = Array.from(new Set(jobs.map(j => j.experience).filter(Boolean)));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage verified job opportunities on the platform.</p>
          </div>
          <Button onClick={openAddForm} className="shrink-0 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add New Job
          </Button>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Job Title, Company, Location or Skills..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-5 gap-3">
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            
            <select 
              value={expFilter} onChange={e => { setExpFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Experience</option>
              {uniqueExperiences.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <select 
              value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Location</option>
              {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select 
              value={modeFilter} onChange={e => { setModeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Work Mode</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* DATA TABLE */}
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No jobs available."
                description="Try adjusting your search criteria or add a new job."
                action={<Button onClick={openAddForm}>Add Job</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-6 py-4">Company & Job Title</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Experience</th>
                      <th className="px-6 py-4">Work Mode</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{job.title}</p>
                          <p className="text-xs font-medium text-slate-500">{job.company_name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{job.location}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{job.experience}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700`}>
                            {job.work_mode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(job.posted_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditForm(job)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }} className={`p-1.5 rounded ${job.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={job.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
                {paginatedJobs.map(job => (
                  <div key={job.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{job.title}</p>
                        <p className="text-xs font-medium text-slate-500">{job.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> <span className="truncate">{job.location}</span></div>
                      <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> <span className="truncate">{job.experience}</span></div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => openEditForm(job)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedJob(job); setIsStatusModalOpen(true); }}><Power className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedJob(job); setIsDeleteModalOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length}
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
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedJob ? "Edit Job" : "Add New Job"} className="max-w-4xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Basic Details</h3>
              <Input label="Company Name *" name="company_name" value={formData.company_name} onChange={handleFormChange} error={formErrors.company_name} />
              <Input label="Job Title *" name="title" value={formData.title} onChange={handleFormChange} error={formErrors.title} />
              <Input label="Company Logo URL (Optional)" name="company_logo_url" value={formData.company_logo_url} onChange={handleFormChange} placeholder="https://..." />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Category</label>
                <select name="category" value={formData.category} onChange={handleFormChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Software Development">Software Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Logistics */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Logistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Location *" name="location" value={formData.location} onChange={handleFormChange} />
                <Input label="Experience *" name="experience" value={formData.experience} onChange={handleFormChange} placeholder="e.g. 0-2 Years" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Mode</label>
                  <select name="work_mode" value={formData.work_mode} onChange={handleFormChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                  <select name="employment_type" value={formData.employment_type} onChange={handleFormChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>
              <Input label="Salary (Optional)" name="salary" value={formData.salary} onChange={handleFormChange} placeholder="e.g. ₹8,00,000/year" />
              <Input label="Official Apply URL *" name="apply_url" value={formData.apply_url} onChange={handleFormChange} error={formErrors.apply_url} />
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Description & Skills</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Description *</label>
                <textarea 
                  name="full_description" 
                  value={formData.full_description} 
                  onChange={handleFormChange} 
                  rows={4}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.full_description ? 'border-red-300' : 'border-slate-300'}`}
                />
                {formErrors.full_description && <p className="text-red-500 text-xs mt-1">{formErrors.full_description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills *</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g. React" />
                    <Button type="button" onClick={addSkill} className="px-3 py-1.5">Add</Button>
                  </div>
                  {formErrors.required_skills && <p className="text-red-500 text-xs mb-2">{formErrors.required_skills}</p>}
                  <div className="flex flex-wrap gap-2">
                    {(formData.required_skills || []).map(skill => (
                      <span key={skill} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        {skill} <button onClick={() => removeSkill(skill)} className="hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsibilities (Optional)</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={respInput} onChange={e => setRespInput(e.target.value)} onKeyDown={addResp} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g. Write clean code" />
                    <Button type="button" onClick={addResp} className="px-3 py-1.5">Add</Button>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                    {(formData.responsibilities || []).map(resp => (
                      <li key={resp} className="group">
                        {resp} <button onClick={() => removeResp(resp)} className="text-slate-300 group-hover:text-red-500 ml-2">&times;</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Job Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="radio" name="status" value="Active" checked={formData.status === 'Active'} onChange={handleFormChange} className="text-blue-600 focus:ring-blue-500" />
                  Active (Visible to Students)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="radio" name="status" value="Inactive" checked={formData.status === 'Inactive'} onChange={handleFormChange} className="text-blue-600 focus:ring-blue-500" />
                  Inactive (Hidden)
                </label>
              </div>
            </div>
            
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveJob} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Job'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW JOB MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Job Details" className="max-w-3xl">
        {selectedJob && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-slate-600 font-medium">
                  <Building className="w-4 h-4" /> {selectedJob.company_name}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedJob.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Location</p>
                <p className="text-sm font-semibold text-slate-900">{selectedJob.location}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/> Experience</p>
                <p className="text-sm font-semibold text-slate-900">{selectedJob.experience}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Type</p>
                <p className="text-sm font-semibold text-slate-900">{selectedJob.employment_type} ({selectedJob.work_mode})</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5"/> Salary</p>
                <p className="text-sm font-semibold text-slate-900">{selectedJob.salary || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-2">Description</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedJob.full_description}</p>
            </div>

            {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Responsibilities</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  {selectedJob.responsibilities.map(r => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-900 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {selectedJob.required_skills.map(s => (
                  <span key={s} className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedJob && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{selectedJob.status === 'Active' ? 'deactivate' : 'activate'}</strong> this job?
            </p>
            {selectedJob.status === 'Active' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800">
                Deactivating this job will immediately hide it from the Student Portal.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                className={selectedJob.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
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
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Job">
        {selectedJob && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Warning: This action is permanent.</p>
                <p className="text-sm mt-1">
                  Are you sure you want to completely delete the job <strong>{selectedJob.title}</strong> at <strong>{selectedJob.company_name}</strong>?
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
                {isProcessing ? 'Deleting...' : 'Yes, Delete Job'}
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
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-300' : 'border-slate-300'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
