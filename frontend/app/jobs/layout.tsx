import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verified Fresher Jobs & Direct Placement Openings',
  description: 'Browse 500+ verified entry-level software engineer, analyst, and fresher job openings with direct application links to official company careers portals on KnowledgePaat.',
  alternates: {
    canonical: 'https://knowledgepaat.com/jobs',
  },
  openGraph: {
    title: 'Verified Fresher Jobs & Direct Openings | KnowledgePaat',
    description: 'Browse verified fresher and entry-level job openings with zero consultancies on KnowledgePaat.',
    url: 'https://knowledgepaat.com/jobs',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verified Fresher Jobs & Direct Openings | KnowledgePaat',
    description: 'Browse verified fresher job openings with direct company links on KnowledgePaat.',
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
