"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { StoreProductCard } from '@/components/StoreProductCard';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Layers,
  ArrowRight,
  PackageCheck
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  StoreProduct, 
  getStoreProducts, 
  getStudentPurchasedProductIds 
} from '@/lib/store';
import { useCart } from '@/hooks/useCart';

export default function StudentStorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();
  const { cartItems, addToCart } = useCart();

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const prods = await getStoreProducts(supabase);
      setProducts(prods);

      if (user) {
        const owned = await getStudentPurchasedProductIds(supabase, user.id);
        setOwnedProductIds(owned);
      }
    } catch (err) {
      console.error("Error loading store data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddToCart = async (product: StoreProduct) => {
    setAddingId(product.id);
    const res = await addToCart(product);
    setAddingId(null);

    if (res.success) {
      setFeedbackMsg({ text: `"${product.title}" added to your cart!`, type: 'success' });
    } else {
      setFeedbackMsg({ text: res.message || 'Could not add to cart.', type: 'error' });
    }

    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const cartProductIds = new Set(cartItems.map(item => item.product_id));

  // Filter products
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      p.title.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query);

    let matchesCategory = true;
    if (categoryFilter === 'questions') {
      matchesCategory = p.product_type === 'question_pack';
    } else if (categoryFilter === 'notes') {
      matchesCategory = p.product_type === 'note';
    } else if (categoryFilter === 'bundles') {
      matchesCategory = p.product_type === 'note_bundle' || p.product_type === 'interview_bundle';
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">GradZenX Store</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Unlock exactly what you need for your career preparation without recurring subscriptions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/student/purchases">
              <Button variant="outline" size="sm" className="text-xs">
                <PackageCheck className="w-3.5 h-3.5 mr-1.5" /> My Purchases ({ownedProductIds.size})
              </Button>
            </Link>
            <Link href="/student/cart">
              <Button variant="primary" size="sm" className="text-xs shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Cart ({cartItems.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {feedbackMsg && (
          <div className={`p-3.5 rounded-[var(--radius-lg)] border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
            <Link href="/student/cart" className="underline font-bold text-emerald-900 hover:text-emerald-950">
              Proceed to Cart →
            </Link>
          </div>
        )}

        {/* CATEGORY TABS & SEARCH */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search question packs, notes & bundles..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'questions', label: 'Interview Questions' },
                { id: 'notes', label: 'Study Notes' },
                { id: 'bundles', label: 'Bundles' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-300)] shadow-xs'
                      : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* PRODUCTS GRID */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState 
            title="No store products found"
            description="Try changing your search query or choosing a different category filter."
            action={<Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>Clear Filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map(prod => (
              <StoreProductCard 
                key={prod.id}
                product={prod}
                isOwned={ownedProductIds.has(prod.id)}
                isInCart={cartProductIds.has(prod.id)}
                onAddToCart={handleAddToCart}
                isAdding={addingId === prod.id}
              />
            ))}
          </div>
        )}

      </div>
    </StudentLayout>
  );
}
