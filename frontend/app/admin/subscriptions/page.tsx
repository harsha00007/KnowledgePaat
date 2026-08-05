"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
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
  Clock
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
    if (!extendDate) return alert("Please select an expiry date.");
    
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage student subscription plans and access.</p>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Student Name, Email or Plan..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select 
              value={planFilter} onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Plans</option>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>
            
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* DATA TABLE */}
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No subscriptions found."
                description="Adjust your search filters."
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Plan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">End Date</th>
                      <th className="px-6 py-4">Updated Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSubs.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{sub.profiles?.full_name}</p>
                          <p className="text-xs text-slate-500">{sub.profiles?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            sub.plan === 'Premium' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${
                            sub.status === 'Active' ? 'text-green-600' : 
                            sub.status === 'Expired' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {sub.status === 'Active' ? <ShieldCheck className="w-4 h-4"/> : 
                             sub.status === 'Expired' ? <Clock className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(sub.updated_at || sub.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => { setSelectedSub(sub); setIsViewModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(sub)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => openExtendModal(sub)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Extend Plan">
                            <CalendarDays className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }} className={`p-1.5 rounded ${sub.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={sub.status === 'Active' ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {paginatedSubs.map(sub => (
                  <div key={sub.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{sub.profiles?.full_name}</p>
                        <p className="text-xs text-slate-500">{sub.profiles?.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase shrink-0 ${
                        sub.plan === 'Premium' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.plan}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span className={`font-medium flex items-center gap-1 ${
                        sub.status === 'Active' ? 'text-green-600' : 
                        sub.status === 'Expired' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {sub.status === 'Active' ? <ShieldCheck className="w-3.5 h-3.5"/> : 
                         sub.status === 'Expired' ? <Clock className="w-3.5 h-3.5"/> : <Ban className="w-3.5 h-3.5"/>}
                        {sub.status}
                      </span>
                      <span>Ends: {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime'}</span>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedSub(sub); setIsViewModalOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => openEditModal(sub)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto text-purple-600" onClick={() => openExtendModal(sub)}><CalendarDays className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" className="text-xs py-1 px-2 h-auto" onClick={() => { setSelectedSub(sub); setIsStatusModalOpen(true); }}><Power className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSubs.length)} of {filteredSubs.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" className="p-2" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" className="p-2" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </Card>

      </div>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Subscription Details" className="max-w-md">
        {selectedSub && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                {selectedSub.profiles?.full_name?.split(' ')?.[0]?.[0] || 'U'}{selectedSub.profiles?.full_name?.split(' ')?.[1]?.[0] || ''}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{selectedSub.profiles?.full_name}</h3>
                <p className="text-sm text-slate-500">{selectedSub.profiles?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Plan</p>
                <p className={`font-bold text-sm ${selectedSub.plan === 'Premium' ? 'text-indigo-600' : 'text-slate-700'}`}>{selectedSub.plan}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
                <p className={`font-bold text-sm ${selectedSub.status === 'Active' ? 'text-green-600' : selectedSub.status === 'Expired' ? 'text-orange-600' : 'text-red-600'}`}>{selectedSub.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Start Date</p>
                <p className="font-medium text-sm text-slate-900">{new Date(selectedSub.start_date).toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">End Date</p>
                <p className="font-medium text-sm text-slate-900">{selectedSub.end_date ? new Date(selectedSub.end_date).toLocaleDateString() : 'Lifetime'}</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => !isProcessing && setIsEditModalOpen(false)} title="Edit Subscription">
        {selectedSub && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
              <select 
                value={editData.plan} 
                onChange={(e) => setEditData({...editData, plan: e.target.value})}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Free">Free</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select 
                value={editData.status} 
                onChange={(e) => setEditData({...editData, status: e.target.value})}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date (Optional)</label>
              <input 
                type="date"
                value={editData.end_date}
                onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Leave blank for lifetime access.</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={isProcessing}>
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EXTEND MODAL */}
      <Modal isOpen={isExtendModalOpen} onClose={() => !isProcessing && setIsExtendModalOpen(false)} title="Extend Subscription">
        {selectedSub && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Extend the subscription plan for <strong>{selectedSub.profiles?.full_name}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Expiry Date</label>
              <input 
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsExtendModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button variant="primary" className="bg-purple-600 hover:bg-purple-700" onClick={handleExtendSave} disabled={isProcessing}>
                {isProcessing ? 'Extending...' : 'Extend Plan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE/DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Action">
        {selectedSub && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{selectedSub.status === 'Active' ? 'deactivate (cancel)' : 'activate'}</strong> this subscription for {selectedSub.profiles?.full_name}?
            </p>
            {selectedSub.plan === 'Premium' && selectedSub.status === 'Active' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800">
                Cancelling this subscription will immediately revoke the student's access to Premium content.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Close</Button>
              <Button 
                variant="primary" 
                className={selectedSub.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
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
