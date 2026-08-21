"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { UpgradeModal } from '@/components/UpgradeModal';
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
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, canViewCompanyName, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId, PlanId } from '@/config/plans';
import { CompanyNameGate } from '@/components/CompanyNameGate';

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
  minimum_plan?: string;
  access_type?: string;
};

const CATEGORIES = [
  'Software Development',
  'Data & Analytics',
  'Design & UI/UX',
  'Product & Operations',
  'Marketing & Sales',
  'Finance & Accounting',
  'Human Resources'
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const EXPERIENCE_LEVELS = ['Fresher (0 yrs)', '0-1 yrs', '1-2 yrs'];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Selected Job for Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('pro');

  const supabase = createClient();

  useEffect(() => {
    fetchJobsAndSavedState();
  }, []);

  const fetchJobsAndSavedState = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user subscription for access control
      if (user) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setUserAccess(calculateUserAccess(subData));
      }

      // Fetch active Jobs
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
      if (!user) return;

      const isSaved = savedJobIds.has(jobId);
      
      setSavedJobIds(prev => {
        const next = new Set(prev);
        if (isSaved) next.delete(jobId);
        else next.add(jobId);
        return next;
      });

      if (isSaved) {
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('student_id', user.id)
          .eq('job_id', jobId);
      } else {
        await supabase
          .from('saved_jobs')
          .insert({ student_id: user.id, job_id: jobId });
      }
    } catch (err) {
      console.error("Error toggling saved job:", err);
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  // Filter Jobs
  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase();
    const canSeeCompany = canViewCompanyName(userAccess, job.minimum_plan || job.access_type);
    
    const matchesSearch = query === '' || 
      job.title.toLowerCase().includes(query) || 
      (canSeeCompany && job.company_name.toLowerCase().includes(query)) ||
      (job.required_skills && job.required_skills.some(s => s.toLowerCase().includes(query))) ||
      job.location.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === '' || job.category === categoryFilter;
    const matchesWorkMode = workModeFilter === '' || job.work_mode === workModeFilter;
    const matchesExp = experienceFilter === '' || job.experience === experienceFilter;
    
    const itemPlan = normalizePlanId(job.minimum_plan || job.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesCategory && matchesWorkMode && matchesExp && matchesPlan;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setWorkModeFilter('');
    setExperienceFilter('');
    setPlanFilter('');
  };

  const userPlanConfig = PLANS[userAccess.effectivePlan];

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Verified Fresher Jobs</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
                Browse verified direct company openings and apply without third-party redirects.
              </p>
            </div>
            
            {/* User Plan Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs shrink-0 self-start sm:self-center">
              <span className="text-[var(--color-text-tertiary)]">Your Plan:</span>
              <span className={`font-bold ${userPlanConfig.badgeTextColor}`}>
                {userPlanConfig.name} Member
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by job title, company, or skills (e.g. React, Python)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors bg-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select 
              value={workModeFilter} 
              onChange={e => setWorkModeFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Work Modes</option>
              {WORK_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>

            <select 
              value={experienceFilter} 
              onChange={e => setExperienceFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Experience</option>
              {EXPERIENCE_LEVELS.map(exp => <option key={exp} value={exp}>{exp}</option>)}
            </select>

            <select 
              value={planFilter} 
              onChange={e => setPlanFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plan Tiers</option>
              <option value="free">Free Jobs</option>
              <option value="starter">Starter Jobs</option>
              <option value="pro">Pro Jobs</option>
              <option value="premium">Premium Jobs</option>
            </select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters} 
              className="col-span-2 sm:col-span-1 text-xs justify-center"
            >
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* JOBS LIST / GRID */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState 
            title="No matching job listings found"
            description="Try relaxing your filters or searching for different keywords or technologies."
            action={<Button variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => {
              const isSaved = savedJobIds.has(job.id);
              const reqPlan = job.minimum_plan || job.access_type || 'free';
              const isUnlocked = isContentAccessible(reqPlan, userAccess);
              const planMeta = PLANS[normalizePlanId(reqPlan)];

              return (
                <div 
                  key={job.id} 
                  onClick={() => handleJobClick(job)}
                  className={`rounded-[var(--radius-xl)] border p-5 transition-all cursor-pointer flex flex-col justify-between relative group ${
                    !isUnlocked 
                      ? 'bg-slate-50/70 border-[var(--color-border)] hover:border-[var(--color-brand-300)]' 
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-sm)]'
                  }`}
                >
                  <div>
                    {/* Header: Company, Plan Badge & Bookmark */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-0.5">
                            <CompanyNameGate
                              companyName={job.company_name}
                              minimumPlan={reqPlan}
                              userAccess={userAccess}
                              onUpgradeClick={(req) => {
                                setModalRequiredPlan(req);
                                setIsUpgradeModalOpen(true);
                              }}
                            />
                          </div>
                          <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] transition-colors leading-snug">
                            {job.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <PremiumBadge minimumPlan={reqPlan} />
                        <button 
                          onClick={(e) => handleToggleSave(job.id, e)}
                          className="p-1.5 rounded-full hover:bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                          title={isSaved ? "Unsave Job" : "Save Job"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[var(--color-brand-600)] fill-[var(--color-brand-50)]" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-secondary)] mb-3">
                      <span className="flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                        <MapPin className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                        <Briefcase className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {job.employment_type}
                      </span>
                      <span className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                        {job.work_mode}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                          <IndianRupee className="w-3 h-3" /> {job.salary}
                        </span>
                      )}
                    </div>

                    {/* Description Snippet */}
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-3 leading-relaxed">
                      {job.short_description || job.full_description}
                    </p>

                    {/* Skills Tags */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {job.required_skills.slice(0, 4).map(skill => (
                          <span key={skill} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2 py-0.5 rounded text-[10px] font-semibold border border-[var(--color-brand-200)]">
                            {skill}
                          </span>
                        ))}
                        {job.required_skills.length > 4 && (
                          <span className="text-[10px] text-[var(--color-text-tertiary)] self-center font-medium">
                            +{job.required_skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium">
                      Posted {new Date(job.posted_at).toLocaleDateString()}
                    </span>

                    {!isUnlocked ? (
                      <Button variant="outline" size="sm" className="text-xs h-7.5 px-3 text-[var(--color-brand-600)] border-[var(--color-brand-200)] hover:bg-[var(--color-brand-50)]">
                        <Lock className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> {planMeta.name} Required
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FULL JOB DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Job Details" className="max-w-2xl">
        {selectedJob && (
          <div className="space-y-5 text-xs text-[var(--color-text-secondary)]">
            
            {/* Header in Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-[var(--color-text-tertiary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                    <PremiumBadge minimumPlan={selectedJob.minimum_plan || selectedJob.access_type} />
                  </div>
                  <div className="mt-1">
                    <CompanyNameGate
                      companyName={selectedJob.company_name}
                      minimumPlan={selectedJob.minimum_plan || selectedJob.access_type}
                      userAccess={userAccess}
                      className="text-xs font-semibold text-[var(--color-brand-600)]"
                      onUpgradeClick={(req) => {
                        setIsModalOpen(false);
                        setModalRequiredPlan(req);
                        setIsUpgradeModalOpen(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={(e) => handleToggleSave(selectedJob.id, e)}
                className="p-2 rounded-full hover:bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors shrink-0"
                title={savedJobIds.has(selectedJob.id) ? "Unsave Job" : "Save Job"}
              >
                {savedJobIds.has(selectedJob.id) ? (
                  <BookmarkCheck className="w-5 h-5 text-[var(--color-brand-600)] fill-[var(--color-brand-50)]" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Quick Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs">
              <div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider">Location</p>
                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{selectedJob.location}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider">Experience</p>
                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{selectedJob.experience}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider">Work Mode</p>
                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{selectedJob.work_mode}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider">Compensation</p>
                <p className="font-semibold text-emerald-700 mt-0.5">{selectedJob.salary || 'Best in Industry'}</p>
              </div>
            </div>

            {/* Full Description */}
            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1.5 text-xs uppercase tracking-wide">Role Overview</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedJob.full_description || selectedJob.short_description}</p>
            </div>

            {/* Responsibilities */}
            {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2 text-xs uppercase tracking-wide">Key Responsibilities</h4>
                <ul className="space-y-1.5">
                  {selectedJob.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-brand-600)] shrink-0 mt-0.5" />
                      <span className="text-[var(--color-text-secondary)] leading-normal">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1.5 text-xs uppercase tracking-wide">Required Skills & Technologies</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.required_skills.map(skill => (
                    <span key={skill} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-2.5 py-1 rounded text-xs font-semibold border border-[var(--color-brand-200)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Apply CTA */}
            <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                Verified direct application • Zero third-party fees
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-initial">
                  Close
                </Button>
                {isContentAccessible(selectedJob.minimum_plan || selectedJob.access_type, userAccess) ? (
                  <Button 
                    size="sm" 
                    onClick={() => window.open(selectedJob.apply_url, '_blank')}
                    className="flex-1 sm:flex-initial"
                  >
                    Apply on Company Site <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const req = selectedJob.minimum_plan || selectedJob.access_type || 'pro';
                      setIsModalOpen(false);
                      setModalRequiredPlan(req);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="flex-1 sm:flex-initial shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" /> Unlock {PLANS[normalizePlanId(selectedJob.minimum_plan || selectedJob.access_type)].name} to Apply
                  </Button>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* UPGRADE PROMPT MODAL */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle="this exclusive fresher job opening"
      />

    </StudentLayout>
  );
}
