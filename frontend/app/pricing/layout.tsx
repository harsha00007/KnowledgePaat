import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparent Pricing Plans & Subscriptions',
  description: 'Choose flexible subscription plans designed for fresher placement success. Access verified jobs, practice question banks, and AI mock interview simulations on KnowledgePaat.',
  alternates: {
    canonical: 'https://knowledgepaat.com/pricing',
  },
  openGraph: {
    title: 'Transparent Pricing Plans | KnowledgePaat',
    description: 'Flexible monthly plans for fresher placement success on KnowledgePaat.',
    url: 'https://knowledgepaat.com/pricing',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Transparent Pricing Plans | KnowledgePaat',
    description: 'Compare affordable subscription plans on KnowledgePaat.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
