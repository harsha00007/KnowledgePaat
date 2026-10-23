"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Sparkles,
  CreditCard,
  User,
  Mail,
  ChevronRight,
  Info,
  Smartphone,
  QrCode,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useEBookCart, ValidatedCartItem, EBookPlan } from '@/hooks/useEBookCart';
import Script from 'next/script';
import {
  openKnowledgePaatRazorpayCheckout,
  loadRazorpayCheckoutScript,
} from '@/lib/razorpayClient';

interface VerifiedCustomerIdentity {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
}

interface ActivePendingOrder {
  internalOrderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  itemsSignature: string;
}

export function CheckoutClient() {
  const router = useRouter();
  const {
    storedItems,
    validatedItems,
    totalPaise,
    formattedTotal,
    isValidating: isValidatingCart,
    validationError,
    warnings,
    removeFromCart,
    clearCart,
  } = useEBookCart();

  const [customer, setCustomer] = useState<VerifiedCustomerIdentity | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [scriptLoadError, setScriptLoadError] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Active server order state to prevent duplicate orders when switching methods or retrying
  const [activePendingOrder, setActivePendingOrder] = useState<ActivePendingOrder | null>(null);

  // Current cart items signature
  const currentItemsSignature = useMemo(() => {
    return validatedItems
      .map((item) => `${item.book_id}:${item.plan}:${item.price_paise}`)
      .sort()
      .join('|');
  }, [validatedItems]);

  // Clear active order if cart items change
  useEffect(() => {
    if (activePendingOrder && activePendingOrder.itemsSignature !== currentItemsSignature) {
      setActivePendingOrder(null);
      setRecoveryMessage(null);
    }
  }, [currentItemsSignature, activePendingOrder]);

  // 1. Resolve Verified Customer Identity
  useEffect(() => {
    async function loadCustomer() {
      setIsAuthLoading(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/ebooks/my-books', {
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (res.status === 401) {
          router.push('/login?redirectTo=/checkout');
          return;
        }

        const data = await res.json();
        if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
          setAuthError('Email verification is required before checkout. Please check your inbox.');
          setIsAuthLoading(false);
          return;
        }

        if (res.ok) {
          setCustomer({
            userId: data.customerId || 'verified_customer',
            email: data.customerEmail || 'customer@knowledgepaat.test',
            fullName: data.customerName || 'Verified Customer',
            role: 'student',
            isEmailVerified: true,
          });
        } else {
          setAuthError(data.error || 'Authentication error.');
        }
      } catch (err: any) {
        setAuthError(err?.message || 'Failed to verify customer authentication.');
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadCustomer();
  }, [router]);

  // 2. Retry script loading if initially blocked
  const handleRetryScriptLoad = async () => {
    setScriptLoadError(false);
    const loaded = await loadRazorpayCheckoutScript(true);
    if (loaded) {
      setRazorpayLoaded(true);
      setPaymentError(null);
    } else {
      setScriptLoadError(true);
      setPaymentError('Could not load Razorpay script. Please disable ad-blockers and check connection.');
    }
  };

  // 3. Launch Checkout for a given server order
  const launchCheckoutForOrder = useCallback(
    async (order: ActivePendingOrder) => {
      setIsProcessingOrder(true);
      setPaymentError(null);

      try {
        await openKnowledgePaatRazorpayCheckout({
          keyId: order.keyId,
          amountPaise: order.amountPaise,
          currency: order.currency || 'INR',
          internalOrderId: order.internalOrderId,
          razorpayOrderId: order.razorpayOrderId,
          orderNumber: order.orderNumber,
          description: `KnowledgePaat Order ${order.orderNumber}`,
          customer: {
            fullName: customer?.fullName,
            email: customer?.email,
          },
          notes: {
            internalOrderId: order.internalOrderId,
            orderNumber: order.orderNumber,
          },
          themeColor: '#0B1D3A',
          onSuccess: async (response) => {
            setIsVerifyingPayment(true);
            try {
              const verifyRes = await fetch('/api/ebooks/orders/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  internalOrderId: order.internalOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyRes.ok && verifyData.success) {
                // Prune purchased items only
                validatedItems.forEach((it) => removeFromCart(it.book_id));
                router.push(`/checkout/success?orderId=${order.internalOrderId}`);
              } else {
                setPaymentError(verifyData.error || 'Payment verification failed.');
              }
            } catch (err: any) {
              setPaymentError(err.message || 'Payment confirmation error.');
            } finally {
              setIsVerifyingPayment(false);
              setIsProcessingOrder(false);
            }
          },
          onDismiss: () => {
            setIsProcessingOrder(false);
            setRecoveryMessage('Checkout closed or switched to UPI app. If payment completed, click "Check Payment Status" below.');
          },
          onPaymentFailed: (err) => {
            setIsProcessingOrder(false);
            setPaymentError(err.description || 'Payment was declined or cancelled. You can retry with UPI or Card.');
          },
        });
      } catch (err: any) {
        setIsProcessingOrder(false);
        setPaymentError(err.message || 'Failed to open payment gateway.');
      }
    },
    [customer, validatedItems, removeFromCart, router]
  );

  // 4. Initiate Order or Reuse Existing Order
  const handleInitiatePayment = async () => {
    if (validatedItems.length === 0 || totalPaise <= 0) return;
    if (isProcessingOrder || isVerifyingPayment) return;

    setPaymentError(null);
    setRecoveryMessage(null);

    // Reuse existing active order if valid for identical items and amount
    if (
      activePendingOrder &&
      activePendingOrder.itemsSignature === currentItemsSignature &&
      activePendingOrder.amountPaise === totalPaise
    ) {
      await launchCheckoutForOrder(activePendingOrder);
      return;
    }

    setIsProcessingOrder(true);

    try {
      // Step A: Create server order
      const createRes = await fetch('/api/ebooks/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validatedItems.map((item) => ({
            bookId: item.book_id,
            plan: item.plan,
          })),
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Could not initialize order.');
      }

      const orderObj: ActivePendingOrder = {
        internalOrderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        razorpayOrderId: orderData.razorpayOrderId,
        amountPaise: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        keyId: orderData.keyId,
        itemsSignature: currentItemsSignature,
      };

      setActivePendingOrder(orderObj);
      await launchCheckoutForOrder(orderObj);
    } catch (err: any) {
      setPaymentError(err?.message || 'An error occurred during order initialization.');
      setIsProcessingOrder(false);
    }
  };

  // 5. Authenticated Payment Status Recovery Action
  const handleCheckPaymentStatus = async () => {
    if (!activePendingOrder || isCheckingStatus) return;

    setIsCheckingStatus(true);
    setRecoveryMessage('Querying Razorpay Gateway for latest payment status...');
    setPaymentError(null);

    try {
      const res = await fetch(`/api/ebooks/orders/${activePendingOrder.internalOrderId}/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        if (data.paymentStatus === 'paid' || data.status === 'paid') {
          validatedItems.forEach((it) => removeFromCart(it.book_id));
          router.push(`/checkout/success?orderId=${activePendingOrder.internalOrderId}`);
          return;
        } else if (data.paymentStatus === 'authorized') {
          setRecoveryMessage('Payment authorized by your bank. Awaiting automatic capture confirmation...');
        } else if (data.paymentStatus === 'failed') {
          setPaymentError(data.message || 'Payment attempt was declined by bank/provider.');
          setRecoveryMessage(null);
        } else {
          setRecoveryMessage(
            data.message || 'Payment has not yet completed. If you approved in UPI app, please allow a few seconds and check again.'
          );
        }
      } else {
        setPaymentError(data.error || 'Unable to check status from payment provider.');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Network error while checking status.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // ── Render Loading & Auth Guards ──
  if (isAuthLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Verifying customer identity...</h2>
        <p className="text-xs text-slate-500 mt-1">Checking secure session credentials</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-red-900">Checkout Authentication Blocked</h2>
          <p className="text-xs text-red-800 leading-relaxed">{authError}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/login?redirectTo=/checkout">
              <Button variant="primary" size="sm">
                Sign in with Verified Account
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

  if (storedItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Your shopping cart is empty</h2>
        <p className="text-xs text-slate-500">
          Add eBooks to your cart before proceeding to checkout.
        </p>
        <Link href="/e-books">
          <Button variant="primary" size="sm" className="mt-2">
            Explore eBook Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => setScriptLoadError(true)}
      />

      <div className="min-h-screen bg-[#FAF9FD] text-[#130B24] py-8 sm:py-12 px-4 sm:px-6 font-ebook">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Navigation & Header */}
          <div className="space-y-2">
            <Link
              href="/cart"
              className="inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Cart</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-100 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#130B24] tracking-tight">
                  Secure Checkout
                </h1>
                <p className="text-xs text-purple-900/60 mt-0.5">
                  Cards, Netbanking, UPI Intent & Dynamic QR payments with instant digital library access.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Test Mode Checkout</span>
              </div>
            </div>
          </div>

          {/* Script Loading Alert */}
          {scriptLoadError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold">Gateway Script Blocked or Network Error</p>
                <p className="text-xs text-amber-800">
                  The secure Razorpay checkout script could not be loaded. Please ensure ad-blockers or privacy extensions allow checkout.razorpay.com, or click retry.
                </p>
                <button
                  type="button"
                  onClick={handleRetryScriptLoad}
                  className="py-1 px-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Loading Gateway</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Alerts */}
          {paymentError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Payment Issue Encountered:</p>
                <p className="text-xs text-red-700">{paymentError}</p>
                <p className="text-[11px] text-red-600 pt-1">
                  Your cart and order items remain safe. You can retry payment when ready.
                </p>
              </div>
            </div>
          )}

          {validationError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Pricing Verification Required:</p>
                <p className="text-xs text-amber-800">{validationError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Order Review & Buyer Identity (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Buyer Identity Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#2563EB]" />
                  Customer Account Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Purchasing Account
                    </span>
                    <span className="font-semibold text-slate-800">{customer?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Delivery & Receipt Email
                    </span>
                    <span className="font-semibold text-slate-800">{customer?.email}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Verified customer identity: eBooks will be granted directly to this account.
                </p>
              </div>

              {/* Selected Items Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                    Items in Order ({validatedItems.length})
                  </p>
                  <Link
                    href="/cart"
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    Edit Cart
                  </Link>
                </div>

                {isValidatingCart ? (
                  <div className="py-6 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500">Revalidating prices with server...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {validatedItems.map((item) => (
                      <div key={item.book_id} className="py-3 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.version_name ? `Edition ${item.edition_number} (${item.version_name})` : `Edition ${item.edition_number}`}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              item.plan === 'read_download'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {item.plan_label}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.formatted_price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Access Terms */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900/80 space-y-1.5">
                <p className="font-bold text-[#130B24] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  Digital Purchase & Unlocking Agreement
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-purple-900/70">
                  <li>
                    <strong>Read Online:</strong> Grants lifetime distraction-free browser reader access to the purchased edition.
                  </li>
                  <li>
                    <strong>Read + Download:</strong> Grants online reader access plus offline PDF download permission.
                  </li>
                  <li>
                    Purchased editions remain permanently in your library shelf even if withdrawn from public sale.
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT COLUMN: Order Summary & Payment Button (5 cols) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-purple-100 p-5 sm:p-6 shadow-sm space-y-5">
                <h2 className="text-base font-bold text-[#130B24] border-b border-purple-100 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-purple-900/70">
                    <span>Subtotal ({validatedItems.length} items)</span>
                    <span className="font-semibold text-[#130B24]">{formattedTotal}</span>
                  </div>
                  <div className="flex justify-between text-purple-900/70">
                    <span>Digital Delivery & Unlocking</span>
                    <span className="font-semibold text-emerald-600">FREE / Instant</span>
                  </div>
                  <div className="flex justify-between text-purple-900/70">
                    <span>Estimated Taxes</span>
                    <span className="text-purple-400">Included</span>
                  </div>

                  <div className="pt-3 border-t border-purple-100 flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-bold text-[#130B24]">Total Payable</span>
                      <span className="text-[10px] text-purple-400 block font-normal">
                        Authoritative integer paise ({totalPaise} paise)
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-[#130B24]">
                      {formattedTotal}
                    </span>
                  </div>
                </div>

                {/* Supported Payment Channels */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-semibold text-[11px]">
                    <span>Payment Methods</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Standard Checkout</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                      <CreditCard className="w-3 h-3 text-slate-700" />
                      Cards & Netbanking (Active)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                      <Smartphone className="w-3 h-3 text-purple-600" />
                      UPI Intent (Mobile)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                      <QrCode className="w-3 h-3 text-purple-600" />
                      UPI QR (Desktop)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Razorpay Standard Checkout automatically presents active payment channels (Cards, Netbanking, and UPI) based on gateway activation and your device capabilities.
                  </p>
                </div>

                {/* Pending Payment Recovery Banner */}
                {activePendingOrder && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">Payment in Progress / Awaiting Confirmation</p>
                        <p className="text-[11px] text-purple-800">
                          Order <strong>#{activePendingOrder.orderNumber}</strong> ({formattedTotal}). If you completed payment in your UPI app or scanned the QR, click <strong>Check Payment Status</strong> below.
                        </p>
                        {recoveryMessage && (
                          <p className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                            {recoveryMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isCheckingStatus || isVerifyingPayment}
                        onClick={handleCheckPaymentStatus}
                        className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                      >
                        {isCheckingStatus ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking with Gateway...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Check Payment Status</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingOrder || isCheckingStatus}
                        onClick={() => launchCheckoutForOrder(activePendingOrder)}
                        className="py-2 px-3 bg-white hover:bg-slate-50 border border-purple-200 text-purple-900 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <span>Reopen Checkout</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment CTA Button */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={
                      isValidatingCart ||
                      validatedItems.length === 0 ||
                      isProcessingOrder ||
                      isVerifyingPayment ||
                      Boolean(validationError)
                    }
                    onClick={handleInitiatePayment}
                    className="btn-gold w-full min-h-[48px] py-3.5 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 touch-manipulation"
                  >
                    {isProcessingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay Checkout...</span>
                      </>
                    ) : isVerifyingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Signature & Granting Access...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay {formattedTotal} via Razorpay</span>
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-slate-400 text-center space-y-1">
                    <p className="flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      256-bit SSL encrypted checkout
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Razorpay Test Mode: No real funds charged
                    </p>
                  </div>
                </div>
              </div>

              {/* Guaranteed Safe Checkout Note */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-[#0B1D3A] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Instant Access Guarantee
                </p>
                <p>
                  Upon payment confirmation, digital entitlement rights are atomically attached to your account and immediately available in your digital library.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
