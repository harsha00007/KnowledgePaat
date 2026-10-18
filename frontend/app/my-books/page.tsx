import React from 'react';
import { Metadata } from 'next';
import { PublicLayout } from '@/layouts/PublicLayout';
import { MyBooksClient } from './MyBooksClient';

export const metadata: Metadata = {
  title: 'My Books — KnowledgePaat Digital Library',
  description: 'View your purchased eBooks, active access tiers, reading progress, and digital library shelf on KnowledgePaat.',
};

export default function MyBooksPage() {
  return (
    <PublicLayout>
      <MyBooksClient />
    </PublicLayout>
  );
}
