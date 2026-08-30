"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  ShoppingBag,
  Clock,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';
import { launchRazorpayCheckout } from '@/lib/razorpayClient';

export default function StudentCheckoutPage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isStoreEnabled = isModuleEnabled('student_store');
  const router = useRouter();
  const { cartItems, totalAmount, isLoading, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isStoreEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Checkout & Payment Coming Soon"
          description="Direct digital checkout and store transactions are currently being prepared for rollout."
          icon={CreditCard}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  // If cart is empty and no completed order, return to cart
  useEffect(() => {
    if (!isLoading && cartItems.length === 0 && !orderSuccess) {
      router.push('/student/cart');
    }
  }, [isLoading, cartItems, orderSuccess, router]);

  const handleRazorpayCartCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (cartItems.length === 0) {
        setErrorMessage("Your cart is empty.");
        setIsProcessing(false);
        return;
      }

      // 1. Create order on server (server calculates official sum from store_products)
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'store_cart',
          productIds: cartItems.map(i => i.product_id)
        })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize checkout order.');
      }

      // 2. Launch Razorpay Test Mode Checkout
      await launchRazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: orderData.name || 'KnowledgePaat Store',
        description: orderData.description || `Purchase of ${cartItems.length} study items`,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        notes: orderData.notes,
        handler: async (response) => {
          try {
            // 3. Verify payment signature on server
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                internalOrderId: orderData.internalOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderType: 'store_cart'
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              await clearCart();
              setOrderSuccess({
                orderId: orderData.internalOrderId,
                paymentId: response.razorpay_payment_id,
                itemsCount: cartItems.length,
                total: totalAmount,
                date: new Date().toLocaleDateString()
              });
            } else {
              setErrorMessage(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            setErrorMessage(err.message || 'Error verifying payment.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Failed to process checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        
        {/* SUCCESS CONFIRMATION SCREEN */}
        {orderSuccess ? (
          <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8 sm:p-12 text-center shadow-[var(--shadow-xs)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                Payment Verified • Razorpay Test Mode
              </span>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Order Completed Successfully!
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 max-w-md mx-auto">
                Thank you for your purchase. Your digital products are now permanently unlocked in your account.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Order ID:</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">{orderSuccess.orderId.slice(0, 8)}...</span>
              </div>
              {orderSuccess.paymentId && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Payment ID:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{orderSuccess.paymentId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Items Purchased:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{orderSuccess.itemsCount} digital item(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Amount Paid:</span>
                <span className="font-extrabold text-emerald-700">₹{orderSuccess.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Status:</span>
                <span className="font-bold text-emerald-700">PAID & COMPLETED</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/student/purchases">
                <Button variant="primary" size="md" className="w-full sm:w-auto text-xs shadow-xs">
                  <PackageCheck className="w-4 h-4 mr-1.5" /> View My Purchases
                </Button>
              </Link>
              <Link href="/student/store">
                <Button variant="outline" size="md" className="w-full sm:w-auto text-xs">
                  Back to Store
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM */
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Checkout & Confirmation</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
                  Review items and confirm your order.
                </p>
              </div>
              <Link href="/student/cart">
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Cart
                </Button>
              </Link>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-[var(--radius-lg)] text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Order Items Review */}
              <div className="md:col-span-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] pb-2 border-b border-[var(--color-border)]">
                  Products in this Order ({cartItems.length})
                </h2>

                <div className="divide-y divide-[var(--color-border)]">
                  {cartItems.map(item => (
                    <div key={item.id} className="py-3 flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{item.product?.title}</h4>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase font-semibold mt-0.5">
                          {item.product?.product_type.replace('_', ' ')} • Lifetime Access
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        ₹{item.product?.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Box & Test Checkout */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Amount</span>
                  <p className="text-2xl font-extrabold text-[var(--color-brand-600)] mt-1">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>

                {/* Razorpay Test Mode Badge Notice */}
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-[var(--radius-lg)] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <span>Razorpay Test Mode</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Test gateway active. Complete checkout with test UPI ID or QR Code. No real money will be charged.
                  </p>
                </div>

                <Button 
                  variant="primary" 
                  size="md" 
                  onClick={handleRazorpayCartCheckout}
                  disabled={isProcessing || cartItems.length === 0}
                  className="w-full justify-center text-xs shadow-xs font-bold"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  {isProcessing ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Connecting to Razorpay...
                    </>
                  ) : (
                    `Pay ₹${totalAmount.toFixed(2)} with Razorpay (Test)`
                  )}
                </Button>

                <div className="text-[10px] text-[var(--color-text-tertiary)] text-center">
                  Encrypted & secure Razorpay test checkout.
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}
