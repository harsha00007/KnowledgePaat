import React from 'react';
import { Metadata } from 'next';
import { EBookLayout } from '@/layouts/EBookLayout';
import { CheckoutClient } from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout — KnowledgePaat eBook Store',
  description: 'Authoritative checkout and instant digital unlocking for KnowledgePaat eBooks.',
};

export default function CheckoutPage() {
  return (
    <EBookLayout>
      <CheckoutClient />
    </EBookLayout>
  );
}
