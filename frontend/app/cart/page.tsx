import React from 'react';
import type { Metadata } from 'next';
import { EBookLayout } from '@/layouts/EBookLayout';
import { CartClient } from './CartClient';

export const metadata: Metadata = {
  title: 'Your Shopping Cart — KnowledgePaat eBooks',
  description: 'Review your selected KnowledgePaat technical eBooks and access plans before proceeding to checkout.',
  robots: {
    index: false, // Cart pages should not be indexed by search engines
    follow: false,
  },
};

export default function CartPage() {
  return (
    <EBookLayout>
      <CartClient />
    </EBookLayout>
  );
}
