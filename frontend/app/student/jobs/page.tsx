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
  ExternalLink,
  CheckCircle2
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
    setWorkModeFilter('');
    setExperienceFilter('');
  };

  // Filter Logic
  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      query === '' || 
      job.title.toLowerCase().includes(query) ||
      job.company_name.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.required_skills.some(skill => skill.toLowerCase().includes(query));

    const matchesCategory = categoryFilter === '' || job.category === categoryFilter;
    const matchesWorkMode = workModeFilter === '' || job.work_mode === workModeFilter;
    const matchesExperience = experienceFilter === '' || job.experience === experienceFilter;

    return matchesSearch && matchesCategory && matchesWorkMode && matchesExperience;
  });

  const uniqueCategories = Array.from(new Set(jobs.map(j => j.category).filter(Boolean)));
  const uniqueWorkModes = Array.from(new Set(jobs.map(j => j.work_mode).filter(Boolean)));
  const uniqueExperiences = Array.from(new Set(jobs.map(j => j.experience).filter(Boolean)));

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleApply = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Verified Jobs</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Explore and apply directly to verified fresher and entry-level positions.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Title, Company, or Skill..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="hidden lg:block w-px h-6 bg-[var(--color-border)]"></div>

          {/* Dropdown Filters */}
          <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select 
              value={workModeFilter} onChange={e => setWorkModeFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Work Modes</option>
              {uniqueWorkModes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Experience</option>
              {uniqueExperiences.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* JOB LIST */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState 
            title="No jobs matching your filters."
            description="Try changing your search terms or clearing the selected filters."
            action={<Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredJobs.map(job => {
              const isSaved = savedJobIds.has(job.id);
              
              return (
                <div 
                  key={job.id} 
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] transition-all flex flex-col justify-between cursor-pointer group"
                  onClick={() => openJobDetails(job)}
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[var(--color-bg-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          {job.company_logo_url ? (
                            <img src={job.company_logo_url} alt={job.company_name} className="h-7 w-7 object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[var(--color-text-primary)] leading-snug group-hover:text-[var(--color-brand-600)] transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{job.company_name}</span>
                            <span className="text-[var(--color-text-tertiary)]">·</span>
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--color-success)]">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => handleToggleSave(job.id, e)}
                        className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-[var(--color-brand-600)] bg-[var(--color-brand-50)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'}`}
                        title={isSaved ? "Remove from Saved" : "Save Job"}
                        aria-label={isSaved ? "Saved" : "Save"}
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)] font-medium mb-3">
                      <span className="inline-flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                        <MapPin className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {job.location} ({job.work_mode})
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                        <Briefcase className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {job.experience}
                      </span>
                      {job.salary && (
                        <span className="inline-flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                          <IndianRupee className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {job.salary}
                        </span>
                      )}
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                      {job.short_description}
                    </p>
                    
                    {/* Skill Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {job.required_skills.slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-[11px] font-semibold rounded-full border border-[var(--color-brand-200)]">
                          {skill}
                        </span>
                      ))}
                      {job.required_skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] text-[11px] font-medium rounded-full border border-[var(--color-border)]">
                          +{job.required_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-xs justify-center" 
                      onClick={(e) => { e.stopPropagation(); openJobDetails(job); }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      className="flex-1 text-xs justify-center" 
                      onClick={(e) => { e.stopPropagation(); handleApply(job.apply_url); }}
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* JOB DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Job Details" className="max-w-2xl">
        {selectedJob && (
          <div className="space-y-5">
            <div className="flex items-start gap-3.5 pb-4 border-b border-[var(--color-border)]">
              <div className="h-12 w-12 bg-[var(--color-bg-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                {selectedJob.company_logo_url ? (
                  <img src={selectedJob.company_logo_url} alt={selectedJob.company_name} className="h-8 w-8 object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-[var(--color-text-tertiary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{selectedJob.company_name}</p>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)] font-medium mt-2">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedJob.location} ({selectedJob.work_mode})</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {selectedJob.experience}</span>
                  {selectedJob.salary && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {selectedJob.salary}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Posted {new Date(selectedJob.posted_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1.5">Job Overview</h3>
              <p className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">{selectedJob.full_description}</p>
            </div>

            {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1.5">Key Responsibilities</h3>
                <ul className="list-disc pl-4 text-xs sm:text-sm text-[var(--color-text-secondary)] space-y-1">
                  {selectedJob.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.required_skills.map(skill => (
                  <span key={skill} className="px-2.5 py-0.5 bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-xs font-semibold rounded-full border border-[var(--color-brand-200)]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleToggleSave(selectedJob.id)}
              >
                {savedJobIds.has(selectedJob.id) ? (
                  <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5" /> Saved</>
                ) : (
                  <><Bookmark className="w-3.5 h-3.5 mr-1.5" /> Save Job</>
                )}
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleApply(selectedJob.apply_url)}>
                Apply on Official Site <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </StudentLayout>
  );
}
