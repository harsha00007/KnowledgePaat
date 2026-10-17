import type { RoadmapContentDefinition } from '../types';

export const frontendBeginnerRoadmap: RoadmapContentDefinition = {
  title: 'Frontend Beginner',
  slug: 'frontend-beginner',
  short_description:
    'Start building websites from scratch. Learn HTML tags, CSS styling, responsive mobile layouts, and simple interactive JavaScript.',
  description:
    'A gentle introduction to building for the web. Learn how web pages are structured, how to style them with modern CSS, and how to add basic interactivity with JavaScript.',
  category: 'Development',
  difficulty: 'Beginner',
  estimated_duration: '6 Weeks',
  seo_title: 'Frontend Beginner Roadmap | KnowledgePaat',
  seo_description:
    'Beginner-friendly roadmap to building web pages with HTML, CSS, and basic JavaScript. No prior experience needed.',
  is_active: true,
  type: 'BEGINNER',
  sections: [
    {
      title: '01 Building Your First Web Page',
      slug: '01-first-page',
      description: 'HTML headings, paragraphs, links, images, and page structure.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'HTML: The Skeleton of the Web',
          slug: 'html-skeleton',
          description: 'Learn opening and closing tags, headings, paragraphs, links, and inserting images.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 90,
          sequence: 1,
          is_required: true,
          topics: ['Headings (h1-h6)', 'Paragraphs and Text Formatting', 'Links (<a>) and Images (<img>)', 'Lists (ul, ol, li)'],
        },
      ],
    },
    {
      title: '02 Making it Look Beautiful with CSS',
      slug: '02-styling-css',
      description: 'Colors, fonts, padding, margins, borders, and centering elements.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'CSS: Colors, Fonts & Box Model',
          slug: 'css-colors-boxmodel',
          description: 'Style your page with hex colors, Google Fonts, spacing (margin/padding), and rounded corners.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Color Palettes & Backgrounds', 'Google Fonts & Typography', 'Padding vs Margin Box Model', 'Centering with Flexbox'],
          prerequisites: ['html-skeleton'],
        },
      ],
    },
    {
      title: '03 Your First Portfolio Website',
      slug: '03-portfolio-website',
      description: 'Assemble a personal profile website and deploy it live for free on the web.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Build & Publish a Personal Profile Page',
          slug: 'project-profile-page',
          description: 'Create an attractive responsive bio page featuring your social links, about me, and contact form.',
          node_type: 'MILESTONE',
          difficulty: 'Beginner',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['Hero Banner with Profile Photo', 'Social Links & Bio Section', 'Publishing Free to GitHub Pages'],
          prerequisites: ['css-colors-boxmodel'],
        },
      ],
    },
  ],
};
