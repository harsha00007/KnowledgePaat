import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { EBookLayout } from '@/layouts/EBookLayout';
import { SuccessClient } from './SuccessClient';

export const metadata: Metadata = {
  title: 'Order Confirmation — KnowledgePaat eBook Store',
  description: 'Your eBook purchase confirmation and library unlocking status.',
};

export default function CheckoutSuccessPage() {
  return (
    <EBookLayout>
      <Suspense fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Loading order confirmation...</h2>
        </div>
      }>
        <SuccessClient />
      </Suspense>
    </EBookLayout>
  );
}
