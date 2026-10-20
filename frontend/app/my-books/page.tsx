import React from 'react';
import { Metadata } from 'next';
import { EBookLayout } from '@/layouts/EBookLayout';
import { MyBooksClient } from './MyBooksClient';

export const metadata: Metadata = {
  title: 'My Books — KnowledgePaat Digital Library',
  description: 'View your purchased eBooks, active access tiers, reading progress, and digital library shelf on KnowledgePaat.',
};

export default function MyBooksPage() {
  return (
    <EBookLayout>
      <MyBooksClient />
    </EBookLayout>
  );
}
