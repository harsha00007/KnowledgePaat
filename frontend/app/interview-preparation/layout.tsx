import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interview Preparation Hub & Practice Question Bank',
  description: 'Master technical, HR, and aptitude interviews with 1,500+ curated practice questions, model answers, core concept explanations, and timed assessments on KnowledgePaat.',
  alternates: {
    canonical: 'https://knowledgepaat.com/interview-preparation',
  },
  openGraph: {
    title: 'Interview Preparation Hub & Question Bank | KnowledgePaat',
    description: 'Master technical, HR, and aptitude interviews with 1,500+ curated practice questions on KnowledgePaat.',
    url: 'https://knowledgepaat.com/interview-preparation',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interview Preparation Hub & Question Bank | KnowledgePaat',
    description: 'Prepare for campus placements and technical interviews with KnowledgePaat.',
  },
};

export default function InterviewPrepLayout({ children }: { children: React.ReactNode }) {
  return children;
}
