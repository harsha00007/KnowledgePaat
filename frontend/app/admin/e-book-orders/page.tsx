"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  BarChart3,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';
import { EBookOrder, EBookAdminReport, EBookReconciliationReport } from '@/types/ebook';

export default function AdminEBookOrdersPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'reports' | 'reconciliation'>('orders');

  // Orders Tab State
  const [orders, setOrders] = useState<EBookOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [orderType, setOrderType] = useState('all');
  const [refundStatus, setRefundStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Reports Tab State
  const [report, setReport] = useState<EBookAdminReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Reconciliation Tab State
  const [reconciliation, setReconciliation] = useState<EBookReconciliationReport | null>(null);
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (paymentStatus !== 'all') params.set('payment_status', paymentStatus);
      if (orderType !== 'all') params.set('order_type', orderType);
      if (refundStatus !== 'all') params.set('refund_status', refundStatus);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/admin/ebooks/orders?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        setError(data.error || 'Failed to load eBook orders.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading eBook orders.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch('/api/admin/ebooks/reports');
      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data.report);
      }
    } catch (err: any) {
      console.error('Failed to load reports', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchReconciliation = async () => {
    setIsLoadingReconciliation(true);
    try {
      const res = await fetch('/api/admin/ebooks/reconciliation');
      const data = await res.json();
      if (res.ok && data.success) {
        setReconciliation(data.report);
      }
    } catch (err: any) {
      console.error('Failed to load reconciliation', err);
    } finally {
      setIsLoadingReconciliation(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'reconciliation') {
      fetchReconciliation();
    }
  }, [page, paymentStatus, orderType, refundStatus, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (paymentStatus !== 'all') params.set('payment_status', paymentStatus);
      if (orderType !== 'all') params.set('order_type', orderType);
      if (refundStatus !== 'all') params.set('refund_status', refundStatus);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('format', 'csv');

      window.open(`/api/admin/ebooks/orders?${params.toString()}`, '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-6 space-y-6 font-ebook">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Phase 8 Operations
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Times shown in IST (UTC+05:30)
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1D3A]">
              eBook Orders, Refunds & Reconciliation
            </h1>
            <p className="text-sm text-slate-500">
              Complete administrative ledger, provider-backed refunds, customer access management, and reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'orders') fetchOrders();
                else if (activeTab === 'reports') fetchReports();
                else fetchReconciliation();
              }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isLoadingReport || isLoadingReconciliation ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Orders Ledger
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Operations & Sales Report
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'reconciliation'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Scale className="w-4 h-4" />
              Financial Reconciliation
              {reconciliation && reconciliation.discrepanciesCount > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {reconciliation.discrepanciesCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* TAB 1: ORDERS LEDGER */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Order #, customer email/name, or gateway ID..."
                    className="w-full pl-9 pr-3 py-2.5 text-base sm:text-base md:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    value={paymentStatus}
                    onChange={(e) => {
                      setPaymentStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full py-2.5 px-3 text-base sm:text-base md:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-slate-800"
                  >
                    <option value="all">Payment: All</option>
                    <option value="paid">Paid</option>
                    <option value="partially_refunded">Partially Refunded</option>
                    <option value="refunded">Fully Refunded</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={orderType}
                    onChange={(e) => {
                      setOrderType(e.target.value);
                      setPage(1);
                    }}
                    className="w-full py-2.5 px-3 text-base sm:text-base md:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-slate-800"
                  >
                    <option value="all">Type: All</option>
                    <option value="purchase">Standard Purchase</option>
                    <option value="upgrade">PDF Upgrade (+₹50)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={refundStatus}
                    onChange={(e) => {
                      setRefundStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full py-2.5 px-3 text-base sm:text-base md:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-slate-800"
                  >
                    <option value="all">Refund: All</option>
                    <option value="none">No Refunds</option>
                    <option value="pending">Pending Refund</option>
                    <option value="partial">Partial Refund</option>
                    <option value="full">Full Refund</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer"
                  >
                    Filter
                  </button>
                  {(search || paymentStatus !== 'all' || orderType !== 'all' || refundStatus !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setPaymentStatus('all');
                        setOrderType('all');
                        setRefundStatus('all');
                        setPage(1);
                      }}
                      className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* MOBILE ORDERS LIST (Phones & Narrow Tablets) */}
              {!isLoading && orders.length > 0 && (
                <div className="md:hidden divide-y divide-slate-100">
                  {orders.map((order) => {
                    const isUpgrade = order.order_type === 'upgrade';
                    return (
                      <div key={`m-${order.id}`} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/admin/e-book-orders/${order.id}`}
                              className="font-bold text-navy text-sm font-mono hover:text-[#2563EB] flex items-center gap-1"
                            >
                              {order.order_number}
                            </Link>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 block">
                              {formatPrice(order.total_amount_paise)}
                            </span>
                            {isUpgrade ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                PDF Upgrade
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Purchase
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium truncate max-w-[180px]">
                              {order.customer_name || 'Customer'}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[150px]">
                              {order.customer_email}
                            </span>
                          </div>
                          {order.items && order.items.length > 0 && (
                            <p className="text-xs text-slate-700 truncate font-medium">
                              {order.items.map((it) => it.title).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            {order.payment_status === 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                              </span>
                            )}
                            {order.payment_status === 'partially_refunded' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Partial Refund
                              </span>
                            )}
                            {order.payment_status === 'refunded' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                Refunded
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/admin/e-book-orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                          >
                            Details <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Order / Type</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Date (IST)</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Refund Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
                          Loading orders ledger...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No orders matched your search or filters.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const isUpgrade = order.order_type === 'upgrade';
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <Link
                                href={`/admin/e-book-orders/${order.id}`}
                                className="font-semibold text-[#0B1D3A] hover:text-[#2563EB] flex items-center gap-1.5"
                              >
                                {order.order_number}
                              </Link>
                              <div className="mt-1">
                                {isUpgrade ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                    PDF Upgrade
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Purchase
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900">{order.customer_name || 'Customer'}</div>
                              <div className="text-xs text-slate-500 font-mono">{order.customer_email}</div>
                            </td>

                            <td className="py-3.5 px-4 max-w-[200px]">
                              {order.items && order.items.length > 0 ? (
                                <div className="space-y-1">
                                  {order.items.map((it) => (
                                    <div key={it.id} className="text-xs truncate font-medium text-slate-800">
                                      {it.title}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">No items listed</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(order.created_at)}
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {formatPrice(order.total_amount_paise)}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {order.payment_status === 'paid' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </span>
                              )}
                              {order.payment_status === 'partially_refunded' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                  <RotateCcw className="w-3 h-3" /> Partial Refund
                                </span>
                              )}
                              {order.payment_status === 'refunded' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                  <RotateCcw className="w-3 h-3" /> Refunded
                                </span>
                              )}
                              {order.payment_status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                              {order.payment_status === 'failed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {order.refund_status === 'full' && (
                                <span className="text-xs font-medium text-rose-600">Full (₹{(order.refunded_amount_paise! / 100).toFixed(0)})</span>
                              )}
                              {order.refund_status === 'partial' && (
                                <span className="text-xs font-medium text-amber-600">Partial (₹{(order.refunded_amount_paise! / 100).toFixed(0)})</span>
                              )}
                              {order.refund_status === 'pending' && (
                                <span className="text-xs font-medium text-blue-600">Pending Review</span>
                              )}
                              {(!order.refund_status || order.refund_status === 'none') && (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <Link
                                href={`/admin/e-book-orders/${order.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                View Details <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-500 bg-slate-50">
                  <div>
                    Showing page <span className="font-semibold text-slate-800">{page}</span> of{' '}
                    <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total orders)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OPERATIONS & SALES REPORT */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {isLoadingReport ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
                Calculating authoritative operations report...
              </div>
            ) : !report ? (
              <div className="py-12 text-center text-slate-500">No report data available.</div>
            ) : (
              <div className="space-y-6">
                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Gross Captured Sales</p>
                    <p className="text-2xl font-bold text-[#0B1D3A] mt-1">{formatPrice(report.capturedSalesPaise)}</p>
                    <p className="text-xs text-slate-500 mt-1">{report.capturedSalesCount} total paid transactions</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Net Sales (Less Refunds)</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(report.netSalesPaise)}</p>
                    <p className="text-xs text-slate-500 mt-1">Processed Refunds: -{formatPrice(report.refunds.processedPaise)}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">₹50 PDF Upgrades</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{report.pdfUpgradesCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Upgrade Revenue: {formatPrice(report.pdfUpgradesPaise)}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Download URL Issuances</p>
                    <p className="text-2xl font-bold text-[#2563EB] mt-1">{report.downloadUrlIssuances}</p>
                    <p className="text-xs text-slate-400 mt-1">Signed bearer link requests (not confirmed saves)</p>
                  </div>
                </div>

                {/* Second Row: Entitlements & Refunds Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Entitlements Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-[#0B1D3A] text-base flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#2563EB]" />
                      Active Customer Entitlements
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Online-Only Licenses (₹49)</span>
                        <span className="font-semibold text-slate-800">{report.entitlements.onlineOnlyCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Read + Download Licenses (₹99 / Upgraded)</span>
                        <span className="font-semibold text-slate-800">{report.entitlements.downloadEnabledCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Complimentary Administrator Grants</span>
                        <span className="font-semibold text-slate-800">{report.entitlements.complimentaryCount}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Revoked / Inactive Access</span>
                        <span className="font-semibold text-rose-600">{report.entitlements.revokedCount}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 font-bold text-slate-900">
                        <span>Total Active Entitlements</span>
                        <span>{report.entitlements.totalActive}</span>
                      </div>
                    </div>
                  </div>

                  {/* Refunds Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-[#0B1D3A] text-base flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-rose-600" />
                      Refunds Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Processed Refunds</span>
                        <span className="font-semibold text-rose-600">
                          {report.refunds.processedCount} ({formatPrice(report.refunds.processedPaise)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Pending Gateway Review</span>
                        <span className="font-semibold text-blue-600">
                          {report.refunds.pendingCount} ({formatPrice(report.refunds.pendingPaise)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Failed / Rejected Refunds</span>
                        <span className="font-semibold text-slate-500">
                          {report.refunds.failedCount} ({formatPrice(report.refunds.failedPaise)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                        <span>Gateway Settlement Status:</span>
                        <span className="font-medium text-slate-600">{report.settlementSummary.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best Sellers */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-[#0B1D3A] text-base">Top Performing Books</h3>
                  <div className="divide-y divide-slate-100">
                    {report.bestSellers.length === 0 ? (
                      <p className="text-sm text-slate-500 py-3">No book sales recorded yet.</p>
                    ) : (
                      report.bestSellers.map((b, idx) => (
                        <div key={b.ebook_id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-sm text-slate-900">{b.title}</p>
                              <p className="text-xs text-slate-500">{b.unitsSold} copies sold</p>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-[#0B1D3A]">{formatPrice(b.grossSalesPaise)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCIAL RECONCILIATION */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {isLoadingReconciliation ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
                Auditing database orders against Razorpay Gateway API...
              </div>
            ) : !reconciliation ? (
              <div className="py-12 text-center text-slate-500">No reconciliation data available.</div>
            ) : (
              <div className="space-y-6">
                {/* Summary Banner */}
                <div className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  reconciliation.discrepanciesCount === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {reconciliation.discrepanciesCount === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {reconciliation.discrepanciesCount === 0
                          ? 'Zero Discrepancies Detected'
                          : `${reconciliation.discrepanciesCount} Potential Discrepancies Requiring Review`}
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">
                        Inspected {reconciliation.totalOrdersInspected} recent transactions against live Razorpay Test Mode API.
                        Provider reachable: {reconciliation.providerReachable ? 'Yes' : 'No'}.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchReconciliation}
                    className="text-xs bg-white text-slate-700"
                  >
                    Re-run Audit
                  </Button>
                </div>

                {/* Discrepancies List */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-[#0B1D3A] text-sm">Discrepancy Ledger</h3>
                  </div>

                  {reconciliation.discrepancies.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      All inspected local orders, payment statuses, and refunds strictly match Razorpay records.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {reconciliation.discrepancies.map((d, idx) => (
                        <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                                {d.discrepancyType?.replace(/_/g, ' ')}
                              </span>
                              {d.orderNumber && (
                                <Link
                                  href={`/admin/e-book-orders/${d.referenceId}`}
                                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                                >
                                  {d.orderNumber}
                                </Link>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-900">{d.discrepancyDescription}</p>
                            <p className="text-xs text-slate-500">
                              Customer: {d.customerEmail} | Local Status: {d.localStatus} | Gateway Ref: {d.gatewayPaymentId || 'N/A'}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {d.actionRequired && (
                              <span className="text-xs text-slate-600 font-medium italic mr-2">
                                {d.actionRequired}
                              </span>
                            )}
                            {d.referenceId && (
                              <Link
                                href={`/admin/e-book-orders/${d.referenceId}`}
                                className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                View Order
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
