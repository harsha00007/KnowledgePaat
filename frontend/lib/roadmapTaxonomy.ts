/**
 * KnowledgePaat — Career Roadmap Platform
 * Phase 4 — Roadmap Taxonomy, Career Outcomes & Quality Architecture
 *
 * Implements:
 * - Deterministic classification (ROLE, SKILL, BEGINNER, BEST_PRACTICE)
 * - Career outcomes (target roles, portfolio projects, interview readiness)
 * - "What Should I Learn Next?" recommendation engine
 * - Admin quality evaluation & validation
 * - Admin preconfigured templates
 */

import type {
  CareerRoadmap,
  RoadmapDetail,
  RoadmapClassification,
  CareerOutcome,
  NextStepRecommendation,
  RoadmapQualityReport,
  ValidTopicStatus,
  TopicProgressStatus,
  NodeDifficulty,
  RoadmapCategory,
  RoadmapDifficulty,
} from '@/types/roadmap';

// ── 1. Deterministic Taxonomy Classification ───────────────────────────────

const KNOWN_SKILL_SLUGS = new Set([
  'python',
  'javascript',
  'typescript',
  'react',
  'sql',
  'docker',
  'git-github',
  'linux',
  'kubernetes',
  'aws',
  'postgresql',
  'mongodb',
  'graphql',
  'rest-api',
  'system-design',
  'data-structures-algorithms',
]);

const KNOWN_BEGINNER_SLUGS = new Set([
  'programming-fundamentals',
  'frontend-beginner',
  'backend-beginner',
  'python-beginner',
  'data-analyst-beginner',
  'start-coding',
]);

const KNOWN_BEST_PRACTICE_SLUGS = new Set([
  'api-security',
  'frontend-performance',
  'code-review-best-practices',
  'database-best-practices',
  'git-best-practices',
  'testing-best-practices',
  'clean-code',
]);

/**
 * Classifies a roadmap into ROLE, SKILL, BEGINNER, or BEST_PRACTICE.
 * Safe application-layer mapping that preserves existing DB category values.
 */
export function classifyRoadmap(
  slug: string,
  category?: string
): RoadmapClassification {
  const normalizedSlug = slug.toLowerCase().trim();
  const normalizedCat = (category || '').toLowerCase().trim();

  if (
    KNOWN_BEST_PRACTICE_SLUGS.has(normalizedSlug) ||
    normalizedSlug.includes('best-practice') ||
    normalizedCat === 'best practices'
  ) {
    return 'BEST_PRACTICE';
  }

  if (
    KNOWN_BEGINNER_SLUGS.has(normalizedSlug) ||
    normalizedSlug.endsWith('-beginner') ||
    normalizedCat === 'beginner'
  ) {
    return 'BEGINNER';
  }

  if (
    KNOWN_SKILL_SLUGS.has(normalizedSlug) ||
    (!normalizedSlug.includes('developer') &&
      !normalizedSlug.includes('engineer') &&
      !normalizedSlug.includes('analyst') &&
      !normalizedSlug.includes('designer') &&
      !normalizedSlug.includes('manager') &&
      !normalizedSlug.includes('specialist') &&
      !normalizedSlug.includes('architect'))
  ) {
    return 'SKILL';
  }

  return 'ROLE';
}

/** Human-readable label for badge presentation */
export function getClassificationLabel(classification: RoadmapClassification): string {
  switch (classification) {
    case 'ROLE':
      return 'Career Path';
    case 'SKILL':
      return 'Core Skill';
    case 'BEGINNER':
      return 'Beginner Track';
    case 'BEST_PRACTICE':
      return 'Engineering Standard';
  }
}

// ── 2. Career Outcomes Database ────────────────────────────────────────────

export const CAREER_OUTCOMES: Record<string, CareerOutcome> = {
  'python-developer': {
    targetRoles: [
      'Junior Python Developer',
      'Python Software Engineer',
      'Backend Developer',
      'Django / FastAPI Engineer',
      'Automation & Scripting Engineer',
    ],
    skillsAcquired: [
      'Python 3',
      'Object-Oriented Programming',
      'Relational Databases & SQL',
      'FastAPI & Django',
      'RESTful APIs & Token Auth',
      'PyTest & Automated Testing',
      'Docker Containerization',
    ],
    portfolioProjects: [
      {
        title: 'Modular CLI Personal Finance & Expense Tracker',
        description:
          'Command-line budgeting suite featuring SQLite persistence, CSV statement parsing, and formatted expense reports.',
        difficulty: 'Beginner',
        estimatedHours: 12,
        skillsUsed: ['Python Core', 'SQLite', 'File I/O', 'PyTest'],
        portfolioValue: 'Demonstrates clean procedural logic, data modeling, and automated testing.',
      },
      {
        title: 'Production Job Board REST API with JWT Auth',
        description:
          'High-performance backend built with FastAPI, PostgreSQL, and SQLAlchemy featuring role-based access and Swagger docs.',
        difficulty: 'Intermediate',
        estimatedHours: 24,
        skillsUsed: ['FastAPI', 'PostgreSQL', 'SQLAlchemy', 'JWT Authentication'],
        portfolioValue: 'Essential proof of backend web architectural capability and API security.',
      },
      {
        title: 'Scalable Microservice with Async Worker & Docker',
        description:
          'Distributed task processing service integrating Redis queues, Celery workers, and Docker Compose orchestration.',
        difficulty: 'Advanced',
        estimatedHours: 35,
        skillsUsed: ['Python', 'Docker', 'Redis', 'Celery', 'PostgreSQL'],
        portfolioValue: 'Demonstrates systems thinking, concurrency, and production container deployment.',
      },
    ],
    practiceAreas: [
      'Data Structures in Python (Lists, Dicts, Sets, Tuples)',
      'Algorithmic Problem Solving on LeetCode / HackerRank',
      'SQL Query Optimization & Database Indexing',
      'Debugging Asynchronous Code in Python',
    ],
    interviewTopics: [
      'Python memory model, GIL, and garbage collection',
      'Decorators, generators, and context managers',
      'Database transaction isolation levels and ACID properties',
      'REST API idempotency and HTTP status codes',
      'System design for scalable backend APIs',
    ],
    careerReadinessMilestone:
      'Able to build, test, containerize, and deploy full-stack backend services with documented APIs.',
  },

  'frontend-developer': {
    targetRoles: [
      'Junior Frontend Developer',
      'React Developer',
      'Web Application Engineer',
      'UI Engineer',
    ],
    skillsAcquired: [
      'Semantic HTML5 & Modern CSS3',
      'JavaScript (ES6+) & TypeScript',
      'React & Component Architecture',
      'State Management & Hooks',
      'Tailwind CSS & Responsive Layouts',
      'Next.js & Server Components',
      'Web Performance & Accessibility (a11y)',
    ],
    portfolioProjects: [
      {
        title: 'Accessible Interactive Dashboard Suite',
        description:
          'Multi-view analytical dashboard featuring charts, responsive sidebar, dark mode, and keyboard navigation.',
        difficulty: 'Intermediate',
        estimatedHours: 20,
        skillsUsed: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts'],
        portfolioValue: 'Showcases component modularity, state management, and modern aesthetics.',
      },
      {
        title: 'E-Commerce Storefront with Next.js App Router',
        description:
          'Server-rendered e-commerce application with dynamic routing, optimistic cart updates, and SEO meta tags.',
        difficulty: 'Intermediate',
        estimatedHours: 28,
        skillsUsed: ['Next.js', 'React', 'TypeScript', 'SSR / SSG', 'Stripe Integration'],
        portfolioValue: 'Demonstrates full-stack frontend fluency, performance, and server rendering.',
      },
      {
        title: 'Collaborative Real-time Canvas / Board',
        description:
          'Interactive workspace with drag-and-drop, WebSocket sync, undo/redo history, and local persistence.',
        difficulty: 'Advanced',
        estimatedHours: 36,
        skillsUsed: ['React', 'WebSockets', 'Canvas API', 'State Machines'],
        portfolioValue: 'High-signal technical project proving mastery over complex interactive DOM state.',
      },
    ],
    practiceAreas: [
      'DOM Manipulation & Event Loop Mechanics',
      'CSS Flexbox, Grid, and Responsive Breakpoints',
      'React Custom Hook Abstractions',
      'Lighthouse Performance Auditing (Core Web Vitals)',
    ],
    interviewTopics: [
      'Virtual DOM and React reconciliation cycle',
      'JavaScript closures, prototypes, and hoisting',
      'Browser critical rendering path and reflows',
      'CORS, XSS, and CSRF frontend mitigations',
      'Accessibility standards (WCAG 2.1 and WAI-ARIA)',
    ],
    careerReadinessMilestone:
      'Equipped to deliver high-performance, responsive, accessible web interfaces that integrate smoothly with APIs.',
  },

  'backend-developer': {
    targetRoles: [
      'Backend Engineer',
      'API Platform Engineer',
      'Cloud Services Developer',
      'Distributed Systems Engineer',
    ],
    skillsAcquired: [
      'Server-side Programming (Node.js / Python / Go)',
      'Relational & NoSQL Database Design',
      'API Protocols (REST, GraphQL, gRPC)',
      'Authentication, OAuth2 & JWT',
      'Caching Strategies (Redis)',
      'Message Queues & Event-Driven Architecture',
      'Containerization & Deployment',
    ],
    portfolioProjects: [
      {
        title: 'High-Throughput URL Shortener & Analytics Platform',
        description:
          'Scalable redirect service with Redis caching, rate limiting, and click event streaming.',
        difficulty: 'Intermediate',
        estimatedHours: 20,
        skillsUsed: ['Node.js/Go', 'PostgreSQL', 'Redis', 'Docker'],
        portfolioValue: 'Demonstrates caching, database indexing, and handling read-heavy architectures.',
      },
      {
        title: 'Multi-Tenant SaaS Authentication & Billing Service',
        description:
          'Robust backend microservice handling tenant isolation, role-based access, and webhook events.',
        difficulty: 'Advanced',
        estimatedHours: 32,
        skillsUsed: ['Express/FastAPI', 'PostgreSQL', 'JWT', 'Stripe Webhooks'],
        portfolioValue: 'Shows real-world business backend engineering and enterprise security design.',
      },
    ],
    practiceAreas: [
      'SQL Query Optimization & EXPLAIN ANALYZE',
      'Concurrency, Mutexes, and Race Condition Handling',
      'API Load Testing & Benchmarking with k6',
    ],
    interviewTopics: [
      'Database normalization, indexing, and connection pooling',
      'Horizontal vs vertical scaling and load balancing',
      'CAP theorem, eventual consistency, and distributed transactions',
      'Microservices vs modular monolith architectural trade-offs',
    ],
    careerReadinessMilestone:
      'Ready to engineer reliable, secure, and performant backends capable of serving production client workloads.',
  },

  'full-stack-developer': {
    targetRoles: [
      'Full Stack Software Engineer',
      'Web Application Developer',
      'Startup Founding Engineer',
    ],
    skillsAcquired: [
      'Frontend (React / Next.js / TypeScript)',
      'Backend (Node.js / Python)',
      'Database (PostgreSQL / Redis)',
      'Cloud & CI/CD Pipelines',
      'End-to-End System Integration',
    ],
    portfolioProjects: [
      {
        title: 'Collaborative Project Management Suite (Full Stack)',
        description:
          'End-to-end web app with kanban boards, real-time activity feeds, team invites, and automated email notifications.',
        difficulty: 'Advanced',
        estimatedHours: 40,
        skillsUsed: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS'],
        portfolioValue: 'Complete demonstration of building and shipping a commercial-grade product end-to-end.',
      },
    ],
    practiceAreas: ['Full Stack Deployment', 'End-to-End Testing with Playwright', 'API Contract Design'],
    interviewTopics: ['Full web request lifecycle', 'Data modeling from UI to DB', 'Authentication security'],
    careerReadinessMilestone: 'Capable of independently conceptualizing, building, and deploying web products.',
  },

  'qa-automation-engineer': {
    targetRoles: [
      'QA Automation Engineer',
      'SDET (Software Development Engineer in Test)',
      'Quality Assurance Specialist',
      'Test Lead',
    ],
    skillsAcquired: [
      'Test Automation Fundamentals & Test Pyramids',
      'Selenium & Playwright for Web UI Testing',
      'API Testing with Postman & RestAssured',
      'Mobile Automation with Appium',
      'Continuous Integration (GitHub Actions / Jenkins)',
      'Performance & Load Testing with JMeter',
    ],
    portfolioProjects: [
      {
        title: 'Enterprise End-to-End Test Automation Framework',
        description:
          'Modular Playwright + TypeScript framework with Page Object Model, parallel execution, cross-browser support, and HTML reports.',
        difficulty: 'Intermediate',
        estimatedHours: 24,
        skillsUsed: ['Playwright', 'TypeScript', 'Page Object Model', 'GitHub Actions'],
        portfolioValue: 'Direct evidence of building reliable, maintainable regression suites for agile teams.',
      },
      {
        title: 'Automated REST API Test Suite with Mock Server',
        description:
          'Comprehensive API validation framework covering positive/negative status codes, schema validation, and token flows.',
        difficulty: 'Intermediate',
        estimatedHours: 18,
        skillsUsed: ['Postman/Newman', 'Jest', 'JSON Schema Validation'],
        portfolioValue: 'Demonstrates deep testing knowledge across backend boundary contracts.',
      },
    ],
    practiceAreas: ['XPath and CSS Locators', 'Bug Life Cycle Documentation', 'Test Case Design Techniques'],
    interviewTopics: [
      'Test Automation Framework Architecture',
      'Handling flaky tests and dynamic asynchronous DOM elements',
      'Severity vs Priority with real bug examples',
      'CI/CD pipeline integration and test reporting',
    ],
    careerReadinessMilestone:
      'Equipped to design, implement, and maintain enterprise automation frameworks reducing QA cycle time.',
  },

  'data-analyst': {
    targetRoles: [
      'Data Analyst',
      'Business Intelligence Analyst',
      'Operations Analyst',
      'Product Data Analyst',
    ],
    skillsAcquired: [
      'Advanced SQL (Window Functions, CTEs, Aggregations)',
      'Data Analysis with Python (Pandas, NumPy)',
      'Data Visualization (Matplotlib, Seaborn, Tableau/Power BI)',
      'Statistical Analysis & A/B Testing Fundamentals',
      'Data Cleaning, Transformation & Storytelling',
    ],
    portfolioProjects: [
      {
        title: 'E-Commerce Customer Segmentation & Retention Analysis',
        description:
          'End-to-end cohort and RFM analysis identifying high-value customers, churn drivers, and actionable recommendations.',
        difficulty: 'Intermediate',
        estimatedHours: 22,
        skillsUsed: ['Python', 'Pandas', 'SQL', 'Seaborn', 'Power BI'],
        portfolioValue: 'Translates raw data into strategic business impact, executive dashboards, and narrative.',
      },
      {
        title: 'Executive Financial Performance Dashboard',
        description:
          'Interactive multi-page BI dashboard tracking revenue, customer acquisition cost, and forecasting trends.',
        difficulty: 'Beginner',
        estimatedHours: 15,
        skillsUsed: ['Power BI/Tableau', 'SQL Data Modeling', 'DAX Formulas'],
        portfolioValue: 'High visual appeal and immediate comprehension for business stakeholders.',
      },
    ],
    practiceAreas: ['Complex SQL Queries on LeetCode/StrataScratch', 'Exploratory Data Analysis (EDA)', 'Data Cleaning'],
    interviewTopics: [
      'SQL Window functions (ROW_NUMBER, DENSE_RANK, LEAD/LAG)',
      'Handling NULL values and data skew',
      'Formulating hypotheses and designing A/B test experiments',
      'Presenting analytical findings to non-technical leaders',
    ],
    careerReadinessMilestone:
      'Ready to extract data from data warehouses, perform rigorous analysis, and present actionable dashboards.',
  },

  'devops-engineer': {
    targetRoles: [
      'DevOps Engineer',
      'Cloud Infrastructure Engineer',
      'Site Reliability Engineer (SRE)',
      'Platform Engineer',
    ],
    skillsAcquired: [
      'Linux System Administration & Shell Scripting',
      'Networking Protocols & DNS/SSL Configuration',
      'Docker Containerization & Multi-Stage Builds',
      'Kubernetes Cluster Orchestration',
      'Infrastructure as Code with Terraform',
      'CI/CD Pipelines (GitHub Actions / GitLab CI)',
      'Monitoring & Alerting (Prometheus, Grafana)',
    ],
    portfolioProjects: [
      {
        title: 'Automated Multi-Stage CI/CD Pipeline with GitOps',
        description:
          'Production pipeline building container images, running automated tests, and deploying to Kubernetes via ArgoCD.',
        difficulty: 'Advanced',
        estimatedHours: 30,
        skillsUsed: ['GitHub Actions', 'Docker', 'Kubernetes', 'Helm', 'ArgoCD'],
        portfolioValue: 'Proves mastery of modern deployment velocity, zero-downtime releases, and GitOps.',
      },
      {
        title: 'Cloud Infrastructure Provisioning with Terraform',
        description:
          'Declarative AWS infrastructure deploying VPC, subnets, ECS/EKS clusters, and RDS with secure IAM policies.',
        difficulty: 'Intermediate',
        estimatedHours: 20,
        skillsUsed: ['Terraform', 'AWS', 'Security Groups', 'Remote State'],
        portfolioValue: 'Showcases repeatable, immutable cloud infrastructure best practices.',
      },
    ],
    practiceAreas: ['Bash Automation Scripts', 'Docker Optimization', 'Kubernetes Troubleshooting'],
    interviewTopics: [
      'Container isolation vs Virtual Machines (cgroups, namespaces)',
      'Kubernetes Pod scheduling, Services, and Ingress routing',
      'Terraform state management and drift detection',
      'Incident response and SLA/SLO/SLI metrics calculation',
    ],
    careerReadinessMilestone:
      'Capable of managing reliable cloud infrastructure, building automated pipelines, and monitoring uptime.',
  },

  'ai-engineer': {
    targetRoles: [
      'AI Engineer',
      'Generative AI Developer',
      'LLM Application Engineer',
      'AI Solutions Architect',
    ],
    skillsAcquired: [
      'Python for AI & Vector Mathematics',
      'Prompt Engineering & Few-Shot Learning',
      'LLM Frameworks (LangChain, LlamaIndex)',
      'Vector Databases & Semantic Search (Pinecone, Chroma)',
      'Retrieval-Augmented Generation (RAG) Architecture',
      'AI Agents, Tools & Function Calling',
      'Model Evaluation & Guardrails',
    ],
    portfolioProjects: [
      {
        title: 'Production Multi-Document RAG Research Assistant',
        description:
          'Enterprise RAG system ingesting PDFs, generating vector embeddings, and delivering cited, hallucination-resistant answers.',
        difficulty: 'Intermediate',
        estimatedHours: 25,
        skillsUsed: ['Python', 'LangChain', 'OpenAI/Ollama', 'ChromaDB', 'FastAPI'],
        portfolioValue: 'Direct demonstration of commercial Generative AI application engineering.',
      },
      {
        title: 'Autonomous Multi-Agent Task Orchestrator',
        description:
          'Agentic system with planning, web searching, code execution, and self-correction loops for automated research.',
        difficulty: 'Advanced',
        estimatedHours: 35,
        skillsUsed: ['LangGraph / CrewAI', 'Tool Calling', 'FastAPI', 'Streaming UI'],
        portfolioValue: 'Cutting-edge demonstration of autonomous AI agent architectures.',
      },
    ],
    practiceAreas: ['Prompt Optimization', 'Chunking Strategies & Embedding Comparison', 'Agent Loop Debugging'],
    interviewTopics: [
      'RAG failure modes: retrieval errors vs generation hallucinations',
      'Fine-tuning vs Prompting vs RAG decision frameworks',
      'Vector similarity metrics (Cosine vs Euclidean vs Dot Product)',
      'Context window management and token economics',
    ],
    careerReadinessMilestone:
      'Equipped to build, evaluate, and ship reliable LLM-powered applications and agentic workflows.',
  },
};

/** Generate a sensible fallback career outcome for roles not explicitly mapped */
export function getRoadmapOutcome(roadmap: CareerRoadmap): CareerOutcome {
  if (CAREER_OUTCOMES[roadmap.slug]) {
    return CAREER_OUTCOMES[roadmap.slug];
  }

  return {
    targetRoles: [
      `Junior ${roadmap.title}`,
      roadmap.title,
      `${roadmap.title} Specialist`,
    ],
    skillsAcquired: [
      `${roadmap.title} Core Competencies`,
      'System Architecture & Toolchain',
      'Industry Best Practices',
      'Hands-on Practical Implementation',
    ],
    portfolioProjects: [
      {
        title: `Comprehensive ${roadmap.title} Portfolio Project`,
        description: `Practical real-world application exercising foundational and advanced competencies in ${roadmap.title}.`,
        difficulty: roadmap.difficulty,
        estimatedHours: 20,
        skillsUsed: [roadmap.title, 'System Design', 'Testing'],
        portfolioValue: `Demonstrates end-to-end competence and problem-solving within ${roadmap.title}.`,
      },
    ],
    practiceAreas: ['Core Concepts', 'Hands-on Exercises', 'Problem Solving'],
    interviewTopics: [
      `Core ${roadmap.title} architectural principles`,
      'Common pitfalls and troubleshooting methodologies',
      'Industry standards and deployment best practices',
    ],
    careerReadinessMilestone: `Job-ready foundation in ${roadmap.title} with verified project evidence and interview preparation.`,
  };
}

// ── 3. Next Step Recommendation Engine ─────────────────────────────────────

/**
 * Deterministically analyzes roadmap sequence and user progress to identify
 * the immediate next actionable learning node and its career rationale.
 */
export function getNextStepRecommendation(
  detail: RoadmapDetail,
  userProgressMap: Record<string, TopicProgressStatus>
): NextStepRecommendation | null {
  // Traverse sections and nodes in sequence order
  for (const section of detail.sections) {
    for (const node of section.nodes) {
      if (!node.is_active) continue;

      const status = userProgressMap[node.id];
      // If not yet completed (neither 'done' nor 'skip')
      if (status !== 'done' && status !== 'skip') {
        const isCurrentlyLearning = status === 'learning';

        // Compose rationale
        let rationale = `Essential competency in ${section.title}.`;
        if (isCurrentlyLearning) {
          rationale = `You're currently learning this topic. Finish it to advance your roadmap completion.`;
        } else if (section.sequence === 1) {
          rationale = `Foundational building block needed before progressing to specialized stages.`;
        } else {
          rationale = `Key skill required for subsequent projects and technical interview readiness.`;
        }

        return {
          nodeId: node.id,
          nodeTitle: node.title,
          sectionTitle: section.title,
          difficulty: node.difficulty,
          rationale,
          estimatedMinutes: node.estimated_minutes,
        };
      }
    }
  }

  // All nodes are either done or skipped!
  return null;
}

// ── 4. Admin Quality Checker & Evaluator ────────────────────────────────────

/**
 * Validates the quality of a roadmap before publishing.
 * Catches orphan nodes, cycle errors, missing descriptions, missing resources, etc.
 */
export function evaluateRoadmapQuality(detail: RoadmapDetail): RoadmapQualityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { roadmap, sections, relationships } = detail;

  // Basic Roadmap Metadata Checks
  if (!roadmap.title?.trim() || roadmap.title.length < 3) {
    errors.push('Roadmap title is missing or too short (minimum 3 characters).');
  }

  if (!roadmap.slug?.trim() || !/^[a-z0-9-]+$/.test(roadmap.slug)) {
    errors.push('Roadmap slug must be valid lowercase alphanumeric with hyphens.');
  }

  if (!roadmap.short_description?.trim() || roadmap.short_description.length < 15) {
    errors.push('Short description is required (minimum 15 characters).');
  }

  if (!roadmap.description?.trim() || roadmap.description.length < 30) {
    warnings.push('Full description should provide thorough detail (recommended 30+ characters).');
  }

  if (!roadmap.estimated_duration?.trim()) {
    warnings.push('Estimated duration is not specified (e.g. "12 Weeks").');
  }

  // Section Checks
  if (sections.length === 0) {
    errors.push('Roadmap must have at least one section.');
  }

  let totalNodes = 0;
  let totalTopics = 0;
  let totalResources = 0;
  let totalRecommendedResources = 0;

  const allNodeIds = new Set<string>();

  sections.forEach((section, sIdx) => {
    if (!section.title?.trim()) {
      errors.push(`Section #${sIdx + 1} is missing a title.`);
    }

    if (section.nodes.length === 0) {
      warnings.push(`Section "${section.title}" has no nodes.`);
    }

    section.nodes.forEach((node) => {
      totalNodes++;
      allNodeIds.add(node.id);

      if (!node.title?.trim()) {
        errors.push(`A node in section "${section.title}" is missing a title.`);
      }

      if (!node.description?.trim()) {
        warnings.push(`Node "${node.title}" does not have a description.`);
      }

      if (node.topics && node.topics.length > 0) {
        totalTopics += node.topics.length;
      } else {
        warnings.push(`Node "${node.title}" has no specific topics/concepts listed.`);
      }

      if (node.resources && node.resources.length > 0) {
        totalResources += node.resources.length;
        const hasRec = node.resources.some((r) => r.is_recommended);
        if (hasRec) {
          totalRecommendedResources++;
        } else {
          warnings.push(`Node "${node.title}" has resources but no primary recommended resource.`);
        }
      } else {
        warnings.push(`Node "${node.title}" has no attached learning resources.`);
      }
    });
  });

  if (totalNodes === 0) {
    errors.push('Roadmap must contain at least one node.');
  }

  // Relationship Integrity & Cycle Detection
  const adj = new Map<string, string[]>();
  relationships.forEach((rel) => {
    if (rel.source_node_id === rel.target_node_id) {
      errors.push(`Self-referential relationship detected on node ${rel.source_node_id}.`);
    }
    if (!allNodeIds.has(rel.source_node_id) || !allNodeIds.has(rel.target_node_id)) {
      errors.push('Relationship connects to a non-existent node ID.');
    }

    if (!adj.has(rel.source_node_id)) adj.set(rel.source_node_id, []);
    adj.get(rel.source_node_id)!.push(rel.target_node_id);
  });

  // Check for circular dependency
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of allNodeIds) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        errors.push('Circular dependency / cycle detected in node relationships.');
        break;
      }
    }
  }

  // SEO Checks
  if (!roadmap.seo_title?.trim()) {
    warnings.push('SEO title is not configured. Default will be generated.');
  }
  if (!roadmap.seo_description?.trim()) {
    warnings.push('SEO meta description is not configured. Default will be generated.');
  }

  // Calculate Quality Score
  let score = 100;
  score -= errors.length * 25;
  score -= warnings.length * 4;
  score = Math.max(0, Math.min(100, score));

  return {
    isReadyToPublish: errors.length === 0,
    score,
    errors,
    warnings,
    stats: {
      sectionCount: sections.length,
      nodeCount: totalNodes,
      topicCount: totalTopics,
      resourceCount: totalResources,
      recommendedResourceCount: totalRecommendedResources,
    },
  };
}

// ── 5. Admin Preconfigured Templates ───────────────────────────────────────

export interface RoadmapTemplateOption {
  type: RoadmapClassification;
  name: string;
  description: string;
  defaultCategory: RoadmapCategory;
  defaultDifficulty: RoadmapDifficulty;
  defaultDuration: string;
  skeletonSections: Array<{
    title: string;
    slug: string;
    description: string;
    sequence: number;
    sampleNodes: Array<{
      title: string;
      slug: string;
      description: string;
      estimatedMinutes: number;
      topics: string[];
    }>;
  }>;
}

export const ROADMAP_TEMPLATES: Record<RoadmapClassification, RoadmapTemplateOption> = {
  ROLE: {
    type: 'ROLE',
    name: 'Career / Role Roadmap',
    description:
      'End-to-end journey from beginner fundamentals to portfolio projects, interview readiness, and job readiness.',
    defaultCategory: 'Development',
    defaultDifficulty: 'Beginner',
    defaultDuration: '16 Weeks',
    skeletonSections: [
      {
        title: '01 Foundations & Toolchain',
        slug: '01-foundations',
        description: 'Core concepts, terminal, version control, and development environment.',
        sequence: 1,
        sampleNodes: [
          {
            title: 'Computer Science & Terminal Basics',
            slug: 'terminal-basics',
            description: 'Navigate filesystem, execute scripts, and understand environment variables.',
            estimatedMinutes: 90,
            topics: ['Terminal Commands', 'Environment Variables', 'Package Managers'],
          },
          {
            title: 'Git & Version Control',
            slug: 'git-version-control',
            description: 'Branching, staging, committing, and collaborating on GitHub.',
            estimatedMinutes: 120,
            topics: ['Git Init', 'Branching & Merging', 'Pull Requests'],
          },
        ],
      },
      {
        title: '02 Core Competencies',
        slug: '02-core-competencies',
        description: 'Primary programming language, data modeling, and architectural patterns.',
        sequence: 2,
        sampleNodes: [
          {
            title: 'Language Fundamentals & Syntax',
            slug: 'language-fundamentals',
            description: 'Variables, loops, functions, and standard libraries.',
            estimatedMinutes: 180,
            topics: ['Data Types', 'Control Flow', 'Functions & Scope'],
          },
          {
            title: 'Object-Oriented & Modular Design',
            slug: 'oop-design',
            description: 'Classes, encapsulation, abstraction, and clean code principles.',
            estimatedMinutes: 240,
            topics: ['Classes & Objects', 'Inheritance', 'SOLID Principles'],
          },
        ],
      },
      {
        title: '03 Databases & Data Storage',
        slug: '03-databases',
        description: 'Relational data modeling, SQL queries, and ORM integration.',
        sequence: 3,
        sampleNodes: [
          {
            title: 'SQL & Relational Modeling',
            slug: 'sql-modeling',
            description: 'Design normalized tables, execute joins, and optimize queries.',
            estimatedMinutes: 210,
            topics: ['DDL & DML', 'Joins & Aggregations', 'Indexes'],
          },
        ],
      },
      {
        title: '04 Web & API Engineering',
        slug: '04-web-api',
        description: 'Protocols, routing, authentication, and service communication.',
        sequence: 4,
        sampleNodes: [
          {
            title: 'REST API Architecture & Auth',
            slug: 'rest-api-auth',
            description: 'Build secure endpoints with token authentication and validation.',
            estimatedMinutes: 240,
            topics: ['HTTP Methods & Codes', 'JWT Auth', 'Request Validation'],
          },
        ],
      },
      {
        title: '05 Practical Portfolio Projects',
        slug: '05-portfolio-projects',
        description: 'Real-world projects showcasing end-to-end development skills.',
        sequence: 5,
        sampleNodes: [
          {
            title: 'Full Production Portfolio Project',
            slug: 'production-project',
            description: 'Build, test, and deploy a multi-tier application.',
            estimatedMinutes: 600,
            topics: ['System Design', 'Implementation', 'Deployment'],
          },
        ],
      },
      {
        title: '06 Technical Interview & Job Ready',
        slug: '06-interview-ready',
        description: 'Coding challenges, architectural reviews, and resume alignment.',
        sequence: 6,
        sampleNodes: [
          {
            title: 'Technical Interview Preparation',
            slug: 'technical-interview-prep',
            description: 'Practice high-frequency interview questions and system design scenarios.',
            estimatedMinutes: 300,
            topics: ['Algorithms', 'System Design Review', 'Behavioral Preparation'],
          },
        ],
      },
    ],
  },

  SKILL: {
    type: 'SKILL',
    name: 'Technology / Skill Roadmap',
    description: 'Deep dive into a specific technology, language, library, or engineering tool.',
    defaultCategory: 'Development',
    defaultDifficulty: 'Intermediate',
    defaultDuration: '8 Weeks',
    skeletonSections: [
      {
        title: '01 Fundamentals & Core Concepts',
        slug: '01-fundamentals',
        description: 'Essential mental models and syntax.',
        sequence: 1,
        sampleNodes: [
          {
            title: 'Core Architecture & Setup',
            slug: 'core-architecture',
            description: 'Runtime environment, setup, and first implementation.',
            estimatedMinutes: 90,
            topics: ['Installation', 'Configuration', 'Hello World'],
          },
        ],
      },
      {
        title: '02 Intermediate Patterns',
        slug: '02-intermediate',
        description: 'Advanced features, idioms, and ecosystem libraries.',
        sequence: 2,
        sampleNodes: [
          {
            title: 'Advanced Features & Optimization',
            slug: 'advanced-features',
            description: 'Concurrency, memory management, and performance tuning.',
            estimatedMinutes: 180,
            topics: ['Async Patterns', 'Performance', 'Best Practices'],
          },
        ],
      },
      {
        title: '03 Hands-on Exercises & Tooling',
        slug: '03-exercises',
        description: 'Testing, debugging, and production integration.',
        sequence: 3,
        sampleNodes: [
          {
            title: 'Production Tooling & Integration',
            slug: 'production-tooling',
            description: 'Linters, test suites, and CI pipeline setup.',
            estimatedMinutes: 150,
            topics: ['Unit Testing', 'Linting', 'CI/CD'],
          },
        ],
      },
    ],
  },

  BEGINNER: {
    type: 'BEGINNER',
    name: 'Beginner Learning Track',
    description:
      'Gentle, approachable introduction with simplified explanations and quick feedback loops.',
    defaultCategory: 'Development',
    defaultDifficulty: 'Beginner',
    defaultDuration: '6 Weeks',
    skeletonSections: [
      {
        title: '01 Getting Started Without Fear',
        slug: '01-getting-started',
        description: 'Plain English introduction to what computers do and how programs run.',
        sequence: 1,
        sampleNodes: [
          {
            title: 'How Programming Works',
            slug: 'how-programming-works',
            description: 'Understand input, processing, output, and writing instructions.',
            estimatedMinutes: 60,
            topics: ['Computers & Code', 'Variables in Plain English', 'Writing Your First Script'],
          },
        ],
      },
      {
        title: '02 Your First Working Projects',
        slug: '02-first-projects',
        description: 'Small, satisfying micro-projects you can build in an afternoon.',
        sequence: 2,
        sampleNodes: [
          {
            title: 'Interactive Mini Project',
            slug: 'mini-project',
            description: 'Build a small calculator, quiz, or text adventure.',
            estimatedMinutes: 120,
            topics: ['Logic & Conditions', 'User Input', 'Debugging Basics'],
          },
        ],
      },
      {
        title: '03 Choosing Your Career Path',
        slug: '03-next-pathways',
        description: 'Discover whether you enjoy Frontend, Backend, Data, or Testing.',
        sequence: 3,
        sampleNodes: [
          {
            title: 'Exploring Software Specializations',
            slug: 'exploring-specializations',
            description: 'Overview of web, mobile, data, and security careers.',
            estimatedMinutes: 60,
            topics: ['Career Options', 'Next Roadmap Selection', 'Study Habits'],
          },
        ],
      },
    ],
  },

  BEST_PRACTICE: {
    type: 'BEST_PRACTICE',
    name: 'Engineering Best Practice',
    description:
      'Standardized production guidelines for security, performance, code quality, and operations.',
    defaultCategory: 'DevOps & Cloud',
    defaultDifficulty: 'Intermediate',
    defaultDuration: '4 Weeks',
    skeletonSections: [
      {
        title: '01 Principles & Threat Modeling',
        slug: '01-principles',
        description: 'Core security and reliability axioms.',
        sequence: 1,
        sampleNodes: [
          {
            title: 'Core Architecture Principles',
            slug: 'core-principles',
            description: 'Defense in depth, least privilege, and zero trust.',
            estimatedMinutes: 90,
            topics: ['Least Privilege', 'Input Validation', 'Defense in Depth'],
          },
        ],
      },
      {
        title: '02 Implementation Checklist',
        slug: '02-checklist',
        description: 'Actionable audit steps and automated rules.',
        sequence: 2,
        sampleNodes: [
          {
            title: 'Automated Auditing & Tooling',
            slug: 'automated-auditing',
            description: 'Static analysis, dependency scanners, and monitoring.',
            estimatedMinutes: 120,
            topics: ['Static Analysis', 'Secret Scanning', 'Runtime Alerts'],
          },
        ],
      },
    ],
  },
};
