"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
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
  Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Subscription = {
  id: string;
  student_id: string;
  plan: 'Free' | 'Premium';
  status: 'Active' | 'Expired' | 'Cancelled';
  start_date: string;
  end_date: string | null;
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
    plan: 'Free', status: 'Active', end_date: ''
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
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles:student_id (full_name, email)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) setSubscriptions(data as unknown as Subscription[]);
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
    
    const matchesSearch = query === '' || 
      fullName.includes(query) || 
      email.includes(query) || 
      sub.plan.toLowerCase().includes(query);

    const matchesPlan = planFilter === '' || sub.plan === planFilter;
    const matchesStatus = statusFilter === '' || sub.status === statusFilter;

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
    setEditData({
      plan: sub.plan,
      status: sub.status,
      end_date: sub.end_date ? new Date(sub.end_date).toISOString().split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    try {
      const payload = {
        plan: editData.plan,
        status: editData.status,
        end_date: editData.end_date ? new Date(editData.end_date).toISOString() : null
      };

      const { error } = await supabase.from('subscriptions').update(payload).eq('id', selectedSub.id);
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
    setExtendDate(sub.end_date ? new Date(sub.end_date).toISOString().split('T')[0] : '');
    setIsExtendModalOpen(true);
  };

  const handleExtendSave = async () => {
    if (!selectedSub) return;
    if (!extendDate) return alert("Please choose an expiry date.");
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('subscriptions')
        .update({ end_date: new Date(extendDate).toISOString() })
        .eq('id', selectedSub.id);
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
      const newStatus = selectedSub.status === 'Active' ? 'Cancelled' : 'Active';
      const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', selectedSub.id);
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
            Monitor student subscription plans, adjust access tiers, and renew memberships.
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
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>
            
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
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
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Valid Until</th>
                      <th className="px-5 py-3.5">Updated</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedSubs.map(sub => (
                      <tr key={sub.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--color-text-primary)]">{sub.profiles?.full_name || 'Anonymous Student'}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">{sub.profiles?.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            sub.plan === 'Premium' 
                              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]' 
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                            sub.status === 'Active' ? 'text-emerald-700' : 
                            sub.status === 'Expired' ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {sub.status === 'Active' ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> : 
                             sub.status === 'Expired' ? <Clock className="w-3.5 h-3.5 text-amber-600"/> : <Ban className="w-3.5 h-3.5 text-red-600"/>}
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-secondary)]">
                          {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime Access'}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-text-tertiary)] font-medium">
                          {new Date(sub.updated_at || sub.created_at).toLocaleDateString()}
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
                          <button onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${sub.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={sub.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedSubs.map(sub => (
                  <div key={sub.id} className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{sub.profiles?.full_name || 'Anonymous Student'}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">{sub.profiles?.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        sub.plan === 'Premium' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]' : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {sub.plan}
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
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }}>{sub.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </div>
                ))}
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
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Subscription Overview" className="max-w-md">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] flex items-center justify-center font-bold text-sm">
                {selectedSub.profiles?.full_name?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[var(--color-text-primary)] truncate">{selectedSub.profiles?.full_name || 'Anonymous Student'}</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)] truncate">{selectedSub.profiles?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Plan Tier</p>
                <p className={`font-bold ${selectedSub.plan === 'Premium' ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-primary)]'}`}>{selectedSub.plan}</p>
              </div>
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Status</p>
                <p className={`font-bold ${selectedSub.status === 'Active' ? 'text-emerald-700' : selectedSub.status === 'Expired' ? 'text-amber-700' : 'text-red-700'}`}>{selectedSub.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Start Date</p>
                <p className="font-semibold text-[var(--color-text-primary)]">{new Date(selectedSub.start_date).toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">End Date</p>
                <p className="font-semibold text-[var(--color-text-primary)]">{selectedSub.end_date ? new Date(selectedSub.end_date).toLocaleDateString() : 'Lifetime'}</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => !isProcessing && setIsEditModalOpen(false)} title="Edit Subscription Tier">
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Subscription Plan</label>
              <select 
                value={editData.plan} 
                onChange={(e) => setEditData({...editData, plan: e.target.value})}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              >
                <option value="Free">Free</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Status</label>
              <select 
                value={editData.status} 
                onChange={(e) => setEditData({...editData, status: e.target.value})}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Expiry Date (Optional)</label>
              <input 
                type="date"
                value={editData.end_date}
                onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
              />
              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">Leave empty for lifetime access.</p>
            </div>
            
            <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleEditSave} disabled={isProcessing}>
                {isProcessing ? 'Saving...' : 'Save Changes'}
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
              Are you sure you want to <strong>{selectedSub.status === 'Active' ? 'cancel / deactivate' : 'activate'}</strong> the subscription for <span className="font-bold text-[var(--color-text-primary)]">{selectedSub.profiles?.full_name || selectedSub.profiles?.email}</span>?
            </p>
            {selectedSub.plan === 'Premium' && selectedSub.status === 'Active' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--radius-lg)] text-amber-900 font-medium leading-relaxed">
                Cancelling this subscription will immediately revoke the student's Premium interview prep access.
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedSub.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedSub.status === 'Active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
