"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  BookOpen, 
  CreditCard,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [stats, setStats] = useState({
    students: 0,
    jobs: 0,
    questions: 0,
    notes: 0,
    paidSubscribers: 0,
    starterCount: 0,
    proCount: 0,
    premiumCount: 0,
  });

  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentPaidSubscribers, setRecentPaidSubscribers] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      // Fetch Stats and Recent Activity all in parallel (8 queries)
      const [
        { count: studentsCount },
        { count: jobsCount },
        { count: questionsCount },
        { count: notesCount },
        { data: activeSubsData },
        { data: studentsData },
        { data: jobsData },
        { data: subRows }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('interview_questions').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('plan, status').in('status', ['active', 'Active']),
        supabase.from('profiles').select('id, full_name, email, created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(5),
        supabase.from('jobs').select('id, title, company_name, posted_at').order('posted_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('*').in('plan', ['starter', 'Starter', 'pro', 'Pro', 'premium', 'Premium']).in('status', ['active', 'Active']).order('created_at', { ascending: false }).limit(5)
      ]);

      let starter = 0;
      let pro = 0;
      let premium = 0;

      if (activeSubsData) {
        activeSubsData.forEach(sub => {
          const p = (sub.plan || '').toLowerCase();
          if (p === 'starter') starter++;
          else if (p === 'pro') pro++;
          else if (p === 'premium') premium++;
        });
      }

      const totalPaid = starter + pro + premium;

      setStats({
        students: studentsCount || 0,
        jobs: jobsCount || 0,
        questions: questionsCount || 0,
        notes: notesCount || 0,
        paidSubscribers: totalPaid,
        starterCount: starter,
        proCount: pro,
        premiumCount: premium,
      });

      setRecentStudents(studentsData || []);
      setRecentJobs(jobsData || []);

      if (subRows && subRows.length > 0) {
        const studentIds = Array.from(new Set(subRows.map(s => s.student_id).filter(Boolean)));
        let pMap: Record<string, { full_name: string; email: string }> = {};

        if (studentIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);

          if (profs) {
            profs.forEach(p => { pMap[p.id] = { full_name: p.full_name || 'Subscriber', email: p.email || '' }; });
          }
        }

        setRecentPaidSubscribers(subRows.map(s => ({
          ...s,
          profiles: pMap[s.student_id] || { full_name: 'Subscriber', email: '' }
        })));
      } else {
        setRecentPaidSubscribers([]);
      }

    } catch (err) {
      console.error("Failed to fetch admin dashboard data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.students, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'Active Jobs', value: stats.jobs, icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { title: 'Interview Questions', value: stats.questions, icon: MessageSquare, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { title: 'Study Notes', value: stats.notes, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { 
      title: 'Paid Subscribers', 
      value: stats.paidSubscribers, 
      icon: CreditCard, 
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      subtitle: `Starter: ${stats.starterCount} · Pro: ${stats.proCount} · Prem: ${stats.premiumCount}`
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Platform Overview</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Monitor real-time student registrations, job postings, content archive, and subscriptions.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex items-center gap-3.5">
                <div className={`h-11 w-11 rounded-[var(--radius-lg)] border flex items-center justify-center shrink-0 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-tertiary)] line-clamp-1">{stat.title}</p>
                  {isFetching ? (
                    <div className="h-6 w-12 bg-gray-100 animate-pulse rounded mt-1"></div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mt-0.5">{stat.value}</h3>
                      {stat.subtitle && (
                        <p className="text-[10px] text-[var(--color-text-tertiary)] font-medium mt-0.5">{stat.subtitle}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">Quick Management Actions</h2>
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" variant="primary" onClick={() => router.push('/admin/jobs')} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add New Job
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/interview-questions')} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/notes')} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Upload Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/students')} className="text-xs">
              <Users className="w-3.5 h-3.5 mr-1" /> View Students
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/subscriptions')} className="text-xs">
              <CreditCard className="w-3.5 h-3.5 mr-1" /> Manage Subscriptions
            </Button>
          </div>
        </div>

        {/* RECENT ACTIVITY 3-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Students */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[var(--color-brand-600)]" /> Recent Students
              </h3>
              <button onClick={() => router.push('/admin/students')} className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-tertiary)] font-medium">No students registered yet.</div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {recentStudents.map(student => (
                    <li key={student.id} className="p-3.5 hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">{student.full_name || 'Anonymous Student'}</p>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <p className="text-[var(--color-text-secondary)] truncate max-w-[160px]">{student.email}</p>
                        <p className="text-[var(--color-text-tertiary)] flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(student.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" /> Recent Job Posts
              </h3>
              <button onClick={() => router.push('/admin/jobs')} className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-tertiary)] font-medium">No jobs posted yet.</div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {recentJobs.map(job => (
                    <li key={job.id} className="p-3.5 hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{job.title}</p>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <p className="text-[var(--color-text-secondary)] font-medium truncate max-w-[160px]">{job.company_name}</p>
                        <p className="text-[var(--color-text-tertiary)] shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(job.posted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Paid Subscribers */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Paid Subscribers
              </h3>
              <button onClick={() => router.push('/admin/subscriptions')} className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentPaidSubscribers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-tertiary)] font-medium">No active paid subscribers yet.</div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {recentPaidSubscribers.map(sub => {
                    const planName = (sub.plan || 'Paid').toLowerCase();
                    const badgeClass = 
                      planName === 'premium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      planName === 'pro' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <li key={sub.id} className="p-3.5 hover:bg-[var(--color-bg-subtle)] transition-colors">
                        <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                          {sub.profiles?.full_name || sub.profiles?.email || 'Anonymous Student'}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] border ${badgeClass}`}>
                            {sub.plan || 'Paid'}
                          </span>
                          <p className="text-[var(--color-text-tertiary)] shrink-0 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(sub.created_at || sub.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
