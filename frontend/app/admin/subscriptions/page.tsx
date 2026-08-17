"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Power, 
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  Clock,
  Calendar,
  Sparkles,
  Bot
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizePlanId, PLANS, PlanId } from '@/config/plans';

type Subscription = {
  id: string;
  student_id: string;
  plan: string;
  status: string;
  start_date?: string;
  end_date?: string | null;
  current_period_start?: string;
  current_period_end?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State for Edit
  const [editData, setEditData] = useState<{ plan: string, status: string, end_date: string }>({
    plan: 'free', status: 'active', end_date: ''
  });
  
  // Form State for Extend
  const [extendDate, setExtendDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setIsFetching(true);
    try {
      const { data: subData, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (subErr) throw subErr;

      if (subData && subData.length > 0) {
        const studentIds = Array.from(new Set(subData.map(s => s.student_id).filter(Boolean)));
        const profilesMap: Record<string, { full_name: string; email: string }> = {};

        if (studentIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);

          if (profs) {
            profs.forEach(p => {
              profilesMap[p.id] = { full_name: p.full_name || 'Subscriber', email: p.email || '' };
            });
          }
        }

        const merged = subData.map(sub => ({
          ...sub,
          profiles: profilesMap[sub.student_id] || { full_name: 'Subscriber', email: '' }
        }));

        setSubscriptions(merged as unknown as Subscription[]);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredSubs = subscriptions.filter(sub => {
    const query = searchQuery.toLowerCase();
    const fullName = `${sub.profiles?.full_name || ''}`.toLowerCase();
    const email = (sub.profiles?.email || '').toLowerCase();
    const normPlan = normalizePlanId(sub.plan);
    
    const matchesSearch = query === '' || 
      fullName.includes(query) || 
      email.includes(query) || 
      normPlan.includes(query);

    const matchesPlan = planFilter === '' || normPlan === planFilter;
    const matchesStatus = statusFilter === '' || sub.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage);
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setPlanFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  // ---------------- ACTIONS ---------------- //
  const openEditModal = (sub: Subscription) => {
    setSelectedSub(sub);
    const normPlan = normalizePlanId(sub.plan);
    
    // Default 1 month expiry if currently empty and assigning a paid tier
    let defaultExpiry = sub.end_date ? new Date(sub.end_date).toISOString().split('T')[0] : '';
    if (!defaultExpiry && normPlan === 'free') {
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      defaultExpiry = oneMonthLater.toISOString().split('T')[0];
    }

    setEditData({
      plan: normPlan,
      status: sub.status.toLowerCase(),
      end_date: defaultExpiry
    });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    try {
      const expDate = editData.plan === 'free' ? null : (editData.end_date ? new Date(editData.end_date).toISOString() : null);
      let payload: any = {
        plan: editData.plan.toLowerCase(),
        status: editData.status.toLowerCase(),
        end_date: expDate,
        current_period_end: expDate
      };

      let { error } = await supabase.from('subscriptions').update(payload).eq('id', selectedSub.id);
      
      // If check constraint error, retry with Capitalized plan name and status
      if (error && error.code === '23514') {
        const capPlan = editData.plan.charAt(0).toUpperCase() + editData.plan.slice(1).toLowerCase();
        const capStatus = editData.status.charAt(0).toUpperCase() + editData.status.slice(1).toLowerCase();
        payload.plan = capPlan;
        payload.status = capStatus;
        const retry = await supabase.from('subscriptions').update(payload).eq('id', selectedSub.id);
        error = retry.error;
      }

      if (error) throw error;
      
      await fetchSubscriptions();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Error updating subscription:", err);
      alert("Failed to update subscription.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openExtendModal = (sub: Subscription) => {
    setSelectedSub(sub);
    // Suggest 1 month addition
    const baseDate = sub.end_date || sub.current_period_end ? new Date(sub.end_date || sub.current_period_end!) : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    setExtendDate(baseDate.toISOString().split('T')[0]);
    setIsExtendModalOpen(true);
  };

  const handleExtendSave = async () => {
    if (!selectedSub) return;
    if (!extendDate) return alert("Please choose an expiry date.");
    
    setIsProcessing(true);
    try {
      const formattedDate = new Date(extendDate).toISOString();
      let updatePayload: any = { 
        end_date: formattedDate,
        current_period_end: formattedDate,
        status: 'active'
      };

      let { error } = await supabase.from('subscriptions')
        .update(updatePayload)
        .eq('id', selectedSub.id);

      // Fallback for legacy casing constraint
      if (error && error.code === '23514') {
        updatePayload.status = 'Active';
        const retry = await supabase.from('subscriptions').update(updatePayload).eq('id', selectedSub.id);
        error = retry.error;
      }

      if (error) throw error;
      
      await fetchSubscriptions();
      setIsExtendModalOpen(false);
    } catch (err) {
      console.error("Error extending subscription:", err);
      alert("Failed to extend subscription.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    try {
      const isCurrentlyActive = selectedSub.status.toLowerCase() === 'active';
      let targetStatus = isCurrentlyActive ? 'cancelled' : 'active';

      let { error } = await supabase.from('subscriptions').update({ status: targetStatus }).eq('id', selectedSub.id);
      
      // Fallback for legacy casing constraint
      if (error && error.code === '23514') {
        targetStatus = isCurrentlyActive ? 'Cancelled' : 'Active';
        const retry = await supabase.from('subscriptions').update({ status: targetStatus }).eq('id', selectedSub.id);
        error = retry.error;
      }

      if (error) throw error;
      
      await fetchSubscriptions();
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error toggling status:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Subscription Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Monitor student subscription plans across Free, Starter, Pro, and Premium tiers.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Student Name, Email, or Plan..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <select 
              value={planFilter} onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter (₹49)</option>
              <option value="pro">Pro (₹99)</option>
              <option value="premium">Premium (₹149)</option>
            </select>
            
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
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
          ) : filteredSubs.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No subscriptions found."
                description="Try clearing your search query or adjusting your filters."
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
                      <th className="px-5 py-3.5">Plan Tier</th>
                      <th className="px-5 py-3.5">Mock Credits</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Valid Until</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedSubs.map(sub => {
                      const pId = normalizePlanId(sub.plan);
                      const pConfig = PLANS[pId];
                      const isExpired = sub.end_date && new Date(sub.end_date).getTime() < Date.now();
                      const displayStatus = isExpired ? 'expired' : sub.status.toLowerCase();

                      return (
                        <tr key={sub.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[var(--color-text-primary)]">{sub.profiles?.full_name || 'Anonymous Student'}</p>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">{sub.profiles?.email}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pConfig.badgeColor} ${pConfig.badgeTextColor} ${pConfig.badgeBorderColor}`}>
                              {pConfig.name} (₹{pConfig.price}/mo)
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-[var(--color-text-secondary)]">
                            {pConfig.mockInterviewsPerMonth} / month
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                              displayStatus === 'active' ? 'text-emerald-700' : 
                              displayStatus === 'expired' ? 'text-amber-700' : 'text-red-700'
                            }`}>
                              {displayStatus === 'active' ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> : 
                               displayStatus === 'expired' ? <Clock className="w-3.5 h-3.5 text-amber-600"/> : <Ban className="w-3.5 h-3.5 text-red-600"/>}
                              {displayStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">
                            {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime / Free'}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                            <button onClick={() => { setSelectedSub(sub); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditModal(sub)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Plan">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => openExtendModal(sub)} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Extend Duration">
                              <CalendarDays className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${sub.status.toLowerCase() === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={sub.status.toLowerCase() === 'active' ? "Deactivate" : "Activate"}>
                              <Power className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedSubs.map(sub => {
                  const pId = normalizePlanId(sub.plan);
                  const pConfig = PLANS[pId];

                  return (
                    <div key={sub.id} className="p-4 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)]">{sub.profiles?.full_name || 'Anonymous Student'}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">{sub.profiles?.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pConfig.badgeColor} ${pConfig.badgeTextColor} ${pConfig.badgeBorderColor}`}>
                          {pConfig.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold">Status: {sub.status}</span>
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">Ends: {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime'}</span>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedSub(sub); setIsViewModalOpen(true); }}>View</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => openEditModal(sub)}>Edit</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => openExtendModal(sub)}>Extend</Button>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }}>{sub.status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSubs.length)} of {filteredSubs.length} subscriptions
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

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Subscription Details" className="max-w-md">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <p className="font-bold text-sm text-[var(--color-text-primary)]">{selectedSub.profiles?.full_name || 'Anonymous Student'}</p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{selectedSub.profiles?.email}</p>
              </div>
              <PremiumBadge minimumPlan={selectedSub.plan} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Status</p>
                <p className="font-bold text-[var(--color-text-primary)]">{selectedSub.status.toUpperCase()}</p>
              </div>
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Mock Interviews</p>
                <p className="font-bold text-[var(--color-brand-600)]">{PLANS[normalizePlanId(selectedSub.plan)].mockInterviewsPerMonth} / month</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Start Date</p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {new Date(selectedSub.start_date || selectedSub.current_period_start || selectedSub.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">End Date</p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {(selectedSub.end_date || selectedSub.current_period_end) 
                    ? new Date(selectedSub.end_date || selectedSub.current_period_end!).toLocaleDateString() 
                    : 'Lifetime'}
                </p>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => !isProcessing && setIsEditModalOpen(false)} title="Change Subscription Plan">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Subscription Plan</label>
              <select 
                value={editData.plan} 
                onChange={(e) => setEditData({...editData, plan: e.target.value})}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none font-semibold text-[var(--color-brand-700)]"
              >
                <option value="free">Free (₹0/mo)</option>
                <option value="starter">Starter (₹49/mo • 1 Mock Credit)</option>
                <option value="pro">Pro (₹99/mo • 2 Mock Credits)</option>
                <option value="premium">Premium (₹149/mo • 4 Mock Credits)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Status</label>
              <select 
                value={editData.status} 
                onChange={(e) => setEditData({...editData, status: e.target.value})}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {editData.plan !== 'free' && (
              <div>
                <label className="block font-bold text-[var(--color-text-primary)] mb-1">Expiry Date *</label>
                <input 
                  type="date"
                  value={editData.end_date}
                  onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
                />
                <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">Default 1 month from activation.</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleEditSave} disabled={isProcessing}>
                {isProcessing ? 'Saving...' : 'Save Plan Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EXTEND MODAL */}
      <Modal isOpen={isExtendModalOpen} onClose={() => !isProcessing && setIsExtendModalOpen(false)} title="Extend Membership Duration">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Extend access for student <strong className="text-[var(--color-text-primary)]">{selectedSub.profiles?.full_name || selectedSub.profiles?.email}</strong>.
            </p>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">New Expiry Date *</label>
              <input 
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              />
            </div>
            
            <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsExtendModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExtendSave} disabled={isProcessing}>
                {isProcessing ? 'Extending...' : 'Extend Duration'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Subscription Change">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedSub.status.toLowerCase() === 'active' ? 'cancel / deactivate' : 'activate'}</strong> the subscription for <span className="font-bold text-[var(--color-text-primary)]">{selectedSub.profiles?.full_name || selectedSub.profiles?.email}</span>?
            </p>
            {normalizePlanId(selectedSub.plan) !== 'free' && selectedSub.status.toLowerCase() === 'active' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--radius-lg)] text-amber-900 font-medium leading-relaxed">
                Cancelling this subscription will immediately downgrade the student's access to the Free tier.
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedSub.status.toLowerCase() === 'active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedSub.status.toLowerCase() === 'active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
