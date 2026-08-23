"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { 
  PackageCheck, 
  BookOpen, 
  FileText, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { StudentPurchase, PRODUCT_TYPE_LABELS } from '@/lib/store';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function StudentPurchasesPage() {
  const { isModuleEnabled } = useFeatureFlags();
  const isPurchasesEnabled = isModuleEnabled('student_purchases');

  const [purchases, setPurchases] = useState<StudentPurchase[]>([]);
  const [productNotesMap, setProductNotesMap] = useState<Map<string, string[]>>(new Map());
  const [isFetching, setIsFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (isPurchasesEnabled) {
      fetchPurchases();
    } else {
      setIsFetching(false);
    }
  }, [isPurchasesEnabled]);

  const fetchPurchases = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_purchases')
        .select(`
          *,
          product:product_id (*)
        `)
        .eq('student_id', user.id);

      if (error) throw error;
      
      const loadedPurchases = (data || []) as StudentPurchase[];
      const productIds = loadedPurchases.map((p: any) => p.product_id).filter(Boolean);

      // Fetch any attached notes relationships in store_product_notes
      const notesMap = new Map<string, string[]>();
      if (productIds.length > 0) {
        try {
          const { data: bundleData } = await supabase
            .from('store_product_notes')
            .select('product_id, note_id')
            .in('product_id', productIds);
          
          if (bundleData) {
            bundleData.forEach((bn: any) => {
              const existing = notesMap.get(bn.product_id) || [];
              existing.push(bn.note_id);
              notesMap.set(bn.product_id, existing);
            });
          }
        } catch {
          // Table may not have records or be optional
        }
      }

      setProductNotesMap(notesMap);

      const sorted = loadedPurchases.sort((a: any, b: any) => {
        const dateA = new Date(a.purchased_at || a.unlocked_at || a.created_at || 0).getTime();
        const dateB = new Date(b.purchased_at || b.unlocked_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setPurchases(sorted);
    } catch (err) {
      console.error("Error fetching student purchases:", err);
    } finally {
      setIsFetching(false);
    }
  };

  if (!isPurchasesEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="My Purchases Coming Soon"
          description="Your purchased study guides, question packs, and permanent digital assets repository is currently being prepared for rollout."
          icon={PackageCheck}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Purchases</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Access your permanently owned interview question packs, study notes, and master bundles.
            </p>
          </div>
          <Link href="/student/store">
            <Button variant="outline" size="sm" className="text-xs">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Browse Store
            </Button>
          </Link>
        </div>

        {/* PURCHASES LIST */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-12 text-center shadow-[var(--shadow-xs)]">
            <EmptyState 
              title="No purchases yet"
              description="You have not purchased any individual question packs or notes yet. You can explore the digital store anytime."
              action={
                <Link href="/student/store">
                  <Button size="sm" className="shadow-xs">Explore Digital Store</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchases.map(item => {
              const product = item.product;
              if (!product) return null;
              const typeMeta = PRODUCT_TYPE_LABELS[product.product_type];
              const attachedNoteIds = productNotesMap.get(product.id) || [];
              
              // Determine optimal target route for purchased study materials
              let targetRoute = '/student/notes';
              if (product.item_reference_id) {
                targetRoute = `/student/notes?noteId=${encodeURIComponent(product.item_reference_id)}`;
              } else if (attachedNoteIds.length === 1) {
                targetRoute = `/student/notes?noteId=${encodeURIComponent(attachedNoteIds[0])}`;
              } else if (attachedNoteIds.length > 1 || product.product_type === 'note_bundle' || product.product_type === 'interview_bundle') {
                targetRoute = `/student/notes?bundleId=${encodeURIComponent(product.id)}`;
              } else {
                targetRoute = `/student/notes?noteId=${encodeURIComponent(product.id)}`;
              }

              return (
                <div 
                  key={item.id}
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between hover:border-[var(--color-brand-300)] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta?.color} ${typeMeta?.textColor} ${typeMeta?.border}`}>
                        {typeMeta?.label}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Lifetime Access
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug mb-1.5">
                      {product.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Purchased {new Date(item.purchased_at || item.unlocked_at || item.created_at || Date.now()).toLocaleDateString()}
                    </span>

                    <Link href={targetRoute}>
                      <Button variant="primary" size="sm" className="text-xs shadow-xs">
                        Open Resource <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </StudentLayout>
  );
}
