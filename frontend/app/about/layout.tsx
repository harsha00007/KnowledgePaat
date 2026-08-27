import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About KnowledgePaat | From Knowledge to Opportunity',
  description: 'Learn about KnowledgePaat mission to bridge the gap between fresh graduates and corporate career breakthroughs through verified jobs, curated prep, and AI simulations.',
  alternates: {
    canonical: 'https://knowledgepaat.com/about',
  },
  openGraph: {
    title: 'About KnowledgePaat — Bridging Skills to Opportunity',
    description: 'Learn about KnowledgePaat mission to empower ambitious students and job seekers nationwide.',
    url: 'https://knowledgepaat.com/about',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About KnowledgePaat — Bridging Skills to Opportunity',
    description: 'Empowering fresh graduates with verified jobs and AI interview prep on KnowledgePaat.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
