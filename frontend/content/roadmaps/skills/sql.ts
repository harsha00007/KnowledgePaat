import type { RoadmapContentDefinition } from '../types';

export const sqlSkillRoadmap: RoadmapContentDefinition = {
  title: 'SQL & Relational Databases',
  slug: 'sql',
  short_description:
    'Deep-dive into SQL, relational data modeling, query optimization, execution plans, indexes, transactions, and stored procedures.',
  description:
    'Master the language of relational data. From core CRUD and joins to window functions, recursive CTEs, indexing internals, lock contention, and PostgreSQL tuning.',
  category: 'Data',
  difficulty: 'Beginner',
  estimated_duration: '8 Weeks',
  seo_title: 'SQL Skill Roadmap | KnowledgePaat',
  seo_description:
    'Master SQL queries, database indexing, joins, window functions, and database performance tuning.',
  is_active: true,
  type: 'SKILL',
  sections: [
    {
      title: '01 Data Definition & Querying',
      slug: '01-ddl-querying',
      description: 'Schema creation, constraints, CRUD queries, filtering, and joins.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Relational Schemas & Constraints',
          slug: 'schemas-constraints',
          description: 'Primary keys, foreign keys, unique constraints, check constraints, and cascading actions.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Primary & Foreign Keys', 'ON DELETE CASCADE / SET NULL', 'Data Types & Nullability'],
        },
      ],
    },
    {
      title: '02 Analytical & Advanced SQL',
      slug: '02-advanced-sql',
      description: 'Window functions, subqueries, common table expressions, and pivots.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Window Functions & Ranking',
          slug: 'window-functions-ranking',
          description: 'ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and running sums with partition clauses.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['PARTITION BY & ORDER BY', 'ROW_NUMBER vs RANK vs DENSE_RANK', 'LEAD & LAG Time Comparisons', 'Cumulative Aggregations'],
          prerequisites: ['schemas-constraints'],
        },
      ],
    },
    {
      title: '03 Performance, Indexing & Transactions',
      slug: '03-performance-indexing',
      description: 'Execution plans (EXPLAIN), B-Tree indexes, partial indexes, and ACID transactions.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Indexing Mechanics & Query Tuning',
          slug: 'indexing-query-tuning',
          description: 'Reading EXPLAIN plans, index scans vs seq scans, composite index column ordering, and vacuuming.',
          node_type: 'SKILL',
          difficulty: 'Advanced',
          estimated_minutes: 210,
          sequence: 1,
          is_required: true,
          topics: ['EXPLAIN ANALYZE Cost & Actual Time', 'Index Leftmost Prefix Rule', 'Covering Indexes (INCLUDE)', 'Transactions & Deadlocks'],
          prerequisites: ['window-functions-ranking'],
        },
      ],
    },
  ],
};
