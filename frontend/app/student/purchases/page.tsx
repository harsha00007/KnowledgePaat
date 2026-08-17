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

export default function StudentPurchasesPage() {
  const [purchases, setPurchases] = useState<StudentPurchase[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchPurchases();
  }, []);

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
      
      const sorted = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.purchased_at || a.unlocked_at || a.created_at || 0).getTime();
        const dateB = new Date(b.purchased_at || b.unlocked_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setPurchases(sorted as StudentPurchase[]);
    } catch (err) {
      console.error("Error fetching student purchases:", err);
    } finally {
      setIsFetching(false);
    }
  };

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
              const isNote = product.product_type === 'note' || product.product_type === 'note_bundle';
              const targetRoute = isNote ? '/student/notes' : '/student/interview-preparation';

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
