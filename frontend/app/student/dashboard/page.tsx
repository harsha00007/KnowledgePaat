"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  ArrowRight,
  UserCheck,
  FileText,
  CreditCard,
  Users,
  Code,
  Brain,
  Building,
  Terminal,
  Code2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile for resume and completion info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);

        // Fetch subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (subData) setSubscription(subData);
      }

      // Fetch top recent jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(4);
      if (jobsData && jobsData.length > 0) {
        setRecentJobs(jobsData);
      } else {
        // Fallback default jobs preview if database is empty
        setRecentJobs([
          { id: '1', company_name: 'TechNova Solutions', title: 'Frontend Developer Intern', location: 'Bangalore, India', employment_type: 'Internship', work_mode: 'Hybrid' },
          { id: '2', company_name: 'Global Finance Inc.', title: 'Junior Data Analyst', location: 'Remote', employment_type: 'Full-time', work_mode: 'Remote' },
          { id: '3', company_name: 'Creative Studios', title: 'UI/UX Designer', location: 'Mumbai, India', employment_type: 'Full-time', work_mode: 'Hybrid' },
          { id: '4', company_name: 'CloudServe Systems', title: 'Software Engineer (Fresher)', location: 'Pune, India', employment_type: 'Full-time', work_mode: 'On-site' },
        ]);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const hasResume = Boolean(profile?.resume_url);
  const isPremium = subscription?.plan === 'Premium' && subscription?.status === 'Active';

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* WELCOME BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Student Dashboard</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Track your profile progress, explore verified jobs, and prepare for upcoming interviews.
            </p>
          </div>
        </div>

        {/* ── ROW 1: THREE SUMMARY CARDS ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* 1. Profile Completion */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Profile Status</span>
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                {profile?.full_name ? 'Profile Active' : 'Profile Incomplete'}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                Add your education, skills, and preferences for better job matching.
              </p>
            </div>
            <Link href="/student/profile" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-center">
                {profile?.full_name ? 'Edit Profile' : 'Complete Profile'}
              </Button>
            </Link>
          </div>

          {/* 2. Resume Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Resume Status</span>
                <div className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center ${hasResume ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                {hasResume ? 'Resume Uploaded' : 'No Resume'}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4 truncate" title={profile?.resume_filename || ''}>
                {hasResume ? (profile?.resume_filename || 'PDF Document') : 'Upload your resume to apply for openings directly.'}
              </p>
            </div>
            <Link href="/student/resume" className="block w-full">
              <Button variant={hasResume ? "outline" : "primary"} size="sm" className="w-full justify-center">
                {hasResume ? 'View / Replace Resume' : 'Upload Resume'}
              </Button>
            </Link>
          </div>

          {/* 3. Subscription Status */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Membership</span>
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                {isPremium ? 'Premium Plan' : 'Free Plan'}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                {isPremium ? 'Full access to all interview prep & study notes.' : 'Upgrade for company-wise questions & full notes.'}
              </p>
            </div>
            <Link href="/student/subscription" className="block w-full">
              <Button variant={isPremium ? "outline" : "outline"} size="sm" className="w-full justify-center">
                {isPremium ? 'View Subscription' : 'Upgrade Plan'}
              </Button>
            </Link>
          </div>

        </div>

        {/* ── ROW 2: RECOMMENDED JOBS & PREPARATION ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recommended Jobs (2 cols on lg) */}
          <div className="lg:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Recommended Jobs</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Verified fresher opportunities</p>
              </div>
              <Link 
                href="/student/jobs" 
                className="text-xs font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-bg-subtle)] transition-all gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                    </div>
                    <div className="min-w-0 truncate">
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{job.title}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{job.company_name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.employment_type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href="/student/jobs" className="shrink-0 self-start sm:self-center">
                    <Button variant="outline" size="sm" className="text-xs h-8 px-3">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Prep & Notes */}
          <div className="space-y-5">
            
            {/* Interview Prep Card */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Interview Preparation</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">Practice questions by category</p>
              
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <PrepCategory icon={<Users className="w-4 h-4" />} label="HR" />
                <PrepCategory icon={<Code className="w-4 h-4" />} label="Technical" />
                <PrepCategory icon={<Brain className="w-4 h-4" />} label="Aptitude" />
                <PrepCategory icon={<Building className="w-4 h-4" />} label="Company" />
              </div>
              
              <Link href="/student/interview-preparation" className="block w-full">
                <Button size="sm" className="w-full justify-center">Start Preparation</Button>
              </Link>
            </div>

            {/* Study Notes Card */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Study Notes</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">Download concise revision guides</p>
              
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <PrepCategory icon={<Users className="w-4 h-4" />} label="HR Notes" />
                <PrepCategory icon={<Terminal className="w-4 h-4" />} label="Technical" />
                <PrepCategory icon={<Brain className="w-4 h-4" />} label="Aptitude" />
                <PrepCategory icon={<Code2 className="w-4 h-4" />} label="Programming" />
              </div>
              
              <Link href="/student/notes" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-center">View Notes</Button>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </StudentLayout>
  );
}

function PrepCategory({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-2.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-brand-50)] hover:border-[var(--color-brand-200)] transition-colors text-center">
      <div className="text-[var(--color-brand-600)] mb-1">{icon}</div>
      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}
