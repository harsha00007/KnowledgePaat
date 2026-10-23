"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldCheck,
  CreditCard,
  User,
  BookOpen,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { EBookOrder, EBookRefund } from '@/types/ebook';

interface OrderDetailResponse extends EBookOrder {
  entitlements?: any[];
  refunds?: EBookRefund[];
  auditEvents?: any[];
  receiptOutbox?: any;
  linkedOrders?: {
    originalOrder?: any;
    upgradeOrders?: any[];
  };
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial' | 'goodwill'>('full');
  const [refundAmountRupees, setRefundAmountRupees] = useState<string>('');
  const [refundReason, setRefundReason] = useState('');
  const [accessAction, setAccessAction] = useState<'revoke' | 'downgrade_to_online' | 'retain'>('revoke');
  const [forceAllowDependent, setForceAllowDependent] = useState(false);
  const [refundBothSelected, setRefundBothSelected] = useState(true);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Access Management Modal State
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessActionType, setAccessActionType] = useState<'revoke' | 'restore'>('revoke');
  const [accessReason, setAccessReason] = useState('');
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Syncing State
  const [syncingRefundId, setSyncingRefundId] = useState<string | null>(null);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ebooks/orders/${orderId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.order);
        // Default access action based on order type
        if (data.order.order_type === 'upgrade') {
          setAccessAction('downgrade_to_online');
        } else {
          setAccessAction('revoke');
        }
      } else {
        setError(data.error || 'Failed to load order details.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading order.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const formatPrice = (paise?: number) => {
    if (typeof paise !== 'number') return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
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

  const availableRefundablePaise = order
    ? Math.max(0, order.total_amount_paise - (order.refunded_amount_paise || 0))
    : 0;

  const handleOpenRefundModal = () => {
    setRefundType('full');
    setRefundAmountRupees((availableRefundablePaise / 100).toFixed(2));
    setRefundReason('');
    setRefundError(null);
    setForceAllowDependent(false);
    if (order?.order_type === 'upgrade') {
      setAccessAction('downgrade_to_online');
    } else {
      setAccessAction('revoke');
    }
    setIsRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!refundReason.trim() || refundReason.trim().length < 5) {
      setRefundError('A detailed reason (at least 5 characters) is required.');
      return;
    }

    const amountRupees = parseFloat(refundAmountRupees);
    if (isNaN(amountRupees) || amountRupees <= 0) {
      setRefundError('Please specify a valid refund amount greater than 0.');
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise > availableRefundablePaise) {
      setRefundError(`Amount exceeds available refundable balance of ${formatPrice(availableRefundablePaise)}.`);
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError(null);

    try {
      const payload: Record<string, any> = {
        amount_paise: amountPaise,
        reason: refundReason.trim(),
        refund_type: refundType,
        access_action: accessAction,
        force_allow_dependent_upgrade: forceAllowDependent,
      };

      if (order?.order_type !== 'upgrade' && (order?.linkedOrders?.upgradeOrders?.length ?? 0) > 0 && refundBothSelected && order?.linkedOrders?.upgradeOrders?.[0]?.id) {
        payload.action = 'refund_both';
        payload.upgrade_order_id = order.linkedOrders.upgradeOrders[0].id;
      }

      const res = await fetch(`/api/admin/ebooks/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsRefundModalOpen(false);
        await fetchOrderDetail();
      } else {
        if (data.code === 'DEPENDENT_UPGRADE_EXISTS') {
          setRefundError(
            `Rule C Conflict: An active paid PDF upgrade exists for this purchase. ` +
            `Standalone base refund is blocked unless you acknowledge and force dependent upgrade resolution.`
          );
        } else {
          setRefundError(data.error || 'Refund processing failed.');
        }
      }
    } catch (err: any) {
      setRefundError(err.message || 'Network exception processing refund.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleSyncRefund = async (refundId: string) => {
    setSyncingRefundId(refundId);
    try {
      const res = await fetch(`/api/admin/ebooks/refunds/${refundId}/reconcile`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchOrderDetail();
      } else {
        alert(data.error || 'Failed to sync refund status with gateway.');
      }
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncingRefundId(null);
    }
  };

  const handleManageAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !order.items?.[0]) return;

    if (!accessReason.trim() || accessReason.trim().length < 5) {
      setAccessError('A mandatory reason of at least 5 characters is required.');
      return;
    }

    setIsSubmittingAccess(true);
    setAccessError(null);

    try {
      const item = order.items[0];
      const res = await fetch(`/api/admin/ebooks/customers/${order.customer_id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: accessActionType,
          ebook_id: item.ebook_id,
          edition_id: item.edition_id,
          reason: accessReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAccessModalOpen(false);
        await fetchOrderDetail();
      } else {
        setAccessError(data.error || 'Failed to alter customer access.');
      }
    } catch (err: any) {
      setAccessError(err.message || 'Network error updating customer access.');
    } finally {
      setIsSubmittingAccess(false);
    }
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-6 space-y-6 font-ebook">
        {/* Back and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/admin/e-book-orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders Ledger
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#0B1D3A]">
                Order {order?.order_number || orderId}
              </h1>
              {order?.order_type === 'upgrade' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  PDF Upgrade (+₹50)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Standard Purchase
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Created on {formatDate(order?.created_at)} | Timezone: IST (UTC+05:30)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrderDetail}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Order
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#2563EB]" />
            Loading complete order record...
          </div>
        ) : !order ? (
          <div className="py-12 text-center text-slate-500">Order not found.</div>
        ) : (
          <div className="space-y-6">
            {/* LINKED ORDERS NOTICE */}
            {order.order_type === 'upgrade' && order.linkedOrders?.originalOrder && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-purple-600" />
                  <div>
                    <h4 className="font-bold text-sm text-purple-900">
                      Funded by Base Online Purchase: {order.linkedOrders.originalOrder.order_number}
                    </h4>
                    <p className="text-xs text-purple-700">
                      This ₹50 upgrade applies to the license originally acquired in Order #{order.linkedOrders.originalOrder.order_number}.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/e-book-orders/${order.linkedOrders.originalOrder.id}`}
                  className="px-3 py-1.5 bg-white text-purple-700 border border-purple-300 text-xs font-bold rounded-lg hover:bg-purple-50 transition-colors"
                >
                  View Base Purchase
                </Link>
              </div>
            )}

            {order.order_type !== 'upgrade' && order.linkedOrders?.upgradeOrders && order.linkedOrders.upgradeOrders.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">
                      Active Dependent PDF Upgrade Exists: {order.linkedOrders.upgradeOrders.map(u => u.order_number).join(', ')}
                    </h4>
                    <p className="text-xs text-blue-700">
                      Rule C Safeguard: A separate ₹50 upgrade order depends on this base license.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/e-book-orders/${order.linkedOrders.upgradeOrders[0].id}`}
                  className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Upgrade Order
                </Link>
              </div>
            )}

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Customer Info */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-[#0B1D3A] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#2563EB]" /> Customer Information
                  </h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400">Name:</span>{' '}
                    <span className="font-semibold text-slate-800">{order.customer_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="font-semibold text-slate-800 font-mono">{order.customer_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Customer ID:</span>{' '}
                    <span className="font-mono text-slate-600 truncate block">{order.customer_id}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Financial Snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-[#0B1D3A] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" /> Financial Snapshot
                  </h3>
                  <span className="text-xs font-bold text-slate-800">
                    {order.currency}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Captured:</span>
                    <span className="font-bold text-slate-900">{formatPrice(order.total_amount_paise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Refunded Total:</span>
                    <span className="font-bold text-rose-600">{formatPrice(order.refunded_amount_paise || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600 font-semibold">Available for Refund:</span>
                    <span className="font-bold text-emerald-700">{formatPrice(availableRefundablePaise)}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Gateway & Payment References */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-[#0B1D3A] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" /> Gateway Credentials
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-700 uppercase">
                    {order.payment_gateway}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400">Payment ID:</span>{' '}
                    <span className="font-mono font-semibold text-slate-800 block truncate">
                      {order.gateway_payment_id || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Order ID:</span>{' '}
                    <span className="font-mono text-slate-600 block truncate">
                      {order.gateway_order_id || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Payment Status:</span>{' '}
                    <span className="font-bold uppercase text-slate-800">{order.payment_status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-[#0B1D3A] text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" /> Purchased Items & Line Allocations
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Edition</th>
                      <th className="py-3 px-4">Immutable Price</th>
                      <th className="py-3 px-4">Refunded</th>
                      <th className="py-3 px-4">Line Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{item.title}</td>
                        <td className="py-3 px-4">
                          {item.plan === 'upgrade_pdf' ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              PDF Upgrade
                            </span>
                          ) : item.plan === 'read_download' ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Read + Download
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              Read Online
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{item.edition_label || 'Standard Edition'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatPrice(item.price_paise)}</td>
                        <td className="py-3 px-4 font-semibold text-rose-600">{formatPrice(item.refunded_paise || 0)}</td>
                        <td className="py-3 px-4 text-xs font-medium uppercase text-slate-700">
                          {item.refund_status || 'none'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Entitlement & Access Management Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-[#0B1D3A] text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Customer Ownership & Access State
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live database entitlements linked to this customer and purchased editions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccessActionType('revoke');
                      setAccessReason('');
                      setAccessError(null);
                      setIsAccessModalOpen(true);
                    }}
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    Revoke Access
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccessActionType('restore');
                      setAccessReason('');
                      setAccessError(null);
                      setIsAccessModalOpen(true);
                    }}
                    className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    Restore Access
                  </Button>
                </div>
              </div>

              {order.entitlements && order.entitlements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.entitlements.map((ent) => (
                    <div key={ent.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">License Status</span>
                        {ent.is_active ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                            Revoked / Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <div><span className="text-slate-400">Plan:</span> <span className="font-semibold text-slate-800">{ent.plan}</span></div>
                        <div><span className="text-slate-400">Online Reading:</span> <span className="font-semibold text-slate-800">{ent.can_read_online ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-slate-400">PDF Download:</span> <span className="font-semibold text-slate-800">{ent.can_download_pdf ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-slate-400">Grant Type:</span> <span className="font-mono text-slate-700">{ent.grant_type}</span></div>
                        {ent.grant_reason && (
                          <div className="pt-1 text-slate-500 italic">Reason: {ent.grant_reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No direct entitlement found matching this order.</p>
              )}
            </div>

            {/* Refunds Ledger & Action */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0B1D3A] text-base flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-rose-600" />
                    Refunds & Gateway Chargebacks
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authoritative provider refunds ledger with two-phase locking.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleOpenRefundModal}
                  disabled={availableRefundablePaise <= 0 || !['paid', 'partially_refunded'].includes(order.payment_status)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Issue Refund ({formatPrice(availableRefundablePaise)} Available)
                </Button>
              </div>

              {order.refunds && order.refunds.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Refund ID / Gateway Ref</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Type / Action</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date (IST)</th>
                        <th className="py-3 px-4 text-right">Recovery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.refunds.map((rf) => (
                        <tr key={rf.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs block font-semibold text-slate-800">
                              {rf.gateway_refund_id || 'Pending Gateway ID'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">{rf.id}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-rose-600">{formatPrice(rf.amount_paise)}</td>
                          <td className="py-3 px-4 text-xs">
                            <div className="font-semibold text-slate-800 uppercase">{rf.refund_type}</div>
                            <div className="text-[10px] text-slate-500">{rf.access_action}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">{rf.reason}</td>
                          <td className="py-3 px-4">
                            {rf.status === 'processed' ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                Processed
                              </span>
                            ) : rf.status === 'pending' ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                                Pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{formatDate(rf.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            {rf.status === 'pending' && (
                              <button
                                onClick={() => handleSyncRefund(rf.id)}
                                disabled={syncingRefundId === rf.id}
                                className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              >
                                {syncingRefundId === rf.id ? 'Syncing...' : 'Sync Gateway'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No refunds recorded for this order.
                </div>
              )}
            </div>

            {/* Audit Events Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-[#0B1D3A] text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                Immutable Audit Trail
              </h3>
              {order.auditEvents && order.auditEvents.length > 0 ? (
                <div className="space-y-3">
                  {order.auditEvents.map((evt) => (
                    <div key={evt.id} className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">{evt.action}</span>
                        <span className="text-slate-500 block font-mono">
                          Actor: {evt.actor_id || 'System'} | Entity: {evt.entity_type} ({evt.entity_id})
                        </span>
                      </div>
                      <span className="text-slate-400 whitespace-nowrap">{formatDate(evt.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific audit entries logged for this order.</p>
              )}
            </div>
          </div>
        )}

        {/* REFUND MODAL */}
        {isRefundModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#0B1D3A]">Process Authoritative Refund</h3>
                  <p className="text-xs text-slate-500">
                    Order {order?.order_number} — Available balance: {formatPrice(availableRefundablePaise)}
                  </p>
                </div>
                <button
                  onClick={() => setIsRefundModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {refundError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {refundError}
                </div>
              )}

              <form onSubmit={handleProcessRefund} className="space-y-4">
                {/* Refund Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Refund Type</label>
                  <select
                    value={refundType}
                    onChange={(e: any) => {
                      setRefundType(e.target.value);
                      if (e.target.value === 'full') {
                        setRefundAmountRupees((availableRefundablePaise / 100).toFixed(2));
                      }
                    }}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="full">Full Refund ({formatPrice(availableRefundablePaise)})</option>
                    <option value="partial">Partial Refund</option>
                    <option value="goodwill">Goodwill / Courtesy Refund</option>
                  </select>
                </div>

                {/* Refund Amount in INR */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Amount to Refund (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={availableRefundablePaise / 100}
                    value={refundAmountRupees}
                    disabled={refundType === 'full'}
                    onChange={(e) => setRefundAmountRupees(e.target.value)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] disabled:opacity-60"
                  />
                </div>

                {/* Access Policy Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Customer Access Resolution</label>
                  <select
                    value={accessAction}
                    onChange={(e: any) => setAccessAction(e.target.value)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="revoke">Rule A: Revoke Access (Full purchase refund)</option>
                    <option value="downgrade_to_online">Rule B: Downgrade to Read Online (Remove PDF only)</option>
                    <option value="retain">Rule D: Retain Access (Goodwill / Courtesy refund)</option>
                  </select>
                </div>

                {/* Rule C Dependent Upgrade Warning */}
                {order?.order_type !== 'upgrade' && (order?.linkedOrders?.upgradeOrders?.length ?? 0) > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Rule C: Dependent Paid Upgrade Warning
                    </div>
                    <p>
                      This base license has an active PDF upgrade ({order?.linkedOrders?.upgradeOrders?.[0]?.order_number || 'Linked Upgrade'}). Standalone refund will leave the upgrade without a base license.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-start gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="ruleC_option"
                          checked={refundBothSelected}
                          onChange={() => {
                            setRefundBothSelected(true);
                            setForceAllowDependent(false);
                          }}
                          className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span><strong>(Recommended)</strong> Refund Both Orders — Cascades ₹50 upgrade then ₹49 base purchase</span>
                      </label>
                      <label className="flex items-start gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="ruleC_option"
                          checked={!refundBothSelected}
                          onChange={() => {
                            setRefundBothSelected(false);
                            setForceAllowDependent(true);
                          }}
                          className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span>Force Standalone Base Refund Only (Acknowledge orphaned upgrade)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Mandatory Reason */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Administrative Reason (Required for audit)
                  </label>
                  <textarea
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter reason for issuing refund..."
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsRefundModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    {isSubmittingRefund ? 'Processing...' : 'Confirm & Execute Refund'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ACCESS MANAGEMENT MODAL */}
        {isAccessModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#0B1D3A]">
                    {accessActionType === 'revoke' ? 'Revoke Customer Access' : 'Restore Customer Access'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customer {order?.customer_email}
                  </p>
                </div>
                <button
                  onClick={() => setIsAccessModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {accessError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {accessError}
                </div>
              )}

              <form onSubmit={handleManageAccess} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Mandatory Administrative Reason
                  </label>
                  <textarea
                    rows={3}
                    value={accessReason}
                    onChange={(e) => setAccessReason(e.target.value)}
                    placeholder="Document why access is being altered..."
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsAccessModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingAccess}
                    className={`${accessActionType === 'revoke' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-xs font-bold`}
                  >
                    {isSubmittingAccess ? 'Saving...' : 'Confirm Action'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
