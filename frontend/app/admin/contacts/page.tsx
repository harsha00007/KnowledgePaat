"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CreditCard, 
  RotateCcw,
  Sparkles,
  Lock,
  ExternalLink,
  MessageSquare,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare
} from 'lucide-react';
import { VALID_CONTACT_CATEGORIES } from '@/types/contact';

interface ContactInquiry {
  id: string;
  created_at: string;
  updated_at: string;
  source_type: 'external' | 'student';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  subject: string;
  message: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  subscription_plan: string | null;
  reference_code: string;
  admin_notes: string | null;
  assigned_admin_id: string | null;
  resolved_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface Metrics {
  total: number;
  external: number;
  students: number;
  newCount: number;
  inProgressCount: number;
  urgentCount: number;
}

export default function AdminContactsPage() {
  const [activeTab, setActiveTab] = useState<'external' | 'student'>('external');
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);

  // Summary Metrics
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    external: 0,
    students: 0,
    newCount: 0,
    inProgressCount: 0,
    urgentCount: 0,
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    mode: 'single' | 'bulk';
    targetInquiry: ContactInquiry | null;
    targetIds: string[];
  }>({
    isOpen: false,
    mode: 'single',
    targetInquiry: null,
    targetIds: [],
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Detail Modal
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminNotesDraft, setAdminNotesDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // 1. Search Debounce (300ms) to prevent excessive backend fetches while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper to show transient toast message
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 3500);
  }, []);

  // 2. Fetch Inquiries and Sync Metrics from API
  const fetchInquiries = useCallback(async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams({
        source_type: activeTab,
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        plan: planFilter,
        search: debouncedSearch,
        sort: sortOrder,
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString(),
      });

      const res = await fetch(`/api/admin/contacts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch contact inquiries');
      const data = await res.json();

      setInquiries(data.inquiries || []);
      setTotalCount(data.totalCount || 0);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching admin inquiries:', err);
    } finally {
      setIsFetching(false);
    }
  }, [activeTab, statusFilter, categoryFilter, priorityFilter, planFilter, debouncedSearch, sortOrder, currentPage]);

  // Fetch inquiries on mount and whenever tabs, filters, search or page changes
  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Clear selections when tab or search/filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, statusFilter, categoryFilter, priorityFilter, planFilter, debouncedSearch]);

  // Handle Tab Switch
  const handleTabChange = (tab: 'external' | 'student') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedIds([]);
    if (tab === 'external') {
      setPlanFilter('all');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setPlanFilter('all');
    setSortOrder('newest');
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Selection calculations for the visible items on current page
  const visibleIds = inquiries.map(i => i.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.includes(id)) && !allVisibleSelected;

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Single Delete Modal
  const handleOpenDeleteSingle = (inquiry: ContactInquiry) => {
    setDeleteModalState({
      isOpen: true,
      mode: 'single',
      targetInquiry: inquiry,
      targetIds: [inquiry.id],
    });
  };

  // Open Bulk Delete Modal
  const handleOpenDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      mode: 'bulk',
      targetInquiry: null,
      targetIds: [...selectedIds],
    });
  };

  // Close Delete Modal
  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalState({
      isOpen: false,
      mode: 'single',
      targetInquiry: null,
      targetIds: [],
    });
  };

  // Confirm Delete Action (Single or Bulk)
  const handleConfirmDelete = async () => {
    const targetIds = deleteModalState.targetIds;
    if (targetIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to delete contact inquiry. Please try again.');
      }

      const deletedCount = targetIds.length;
      const deletedItems = inquiries.filter(i => targetIds.includes(i.id));

      // 1. Immediately remove deleted rows from current view
      setInquiries(prev => prev.filter(i => !targetIds.includes(i.id)));
      setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));

      // 2. Adjust local totalCount
      const nextTotalCount = Math.max(0, totalCount - deletedCount);
      setTotalCount(nextTotalCount);

      // 3. Immediately adjust local summary metrics
      setMetrics(prev => {
        let extDel = 0;
        let stuDel = 0;
        let newDel = 0;
        let inProgDel = 0;
        let urgDel = 0;

        deletedItems.forEach(item => {
          if (item.source_type === 'external') extDel++;
          if (item.source_type === 'student') stuDel++;
          if (item.status === 'new') newDel++;
          if (item.status === 'in_progress') inProgDel++;
          if (item.priority === 'urgent') urgDel++;
        });

        return {
          total: Math.max(0, prev.total - deletedCount),
          external: Math.max(0, prev.external - extDel),
          students: Math.max(0, prev.students - stuDel),
          newCount: Math.max(0, prev.newCount - newDel),
          inProgressCount: Math.max(0, prev.inProgressCount - inProgDel),
          urgentCount: Math.max(0, prev.urgentCount - urgDel),
        };
      });

      // 4. Close modals
      handleCloseDeleteModal();
      if (selectedInquiry && targetIds.includes(selectedInquiry.id)) {
        setIsDetailModalOpen(false);
        setSelectedInquiry(null);
      }

      // 5. Show clean success toast
      showToast(
        deletedCount === 1 
          ? 'Contact inquiry deleted successfully.' 
          : `${deletedCount} contact inquiries deleted successfully.`,
        'success'
      );

      // 6. Handle Pagination Boundary: If deleted final item on page, step back automatically
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / itemsPerPage));
      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
      } else {
        // Refetch current page and sync metrics
        fetchInquiries();
      }

      // 7. Background sync of metrics to guarantee exact server parity
      fetch('/api/admin/contacts?page=1&pageSize=1&include_metrics=true')
        .then(r => r.json())
        .then(d => {
          if (d?.metrics) setMetrics(d.metrics);
        })
        .catch(() => {});

    } catch (err: any) {
      console.error('Error deleting contact inquiry:', err);
      showToast(err.message || 'Unable to delete contact inquiry. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Detail Modal (Fast: uses existing row state directly)
  const handleOpenDetail = (inquiry: ContactInquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotesDraft(inquiry.admin_notes || '');
    setNotesSavedSuccess(false);
    setIsDetailModalOpen(true);
  };

  // Update Status or Priority
  const handleUpdateInquiry = async (updates: Partial<ContactInquiry>) => {
    if (!selectedInquiry) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInquiry.id,
          ...updates,
        }),
      });

      if (!res.ok) throw new Error('Failed to update inquiry');
      const data = await res.json();

      if (data.inquiry) {
        setSelectedInquiry(data.inquiry);
        setInquiries(prev => prev.map(item => item.id === data.inquiry.id ? data.inquiry : item));
        // Refresh metrics in background
        fetchInquiries();
      }
    } catch (err) {
      console.error('Error updating inquiry status:', err);
      showToast('Failed to update inquiry status.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Admin Internal Notes
  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;
    setIsSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInquiry.id,
          admin_notes: adminNotesDraft,
        }),
      });

      if (!res.ok) throw new Error('Failed to save admin notes');
      const data = await res.json();

      if (data.inquiry) {
        setSelectedInquiry(data.inquiry);
        setInquiries(prev => prev.map(item => item.id === data.inquiry.id ? data.inquiry : item));
        setNotesSavedSuccess(true);
        setTimeout(() => setNotesSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving admin notes:', err);
      showToast('Failed to save admin notes.', 'error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getStatusBadge = (status: ContactInquiry['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            New
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Closed
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: ContactInquiry['priority']) => {
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

  const getPlanBadge = (plan: string | null) => {
    if (!plan) return <span className="text-slate-400 text-xs">-</span>;
    const p = plan.toLowerCase();
    switch (p) {
      case 'premium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            Premium
          </span>
        );
      case 'pro':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
            Pro
          </span>
        );
      case 'starter':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            Starter
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Free
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-display flex items-center gap-2.5">
              <HelpCircle className="w-6 h-6 text-[var(--color-brand-600)]" />
              Contact Monitoring
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Manage external inquiries and student support requests from one unified dashboard.
            </p>
          </div>
        </div>

        {/* ── SUMMARY METRIC CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Inquiries</p>
            <p className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-1 font-mono">{metrics.total}</p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">External</p>
            <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1 font-mono">{metrics.external}</p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Students</p>
            <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300 mt-1 font-mono">{metrics.students}</p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">New</p>
            <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 font-mono">{metrics.newCount}</p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">In Progress</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 font-mono">{metrics.inProgressCount}</p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Urgent</p>
            <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-1 font-mono">{metrics.urgentCount}</p>
          </Card>
        </div>

        {/* ── TWO PRIMARY TABS ─────────────────────────────────────────── */}
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => handleTabChange('external')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'external'
                ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)] dark:text-blue-400'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
            aria-selected={activeTab === 'external'}
            role="tab"
          >
            <Mail className="w-4 h-4" />
            <span>External Users</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {metrics.external}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('student')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)] dark:text-blue-400'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
            aria-selected={activeTab === 'student'}
            role="tab"
          >
            <User className="w-4 h-4" />
            <span>Students</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {metrics.students}
            </span>
          </button>
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ─────────────────────────────────── */}
        <Card className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input with Debounce */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder={activeTab === 'external' ? 'Search by name, email, reference, subject...' : 'Search by student name, email, reference, subject...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs transition-colors"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs"
              >
                <option value="all">Status: All</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs"
              >
                <option value="all">Priority: All</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] max-w-[150px] truncate shadow-xs"
              >
                <option value="all">Category: All</option>
                {VALID_CONTACT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Subscription Plan Filter (Students tab only) */}
              {activeTab === 'student' && (
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                  className="text-xs px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs"
                >
                  <option value="all">Plan: All</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchInquiries()}
                disabled={isFetching}
                className="text-xs py-1.5 px-2.5 text-slate-500 hover:text-slate-700"
                title="Refresh inquiries"
              >
                <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Reset Filters */}
              {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || planFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs py-1.5 px-2.5 text-slate-500 hover:text-slate-700"
                  title="Reset all filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* ── BULK ACTION TOOLBAR (Appears when 1+ rows selected) ───────── */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-[var(--radius-lg)] text-xs shadow-sm animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-red-900 dark:text-red-200 font-semibold">
              <CheckSquare className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>
                <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'contact inquiry' : 'contact inquiries'} selected
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-xs py-1 px-2.5 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 border-[var(--color-border)]"
              >
                Deselect All
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenDeleteBulk}
                className="bg-red-600 hover:bg-red-700 border-transparent text-white text-xs py-1 px-3 flex items-center gap-1.5 shadow-sm font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── TABLE CONTAINER ──────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          {isFetching ? (
            /* Elegant Skeleton Loading State */
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="animate-pulse flex items-center justify-between p-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="w-28 h-4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="w-36 h-4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="w-48 h-4 rounded bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-700 hidden md:block" />
                  </div>
                  <div className="w-16 h-7 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                </div>
              ))}
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No inquiries found"
                description={`No ${activeTab === 'external' ? 'external inquiries' : 'student support requests'} match your selected filters.`}
                icon={<MessageSquare className="w-8 h-8 text-[var(--color-brand-600)]" />}
                action={
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                    Clear Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      {/* Select All Visible Checkbox */}
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVisibleSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          title="Select all visible inquiries on this page"
                          className="w-4 h-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">{activeTab === 'external' ? 'Sender' : 'Student'}</th>
                      {activeTab === 'student' && <th className="px-5 py-3.5">Plan</th>}
                      <th className="px-5 py-3.5">Subject & Category</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th 
                        className="hidden lg:table-cell px-5 py-3.5 cursor-pointer select-none hover:text-[var(--color-text-primary)] transition-colors"
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        title="Toggle sort direction"
                      >
                        <div className="inline-flex items-center gap-1">
                          <span>Submitted</span>
                          <span className="text-[10px] font-bold text-[var(--color-brand-600)]">
                            {sortOrder === 'newest' ? '↓' : '↑'}
                          </span>
                        </div>
                      </th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {inquiries.map((inquiry) => {
                      const fullName = `${inquiry.first_name} ${inquiry.last_name}`.trim() || 'Anonymous';
                      const isSelected = selectedIds.includes(inquiry.id);

                      return (
                        <tr 
                          key={inquiry.id} 
                          className={`transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/40' 
                              : 'hover:bg-[var(--color-bg-subtle)]/70'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="px-4 py-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(inquiry.id)}
                              aria-label={`Select inquiry ${inquiry.reference_code}`}
                              className="w-4 h-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                            />
                          </td>

                          {/* Reference */}
                          <td className="px-4 py-3.5 font-mono font-bold text-[var(--color-brand-600)] dark:text-blue-400">
                            {inquiry.reference_code}
                          </td>

                          {/* Sender / Student */}
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-bold text-[var(--color-text-primary)]">{fullName}</p>
                              <p className="text-[11px] text-[var(--color-text-tertiary)]">{inquiry.email}</p>
                            </div>
                          </td>

                          {/* Plan (Students tab) */}
                          {activeTab === 'student' && (
                            <td className="px-5 py-3.5">
                              {getPlanBadge(inquiry.subscription_plan)}
                            </td>
                          )}

                          {/* Subject & Category */}
                          <td className="px-5 py-3.5 max-w-xs">
                            <p className="font-semibold text-[var(--color-text-primary)] truncate" title={inquiry.subject}>
                              {inquiry.subject}
                            </p>
                            <span className="inline-block text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)] px-1.5 py-0.2 rounded border border-[var(--color-border)] mt-0.5">
                              {inquiry.category}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {getStatusBadge(inquiry.status)}
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {getPriorityBadge(inquiry.priority)}
                          </td>

                          {/* Submitted */}
                          <td className="hidden lg:table-cell px-5 py-3.5 text-[var(--color-text-secondary)] whitespace-nowrap">
                            {new Date(inquiry.created_at).toLocaleDateString()}
                          </td>

                          {/* Actions: View & Safe Delete */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetail(inquiry)}
                                className="text-xs py-1 px-2.5"
                                title="View Inquiry Details"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>

                              <button
                                onClick={() => handleOpenDeleteSingle(inquiry)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                                title="Delete Inquiry"
                                aria-label={`Delete inquiry ${inquiry.reference_code}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST */}
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {/* Mobile Select All Header */}
                <div className="p-3 bg-[var(--color-bg-subtle)] flex items-center justify-between border-b border-[var(--color-border)] text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--color-text-primary)] select-none">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all visible inquiries on mobile"
                      className="w-4 h-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                    />
                    <span>Select All Visible ({inquiries.length})</span>
                  </label>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                {inquiries.map((inquiry) => {
                  const fullName = `${inquiry.first_name} ${inquiry.last_name}`.trim() || 'Anonymous';
                  const isSelected = selectedIds.includes(inquiry.id);

                  return (
                    <div 
                      key={inquiry.id} 
                      className={`p-4 space-y-2.5 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(inquiry.id)}
                            aria-label={`Select inquiry ${inquiry.reference_code}`}
                            className="w-4 h-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                          />
                          <span className="font-mono text-xs font-bold text-[var(--color-brand-600)] dark:text-blue-400">
                            {inquiry.reference_code}
                          </span>
                        </div>
                        {getStatusBadge(inquiry.status)}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{fullName}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[240px] xs:max-w-xs">{inquiry.email}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-2 break-words">
                          {inquiry.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)] px-1.5 py-0.2 rounded border border-[var(--color-border)]">
                            {inquiry.category}
                          </span>
                          {getPriorityBadge(inquiry.priority)}
                          {activeTab === 'student' && getPlanBadge(inquiry.subscription_plan)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(inquiry)}
                            className="text-xs py-1 px-2.5"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteSingle(inquiry)}
                            className="text-xs py-1 px-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION FOOTER */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} inquiries
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-1.5 h-8 w-8 justify-center"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-xs font-bold px-2 text-[var(--color-text-primary)]">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    className="p-1.5 h-8 w-8 justify-center"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ── DETAIL & TRIAGE MODAL ────────────────────────────────────── */}
        {selectedInquiry && (
          <Modal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title={`Inquiry: ${selectedInquiry.reference_code}`}
            className="max-w-2xl"
          >
            <div className="p-6 space-y-6">
              
              {/* Header Status & Reference */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Source & Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {selectedInquiry.source_type}
                    </span>
                    {getStatusBadge(selectedInquiry.status)}
                    {getPriorityBadge(selectedInquiry.priority)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Submitted On</span>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] mt-1">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Sender Name</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
                    {selectedInquiry.first_name} {selectedInquiry.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Email Address</p>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-sm font-semibold text-[var(--color-brand-600)] hover:underline mt-0.5 block">
                    {selectedInquiry.email}
                  </a>
                </div>

                {selectedInquiry.phone && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Phone Number</p>
                    <p className="text-xs font-medium text-[var(--color-text-primary)] mt-0.5">
                      {selectedInquiry.phone}
                    </p>
                  </div>
                )}

                {selectedInquiry.source_type === 'student' && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Subscription Plan</p>
                    <div className="mt-0.5">
                      {getPlanBadge(selectedInquiry.subscription_plan)}
                    </div>
                  </div>
                )}
              </div>

              {/* Subject & Message */}
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Category</span>
                  <p className="text-xs font-bold text-[var(--color-brand-600)] dark:text-blue-400 mt-0.5">
                    {selectedInquiry.category}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Subject</span>
                  <p className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
                    {selectedInquiry.subject}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Message Content</span>
                  <div className="mt-1 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </div>
                </div>
              </div>

              {/* Quick Status & Priority Actions */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Triage Actions
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus || selectedInquiry.status === 'in_progress'}
                    onClick={() => handleUpdateInquiry({ status: 'in_progress' })}
                    className="text-xs py-1 px-2.5 text-amber-700 hover:bg-amber-50"
                  >
                    Mark In Progress
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus || selectedInquiry.status === 'resolved'}
                    onClick={() => handleUpdateInquiry({ status: 'resolved' })}
                    className="text-xs py-1 px-2.5 text-emerald-700 hover:bg-emerald-50"
                  >
                    Mark Resolved
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus || selectedInquiry.status === 'closed'}
                    onClick={() => handleUpdateInquiry({ status: 'closed' })}
                    className="text-xs py-1 px-2.5 text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </Button>

                  {/* Priority selector */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-tertiary)]">Priority:</span>
                    <select
                      value={selectedInquiry.priority}
                      onChange={(e) => handleUpdateInquiry({ priority: e.target.value as any })}
                      disabled={isUpdatingStatus}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Admin Internal Notes */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Admin Internal Notes (Private)
                    </span>
                  </div>
                  {notesSavedSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
                      ✓ Notes saved
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  placeholder="Record internal resolution notes, follow-up actions, or student communications here (never visible to students)..."
                  value={adminNotesDraft}
                  onChange={(e) => setAdminNotesDraft(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-amber-50/30 dark:bg-slate-800 px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-y"
                />

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveNotes}
                    isLoading={isSavingNotes}
                    disabled={isSavingNotes}
                    className="text-xs py-1 px-3"
                  >
                    Save Notes
                  </Button>
                </div>
              </div>

              {/* Modal Footer with Safe Delete and Close */}
              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const target = selectedInquiry;
                    setIsDetailModalOpen(false);
                    handleOpenDeleteSingle(target);
                  }}
                  className="text-xs py-1.5 px-3 text-red-600 hover:bg-red-50 border-red-200 dark:border-red-900"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Inquiry
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>

            </div>
          </Modal>
        )}

        {/* ── SINGLE DELETE CONFIRMATION MODAL ───────────────────────── */}
        <Modal
          isOpen={deleteModalState.isOpen && deleteModalState.mode === 'single'}
          onClose={handleCloseDeleteModal}
          title="Delete Contact Inquiry"
          className="max-w-md"
        >
          {deleteModalState.targetInquiry && (
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 p-4 rounded-[var(--radius-lg)] border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-950 dark:text-red-200">
                    Are you sure you want to delete this contact inquiry?
                  </p>
                  <p className="text-[11px] text-red-800 dark:text-red-300">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Reference:</span>
                  <p className="font-mono font-bold text-sm text-[var(--color-brand-600)] dark:text-blue-400 mt-0.5">
                    {deleteModalState.targetInquiry.reference_code}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Sender:</span>
                  <p className="font-bold text-[var(--color-text-primary)] mt-0.5">
                    {deleteModalState.targetInquiry.first_name} {deleteModalState.targetInquiry.last_name}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Email:</span>
                  <p className="text-[var(--color-text-secondary)] mt-0.5">
                    {deleteModalState.targetInquiry.email}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCloseDeleteModal} 
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700 border-transparent text-white focus:ring-red-500 font-semibold" 
                  onClick={handleConfirmDelete} 
                  isLoading={isDeleting}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── BULK DELETE CONFIRMATION MODAL ─────────────────────────── */}
        <Modal
          isOpen={deleteModalState.isOpen && deleteModalState.mode === 'bulk'}
          onClose={handleCloseDeleteModal}
          title={`Delete ${deleteModalState.targetIds.length} Contact Inquiries?`}
          className="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 p-4 rounded-[var(--radius-lg)] border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-950 dark:text-red-200">
                  This will permanently remove the {deleteModalState.targetIds.length} selected contact inquiries.
                </p>
                <p className="text-[11px] text-red-800 dark:text-red-300">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Selected Reference Codes ({deleteModalState.targetIds.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                {inquiries
                  .filter(i => deleteModalState.targetIds.includes(i.id))
                  .map(item => (
                    <span 
                      key={item.id} 
                      className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[var(--color-border)] text-[var(--color-brand-600)] dark:text-blue-400"
                    >
                      {item.reference_code}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCloseDeleteModal} 
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 border-transparent text-white focus:ring-red-500 font-semibold" 
                onClick={handleConfirmDelete} 
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                Delete {deleteModalState.targetIds.length}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── TRANSIENT TOAST NOTIFICATION ─────────────────────────────── */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-lg)] shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700' 
              : 'bg-red-900 text-white border-red-700'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
