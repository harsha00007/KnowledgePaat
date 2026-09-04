"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Filter, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Order } from '@/lib/store';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Selection state (current page only)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isSingleDeleteModalOpen, setIsSingleDeleteModalOpen] = useState(false);

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Feedback Notification Banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
    // Selection resets on page, search, or filter changes to prevent stale actions
    setSelectedOrderIds([]);
  }, [currentPage, searchQuery, paymentStatusFilter, orderStatusFilter]);

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:product_id (*)
          )
        `, { count: 'exact' });

      // Apply payment status filter
      if (paymentStatusFilter) {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      // Apply order status filter
      if (orderStatusFilter) {
        query = query.eq('order_status', orderStatusFilter);
      }

      // Apply Search (Search by UUID order id, or by student profile full_name/email)
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(q)) {
          query = query.eq('id', q);
        } else {
          // Search student profiles
          const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

          const matchedStudentIds = matchedProfiles?.map(p => p.id) || [];
          if (matchedStudentIds.length > 0) {
            query = query.in('student_id', matchedStudentIds);
          } else {
            // No student matched query
            setOrders([]);
            setTotalCount(0);
            setIsFetching(false);
            return;
          }
        }
      }

      // Database pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: orderData, count, error: orderErr } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (orderErr) throw orderErr;

      setTotalCount(count ?? 0);

      if (orderData && orderData.length > 0) {
        const studentIds = Array.from(new Set(orderData.map(o => o.student_id).filter(Boolean)));
        const profilesMap: Record<string, { full_name: string; email: string }> = {};

        if (studentIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);

          if (profs) {
            profs.forEach(p => {
              profilesMap[p.id] = { full_name: p.full_name || 'Customer', email: p.email || '' };
            });
          }
        }

        const merged = orderData.map(ord => ({
          ...ord,
          profiles: profilesMap[ord.student_id] || { full_name: 'Customer', email: '' }
        }));

        setOrders(merged as unknown as Order[]);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setFeedbackMsg({ type: 'error', text: 'Unable to load orders. Please try again.' });
    } finally {
      setIsFetching(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Selection Logic (Current Page Only)
  const currentPageOrderIds = orders.map(o => o.id);
  const selectedOnCurrentPage = currentPageOrderIds.filter(id => selectedOrderIds.includes(id));
  const isAllCurrentSelected = currentPageOrderIds.length > 0 && selectedOnCurrentPage.length === currentPageOrderIds.length;
  const isIndeterminate = selectedOnCurrentPage.length > 0 && !isAllCurrentSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllCurrentSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !currentPageOrderIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...currentPageOrderIds])));
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPaymentStatusFilter('');
    setOrderStatusFilter('');
    setCurrentPage(1);
    setSelectedOrderIds([]);
  };

  // Single Delete Handlers
  const handleOpenSingleDelete = (ord: Order) => {
    if (ord.payment_status === 'paid') {
      setFeedbackMsg({ 
        type: 'error', 
        text: 'Paid orders are protected from deletion to preserve student entitlements and financial audit trail.' 
      });
      return;
    }
    setOrderToDelete(ord);
    setIsSingleDeleteModalOpen(true);
  };

  const handleConfirmSingleDelete = async () => {
    if (!orderToDelete) return;
    setIsProcessingDelete(true);
    try {
      const res = await fetch('/api/admin/orders/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderToDelete.id], action: 'delete' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete order.');
      }

      setFeedbackMsg({ type: 'success', text: `Order ${orderToDelete.id.slice(0, 8)}... deleted successfully.` });
      setIsSingleDeleteModalOpen(false);
      setOrderToDelete(null);
      setSelectedOrderIds(prev => prev.filter(id => id !== orderToDelete.id));

      // If last row on page deleted and page > 1, go to previous page
      if (orders.length === 1 && currentPage > 1) {
        setCurrentPage(p => p - 1);
      } else {
        fetchOrders();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete order.';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsProcessingDelete(false);
    }
  };

  // Bulk Delete Handlers
  const handleOpenBulkDeleteModal = () => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const selectedOrdersData = orders.filter(o => selectedOrderIds.includes(o.id));
  const paidSelectedCount = selectedOrdersData.filter(o => o.payment_status === 'paid').length;
  const eligibleSelectedCount = selectedOrdersData.filter(o => o.payment_status !== 'paid').length;

  const handleConfirmBulkDelete = async () => {
    if (paidSelectedCount > 0) {
      setFeedbackMsg({
        type: 'error',
        text: `Cannot delete: ${paidSelectedCount} selected order(s) are marked as PAID and cannot be deleted.`
      });
      setIsBulkDeleteModalOpen(false);
      return;
    }

    setIsProcessingDelete(true);
    try {
      const res = await fetch('/api/admin/orders/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds, action: 'delete' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete selected orders.');
      }

      setFeedbackMsg({ type: 'success', text: data.message || `${selectedOrderIds.length} orders deleted successfully.` });
      setIsBulkDeleteModalOpen(false);
      setSelectedOrderIds([]);

      // If all rows on current page deleted and page > 1, go to previous page
      if (orders.length === selectedOrderIds.length && currentPage > 1) {
        setCurrentPage(p => p - 1);
      } else {
        fetchOrders();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete selected orders.';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsProcessingDelete(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Student Orders</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Monitor digital store purchases, payment fulfillment, and student transaction receipts.
          </p>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {feedbackMsg && (
          <div className={`p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button 
              onClick={() => setFeedbackMsg(null)} 
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Student Name, Email, or Order ID..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <select 
              value={paymentStatusFilter} 
              onChange={e => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select 
              value={orderStatusFilter} 
              onChange={e => { setOrderStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Order Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* BULK ACTIONS TOOLBAR */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] rounded-[var(--radius-lg)] px-4 py-2.5 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-brand-900)]">
                {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
              </span>
              <span className="text-xs text-[var(--color-brand-700)]">
                (current page)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedOrderIds([])}
                className="text-xs py-1 px-3 h-8 bg-white hover:bg-[var(--color-brand-50)] text-[var(--color-text-secondary)]"
              >
                Clear Selection
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleOpenBulkDeleteModal}
                className="text-xs py-1 px-3 h-8 bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* DATA TABLE CONTAINER */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No orders found."
                description="Try clearing your search query or adjusting status filters."
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
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input 
                          type="checkbox"
                          ref={selectAllCheckboxRef}
                          checked={isAllCurrentSelected}
                          onChange={handleToggleSelectAll}
                          aria-label="Select all visible orders"
                          className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Payment</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {orders.map(ord => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      const isPaid = ord.payment_status === 'paid';
                      return (
                        <tr 
                          key={ord.id} 
                          className={`transition-colors ${isSelected ? 'bg-[var(--color-brand-50)]/50' : 'hover:bg-[var(--color-bg-subtle)]/70'}`}
                        >
                          <td className="px-4 py-3.5 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOrder(ord.id)}
                              aria-label={`Select order ${ord.id}`}
                              className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-[var(--color-text-primary)]">
                            {ord.id.slice(0, 8)}...
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[var(--color-text-primary)]">{ord.profiles?.full_name || 'Anonymous Student'}</p>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">{ord.profiles?.email}</p>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-[var(--color-text-secondary)]">
                            {ord.order_items?.length || 1} item(s)
                          </td>
                          <td className="px-5 py-3.5 font-extrabold text-[var(--color-text-primary)]">
                            ₹{Number(ord.total_amount).toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              ord.payment_status === 'paid' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : ord.payment_status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {ord.payment_status === 'paid' ? <CheckCircle2 className="w-3 h-3 text-emerald-600"/> : <Clock className="w-3 h-3 text-amber-600"/>}
                              {ord.payment_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-[var(--color-text-secondary)]">
                            {new Date(ord.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => { setSelectedOrder(ord); setIsViewModalOpen(true); }} 
                                className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" 
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isPaid && (
                                <button
                                  onClick={() => handleOpenSingleDelete(ord)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete unfulfilled order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {orders.map(ord => {
                  const isSelected = selectedOrderIds.includes(ord.id);
                  const isPaid = ord.payment_status === 'paid';
                  return (
                    <div key={ord.id} className={`p-4 space-y-2.5 transition-colors ${isSelected ? 'bg-[var(--color-brand-50)]/40' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(ord.id)}
                            aria-label={`Select order ${ord.id}`}
                            className="w-4 h-4 mt-0.5 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text-primary)]">{ord.profiles?.full_name || 'Anonymous Student'}</p>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">{ord.profiles?.email}</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-sm text-[var(--color-text-primary)] shrink-0">
                          ₹{Number(ord.total_amount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pl-7">
                        <span className="font-mono text-[10px]">{ord.id.slice(0, 8)}...</span>
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full border ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ord.payment_status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs py-1 px-2.5" 
                          onClick={() => { setSelectedOrder(ord); setIsViewModalOpen(true); }}
                        >
                          View Receipt
                        </Button>
                        {!isPaid && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="text-xs py-1 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200" 
                            onClick={() => handleOpenSingleDelete(ord)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION BAR */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
                </span>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="p-1.5 h-8 px-2.5 justify-center text-xs flex items-center gap-1" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  {/* Page number indicators */}
                  <div className="hidden sm:flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, index, filteredArr) => {
                        const prevPage = filteredArr[index - 1];
                        const showEllipsis = prevPage && p - prevPage > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-[var(--color-text-tertiary)]">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-8 w-8 rounded-[var(--radius-md)] text-xs font-semibold transition-colors ${
                                currentPage === p
                                  ? 'bg-[var(--color-brand-500)] text-white font-bold'
                                  : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border)]'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="p-1.5 h-8 px-2.5 justify-center text-xs flex items-center gap-1" 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* VIEW ORDER MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Order Receipt" className="max-w-md">
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <p className="font-bold text-sm text-[var(--color-text-primary)]">{selectedOrder.profiles?.full_name || 'Anonymous Student'}</p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{selectedOrder.profiles?.email}</p>
                <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-1">ID: {selectedOrder.id}</p>
              </div>
              <span className="text-base font-extrabold text-[var(--color-brand-600)]">₹{Number(selectedOrder.total_amount).toFixed(2)}</span>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] uppercase text-[10px] tracking-wider mb-2">Order Items</h4>
              <div className="space-y-2 bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                {selectedOrder.order_items?.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)]">{item.product?.title || 'Digital Product'}</span>
                    <span className="font-bold">₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Payment Status</p>
                <p className="font-bold text-emerald-700">{selectedOrder.payment_status.toUpperCase()}</p>
              </div>
              <div className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-bold tracking-wider mb-0.5">Order Status</p>
                <p className="font-bold text-[var(--color-text-primary)]">{selectedOrder.order_status.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      <Modal 
        isOpen={isSingleDeleteModalOpen} 
        onClose={() => { if (!isProcessingDelete) { setIsSingleDeleteModalOpen(false); setOrderToDelete(null); } }} 
        title="Delete Order?" 
        className="max-w-md"
      >
        {orderToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-red-900 space-y-1">
                <p className="font-bold">Are you sure you want to delete this order?</p>
                <p className="text-[11px] leading-relaxed">
                  Order <span className="font-mono font-bold">{orderToDelete.id.slice(0, 8)}...</span> for{' '}
                  <span className="font-bold">{orderToDelete.profiles?.full_name || 'Student'}</span> will be permanently removed.
                </p>
              </div>
            </div>

            <p className="text-[var(--color-text-secondary)] text-[11px]">
              This action only applies to unfulfilled/pending orders. Completed financial records are strictly protected and cannot be deleted.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isProcessingDelete} 
                onClick={() => { setIsSingleDeleteModalOpen(false); setOrderToDelete(null); }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                disabled={isProcessingDelete} 
                onClick={handleConfirmSingleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {isProcessingDelete ? 'Deleting...' : 'Delete Order'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal 
        isOpen={isBulkDeleteModalOpen} 
        onClose={() => { if (!isProcessingDelete) setIsBulkDeleteModalOpen(false); }} 
        title="Delete Selected Orders?" 
        className="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {paidSelectedCount > 0 ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-amber-900 space-y-1">
                <p className="font-bold">Deletion Blocked for Protected Orders</p>
                <p className="text-[11px] leading-relaxed">
                  {paidSelectedCount} of the {selectedOrderIds.length} selected orders are marked as <strong>PAID</strong>.
                </p>
                <p className="text-[11px] leading-relaxed">
                  Paid orders represent completed financial transactions and active student content entitlements, and cannot be deleted.
                </p>
                <p className="text-[11px] font-semibold mt-1">
                  Please deselect paid orders to proceed with deleting unfulfilled orders.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-red-900 space-y-1">
                <p className="font-bold">Permanently delete {selectedOrderIds.length} orders?</p>
                <p className="text-[11px] leading-relaxed">
                  This will remove the selected unfulfilled order records and their associated line items from the database.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isProcessingDelete} 
              onClick={() => setIsBulkDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              disabled={isProcessingDelete || paidSelectedCount > 0} 
              onClick={handleConfirmBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
            >
              {isProcessingDelete ? 'Deleting...' : `Delete ${selectedOrderIds.length} Orders`}
            </Button>
          </div>
        </div>
      </Modal>

    </AdminLayout>
  );
}
