"use client";

import React from 'react';
import { Button } from '@/components/Button';
import { 
  StoreProduct, 
  PRODUCT_TYPE_LABELS 
} from '@/lib/store';
import { 
  ShoppingBag, 
  Check, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  Layers, 
  Tag,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export interface StoreProductCardProps {
  product: StoreProduct;
  isOwned: boolean;
  isInCart: boolean;
  onAddToCart: (product: StoreProduct) => void;
  isAdding?: boolean;
}

export function StoreProductCard({
  product,
  isOwned,
  isInCart,
  onAddToCart,
  isAdding = false
}: StoreProductCardProps) {
  const typeMeta = PRODUCT_TYPE_LABELS[product.product_type] || {
    label: 'Digital Product',
    color: 'bg-slate-50',
    textColor: 'text-slate-700',
    border: 'border-slate-200'
  };

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <div className={`rounded-[var(--radius-xl)] bg-white border p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] transition-all relative ${
      isOwned 
        ? 'border-emerald-200 bg-emerald-50/20' 
        : 'border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-sm)]'
    }`}>
      
      {/* Top Badge & Discount */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.color} ${typeMeta.textColor} ${typeMeta.border}`}>
            {typeMeta.label}
          </span>

          {discountPercent && !isOwned && (
            <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {discountPercent}% OFF
            </span>
          )}

          {isOwned && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Owned
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug mb-1.5 line-clamp-2">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 mb-4 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Pricing and Action */}
      <div className="pt-3.5 border-t border-[var(--color-border)]">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-xl font-extrabold text-[var(--color-text-primary)]">
              ₹{product.price}
            </span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-xs text-[var(--color-text-tertiary)] line-through ml-1.5 font-medium">
                ₹{product.original_price}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
            One-time purchase
          </span>
        </div>

        {isOwned ? (
          <Link 
            href={
              product.product_type === 'note' || product.product_type === 'note_bundle'
                ? '/student/notes'
                : '/student/interview-preparation'
            }
            className="block w-full"
          >
            <Button variant="outline" size="sm" className="w-full justify-center text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <Check className="w-3.5 h-3.5 mr-1" /> Access Content
            </Button>
          </Link>
        ) : isInCart ? (
          <Link href="/student/cart" className="block w-full">
            <Button variant="outline" size="sm" className="w-full justify-center text-xs text-[var(--color-brand-600)] border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]">
              View in Cart →
            </Button>
          </Link>
        ) : (
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => onAddToCart(product)}
            disabled={isAdding}
            className="w-full justify-center text-xs shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            {isAdding ? 'Adding...' : `Buy for ₹${product.price}`}
          </Button>
        )}
      </div>

    </div>
  );
}
