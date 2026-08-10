"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Building2, 
  Clock, 
  IndianRupee,
  Bookmark,
  BookmarkCheck,
  Filter,
  X,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Job = {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  title: string;
  location: string;
  experience: string;
  salary: string | null;
  employment_type: string;
  work_mode: string;
  category: string;
  required_skills: string[];
  short_description: string;
  full_description: string;
  responsibilities: string[];
  apply_url: string;
  posted_at: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');

  // Selected Job for Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchJobsAndSavedState();
  }, []);

  const fetchJobsAndSavedState = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch Jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false });

      if (jobsError) throw jobsError;
      if (jobsData) setJobs(jobsData as Job[]);

      // Fetch Saved Jobs for current user
      if (user) {
        const { data: savedData, error: savedError } = await supabase
          .from('saved_jobs')
          .select('job_id')
          .eq('student_id', user.id);

        if (savedError) throw savedError;
        
        if (savedData) {
          const ids = new Set(savedData.map(s => s.job_id));
          setSavedJobIds(ids);
        }
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggleSave = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in to save jobs.");

      const isSaved = savedJobIds.has(jobId);

      if (isSaved) {
        // Unsave
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('student_id', user.id)
          .eq('job_id', jobId);
        
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        // Save
        await supabase
          .from('saved_jobs')
          .insert({ student_id: user.id, job_id: jobId });
          
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.add(jobId);
          return next;
        });
      }
    } catch (err) {
      console.error("Error saving job:", err);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setLocationFilter('');
    setWorkModeFilter('');
    setExperienceFilter('');
  };

  // Filter Logic
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.required_skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === '' || job.category === categoryFilter;
    const matchesLocation = locationFilter === '' || job.location.includes(locationFilter);
    const matchesWorkMode = workModeFilter === '' || job.work_mode === workModeFilter;
    const matchesExperience = experienceFilter === '' || job.experience === experienceFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesWorkMode && matchesExperience;
  });

  // Extract unique values for filter dropdowns
  const uniqueCategories = Array.from(new Set(jobs.map(j => j.category)));
  const uniqueWorkModes = Array.from(new Set(jobs.map(j => j.work_mode)));
  const uniqueExperiences = Array.from(new Set(jobs.map(j => j.experience)));

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleApply = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Explore verified fresher job opportunities.</p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <Card className="p-4 border-slate-200 shadow-sm shadow-sm flex flex-col lg:flex-row gap-4 items-center">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-1/3">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Company, Skills..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm"
            />
          </div>

          <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

          {/* Dropdown Filters */}
          <div className="w-full lg:flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <select 
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select 
              value={workModeFilter} onChange={e => setWorkModeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">Work Mode</option>
              {uniqueWorkModes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white"
            >
              <option value="">Experience</option>
              {uniqueExperiences.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* JOB LIST */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState 
            title="No jobs found."
            description="Try adjusting your search or filter criteria to find what you're looking for."
            action={<Button onClick={resetFilters}>Clear Filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map(job => {
              const isSaved = savedJobIds.has(job.id);
              
              return (
                <Card key={job.id} className="p-6 border-slate-200 shadow-sm hover:border-[var(--color-brand-200)] transition-all shadow-sm hover:shadow-md flex flex-col h-full bg-white group cursor-pointer" onClick={() => openJobDetails(job)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                        {job.company_logo_url ? (
                          <img src={job.company_logo_url} alt={job.company_name} className="h-8 w-8 object-contain" />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400 group-hover:text-[var(--color-brand-500)] transition-colors" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h3>
                        <p className="text-sm text-slate-500">{job.company_name}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => handleToggleSave(job.id, e)}
                      className={`p-2 rounded-full transition-colors ${isSaved ? 'text-[var(--color-brand-600)] bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={isSaved ? "Remove Saved Job" : "Save Job"}
                    >
                      {isSaved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                      <MapPin className="w-4 h-4 text-gray-400" /> {job.location} ({job.work_mode})
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                      <Briefcase className="w-4 h-4 text-gray-400" /> {job.experience}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                      <Clock className="w-4 h-4 text-gray-400" /> {job.employment_type}
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                        <IndianRupee className="w-4 h-4 text-gray-400" /> {job.salary}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-1">
                    {job.short_description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {job.required_skills.slice(0, 3).map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 3 && (
                      <span className="px-2.5 py-1 bg-gray-50 text-slate-500 text-xs font-medium rounded-full">
                        +{job.required_skills.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                    <Button variant="outline" className="flex-1 text-sm" onClick={(e) => { e.stopPropagation(); openJobDetails(job); }}>
                      View Details
                    </Button>
                    <Button variant="primary" className="flex-1 text-sm bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white" onClick={(e) => { e.stopPropagation(); handleApply(job.apply_url); }}>
                      Apply Now
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* JOB DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Job Details" className="max-w-3xl">
        {selectedJob && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <div className="h-16 w-16 bg-gray-50 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                {selectedJob.company_logo_url ? (
                  <img src={selectedJob.company_logo_url} alt={selectedJob.company_name} className="h-10 w-10 object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                <p className="text-lg text-slate-600 font-medium">{selectedJob.company_name}</p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedJob.location} ({selectedJob.work_mode})</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {selectedJob.experience}</span>
                  {selectedJob.salary && <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" /> {selectedJob.salary}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Posted {new Date(selectedJob.posted_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Job Description</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedJob.full_description}</p>
            </div>

            {selectedJob.responsibilities.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Key Responsibilities</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {selectedJob.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {selectedJob.required_skills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
              <Button 
                variant={savedJobIds.has(selectedJob.id) ? "outline" : "outline"} 
                onClick={() => handleToggleSave(selectedJob.id)}
              >
                {savedJobIds.has(selectedJob.id) ? (
                  <><BookmarkCheck className="w-4 h-4 mr-2" /> Saved</>
                ) : (
                  <><Bookmark className="w-4 h-4 mr-2" /> Save Job</>
                )}
              </Button>
              <Button onClick={() => handleApply(selectedJob.apply_url)}>
                Apply Now <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </StudentLayout>
  );
}
