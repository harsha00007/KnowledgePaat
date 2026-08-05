"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  BookOpen, 
  CreditCard,
  Plus,
  ArrowRight
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
    premium: 0
  });

  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentPremium, setRecentPremium] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      // Fetch Stats in parallel
      const [
        { count: studentsCount },
        { count: jobsCount },
        { count: questionsCount },
        { count: notesCount },
        { count: premiumCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('interview_questions').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'Premium').eq('status', 'Active')
      ]);

      setStats({
        students: studentsCount || 0,
        jobs: jobsCount || 0,
        questions: questionsCount || 0,
        notes: notesCount || 0,
        premium: premiumCount || 0
      });

      // Fetch Recent Activity in parallel
      const [
        { data: studentsData },
        { data: jobsData },
        { data: premiumData }
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(5),
        supabase.from('jobs').select('id, title, company_name, posted_at').order('posted_at', { ascending: false }).limit(5),
        // Join with profiles to get the student's name
        supabase.from('subscriptions').select('id, plan, start_date, profiles(full_name, email)').eq('plan', 'Premium').eq('status', 'Active').order('start_date', { ascending: false }).limit(5)
      ]);

      setRecentStudents(studentsData || []);
      setRecentJobs(jobsData || []);
      setRecentPremium(premiumData || []);

    } catch (err) {
      console.error("Failed to fetch admin dashboard data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.students, icon: <Users className="w-6 h-6 text-blue-600" />, bg: 'bg-blue-50' },
    { title: 'Total Jobs', value: stats.jobs, icon: <Briefcase className="w-6 h-6 text-indigo-600" />, bg: 'bg-indigo-50' },
    { title: 'Interview Questions', value: stats.questions, icon: <MessageSquare className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-50' },
    { title: 'Study Notes', value: stats.notes, icon: <BookOpen className="w-6 h-6 text-pink-600" />, bg: 'bg-pink-50' },
    { title: 'Premium Subscribers', value: stats.premium, icon: <CreditCard className="w-6 h-6 text-emerald-600" />, bg: 'bg-emerald-50' },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="p-5 border-slate-200 shadow-sm flex items-center gap-4 bg-white">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 line-clamp-1">{stat.title}</p>
                {isFetching ? (
                  <div className="h-6 w-12 bg-slate-200 animate-pulse rounded mt-1"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/admin/jobs')} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Job
            </Button>
            <Button onClick={() => router.push('/admin/interview-questions')} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Interview Question
            </Button>
            <Button onClick={() => router.push('/admin/notes')} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Upload Notes
            </Button>
            <Button onClick={() => router.push('/admin/students')} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm">
              <Users className="w-4 h-4 mr-2" /> View Students
            </Button>
            <Button onClick={() => router.push('/admin/subscriptions')} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm">
              <CreditCard className="w-4 h-4 mr-2" /> Manage Subscriptions
            </Button>
          </div>
        </div>

        {/* RECENT ACTIVITY GRIDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Students */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" /> Recent Students
              </h3>
              <button onClick={() => router.push('/admin/students')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No students found.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentStudents.map(student => (
                    <li key={student.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-900">{student.full_name || 'Anonymous'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500">{student.email}</p>
                        <p className="text-xs text-slate-400">{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Recent Jobs */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" /> Recent Job Posts
              </h3>
              <button onClick={() => router.push('/admin/jobs')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No jobs posted yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentJobs.map(job => (
                    <li key={job.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 truncate">{job.company_name}</p>
                        <p className="text-xs text-slate-400 shrink-0">{new Date(job.posted_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Recent Premium */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" /> Recent Premium
              </h3>
              <button onClick={() => router.push('/admin/subscriptions')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="p-0 flex-1">
              {isFetching ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded"></div>)}
                </div>
              ) : recentPremium.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No premium subscriptions yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentPremium.map(sub => (
                    <li key={sub.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {sub.profiles?.full_name || 'Anonymous User'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-emerald-600 font-medium">Premium</p>
                        <p className="text-xs text-slate-400">{new Date(sub.start_date).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

        </div>

      </div>
    </AdminLayout>
  );
}
