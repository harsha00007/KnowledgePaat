import type { RoadmapContentDefinition } from '../types';

export const pythonSkillRoadmap: RoadmapContentDefinition = {
  title: 'Python',
  slug: 'python',
  short_description:
    'Deep-dive into the Python programming language: memory model, iterators, generators, decorators, concurrency, and performance tuning.',
  description:
    'Technology-focused roadmap for mastering Python from core language syntax to advanced metaprogramming, asynchronous programming with asyncio, and clean software architecture.',
  category: 'Development',
  difficulty: 'Intermediate',
  estimated_duration: '8 Weeks',
  seo_title: 'Python Language Skill Roadmap | KnowledgePaat',
  seo_description:
    'Comprehensive technology roadmap for Python. Master syntax, OOP, dunder methods, generators, asyncio, and clean code.',
  is_active: true,
  type: 'SKILL',
  sections: [
    {
      title: '01 Core Syntax & Built-ins',
      slug: '01-core-syntax',
      description: 'Primitive types, collections, control flow, functions, and standard library.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Data Structures & Pythonic Idioms',
          slug: 'pythonic-idioms',
          description: 'List/dict/set comprehensions, unpacking, zip/enumerate, and the collections module.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Comprehensions & Generator Expressions', 'collections.defaultdict & Counter', 'Unpacking & Slicing Tricks'],
        },
      ],
    },
    {
      title: '02 Advanced Python Patterns',
      slug: '02-advanced-patterns',
      description: 'Iterators, generators, decorators, context managers, and dunder methods.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Decorators & Closures',
          slug: 'decorators-closures',
          description: 'Higher-order functions, functools.wraps, parameterized decorators, and class decorators.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 1,
          is_required: true,
          topics: ['Closures & Lexical Scoping', 'Writing Custom Decorators', 'functools.wraps & functools.lru_cache'],
          prerequisites: ['pythonic-idioms'],
        },
        {
          title: 'Generators, Iterators & Context Managers',
          slug: 'generators-iterators-context',
          description: 'yield statements, generator pipelines, __iter__ / __next__, and with statement protocols.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 2,
          is_required: true,
          topics: ['yield & Memory Efficiency', 'Iterator Protocol', 'contextlib & __enter__ / __exit__'],
          prerequisites: ['decorators-closures'],
        },
      ],
    },
    {
      title: '03 Asynchronous Python (asyncio)',
      slug: '03-asyncio',
      description: 'Cooperative multitasking, event loops, tasks, coroutines, and async I/O.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'asyncio Event Loops & Coroutines',
          slug: 'asyncio-event-loops',
          description: 'Understanding async/await, asyncio.gather, Task objects, and handling async timeouts.',
          node_type: 'SKILL',
          difficulty: 'Advanced',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['Coroutines vs Threads vs Processes', 'asyncio.gather & Task Groups', 'Async Context Managers & Iterators'],
          prerequisites: ['generators-iterators-context'],
        },
      ],
    },
  ],
};
