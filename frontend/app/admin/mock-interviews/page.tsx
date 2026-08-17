"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Filter, 
  Bot, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Award,
  Users, 
  Code2, 
  Briefcase,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  BrainCircuit,
  Zap,
  Activity,
  Tag
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type AdminSession = {
  id: string;
  student_id: string;
  interview_type: string;
  interview_mode: string;
  target_role: string | null;
  experience_level: string | null;
  current_difficulty?: string | null;
  highest_difficulty_reached?: string | null;
  interview_momentum?: string | null;
  topic_performance?: any[] | null;
  status: string;
  subscription_plan: string;
  total_questions: number;
  answered_questions: number;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  ai_overall_feedback: string | null;
  feedback: string | null;
  started_at: string;
  completed_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
};

export default function AdminMockInterviewsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Selected Session for View Modal
  const [selectedSession, setSelectedSession] = useState<AdminSession | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsFetching(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (sessionErr) throw sessionErr;

      if (sessionData && sessionData.length > 0) {
        const studentIds = Array.from(new Set(sessionData.map(s => s.student_id).filter(Boolean)));
        
        const profilesMap: Record<string, { full_name: string; email: string }> = {};
        if (studentIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);

          if (profs) {
            profs.forEach(p => {
              profilesMap[p.id] = { full_name: p.full_name || 'Student', email: p.email || '' };
            });
          }
        }

        const merged = sessionData.map(s => ({
          ...s,
          profiles: profilesMap[s.student_id] || { full_name: 'Student', email: '' }
        }));

        setSessions(merged as unknown as AdminSession[]);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Error fetching mock interview sessions for admin:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpenDetails = async (s: AdminSession) => {
    setSelectedSession(s);
    setIsViewModalOpen(true);
    setIsLoadingDetails(true);

    try {
      const { data: mData } = await supabase
        .from('mock_interview_ai_messages')
        .select('*')
        .eq('session_id', s.id)
        .order('created_at', { ascending: true });

      setSessionMessages(mData || []);
    } catch (err) {
      console.error("Error loading session messages:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Filtering Logic
  const filteredSessions = sessions.filter(item => {
    const query = searchQuery.toLowerCase();
    const fullName = `${item.profiles?.full_name || ''}`.toLowerCase();
    const email = (item.profiles?.email || '').toLowerCase();
    const track = item.interview_type.toLowerCase();
    const role = (item.target_role || '').toLowerCase();
    
    const matchesSearch = query === '' || 
      fullName.includes(query) || 
      email.includes(query) || 
      track.includes(query) ||
      role.includes(query);

    const matchesType = typeFilter === '' || item.interview_type === typeFilter;
    const matchesStatus = statusFilter === '' || item.status === statusFilter;
    const matchesPlan = planFilter === '' || item.subscription_plan === planFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPlan;
  });

  // Analytics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const completedCount = completedSessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  const scores = completedSessions
    .filter(s => s.overall_score)
    .map(s => Number(s.overall_score) || 0);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Track Distribution
  const hrCount = sessions.filter(s => s.interview_type === 'hr').length;
  const techCount = sessions.filter(s => s.interview_type === 'technical').length;
  const managerCount = sessions.filter(s => s.interview_type === 'managerial').length;

  // Pagination Logic
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setStatusFilter('');
    setPlanFilter('');
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-600)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--color-brand-200)] flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" /> Adaptive Interview Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Mock Interview Analytics</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Monitor adaptive difficulty progression, candidate momentum, and topic performance.
          </p>
        </div>

        {/* ── 4 SUMMARY ANALYTICS CARDS ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total AI Interviews</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">{totalSessions}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">All initiated sessions</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Completion Rate</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">{completionRate}%</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">{completedCount} evaluated sessions</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Average AI Score</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-1">{averageScore}%</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">Across adaptive tracks</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Track Distribution</span>
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
              <span>Tech: {techCount}</span> • <span>HR: {hrCount}</span> • <span>Mgr: {managerCount}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Breakdown by track</p>
          </div>

        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Student Name, Email, Role, or Track..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Tracks</option>
              <option value="hr">HR Interview</option>
              <option value="technical">Technical</option>
              <option value="managerial">Managerial</option>
            </select>

            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select 
              value={planFilter} onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
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
          ) : filteredSessions.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No interview sessions found."
                description="Try clearing search filters or check back after students complete interviews."
                action={<Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Track & Role</th>
                      <th className="px-5 py-3.5">Peak Difficulty</th>
                      <th className="px-5 py-3.5">Momentum</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Started</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedSessions.map(item => (
                      <tr key={item.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)]">{item.profiles?.full_name || 'Anonymous Student'}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">{item.profiles?.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)] capitalize">{item.interview_type} Interview</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">{item.target_role || 'General Software'}</p>
                        </td>
                        <td className="px-5 py-3.5 capitalize font-bold text-[var(--color-brand-600)]">
                          {item.highest_difficulty_reached || item.current_difficulty || 'Medium'}
                        </td>
                        <td className="px-5 py-3.5 capitalize font-medium text-[var(--color-text-secondary)]">
                          {item.interview_momentum?.replace('_', ' ') || 'Stable'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-[var(--color-text-secondary)]">
                          {new Date(item.started_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-[var(--color-brand-600)]">
                          {item.overall_score ? `${item.overall_score}%` : '--'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button 
                            onClick={() => handleOpenDetails(item)}
                            className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" 
                            title="View Transcript Audit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedSessions.map(item => (
                  <div key={item.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{item.profiles?.full_name || 'Anonymous Student'}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">{item.target_role} ({item.experience_level})</p>
                      </div>
                      <span className="font-bold text-xs capitalize text-[var(--color-brand-600)]">
                        {item.interview_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>{new Date(item.started_at).toLocaleDateString()}</span>
                      <span className="font-bold text-emerald-700">{item.overall_score ? `${item.overall_score}%` : item.status.toUpperCase()}</span>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => handleOpenDetails(item)}>
                        View Audit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
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

      {/* VIEW SESSION AUDIT MODAL (READ-ONLY) */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Adaptive AI Interview Transcript Audit"
        className="max-w-2xl"
      >
        {selectedSession && (
          <div className="space-y-4 text-xs">
            
            {/* Candidate Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                  {selectedSession.profiles?.full_name || 'Anonymous Student'}
                </h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{selectedSession.profiles?.email}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] font-medium mt-0.5">
                  Role: {selectedSession.target_role || 'Software'} • Peak Difficulty: {selectedSession.highest_difficulty_reached || 'Medium'} • Momentum: {selectedSession.interview_momentum?.replace('_', ' ') || 'Stable'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-[var(--color-brand-600)]">
                  {selectedSession.overall_score ? `${selectedSession.overall_score}%` : 'In Progress'}
                </span>
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)]">
                  {selectedSession.interview_type} Interview
                </p>
              </div>
            </div>

            {/* Messages Transcript */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <h4 className="font-bold uppercase text-[10px] tracking-wider text-[var(--color-text-tertiary)]">
                Recorded Transcript ({sessionMessages.length} Messages)
              </h4>

              {isLoadingDetails ? (
                <div className="py-8 text-center text-[var(--color-text-tertiary)]">Loading transcript...</div>
              ) : sessionMessages.length === 0 ? (
                <div className="py-4 text-center text-[var(--color-text-tertiary)]">No messages recorded in session.</div>
              ) : (
                sessionMessages.map((m, idx) => {
                  const isInterviewer = m.role === 'interviewer';

                  return (
                    <div 
                      key={m.id || idx} 
                      className={`p-3 rounded-[var(--radius-lg)] border ${
                        isInterviewer 
                          ? 'bg-[var(--color-brand-50)]/50 border-[var(--color-brand-200)] text-[var(--color-text-primary)]' 
                          : 'bg-white border-[var(--color-border)] text-[var(--color-text-primary)] ml-4'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[10px] uppercase text-[var(--color-text-tertiary)]">
                          {isInterviewer ? (m.message_type === 'follow_up' ? 'Adaptive Follow-Up' : 'AI Interviewer') : 'Student Response'}
                          {m.metadata?.topic ? ` • Topic: ${m.metadata.topic}` : ''}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-tertiary)]">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{m.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>
                Close Audit
              </Button>
            </div>

          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
