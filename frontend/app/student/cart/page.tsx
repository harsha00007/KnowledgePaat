"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { 
  ShoppingCart, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { PRODUCT_TYPE_LABELS } from '@/lib/store';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function StudentCartPage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isStoreEnabled = isModuleEnabled('student_store');
  const router = useRouter();
  const { cartItems, totalAmount, isLoading, removeFromCart } = useCart();

  if (!isStoreEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Digital Store & Cart Coming Soon"
          description="Curated interview packs, high-yield study materials, and direct checkout are currently being prepared for rollout."
          icon={ShoppingCart}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Your Shopping Cart</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Review your selected digital study guides and interview packs.
            </p>
          </div>
          <Link href="/student/store">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Continue Shopping
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-12 text-center shadow-[var(--shadow-xs)]">
            <EmptyState 
              title="Your cart is empty"
              description="Explore our store for technical question packs, aptitude formula handbooks, and revision bundles."
              action={
                <Link href="/student/store">
                  <Button size="sm" className="shadow-xs">Explore Store</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* CART ITEMS LIST (2 COLS ON LG) */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map((item) => {
                const product = item.product;
                if (!product) return null;
                const typeMeta = PRODUCT_TYPE_LABELS[product.product_type];

                return (
                  <div 
                    key={item.id}
                    className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex items-start justify-between gap-4 transition-all hover:border-[var(--color-brand-200)]"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${typeMeta?.color} ${typeMeta?.textColor} ${typeMeta?.border}`}>
                          {typeMeta?.label}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          Permanent Access
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
                        {product.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                      <span className="text-base font-extrabold text-[var(--color-text-primary)]">
                        ₹{product.price}
                      </span>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ORDER SUMMARY (1 COL) */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-4">
              <h2 className="text-base font-bold text-[var(--color-text-primary)] pb-3 border-b border-[var(--color-border)]">
                Order Summary
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Items ({cartItems.length})</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Taxes & Handling</span>
                  <span className="text-emerald-600 font-semibold">₹0.00 (Free)</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Delivery Method</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">Instant Digital Download</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex justify-between items-baseline">
                <span className="font-bold text-sm text-[var(--color-text-primary)]">Total Amount</span>
                <span className="text-2xl font-extrabold text-[var(--color-brand-600)]">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <Button 
                variant="primary" 
                size="md" 
                onClick={() => router.push('/student/checkout')}
                className="w-full justify-center text-xs shadow-xs"
              >
                Proceed to Checkout <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>

              <div className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--color-brand-600)] shrink-0 mt-0.5" />
                <span>All purchases grant lifetime access to downloaded files and interview questions.</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}
