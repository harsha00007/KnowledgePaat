import type { RoadmapContentDefinition } from '../types';

export const frontendPerformanceRoadmap: RoadmapContentDefinition = {
  title: 'Frontend Performance',
  slug: 'frontend-performance',
  short_description:
    'Production engineering standard: Core Web Vitals (LCP, INP, CLS), bundle optimization, tree shaking, image compression, and edge caching.',
  description:
    'Engineering best-practice guide to high-performance web applications. Master browser rendering mechanics, optimize JavaScript bundle payloads, eliminate layout shifts, and achieve 95+ Google Lighthouse scores.',
  category: 'Development',
  difficulty: 'Intermediate',
  estimated_duration: '4 Weeks',
  seo_title: 'Frontend Performance Best Practices Roadmap | KnowledgePaat',
  seo_description:
    'Optimize web performance: Core Web Vitals (LCP, INP, CLS), JavaScript bundle splitting, asset compression, and caching.',
  is_active: true,
  type: 'BEST_PRACTICE',
  sections: [
    {
      title: '01 Core Web Vitals & Metrics',
      slug: '01-core-web-vitals',
      description: 'Understanding Google performance benchmarks: LCP, INP, and CLS.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Understanding LCP, INP & CLS Benchmarks',
          slug: 'understanding-core-web-vitals',
          description: 'Largest Contentful Paint (<2.5s), Interaction to Next Paint (<200ms), and Cumulative Layout Shift (<0.1).',
          node_type: 'TOPIC',
          difficulty: 'Intermediate',
          estimated_minutes: 90,
          sequence: 1,
          is_required: true,
          topics: ['LCP (Largest Contentful Paint)', 'INP (Interaction to Next Paint)', 'CLS (Cumulative Layout Shift)', 'Field Data vs Lab Data'],
        },
      ],
    },
    {
      title: '02 Bundle Size & JavaScript Execution',
      slug: '02-bundle-optimization',
      description: 'Code splitting, dynamic imports, tree shaking, and eliminating render-blocking scripts.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Dynamic Imports & Tree-Shaking',
          slug: 'dynamic-imports-treeshaking',
          description: 'Route-based code splitting, lazy-loading heavy libraries (charts, rich text editors), and analyzing webpack/vite bundle sizes.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Dynamic import() & React.lazy', 'Analyzing Bundles with Webpack Bundle Analyzer', 'Tree Shaking & Side-Effects Flag', 'Deferring Non-Critical JavaScript'],
          prerequisites: ['understanding-core-web-vitals'],
        },
      ],
    },
    {
      title: '03 Media & Asset Optimization',
      slug: '03-media-caching',
      description: 'Next-gen image formats (AVIF/WebP), responsive srcsets, font subsetting, and HTTP caching.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Next-Gen Images, Web Fonts & Edge Caching',
          slug: 'images-fonts-edge-caching',
          description: 'AVIF compression, explicit width/height to stop CLS, self-hosting fonts with font-display: swap, and Cache-Control headers.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['AVIF / WebP Compression', 'Explicit Dimensions to Prevent CLS', 'Self-hosting Variable Fonts (font-display: swap)', 'Cache-Control: immutable & CDN Edge Caching'],
          prerequisites: ['dynamic-imports-treeshaking'],
        },
      ],
    },
  ],
};
