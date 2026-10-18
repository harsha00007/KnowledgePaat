"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  BookOpen, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Plus, 
  RotateCcw, 
  Download, 
  Clock, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileText,
  Sparkles
} from 'lucide-react';

interface CustomerListItem {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  purchased_editions_count: number;
  total_orders_count: number;
  total_paid_paise: number;
  formatted_total_paid: string;
  access_status: 'active' | 'revoked' | 'complimentary' | 'no_access';
  active_entitlements_count: number;
  revoked_entitlements_count: number;
  has_reading_activity: boolean;
  last_read_at: string | null;
}

export default function AdminEBookCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Customer Detail Drawer / Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'entitlements' | 'orders' | 'reading' | 'downloads' | 'audit'>('entitlements');

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    type: 'grant' | 'revoke' | 'restore';
    entitlement?: any;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [grantBookId, setGrantBookId] = useState('');
  const [grantEditionId, setGrantEditionId] = useState('');
  const [grantPlan, setGrantPlan] = useState<'read_online' | 'read_download'>('read_online');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchCustomers = async (pageToLoad = page) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(pageToLoad));
      params.set('limit', '15');

      const res = await fetch(`/api/admin/ebooks/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load customers.');
      }

      setCustomers(data.customers || []);
      setPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching customer list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  // Fetch full customer details
  const fetchCustomerDetail = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/ebooks/customers?customerId=${customerId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch customer details.');
      }

      setCustomerDetail(data);
      if (data.available_books?.length > 0) {
        setGrantBookId(data.available_books[0].id);
        const ed = data.available_books[0].editions?.[0];
        if (ed) setGrantEditionId(ed.id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error loading customer details.' });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Execute Action (Grant, Revoke, Restore)
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal || !selectedCustomerId) return;

    if (!actionReason.trim() || actionReason.trim().length < 5) {
      alert('A detailed audit reason (at least 5 characters) is required.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      let payload: any = {
        customerId: selectedCustomerId,
        reason: actionReason.trim(),
      };

      if (actionModal.type === 'grant') {
        payload.action = 'grant_complimentary';
        payload.ebookId = grantBookId;
        payload.editionId = grantEditionId;
        payload.plan = grantPlan;
      } else if (actionModal.type === 'revoke') {
        payload.action = 'revoke';
        payload.ebookId = actionModal.entitlement?.ebook_id;
        payload.editionId = actionModal.entitlement?.edition_id;
      } else if (actionModal.type === 'restore') {
        payload.action = 'restore';
        payload.ebookId = actionModal.entitlement?.ebook_id;
        payload.editionId = actionModal.entitlement?.edition_id;
      }

      const res = await fetch('/api/admin/ebooks/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute administrative action.');
      }

      setFeedback({ type: 'success', message: data.message });
      setActionModal(null);
      setActionReason('');
      await fetchCustomerDetail(selectedCustomerId);
      await fetchCustomers(page);
    } catch (err: any) {
      alert(err.message || 'Failed to execute action.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/e-books"
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-navy">eBook Customer Management</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold font-mono">
                  {totalCount} Total Customers
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect customer book ownership, reading progress, download logs, and issue audited grants or revocations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCustomers(page)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline hover:opacity-80 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name or email..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">Search</Button>
          </form>

          {/* STATUS TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Customers' },
              { id: 'active', label: 'Active Readers' },
              { id: 'complimentary', label: 'Complimentary Grants' },
              { id: 'revoked', label: 'Revoked Access' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading customer directory...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No customers found matching the search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Customer</th>
                    <th className="py-3 px-4 font-bold">Owned Books</th>
                    <th className="py-3 px-4 font-bold">Access Status</th>
                    <th className="py-3 px-4 font-bold">Total Paid</th>
                    <th className="py-3 px-4 font-bold">Reading Activity</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy text-sm">{c.full_name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{c.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {c.purchased_editions_count} edition{c.purchased_editions_count === 1 ? '' : 's'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.total_orders_count} paid order{c.total_orders_count === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {c.access_status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Active Access
                          </span>
                        )}
                        {c.access_status === 'complimentary' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                            <Sparkles className="w-3 h-3" /> Complimentary
                          </span>
                        )}
                        {c.access_status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <ShieldAlert className="w-3 h-3" /> Revoked Access
                          </span>
                        )}
                        {c.access_status === 'no_access' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            No Editions Owned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-navy">
                        {c.formatted_total_paid}
                      </td>
                      <td className="py-3 px-4">
                        {c.has_reading_activity ? (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {c.last_read_at ? new Date(c.last_read_at).toLocaleDateString() : 'Active'}
                          </div>
                        ) : (
                          <span className="text-slate-400">No reading yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchCustomerDetail(c.id)}
                          className="text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect & Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION BAR */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => fetchCustomers(page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-0.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => fetchCustomers(page + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* CUSTOMER DETAIL MODAL / DRAWER */}
        {selectedCustomerId && (
          <Modal
            isOpen={Boolean(selectedCustomerId)}
            onClose={() => {
              setSelectedCustomerId(null);
              setCustomerDetail(null);
            }}
            title={customerDetail?.customer ? `Customer Profile: ${customerDetail.customer.full_name}` : 'Loading Customer...'}
            className="max-w-4xl"
          >
            {isLoadingDetail || !customerDetail ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Retrieving detailed customer records...
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* SUMMARY HERO */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-base font-bold text-navy">{customerDetail.customer.full_name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{customerDetail.customer.email}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      User ID: {customerDetail.customer.id} • Registered: {new Date(customerDetail.customer.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setActionModal({ type: 'grant' });
                      setActionReason('');
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Grant Complimentary Access
                  </Button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
                  <button
                    onClick={() => setDetailTab('entitlements')}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      detailTab === 'entitlements' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Owned Editions ({customerDetail.entitlements?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('orders')}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      detailTab === 'orders' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Orders & Upgrades ({customerDetail.orders?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('reading')}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      detailTab === 'reading' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Reading Progress ({customerDetail.reading_progress?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('downloads')}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      detailTab === 'downloads' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Download Link Logs ({customerDetail.download_logs?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('audit')}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      detailTab === 'audit' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Audit Trail ({customerDetail.audit_logs?.length || 0})
                  </button>
                </div>

                {/* TAB CONTENT: ENTITLEMENTS */}
                {detailTab === 'entitlements' && (
                  <div className="space-y-3">
                    {customerDetail.entitlements?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        This customer does not own access to any eBooks.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {customerDetail.entitlements.map((ent: any) => (
                          <div key={ent.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                            <div>
                              <div className="font-bold text-sm text-navy">{ent.ebook?.title || 'Unknown Title'}</div>
                              <div className="text-slate-500">
                                {ent.edition?.version_name || `Edition ${ent.edition?.edition_number || '1'}`} • Plan: <strong>{ent.plan === 'read_download' ? 'Read + Download (PDF)' : 'Read Online'}</strong>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Grant source: <span className="font-semibold uppercase">{ent.grant_type || 'purchase'}</span>
                                {ent.grant_reason ? ` • "${ent.grant_reason}"` : ''}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {ent.is_active ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                  REVOKED
                                </span>
                              )}

                              {ent.is_active ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setActionModal({ type: 'revoke', entitlement: ent });
                                    setActionReason('');
                                  }}
                                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Revoke Access
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setActionModal({ type: 'restore', entitlement: ent });
                                    setActionReason('');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore Access
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: ORDERS */}
                {detailTab === 'orders' && (
                  <div className="space-y-3">
                    {customerDetail.orders?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No purchase orders recorded for this customer.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {customerDetail.orders.map((ord: any) => (
                          <div key={ord.id} className="p-3.5 bg-white flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-navy font-mono">{ord.order_number}</div>
                              <div className="text-slate-500">
                                Type: <span className="font-semibold uppercase">{ord.order_type}</span> • {new Date(ord.created_at).toLocaleString()}
                              </div>
                              {ord.items && ord.items.length > 0 && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {ord.items.map((i: any) => `${i.title} (${i.edition_label || i.plan})`).join(', ')}
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-navy text-sm">
                                ₹{(ord.total_amount_paise / 100).toFixed(0)}
                              </div>
                              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                ord.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {ord.payment_status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: READING PROGRESS */}
                {detailTab === 'reading' && (
                  <div className="space-y-3">
                    {customerDetail.reading_progress?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No reading progress recorded for this customer.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {customerDetail.reading_progress.map((prog: any) => (
                          <div key={prog.id} className="p-3.5 bg-white flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-navy">{prog.book?.title || 'Unknown Title'}</div>
                              <div className="text-slate-500">
                                Last read chapter #{prog.last_chapter_index || '1'} • {new Date(prog.last_read_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-600 font-mono">
                                {prog.progress_percent || 0}% Complete
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: DOWNLOAD LOGS */}
                {detailTab === 'downloads' && (
                  <div className="space-y-3">
                    {customerDetail.download_logs?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No PDF download links issued for this customer.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {customerDetail.download_logs.map((dl: any) => (
                          <div key={dl.id} className="p-3 bg-white flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-navy">{dl.book?.title || 'eBook PDF'}</div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                IP: {dl.ip_address || 'Unknown'} • {new Date(dl.created_at).toLocaleString()}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {dl.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: AUDIT TRAIL */}
                {detailTab === 'audit' && (
                  <div className="space-y-3">
                    {customerDetail.audit_logs?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No administrative audit events recorded for this customer.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {customerDetail.audit_logs.map((al: any) => (
                          <div key={al.id} className="p-3 bg-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-navy font-mono uppercase">{al.action}</span>
                              <span className="text-slate-400 text-[11px]">{new Date(al.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-slate-600">
                              Actor: {al.actor?.full_name || 'Admin'} • Reason: <em>"{al.metadata?.reason || al.metadata?.change_reason || 'N/A'}"</em>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </Modal>
        )}

        {/* ACTION MODAL (GRANT / REVOKE / RESTORE) */}
        {actionModal && (
          <Modal
            isOpen={Boolean(actionModal)}
            onClose={() => setActionModal(null)}
            title={
              actionModal.type === 'grant'
                ? 'Grant Complimentary Access'
                : actionModal.type === 'revoke'
                ? 'Revoke Customer Access'
                : 'Restore Customer Access'
            }
            className="max-w-lg"
          >
            <form onSubmit={handleExecuteAction} className="space-y-4">
              {actionModal.type === 'grant' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select eBook *</label>
                    <select
                      value={grantBookId}
                      onChange={(e) => {
                        setGrantBookId(e.target.value);
                        const b = customerDetail?.available_books?.find((bk: any) => bk.id === e.target.value);
                        if (b?.editions?.[0]) setGrantEditionId(b.editions[0].id);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-navy bg-white"
                      required
                    >
                      {customerDetail?.available_books?.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Access Plan *</label>
                    <select
                      value={grantPlan}
                      onChange={(e) => setGrantPlan(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-navy bg-white"
                    >
                      <option value="read_online">Read Online (Browser)</option>
                      <option value="read_download">Read + Download (PDF Download Rights)</option>
                    </select>
                  </div>
                </>
              )}

              {actionModal.type === 'revoke' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  Are you sure you want to revoke access to <strong>{actionModal.entitlement?.ebook?.title}</strong>? Reading progress and bookmarks will remain intact.
                </div>
              )}

              {actionModal.type === 'restore' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  Are you sure you want to restore access to <strong>{actionModal.entitlement?.ebook?.title}</strong>?
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Reason * (Mandatory for audit trail)
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Authorized complimentary review copy for partner architect..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingAction || !actionReason.trim() || actionReason.trim().length < 5}
                  className={actionModal.type === 'revoke' ? 'bg-rose-600 hover:bg-rose-700 text-white' : undefined}
                >
                  {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </AdminLayout>
  );
}
