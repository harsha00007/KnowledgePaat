import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curated Study Notes, Cheat Sheets & Formula Guides',
  description: 'Access high-yield study notes, programming cheat sheets, CS core fundamentals (OS, DBMS, Networks), and aptitude formula booklets for rapid exam and placement revision on KnowledgePaat.',
  alternates: {
    canonical: 'https://knowledgepaat.com/notes',
  },
  openGraph: {
    title: 'Curated Study Notes & Cheat Sheets | KnowledgePaat',
    description: 'High-yield study notes, CS fundamentals, and cheatsheets on KnowledgePaat.',
    url: 'https://knowledgepaat.com/notes',
    siteName: 'KnowledgePaat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Curated Study Notes & Cheat Sheets | KnowledgePaat',
    description: 'Download CS study notes and formula guides on KnowledgePaat.',
  },
};

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
