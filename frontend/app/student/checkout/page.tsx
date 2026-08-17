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
  PackageCheck
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useCart } from '@/hooks/useCart';

export default function StudentCheckoutPage() {
  const router = useRouter();
  const { cartItems, totalAmount, isLoading, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  // If cart is empty and no completed order, return to cart
  useEffect(() => {
    if (!isLoading && cartItems.length === 0 && !orderSuccess) {
      router.push('/student/cart');
    }
  }, [isLoading, cartItems, orderSuccess, router]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage("Please log in to complete your purchase.");
        return;
      }

      if (cartItems.length === 0) {
        setErrorMessage("Your cart is empty.");
        return;
      }

      // 1. Create order record with 'paid' status for simulated checkout
      let orderPayload: any = {
        student_id: user.id,
        total_amount: totalAmount,
        status: 'completed',
        order_status: 'completed',
        payment_status: 'paid',
        payment_method: 'simulated'
      };

      let { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      // If specific column is missing in older schema, retry with minimal standard columns
      if (orderError) {
        const simplifiedPayload = {
          student_id: user.id,
          total_amount: totalAmount,
          status: 'completed'
        };
        const retry = await supabase
          .from('orders')
          .insert(simplifiedPayload)
          .select()
          .single();

        orderData = retry.data;
        orderError = retry.error;
      }

      if (orderError || !orderData) throw orderError || new Error("Failed to create order.");

      // 2. Create order items
      const orderItemsPayload = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        price: item.product?.price || 0
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      // 3. Create permanent student_purchases entries
      const purchasesPayload = cartItems.map(item => ({
        student_id: user.id,
        product_id: item.product_id,
        order_id: orderData.id
      }));

      // Upsert student purchases
      const { error: purchasesError } = await supabase
        .from('student_purchases')
        .upsert(purchasesPayload, { onConflict: 'student_id,product_id' });

      if (purchasesError) throw purchasesError;

      // 4. Clear the cart
      await clearCart();

      // 5. Set success state
      setOrderSuccess({
        orderId: orderData.id,
        itemsCount: cartItems.length,
        total: totalAmount,
        date: new Date().toLocaleDateString()
      });
    } catch (err: any) {
      console.error("Payment simulation failed:", err);
      setErrorMessage(err.message || "Failed to process checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        
        {/* SUCCESS CONFIRMATION SCREEN */}
        {orderSuccess ? (
          <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8 sm:p-12 text-center shadow-[var(--shadow-xs)] space-y-6">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
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
              <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-lg)] text-xs font-semibold">
                {errorMessage}
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

              {/* Payment Box & Test Simulation */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total Amount</span>
                  <p className="text-2xl font-extrabold text-[var(--color-brand-600)] mt-1">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>

                {/* Local Test Simulation Box */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-[var(--radius-lg)] space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Test Checkout Mode</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Clicking below will simulate an instantaneous test payment and immediately grant permanent access to these products.
                  </p>
                </div>

                <Button 
                  variant="primary" 
                  size="md" 
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full justify-center text-xs shadow-xs"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  {isProcessing ? 'Processing Order...' : `Pay ₹${totalAmount.toFixed(2)} (Test)`}
                </Button>

                <div className="text-[10px] text-[var(--color-text-tertiary)] text-center">
                  Encrypted & secure checkout simulation.
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}
