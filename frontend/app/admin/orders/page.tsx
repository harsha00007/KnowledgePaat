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
  Receipt, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Order, OrderItem } from '@/lib/store';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:product_id (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (orderErr) throw orderErr;

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
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredOrders = orders.filter(ord => {
    const query = searchQuery.toLowerCase();
    const fullName = `${ord.profiles?.full_name || ''}`.toLowerCase();
    const email = (ord.profiles?.email || '').toLowerCase();
    const orderId = ord.id.toLowerCase();
    
    const matchesSearch = query === '' || 
      fullName.includes(query) || 
      email.includes(query) || 
      orderId.includes(query);

    const matchesPayment = paymentStatusFilter === '' || ord.payment_status === paymentStatusFilter;
    const matchesOrder = orderStatusFilter === '' || ord.order_status === orderStatusFilter;

    return matchesSearch && matchesPayment && matchesOrder;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setPaymentStatusFilter('');
    setOrderStatusFilter('');
    setCurrentPage(1);
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
              value={paymentStatusFilter} onChange={e => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select 
              value={orderStatusFilter} onChange={e => { setOrderStatusFilter(e.target.value); setCurrentPage(1); }}
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

        {/* DATA TABLE CONTAINER */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
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
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Payment</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedOrders.map(ord => (
                      <tr key={ord.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-[var(--color-text-primary)]">
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
                          <button 
                            onClick={() => { setSelectedOrder(ord); setIsViewModalOpen(true); }} 
                            className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" 
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--color-border)]">
                {paginatedOrders.map(ord => (
                  <div key={ord.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{ord.profiles?.full_name || 'Anonymous Student'}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">{ord.profiles?.email}</p>
                      </div>
                      <span className="font-extrabold text-sm text-[var(--color-text-primary)]">
                        ₹{Number(ord.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="font-mono text-[10px]">{ord.id.slice(0, 8)}...</span>
                      <span className="font-bold text-emerald-700">{ord.payment_status.toUpperCase()}</span>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedOrder(ord); setIsViewModalOpen(true); }}>
                        View Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
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

    </AdminLayout>
  );
}
