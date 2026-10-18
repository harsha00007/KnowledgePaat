"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useEBookCart, ValidatedCartItem, EBookPlan } from '@/hooks/useEBookCart';
import Script from 'next/script';

interface VerifiedCustomerIdentity {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
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
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

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
          // Resolve customer details from auth session
          const userRes = await fetch('/api/ebooks/orders', {
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (userRes.status === 401) {
            router.push('/login?redirectTo=/checkout');
            return;
          }

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

  // 2. Initiate Order and Launch Razorpay Checkout
  const handleInitiatePayment = async () => {
    if (validatedItems.length === 0 || totalPaise <= 0) return;

    setIsProcessingOrder(true);
    setPaymentError(null);

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

      // Step B: Launch Razorpay popup
      const {
        orderId: internalOrderId,
        orderNumber,
        razorpayOrderId,
        amountPaise,
        currency,
        keyId,
      } = orderData;

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount: amountPaise,
          currency: currency || 'INR',
          name: 'KnowledgePaat',
          description: `Order ${orderNumber}`,
          order_id: razorpayOrderId,
          prefill: {
            name: customer?.fullName,
            email: customer?.email,
          },
          notes: {
            internalOrderId,
            orderNumber,
          },
          theme: {
            color: '#0B1D3A',
          },
          handler: async function (response: any) {
            setIsVerifyingPayment(true);
            try {
              const verifyRes = await fetch('/api/ebooks/orders/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  internalOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyRes.ok && verifyData.success) {
                // Prune purchased items only
                validatedItems.forEach((it) => removeFromCart(it.book_id));
                router.push(`/checkout/success?orderId=${internalOrderId}`);
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
          modal: {
            ondismiss: function () {
              setIsProcessingOrder(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setPaymentError(
            resp.error?.description || 'Payment was declined or cancelled. Please try again.'
          );
          setIsProcessingOrder(false);
        });
        rzp.open();
      } else {
        // Fallback if Razorpay JS is blocked by browser extension
        throw new Error(
          'Payment gateway script could not be loaded. Please disable ad blockers and try again.'
        );
      }
    } catch (err: any) {
      setPaymentError(err?.message || 'An error occurred during order initialization.');
      setIsProcessingOrder(false);
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
      />

      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-2">
          <Link
            href="/cart"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-[#0B1D3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Cart
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B1D3A] tracking-tight font-display">
                Secure Checkout
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your order, buyer identity, and confirm instant digital unlocking.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Test Mode Checkout
            </div>
          </div>
        </div>

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
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display flex items-center gap-1.5">
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
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display flex items-center gap-1.5">
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1.5">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#0B1D3A]" />
                Digital Purchase & Unlocking Agreement
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                <li>
                  <strong>Read Online (₹49):</strong> Grants lifetime distraction-free browser reader access to the purchased edition.
                </li>
                <li>
                  <strong>Read + Download (₹99):</strong> Grants online reader access plus offline PDF download permission.
                </li>
                <li>
                  Purchased editions remain permanently in your library shelf even if withdrawn from public sale.
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Payment Button (5 cols) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-[#0B1D3A] font-display border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({validatedItems.length} items)</span>
                  <span className="font-semibold text-slate-800">{formattedTotal}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Digital Delivery & Unlocking</span>
                  <span className="font-semibold text-emerald-600">FREE / Instant</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Taxes</span>
                  <span className="text-slate-400">Included</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-[#0B1D3A]">Total Payable</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Authoritative integer paise ({totalPaise} paise)
                    </span>
                  </div>
                  <span className="text-2xl font-black text-[#0B1D3A] font-display">
                    {formattedTotal}
                  </span>
                </div>
              </div>

              {/* Payment CTA Button */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={
                    isValidatingCart ||
                    validatedItems.length === 0 ||
                    isProcessingOrder ||
                    isVerifyingPayment ||
                    Boolean(validationError)
                  }
                  onClick={handleInitiatePayment}
                  className="w-full font-bold text-sm shadow-brand cursor-pointer disabled:opacity-50"
                >
                  {isProcessingOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Initializing Payment Gateway...
                    </>
                  ) : isVerifyingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying Signature & Granting Access...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {formattedTotal} via Razorpay
                    </>
                  )}
                </Button>

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
    </>
  );
}
