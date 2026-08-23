import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us & Student Support',
  description: 'Have questions about placement preparation, study notes, or membership plans? Contact the KnowledgePaat support team.',
  alternates: {
    canonical: 'https://www.knowledgepaat.com/contact',
  },
  openGraph: {
    title: 'Contact KnowledgePaat | Student Support',
    description: 'Get in touch with the KnowledgePaat team for support, partnerships, or feedback.',
    url: 'https://www.knowledgepaat.com/contact',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact KnowledgePaat | Student Support',
    description: 'Get in touch with KnowledgePaat support.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
