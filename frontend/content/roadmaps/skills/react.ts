import type { RoadmapContentDefinition } from '../types';

export const reactSkillRoadmap: RoadmapContentDefinition = {
  title: 'React',
  slug: 'react',
  short_description:
    'Deep-dive into React: JSX, component composition, hooks, state machines, reconciliation, performance profiling, and server components.',
  description:
    'Focused technology roadmap for mastering React. Learn component design patterns, custom hooks, context optimization, virtual DOM mechanics, and transition to React 19 / Server Components.',
  category: 'Development',
  difficulty: 'Intermediate',
  estimated_duration: '8 Weeks',
  seo_title: 'React Skill Roadmap | KnowledgePaat',
  seo_description:
    'Complete technology roadmap for React. Master hooks, state management, memoization, custom hooks, and React 19.',
  is_active: true,
  type: 'SKILL',
  sections: [
    {
      title: '01 Core React & JSX',
      slug: '01-core-react',
      description: 'JSX compilation, props, rendering cycle, and synthetic events.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Component Composition & Children Pattern',
          slug: 'component-composition',
          description: 'Avoid prop drilling using slot patterns, children prop, and modular layout components.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Children Prop & Inversion of Control', 'Compound Component Pattern', 'Component Separation of Concerns'],
        },
      ],
    },
    {
      title: '02 Hooks & Lifecycle Mechanics',
      slug: '02-hooks-lifecycle',
      description: 'State, effects, refs, and custom hook abstractions.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Mastering useEffect & Sync with External Systems',
          slug: 'useeffect-mastery',
          description: 'Understanding dependency arrays, cleanup functions, race condition handling, and avoiding unnecessary effects.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 1,
          is_required: true,
          topics: ['Effect Cleanup Functions', 'Synchronizing with Browser APIs / WebSockets', 'Handling AbortControllers & Race Conditions'],
          prerequisites: ['component-composition'],
        },
        {
          title: 'Custom Hooks Architecture',
          slug: 'custom-hooks-architecture',
          description: 'Extracting stateful business logic into reusable testable hooks (useDebounce, useMediaQuery, useFetch).',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 2,
          is_required: true,
          topics: ['Hook Rules & Linting', 'Extracting State & Handlers', 'Testing Custom Hooks with React Testing Library'],
          prerequisites: ['useeffect-mastery'],
        },
      ],
    },
    {
      title: '03 Performance & Rendering Optimization',
      slug: '03-performance-optimization',
      description: 'Re-render mitigation, memoization, lazy loading, and React profiling.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'useMemo, useCallback & React Profiler',
          slug: 'react-memoization-profiler',
          description: 'Measuring render durations, memoizing expensive calculations, and stabilizing callback references.',
          node_type: 'SKILL',
          difficulty: 'Advanced',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['React Profiler in DevTools', 'useMemo vs useCallback Trade-offs', 'React.memo & Shallow Equality Checks', 'Code Splitting with React.lazy & Suspense'],
          prerequisites: ['custom-hooks-architecture'],
        },
      ],
    },
  ],
};
