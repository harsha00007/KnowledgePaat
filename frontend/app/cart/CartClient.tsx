"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Laptop,
  Download,
  Lock,
  Clock
} from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { useEBookCart, ValidatedCartItem, EBookPlan } from '@/lib/ebook/cartContext';
import { useFeatureFlags } from '@/context/FeatureFlagContext';

export function CartClient() {
  const router = useRouter();
  const { isFeatureEnabled } = useFeatureFlags();
  const isCheckoutEnabled = isFeatureEnabled('ebook_checkout');

  const {
    isHydrated,
    isLoading,
    isValidating,
    validationStatus,
    validationError,
    cartCount,
    storedItems,
    validatedItems,
    totalPaise,
    formattedTotal,
    warnings,
    updatePlan,
    removeFromCart,
    clearCart,
    revalidateCart,
  } = useEBookCart();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // During SSR or initial hydration, display clean skeleton
  if (!isHydrated || (isLoading && storedItems.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Truly empty cart (no stored items)
  if (storedItems.length === 0 && validatedItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8 text-[#2563EB]" />}
          title="Your eBook Shopping Cart is Empty"
          description="Browse our curated technical catalogue to discover comprehensive engineering, system design, and career guides."
          action={
            <Link href="/e-books">
              <Button variant="primary" size="md" className="shadow-brand">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Explore eBooks Bookstore
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isValidationFailed = validationStatus === 'error';
  const isReadyForCheckout = validationStatus === 'validated' && !isValidating && validatedItems.length > 0;

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#130B24] py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#130B24]">
                Shopping Cart
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-800 border border-amber-400/30 font-display">
                {cartCount} {cartCount === 1 ? 'Book' : 'Books'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-900/60 font-medium mt-1">
              Authoritative server pricing verified directly against published editions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={revalidateCart}
              disabled={isValidating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-semibold text-purple-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
              <span>Revalidate Prices</span>
            </button>

            <Link href="/e-books#catalogue">
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Continue Browsing</span>
              </button>
            </Link>
          </div>
        </div>

        {/* ── VALIDATION ERROR BANNER ─────────────────────────────── */}
        {isValidationFailed && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Live pricing verification could not be completed:</p>
              <p className="text-xs text-red-700">
                {validationError || 'Unable to verify server prices. Please check your network connection.'}
              </p>
              <p className="text-xs text-red-600 font-medium pt-0.5">
                Checkout is disabled until prices are authoritatively verified by the server.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={revalidateCart}
                className="mt-2 text-xs border-red-300 text-red-800 hover:bg-red-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry Verification
              </Button>
            </div>
          </div>
        )}

        {/* ── NOTICES / WARNINGS BANNER ───────────────────────────── */}
        {warnings.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Notice regarding your cart items:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-800">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── TWO-COLUMN CART LAYOUT ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Cart Line Items (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {validatedItems.length > 0 ? (
              validatedItems.map((item) => (
                <CartItemCard
                  key={item.book_id}
                  item={item}
                  onUpdatePlan={(newPlan) => updatePlan(item.book_id, newPlan)}
                  onRemove={() => removeFromCart(item.book_id)}
                />
              ))
            ) : (
              /* Fallback cards for stored items when server validation failed */
              storedItems.map((st) => (
                <div key={st.bookId} className="bg-white rounded-2xl border border-red-200/80 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 font-display">Book ID: {st.bookId}</p>
                    <p className="text-xs text-slate-500">Plan: {st.plan === 'read_download' ? 'Read + Download (PDF)' : 'Read Online'}</p>
                    <p className="text-xs text-red-600 font-medium">Server price unverified — click Revalidate Prices to refresh</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(st.bookId)}
                    className="text-slate-400 hover:text-red-600 p-2 rounded-lg transition-colors cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            {/* Clear Cart Trigger */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all items from cart
              </button>
            </div>
          </div>

          {/* RIGHT: Order Summary Card (4 Cols) */}
          <div className="lg:col-span-4 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-bold text-[#0B1D3A] font-display border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[#0B1D3A]">
                    {isReadyForCheckout ? formattedTotal : (isValidationFailed ? '—' : 'Verifying...')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>Taxes & GST</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>Digital Delivery</span>
                  <span className="text-emerald-600 font-semibold">Instant Access</span>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#0B1D3A]">Total Amount</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#0B1D3A] font-display">
                      {isReadyForCheckout ? formattedTotal : (isValidationFailed ? '—' : 'Verifying...')}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {isReadyForCheckout ? 'Server-verified total (INR)' : isValidationFailed ? 'Pricing unverified' : 'Updating from server...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkout CTA: strictly disabled when prices are unverified */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={!isReadyForCheckout}
                  onClick={() => {
                    if (isCheckoutEnabled) {
                      router.push('/checkout');
                    } else {
                      setCheckoutModalOpen(true);
                    }
                  }}
                  className="btn-gold w-full py-3.5 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isReadyForCheckout
                      ? `Proceed to Checkout (${formattedTotal})`
                      : isValidationFailed
                      ? 'Checkout Unavailable (Verification Failed)'
                      : 'Verifying Pricing...'}
                  </span>
                </button>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                  {isReadyForCheckout ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-700 font-semibold">Server-verified pricing</span>
                    </>
                  ) : isValidationFailed ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-600 font-semibold">Price verification failed — checkout unavailable</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      <span className="text-slate-500 font-medium">Verifying live server pricing...</span>
                    </>
                  )}
                </p>
              </div>

              {/* Upgrade Info Reminder */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-[#0B1D3A] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Flexible Upgrade Guarantee
                </p>
                <p>
                  Any book purchased with <em>Read Online</em> can later be upgraded to include PDF downloads for just ₹50.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── CONFIRM CLEAR CART MODAL ──────────────────────────────── */}
      <Modal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear Shopping Cart?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove all {cartCount} {cartCount === 1 ? 'book' : 'books'} from your shopping cart?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                clearCart();
                setConfirmClearOpen(false);
              }}
            >
              Yes, Clear Cart
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CHECKOUT MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={isCheckoutEnabled ? "Review Order & Checkout" : "Digital Checkout In Preparation"}
      >
        <div className="space-y-5">
          {/* Gated feature notification */}
          {!isCheckoutEnabled ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs sm:text-sm text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#2563EB]" />
                Online Checkout Coming Soon
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Online payment capture and instant digital unlocking for eBooks are currently in active preparation and will be enabled shortly.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed pt-1">
                Your selected titles and chosen plans remain saved in your browser cart. Sign in to your account to continue.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900">
              <p className="font-bold">Please review your order before payment.</p>
            </div>
          )}

          {/* Selected Line Items Overview */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
              Selected Titles & Access Plans
            </p>
            <div className="space-y-1 text-xs">
              {validatedItems.map((item) => (
                <div key={item.book_id} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-none">
                  <div>
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <span className="text-[11px] text-slate-500 ml-2 font-medium">({item.plan_label})</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.formatted_price}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-bold text-sm text-[#0B1D3A] border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-base font-black text-[#0B1D3A] font-display">{formattedTotal}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Link href="/login?redirectTo=/cart" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full text-xs font-semibold shadow-brand">
                Sign in to continue
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheckoutModalOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Keep Reviewing Cart
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

/**
 * Individual Cart Line Item Card with Plan Selector
 */
function CartItemCard({
  item,
  onUpdatePlan,
  onRemove,
}: {
  item: ValidatedCartItem;
  onUpdatePlan: (plan: EBookPlan) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
      {/* Cover thumbnail */}
      <div className="w-20 sm:w-24 aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#0B1D3A] text-white p-2 flex flex-col justify-between text-[9px]">
            <p className="font-bold line-clamp-3">{item.title}</p>
            <p className="text-slate-400 truncate">{item.author}</p>
          </div>
        )}
      </div>

      {/* Details & Plan Selector */}
      <div className="flex-1 min-w-0 space-y-3 w-full">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0B1D3A] font-display hover:text-[#2563EB] transition-colors truncate">
              <Link href={`/e-books/${item.slug || item.book_id}`}>
                {item.title}
              </Link>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              by {item.author} • <span className="text-slate-700 font-semibold">Ed. {item.edition_number}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Plan Selector Buttons (1 item per book constraint) */}
        <div className="pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display block mb-1.5">
            Selected Access Tier
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Read Online */}
            <button
              type="button"
              onClick={() => onUpdatePlan('read_online')}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                item.plan === 'read_online'
                  ? 'border-purple-600 bg-purple-50/60 text-[#130B24] shadow-2xs font-semibold'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Laptop className={`w-4 h-4 ${item.plan === 'read_online' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-xs">Read Online</span>
              </div>
              <span className="text-xs font-bold font-display">
                {item.plan === 'read_online' ? item.formatted_price : 'Online'}
              </span>
            </button>

            {/* Read + Download */}
            <button
              type="button"
              onClick={() => onUpdatePlan('read_download')}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                item.plan === 'read_download'
                  ? 'border-purple-600 bg-purple-50/60 text-[#130B24] shadow-2xs font-semibold'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className={`w-4 h-4 ${item.plan === 'read_download' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-xs">Read + PDF</span>
              </div>
              <span className="text-xs font-bold font-display">
                {item.plan === 'read_download' ? item.formatted_price : 'Online + PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
