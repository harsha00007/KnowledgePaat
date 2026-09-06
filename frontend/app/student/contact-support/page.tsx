"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { createClient } from '@/utils/supabase/client';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  CreditCard, 
  Briefcase, 
  BookOpen, 
  User, 
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus
} from 'lucide-react';
import { VALID_CONTACT_CATEGORIES, ContactCategory } from '@/types/contact';

interface StudentInquiry {
  id: string;
  reference_code: string;
  category: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  resolved_at: string | null;
}

const CATEGORY_TIPS: Record<string, string> = {
  'Payment': 'Please mention your Razorpay payment ID or order reference. Never share card details, PINs, or passwords.',
  'Subscription': 'Specify your target plan (Starter, Pro, Premium) and whether this is regarding renewal, upgrade, or billing.',
  'Account & Profile': 'Mention whether you need email changes, college update verification, or profile details adjustment.',
  'Jobs': 'Include the job title and company name from the portal so we can look up the opportunity quickly.',
  'Resume': 'Describe whether you encountered an issue generating, downloading, or formatting your resume.',
  'Interview Preparation': 'Specify which track (HR, Technical, Managerial) or question set you are practicing.',
  'Notes & Learning': 'Mention the specific study notes topic or PDF download you are inquiring about.',
  'Store & Purchases': 'Include your order ID and the store product bundle you purchased.',
  'Technical Issue': 'Briefly describe what you were doing, what went wrong, and what device/browser you are using.',
  'Other': 'Please provide as much relevant context as possible so our team can assist you efficiently.',
};

export default function StudentContactSupportPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  
  // Form State
  const [category, setCategory] = useState<ContactCategory>('Account & Profile');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // History State
  const [inquiries, setInquiries] = useState<StudentInquiry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchStudentInquiries();
  }, []);

  const fetchStudentInquiries = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('id, reference_code, category, subject, message, status, priority, created_at, resolved_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table may not be created yet in remote database
        if (error.code !== 'PGRST205') {
          console.error('Error loading student inquiries:', error);
        }
      } else if (data) {
        setInquiries(data as StudentInquiry[]);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject,
          message,
          priority,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Unable to submit your support request right now. Please try again.');
      }

      setSubmittedRef(data.referenceCode || 'KP-2026-CONFIRMED');
      // Reset form
      setSubject('');
      setMessage('');
      setCategory('Account & Profile');
      setPriority('normal');
      // Refresh inquiries history
      fetchStudentInquiries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to submit your support request right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: StudentInquiry['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Submitted
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            Closed
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: StudentInquiry['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800">
            High
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Normal
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-800">
            Low
          </span>
        );
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-blue-950/60 dark:text-blue-400">
                <HelpCircle className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Contact Support</h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">
              We&apos;re here to help you get the most out of KnowledgePaat.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[var(--color-bg-subtle)] p-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] self-start sm:self-auto">
            <button
              onClick={() => { setActiveTab('new'); setSubmittedRef(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
                activeTab === 'new'
                  ? 'bg-white text-[var(--color-brand-600)] shadow-xs dark:bg-slate-800 dark:text-blue-400'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Request</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-[var(--color-brand-600)] shadow-xs dark:bg-slate-800 dark:text-blue-400'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Requests</span>
              {inquiries.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-blue-900/50 dark:text-blue-300">
                  {inquiries.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── TAB 1: NEW SUPPORT REQUEST ──────────────────────────────── */}
        {activeTab === 'new' && (
          <div>
            {submittedRef ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-[var(--shadow-sm)] animate-in fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  Your request has been submitted successfully!
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto mb-4">
                  Our dedicated student support team has received your inquiry and will investigate it promptly.
                </p>

                <div className="inline-flex items-center gap-2 bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-blue-950/60 dark:text-blue-300 border border-[var(--color-brand-200)] dark:border-blue-800 px-4 py-2 rounded-full text-xs font-mono font-bold mb-8">
                  <span>Reference:</span>
                  <span className="tracking-wide text-sm">{submittedRef}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button 
                    variant="primary" 
                    onClick={() => setActiveTab('history')}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    View My Requests
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => setSubmittedRef(null)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Submit Another Request
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Submit a Support Inquiry</h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Your authenticated student profile and active subscription details are automatically attached to this request.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ContactCategory)}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors"
                      >
                        {VALID_CONTACT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                        Priority Level
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors"
                      >
                        <option value="low">Low — General inquiry</option>
                        <option value="normal">Normal — Standard request</option>
                        <option value="high">High — Time-sensitive question</option>
                        <option value="urgent">Urgent — Critical portal issue</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Tip Guidance Alert */}
                  {CATEGORY_TIPS[category] && (
                    <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--color-brand-50)]/70 dark:bg-blue-950/40 border border-[var(--color-brand-200)] dark:border-blue-800/80 text-xs text-[var(--color-brand-900)] dark:text-blue-300">
                      <AlertCircle className="w-4 h-4 text-[var(--color-brand-600)] dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{CATEGORY_TIPS[category]}</p>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Issue downloading Python interview notes bundle"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                      Detailed Description
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Please explain the issue or question in detail. Mention any error messages or steps you took..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] transition-colors resize-y"
                    />
                  </div>

                  {/* Error Notification */}
                  {errorMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      Submitted inquiries are typically answered within 24 business hours.
                    </p>

                    <Button
                      type="submit"
                      variant="primary"
                      className="min-w-[180px] text-xs shadow-xs"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MY SUPPORT REQUESTS (HISTORY) ────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Your Support Requests</h2>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Track the status and triage progress of your submitted inquiries.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchStudentInquiries}
                disabled={isLoadingHistory}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingHistory ? (
              <div className="p-12 text-center text-xs text-[var(--color-text-tertiary)]">
                Loading your support history...
              </div>
            ) : inquiries.length === 0 ? (
              <EmptyState
                title="No support requests found"
                description="You have not submitted any inquiries yet. If you need help with anything on KnowledgePaat, reach out to us."
                icon={<MessageSquare className="w-6 h-6 text-[var(--color-brand-600)]" />}
                action={
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('new')} className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create First Request
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {inquiries.map((inq) => {
                  const isExpanded = expandedInquiryId === inq.id;
                  return (
                    <div
                      key={inq.id}
                      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white dark:bg-slate-900 p-4 shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-brand-300)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)]/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--color-brand-600)] dark:text-blue-400 bg-[var(--color-brand-50)] dark:bg-blue-950/60 border border-[var(--color-brand-200)] dark:border-blue-800 px-2 py-0.5 rounded">
                            {inq.reference_code}
                          </span>
                          <span className="text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                            {inq.category}
                          </span>
                          {getPriorityBadge(inq.priority)}
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          {getStatusBadge(inq.status)}
                          <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium">
                            {new Date(inq.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                          {inq.subject}
                        </h3>

                        <p className={`text-xs text-[var(--color-text-secondary)] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {inq.message}
                        </p>

                        <button
                          onClick={() => setExpandedInquiryId(isExpanded ? null : inq.id)}
                          className="mt-2 text-[11px] font-semibold text-[var(--color-brand-600)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Read full message</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </StudentLayout>
  );
}
