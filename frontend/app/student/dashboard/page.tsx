"use client";

import React from 'react';
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
  Code2
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ROW 1: Quick Stats / Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Profile Completion */}
          <Card className="p-6 border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Profile Status</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">80% Complete</h3>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
              <div className="bg-[var(--color-brand-600)] h-2 rounded-full" style={{ width: '80%' }}></div>
            </div>
            <Link href="/student/profile">
              <Button variant="outline" className="w-full text-sm">Complete Profile</Button>
            </Link>
          </Card>

          {/* 2. Resume Status */}
          <Card className="p-6 border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Resume</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Resume Uploaded</h3>
            <p className="text-sm text-slate-500 mb-6">Upload your resume to apply for jobs directly.</p>
            <Link href="/student/resume">
              <Button variant="primary" className="w-full text-sm">Upload Resume</Button>
            </Link>
          </Card>

          {/* 6. Subscription */}
          <Card className="p-6 border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Current Plan</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
            <p className="text-sm text-slate-500 mb-6">Upgrade to Premium for exclusive content.</p>
            <Link href="/pricing">
              <Button variant="outline" className="w-full text-sm">Upgrade Plan</Button>
            </Link>
          </Card>

        </div>

        {/* ROW 2: Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 3. Latest Jobs (Takes up 2 columns on large screens) */}
          <Card className="p-6 border-slate-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Recommended Jobs</h2>
              <Link href="/jobs" className="text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { company: 'TechNova Solutions', role: 'Frontend Developer Intern', location: 'Bangalore, India' },
                { company: 'Global Finance Inc.', role: 'Junior Data Analyst', location: 'Remote' },
                { company: 'Creative Studios', role: 'UI/UX Designer', location: 'Mumbai, India' },
                { company: 'CloudServe Systems', role: 'SDE 1', location: 'Pune, India' },
                { company: 'Innovate AI', role: 'Machine Learning Intern', location: 'Remote' },
              ].map((job, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[var(--color-brand-100)] hover:shadow-sm transition-all bg-white group">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-gray-400 group-hover:text-[var(--color-brand-500)] transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{job.role}</h4>
                      <p className="text-sm text-slate-500">{job.company}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Full-time</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4 sm:mt-0 self-start sm:self-center">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* 4 & 5. Prep and Notes Side Column */}
          <div className="space-y-6">
            
            {/* 4. Interview Preparation */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Interview Prep</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <PrepCategory icon={<Users className="w-4 h-4" />} label="HR" />
                <PrepCategory icon={<Code className="w-4 h-4" />} label="Technical" />
                <PrepCategory icon={<Brain className="w-4 h-4" />} label="Aptitude" />
                <PrepCategory icon={<Building className="w-4 h-4" />} label="Company" />
              </div>
              <Link href="/interview-preparation">
                <Button className="w-full text-sm">Start Preparation</Button>
              </Link>
            </Card>

            {/* 5. Notes */}
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Study Notes</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <PrepCategory icon={<Users className="w-4 h-4" />} label="HR" />
                <PrepCategory icon={<Terminal className="w-4 h-4" />} label="Technical" />
                <PrepCategory icon={<Brain className="w-4 h-4" />} label="Aptitude" />
                <PrepCategory icon={<Code2 className="w-4 h-4" />} label="Programming" />
              </div>
              <Link href="/notes">
                <Button variant="outline" className="w-full text-sm">View Notes</Button>
              </Link>
            </Card>

          </div>

        </div>
      </div>
    </StudentLayout>
  );
}

function PrepCategory({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-[var(--color-brand-50)] hover:border-[var(--color-brand-100)] transition-colors cursor-pointer text-center">
      <div className="text-slate-600 mb-2">{icon}</div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </div>
  );
}
