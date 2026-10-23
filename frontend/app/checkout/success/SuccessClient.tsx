"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Download,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { EBookOrder } from '@/types/ebook';

export function SuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<EBookOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  const fetchOrder = React.useCallback(async () => {
    if (!orderId) {
      setError('No order reference provided.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/ebooks/orders/${orderId}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to retrieve order confirmation.');
        return;
      }

      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Network error while checking order confirmation.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Authenticated recovery action
  const checkPaymentStatus = React.useCallback(async (isAuto = false) => {
    if (!orderId || isCheckingStatus) return;
    setIsCheckingStatus(true);
    if (isAuto) {
      setRecoveryMessage(`Checking with Razorpay... (attempt ${autoRetryCount + 1} of 3)`);
    } else {
      setRecoveryMessage('Checking status with Razorpay Gateway...');
    }

    try {
      const res = await fetch(`/api/ebooks/orders/${orderId}/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        if (data.paymentStatus === 'paid' || data.status === 'paid') {
          await fetchOrder();
          setRecoveryMessage('Payment confirmed! Digital library access unlocked.');
          return;
        } else if (data.paymentStatus === 'authorized') {
          setRecoveryMessage('Payment authorized by your bank. Pending capture confirmation...');
        } else if (data.paymentStatus === 'failed') {
          setRecoveryMessage(data.message || 'Payment attempt failed.');
          await fetchOrder();
        } else {
          setRecoveryMessage(data.message || 'Awaiting completed payment confirmation from gateway.');
        }
      } else {
        setRecoveryMessage(data.error || 'Unable to check payment status.');
      }
    } catch (err: any) {
      setRecoveryMessage('Network error while checking payment status.');
    } finally {
      setIsCheckingStatus(false);
      if (isAuto) {
        setAutoRetryCount((prev) => prev + 1);
      }
    }
  }, [orderId, isCheckingStatus, autoRetryCount, fetchOrder]);

  // Bounded retries: up to 3 automatic checks every 3.5s if order is pending
  useEffect(() => {
    if (!order || order.payment_status === 'paid') return;
    if (autoRetryCount < 3) {
      const timer = setTimeout(() => {
        checkPaymentStatus(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [order, autoRetryCount, checkPaymentStatus]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Confirming your purchase...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying payment records and digital library entitlements</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-amber-900">Order Confirmation Status</h2>
          <p className="text-xs text-amber-800 leading-relaxed">
            {error || 'Unable to locate order details.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/my-books">
              <Button variant="primary" size="sm">
                Check My Digital Library
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="outline" size="sm">
                Return to Cart
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid';
  const isCompleted = order.order_status === 'completed';
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: order.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(order.total_amount_paise / 100);

  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-16 px-4 sm:px-6 space-y-8 animate-in fade-in font-ebook">
      {/* ── STATUS HERO CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-4">
        {isPaid && isCompleted ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                Payment Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1D3A] tracking-tight">
                Thank You For Your Purchase!
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your eBook access has been atomically granted. The titles below are now part of your permanent library shelf.
              </p>
            </div>
          </>
        ) : isPaid ? (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-[#2563EB] mb-2">
              <Clock className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB]">
                Payment Received
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1D3A] tracking-tight">
                Digital Unlocking in Progress
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your payment was received. Entitlement unlocking is finishing in the background.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-2">
              <Clock className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
                Pending Confirmation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1D3A] tracking-tight">
                Awaiting Gateway Confirmation
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We are waiting for Razorpay to finalize this transaction. If you completed payment, click below to verify and unlock your library.
              </p>
            </div>

            {/* Authenticated Recovery Action */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => checkPaymentStatus(false)}
                disabled={isCheckingStatus}
                className="font-bold text-xs shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                {isCheckingStatus ? 'Checking Gateway...' : 'Check Payment Status'}
              </Button>
              {recoveryMessage && (
                <p className="text-[11px] text-slate-600 font-medium animate-in fade-in">
                  {recoveryMessage}
                </p>
              )}
            </div>
          </>
        )}

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/my-books" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full font-bold text-xs sm:text-sm shadow-brand">
              <BookOpen className="w-4 h-4 mr-2" />
              Go to My Books
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/e-books" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full font-semibold text-xs sm:text-sm">
              Explore More eBooks
            </Button>
          </Link>
        </div>
      </div>

      {/* ── ORDER SUMMARY & METADATA ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order Reference
            </span>
            <p className="text-sm font-black text-slate-900 font-mono">
              {order.order_number}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Amount
            </span>
            <p className="text-base font-bold text-[#0B1D3A]">
              {formattedAmount}
            </p>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-[#2563EB]" />
            Purchased Titles & Access Plans
          </p>

          <div className="divide-y divide-slate-100">
            {order.items?.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {item.edition_label || 'Current Edition'}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.plan === 'read_download'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {item.plan === 'read_download' ? 'Read + Download' : 'Read Online'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 text-sm">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(item.price_paise / 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Proof Details */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Payment Gateway Reference
            </span>
            <span className="font-mono text-slate-800">
              {order.gateway_payment_id || order.gateway_order_id || 'Pending reference'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Payment Status
            </span>
            <span className="font-semibold text-emerald-700 capitalize">
              {order.payment_status} (Test Mode)
            </span>
          </div>
        </div>

        {/* Honest Delivery Disclaimer */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-[#0B1D3A] flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            Reading & Download Delivery Notes
          </p>
          <p>
            Your entitlement is permanently recorded. The online distraction-free reader (Phase 6) and secure PDF downloads (Phase 7) are in active preparation. You can view your owned titles at any time in My Books.
          </p>
        </div>
      </div>
    </div>
  );
}
