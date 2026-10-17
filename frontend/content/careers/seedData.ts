/**
 * KnowledgePaat — Career & Skill Graph Deterministic Seed Catalog
 * Phase A — Foundation
 */

export interface SeedCareer {
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_months: number;
  display_order: number;
  is_featured: boolean;
  skills: Array<{
    skill_slug: string;
    importance: 'required' | 'recommended' | 'optional';
    proficiency_target: 'beginner' | 'working' | 'proficient' | 'advanced';
    display_order: number;
  }>;
}

export interface SeedSkill {
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  skill_type:
    | 'language'
    | 'framework'
    | 'library'
    | 'database'
    | 'tool'
    | 'platform'
    | 'concept'
    | 'soft_skill'
    | 'domain'
    | 'practice'
    | 'architecture'
    | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  display_order: number;
  is_featured: boolean;
}

export interface SeedRelationship {
  source_slug: string;
  target_slug: string;
  relationship_type: 'prerequisite' | 'related' | 'commonly_used_with' | 'builds_on' | 'alternative';
  strength: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SKILLS (60+ curated foundational skills)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_SKILLS: SeedSkill[] = [
  // Languages
  { slug: 'python', name: 'Python', category: 'software_development', skill_type: 'language', difficulty: 'beginner', display_order: 1, is_featured: true, short_description: 'Versatile, high-level programming language used in backend, data, AI, and automation.', description: 'Python is a widely adopted dynamically typed programming language known for readable syntax and rich ecosystem.' },
  { slug: 'javascript', name: 'JavaScript', category: 'software_development', skill_type: 'language', difficulty: 'beginner', display_order: 2, is_featured: true, short_description: 'The core programming language of the modern web platform.', description: 'JavaScript powers dynamic behavior across client-side web applications and server-side runtimes like Node.js.' },
  { slug: 'typescript', name: 'TypeScript', category: 'software_development', skill_type: 'language', difficulty: 'intermediate', display_order: 3, is_featured: true, short_description: 'Typed superset of JavaScript that compiles to plain JavaScript.', description: 'TypeScript introduces static types, interfaces, and tooling advantages for large-scale application development.' },
  { slug: 'java', name: 'Java', category: 'software_development', skill_type: 'language', difficulty: 'intermediate', display_order: 4, is_featured: false, short_description: 'Class-based, object-oriented language for enterprise backend systems.', description: 'Java powers robust enterprise platforms, Android legacy systems, and distributed backends.' },
  { slug: 'cpp', name: 'C++', category: 'software_development', skill_type: 'language', difficulty: 'advanced', display_order: 5, is_featured: false, short_description: 'High-performance systems programming language with low-level memory control.', description: 'C++ is widely utilized for system drivers, game engines, performance-critical backends, and embedded software.' },
  { slug: 'sql', name: 'SQL', category: 'data', skill_type: 'language', difficulty: 'beginner', display_order: 6, is_featured: true, short_description: 'Standard query language for relational database management systems.', description: 'Structured Query Language (SQL) is used for querying, manipulating, and managing relational databases.' },
  { slug: 'html', name: 'HTML5', category: 'software_development', skill_type: 'language', difficulty: 'beginner', display_order: 7, is_featured: false, short_description: 'Standard markup language for documents designed to be displayed in a web browser.', description: 'HTML provides the structural backbone and semantic accessibility for web pages.' },
  { slug: 'css', name: 'CSS3', category: 'software_development', skill_type: 'language', difficulty: 'beginner', display_order: 8, is_featured: false, short_description: 'Style sheet language used for describing the presentation of web pages.', description: 'CSS controls layout, visual presentation, animations, and responsive media queries across devices.' },
  { slug: 'bash-shell', name: 'Bash & Shell Scripting', category: 'devops_cloud', skill_type: 'language', difficulty: 'intermediate', display_order: 9, is_featured: false, short_description: 'Command line scripting for Unix/Linux automation and system tasks.', description: 'Bash scripts automate developer workflows, deployment pipelines, and server provisioning.' },

  // Frameworks & Libraries
  { slug: 'react', name: 'React', category: 'software_development', skill_type: 'framework', difficulty: 'intermediate', display_order: 10, is_featured: true, short_description: 'Declarative, component-driven JavaScript library for building user interfaces.', description: 'React enables efficient rendering and state-driven UI architecture for modern web applications.' },
  { slug: 'nextjs', name: 'Next.js', category: 'software_development', skill_type: 'framework', difficulty: 'intermediate', display_order: 11, is_featured: true, short_description: 'Production React framework for server components, SSR, and API routes.', description: 'Next.js provides hybrid static & server rendering, file-based routing, and built-in performance optimization.' },
  { slug: 'nodejs', name: 'Node.js', category: 'software_development', skill_type: 'platform', difficulty: 'intermediate', display_order: 12, is_featured: true, short_description: 'Asynchronous event-driven JavaScript runtime environment for backend servers.', description: 'Node.js enables developers to write fast, scalable backend microservices and APIs in JavaScript.' },
  { slug: 'express', name: 'Express.js', category: 'software_development', skill_type: 'framework', difficulty: 'beginner', display_order: 13, is_featured: false, short_description: 'Fast, unopinionated, minimalist web framework for Node.js.', description: 'Express handles HTTP routing, middleware processing, and REST API creation in Node environments.' },
  { slug: 'django', name: 'Django', category: 'software_development', skill_type: 'framework', difficulty: 'intermediate', display_order: 14, is_featured: true, short_description: 'High-level Python web framework that encourages rapid, secure development.', description: 'Django follows the batteries-included philosophy with ORM, authentication, and admin interfaces out of the box.' },
  { slug: 'fastapi', name: 'FastAPI', category: 'software_development', skill_type: 'framework', difficulty: 'intermediate', display_order: 15, is_featured: true, short_description: 'Modern, fast (high-performance) web framework for building APIs with Python 3.8+.', description: 'FastAPI leverages standard Python type hints for automatic validation, serialization, and OpenAPI docs.' },
  { slug: 'spring-boot', name: 'Spring Boot', category: 'software_development', skill_type: 'framework', difficulty: 'advanced', display_order: 16, is_featured: false, short_description: 'Convention-over-configuration Java framework for microservices and cloud backends.', description: 'Spring Boot simplifies production-ready enterprise services with dependency injection and metrics.' },
  { slug: 'pandas', name: 'Pandas', category: 'data', skill_type: 'library', difficulty: 'intermediate', display_order: 17, is_featured: false, short_description: 'Python data manipulation and analysis library with DataFrame structures.', description: 'Pandas provides powerful structures for cleaning, filtering, aggregating, and analyzing tabular datasets.' },
  { slug: 'numpy', name: 'NumPy', category: 'data', skill_type: 'library', difficulty: 'beginner', display_order: 18, is_featured: false, short_description: 'Fundamental package for scientific computing with multi-dimensional arrays in Python.', description: 'NumPy offers high-performance numerical operations and matrix manipulations in Python.' },
  { slug: 'scikit-learn', name: 'Scikit-Learn', category: 'ai_ml', skill_type: 'library', difficulty: 'intermediate', display_order: 19, is_featured: false, short_description: 'Simple and efficient tools for predictive data analysis and classical machine learning.', description: 'Scikit-Learn provides algorithms for classification, regression, clustering, and dimensionality reduction.' },
  { slug: 'pytorch', name: 'PyTorch', category: 'ai_ml', skill_type: 'framework', difficulty: 'advanced', display_order: 20, is_featured: true, short_description: 'Open source machine learning framework that accelerates path from research to production.', description: 'PyTorch provides dynamic computation graphs and GPU acceleration for deep neural networks.' },

  // Databases & Storage
  { slug: 'postgresql', name: 'PostgreSQL', category: 'software_development', skill_type: 'database', difficulty: 'intermediate', display_order: 21, is_featured: true, short_description: 'Powerful, open-source object-relational database system with SQL compliance.', description: 'PostgreSQL excels at ACID transactions, JSONB querying, indexing, and scalable relational data storage.' },
  { slug: 'mysql', name: 'MySQL', category: 'software_development', skill_type: 'database', difficulty: 'beginner', display_order: 22, is_featured: false, short_description: 'Widely deployed open-source relational database management system.', description: 'MySQL powers countless web applications, CMS platforms, and transaction logging systems.' },
  { slug: 'mongodb', name: 'MongoDB', category: 'software_development', skill_type: 'database', difficulty: 'intermediate', display_order: 23, is_featured: false, short_description: 'Document-oriented NoSQL database that stores data in JSON-like BSON documents.', description: 'MongoDB offers flexible schema designs, horizontal scaling via sharding, and document retrieval.' },
  { slug: 'redis', name: 'Redis', category: 'software_development', skill_type: 'database', difficulty: 'intermediate', display_order: 24, is_featured: false, short_description: 'In-memory data structure store used as a distributed cache, message broker, and database.', description: 'Redis provides sub-millisecond responses for sessions, caching layers, and real-time pub/sub.' },

  // Tools & Platforms
  { slug: 'git', name: 'Git', category: 'software_development', skill_type: 'tool', difficulty: 'beginner', display_order: 25, is_featured: true, short_description: 'Distributed version control system for tracking changes in source code.', description: 'Git enables collaborative branching, merging, history inspection, and code version management.' },
  { slug: 'github', name: 'GitHub', category: 'software_development', skill_type: 'platform', difficulty: 'beginner', display_order: 26, is_featured: false, short_description: 'Cloud hosting platform for Git repositories with PR workflows and Actions.', description: 'GitHub hosts version control repositories, peer code reviews, CI workflows, and project issue trackers.' },
  { slug: 'linux', name: 'Linux Fundamentals', category: 'devops_cloud', skill_type: 'platform', difficulty: 'beginner', display_order: 27, is_featured: true, short_description: 'Core concepts of Linux operating systems, permissions, filesystem, and CLI.', description: 'Linux underpins modern cloud infrastructure, server operating systems, and containerized runtimes.' },
  { slug: 'docker', name: 'Docker', category: 'devops_cloud', skill_type: 'tool', difficulty: 'intermediate', display_order: 28, is_featured: true, short_description: 'Containerization platform to package applications and dependencies into standardized containers.', description: 'Docker eliminates environment discrepancies between local development and production deployments.' },
  { slug: 'kubernetes', name: 'Kubernetes', category: 'devops_cloud', skill_type: 'tool', difficulty: 'advanced', display_order: 29, is_featured: true, short_description: 'Open-source container orchestration system for automating application deployment and scaling.', description: 'Kubernetes manages clusters of containerized workloads with declarative configurations and self-healing.' },
  { slug: 'aws', name: 'AWS Cloud', category: 'devops_cloud', skill_type: 'platform', difficulty: 'intermediate', display_order: 30, is_featured: true, short_description: 'Comprehensive cloud computing platform offering compute, storage, and networking services.', description: 'Amazon Web Services provides scalable infrastructure components like EC2, S3, RDS, Lambda, and IAM.' },
  { slug: 'postman', name: 'Postman', category: 'qa_testing', skill_type: 'tool', difficulty: 'beginner', display_order: 31, is_featured: false, short_description: 'API platform for building, mocking, testing, and documenting HTTP APIs.', description: 'Postman simplifies manual and automated API request verification, environment variables, and test suites.' },
  { slug: 'figma', name: 'Figma', category: 'design', skill_type: 'tool', difficulty: 'beginner', display_order: 32, is_featured: true, short_description: 'Collaborative cloud-based interface design and prototyping tool.', description: 'Figma allows designers and product teams to create wireframes, UI components, design systems, and clickable prototypes.' },

  // Concepts & Architecture
  { slug: 'rest-apis', name: 'REST APIs', category: 'software_development', skill_type: 'architecture', difficulty: 'beginner', display_order: 33, is_featured: true, short_description: 'Architectural style for designing networked applications over HTTP.', description: 'REST APIs leverage standard HTTP methods, stateless exchanges, JSON payloads, and clean resource routing.' },
  { slug: 'graphql', name: 'GraphQL', category: 'software_development', skill_type: 'architecture', difficulty: 'intermediate', display_order: 34, is_featured: false, short_description: 'Query language for APIs that lets clients request exactly the data they need.', description: 'GraphQL prevents over-fetching and under-fetching by exposing a strongly typed schema and single endpoint.' },
  { slug: 'microservices', name: 'Microservices Architecture', category: 'software_development', skill_type: 'architecture', difficulty: 'advanced', display_order: 35, is_featured: false, short_description: 'Architectural pattern structuring an application as a collection of loosely coupled services.', description: 'Microservices allow independent deployment, horizontal scaling, and isolated domain boundaries.' },
  { slug: 'system-design', name: 'System Design', category: 'software_development', skill_type: 'architecture', difficulty: 'advanced', display_order: 36, is_featured: true, short_description: 'Designing high-scale, reliable, fault-tolerant distributed system architectures.', description: 'System design encompasses load balancing, caching, database partitioning, CAP theorem, and throughput tuning.' },
  { slug: 'data-structures', name: 'Data Structures', category: 'software_development', skill_type: 'concept', difficulty: 'beginner', display_order: 37, is_featured: true, short_description: 'Fundamental data organization formats such as arrays, linked lists, trees, and hash maps.', description: 'Data structures provide the core building blocks for memory-efficient and algorithmically optimal software.' },
  { slug: 'algorithms', name: 'Algorithms', category: 'software_development', skill_type: 'concept', difficulty: 'intermediate', display_order: 38, is_featured: true, short_description: 'Step-by-step computational procedures for searching, sorting, and optimization.', description: 'Understanding algorithmic complexity (Big-O), recursion, and dynamic programming enables performant software.' },
  { slug: 'ci-cd', name: 'CI/CD Pipelines', category: 'devops_cloud', skill_type: 'practice', difficulty: 'intermediate', display_order: 39, is_featured: true, short_description: 'Automated continuous integration and continuous deployment pipelines.', description: 'CI/CD practices automate build validation, testing, linting, security scans, and production deployments.' },

  // Testing & Quality
  { slug: 'unit-testing', name: 'Unit Testing', category: 'qa_testing', skill_type: 'practice', difficulty: 'beginner', display_order: 40, is_featured: true, short_description: 'Software testing method where individual units or components of code are tested in isolation.', description: 'Unit testing verifies that discrete functions produce expected outputs given known inputs.' },
  { slug: 'automation-testing', name: 'Automation Testing', category: 'qa_testing', skill_type: 'practice', difficulty: 'intermediate', display_order: 41, is_featured: true, short_description: 'Automated execution of test scripts to validate software quality repeatedly.', description: 'Automation testing reduces regression defects, accelerates test cycles, and verifies web flows.' },
  { slug: 'api-testing', name: 'API Testing', category: 'qa_testing', skill_type: 'practice', difficulty: 'intermediate', display_order: 42, is_featured: true, short_description: 'Validating API endpoints for functional correctness, reliability, status codes, and security.', description: 'API testing validates request contracts, schemas, authentication tokens, and payload edge cases.' },
  { slug: 'selenium', name: 'Selenium', category: 'qa_testing', skill_type: 'tool', difficulty: 'intermediate', display_order: 43, is_featured: false, short_description: 'Browser automation framework for end-to-end testing of web applications.', description: 'Selenium controls web browsers programmatically to simulate real user interactions and assertions.' },
  { slug: 'playwright', name: 'Playwright', category: 'qa_testing', skill_type: 'tool', difficulty: 'intermediate', display_order: 44, is_featured: true, short_description: 'Modern, fast end-to-end testing framework for Chromium, Firefox, and WebKit.', description: 'Playwright offers auto-waiting, network interception, multi-tab execution, and resilient selectors.' },
  { slug: 'performance-testing', name: 'Performance & Load Testing', category: 'qa_testing', skill_type: 'practice', difficulty: 'advanced', display_order: 45, is_featured: false, short_description: 'Testing system behavior under expected and peak workloads.', description: 'Load testing validates response latencies, bottlenecks, throughput limits, and resource utilization.' },

  // Data & Analytics & AI
  { slug: 'statistics', name: 'Statistics & Probability', category: 'data', skill_type: 'concept', difficulty: 'beginner', display_order: 46, is_featured: false, short_description: 'Mathematical foundation for inference, hypothesis testing, and quantitative reasoning.', description: 'Statistical concepts enable rigorous data analysis, A/B testing evaluation, and machine learning models.' },
  { slug: 'data-visualization', name: 'Data Visualization', category: 'data', skill_type: 'practice', difficulty: 'beginner', display_order: 47, is_featured: false, short_description: 'Communicating data insights effectively using charts, graphs, and visual dashboards.', description: 'Data visualization turns complex quantitative metrics into actionable business narratives.' },
  { slug: 'power-bi', name: 'Power BI', category: 'data', skill_type: 'tool', difficulty: 'intermediate', display_order: 48, is_featured: true, short_description: 'Interactive business intelligence and data visualization platform by Microsoft.', description: 'Power BI connects to diverse data sources to produce live reports, DAX calculations, and dashboards.' },
  { slug: 'excel', name: 'Advanced Excel', category: 'data', skill_type: 'tool', difficulty: 'beginner', display_order: 49, is_featured: false, short_description: 'Spreadsheet formulas, pivot tables, VLOOKUP/XLOOKUP, and business modeling.', description: 'Excel remains an indispensable enterprise utility for financial modeling and ad-hoc data auditing.' },
  { slug: 'machine-learning', name: 'Machine Learning Fundamentals', category: 'ai_ml', skill_type: 'concept', difficulty: 'intermediate', display_order: 50, is_featured: true, short_description: 'Supervised, unsupervised, and reinforcement learning principles and model evaluation.', description: 'Machine learning algorithms detect patterns in training data to make predictions on unseen samples.' },

  // Security & Product
  { slug: 'cybersecurity-fundamentals', name: 'Cybersecurity Fundamentals', category: 'cybersecurity', skill_type: 'concept', difficulty: 'beginner', display_order: 51, is_featured: true, short_description: 'Core concepts of information security: confidentiality, integrity, availability, and threat models.', description: 'Provides foundational understanding of attack vectors, defense in depth, and access control.' },
  { slug: 'web-security', name: 'Web Application Security', category: 'cybersecurity', skill_type: 'practice', difficulty: 'intermediate', display_order: 52, is_featured: false, short_description: 'Mitigating OWASP Top 10 vulnerabilities including XSS, SQLi, CSRF, and broken auth.', description: 'Practical security engineering to protect web applications against malicious exploitation.' },
  { slug: 'ui-design', name: 'UI Design Principles', category: 'design', skill_type: 'practice', difficulty: 'beginner', display_order: 53, is_featured: false, short_description: 'Visual hierarchy, typography, color theory, and layout composition for digital interfaces.', description: 'UI design creates visually polished, accessible, and intuitive interactive interfaces.' },
  { slug: 'ux-design', name: 'UX Research & Design', category: 'design', skill_type: 'practice', difficulty: 'intermediate', display_order: 54, is_featured: false, short_description: 'User interviews, personas, journey mapping, usability testing, and wireframing.', description: 'UX design focuses on solving user pain points through empathetic research and iterative testing.' },
  { slug: 'product-strategy', name: 'Product Strategy & Discovery', category: 'product', skill_type: 'domain', difficulty: 'intermediate', display_order: 55, is_featured: true, short_description: 'Defining product vision, market validation, feature prioritization, and roadmapping.', description: 'Guides cross-functional teams toward building products that solve validated customer needs.' },
  { slug: 'agile-scrum', name: 'Agile & Scrum Methodologies', category: 'product', skill_type: 'practice', difficulty: 'beginner', display_order: 56, is_featured: false, short_description: 'Iterative product delivery frameworks, sprints, backlog grooming, and standups.', description: 'Agile methodologies facilitate continuous customer delivery and rapid adaptability to change.' }
];

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE CAREERS (15 Industry Roles)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_CAREERS: SeedCareer[] = [
  {
    slug: 'python-developer',
    name: 'Python Developer',
    category: 'software_development',
    difficulty: 'beginner',
    estimated_months: 6,
    display_order: 1,
    is_featured: true,
    short_description: 'Build backend web services, automation scripts, and database integrations using modern Python.',
    description: 'Python developers design server-side application logic, maintain database systems, develop REST APIs, and integrate third-party services. Python is recognized for readability, ecosystem maturity, and versatility across backend, data, and automation domains.',
    skills: [
      { skill_slug: 'python', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 2 },
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'working', display_order: 3 },
      { skill_slug: 'rest-apis', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'django', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'fastapi', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'postgresql', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'beginner', display_order: 8 },
      { skill_slug: 'unit-testing', importance: 'recommended', proficiency_target: 'working', display_order: 9 },
      { skill_slug: 'redis', importance: 'optional', proficiency_target: 'beginner', display_order: 10 },
      { skill_slug: 'aws', importance: 'optional', proficiency_target: 'beginner', display_order: 11 },
      { skill_slug: 'system-design', importance: 'optional', proficiency_target: 'beginner', display_order: 12 },
    ],
  },
  {
    slug: 'frontend-developer',
    name: 'Frontend Developer',
    category: 'software_development',
    difficulty: 'beginner',
    estimated_months: 6,
    display_order: 2,
    is_featured: true,
    short_description: 'Create responsive, high-performance web user interfaces with React, TypeScript, and modern CSS.',
    description: 'Frontend developers build client-facing web applications. They translate Figma UI designs into interactive, accessible, and fast web experiences using HTML5, CSS3, modern JavaScript, and React.',
    skills: [
      { skill_slug: 'html', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'css', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'javascript', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'typescript', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'react', importance: 'required', proficiency_target: 'proficient', display_order: 5 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'nextjs', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'rest-apis', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'unit-testing', importance: 'recommended', proficiency_target: 'beginner', display_order: 9 },
      { skill_slug: 'figma', importance: 'recommended', proficiency_target: 'working', display_order: 10 },
      { skill_slug: 'graphql', importance: 'optional', proficiency_target: 'beginner', display_order: 11 },
      { skill_slug: 'docker', importance: 'optional', proficiency_target: 'beginner', display_order: 12 },
    ],
  },
  {
    slug: 'backend-developer',
    name: 'Backend Developer',
    category: 'software_development',
    difficulty: 'intermediate',
    estimated_months: 7,
    display_order: 3,
    is_featured: true,
    short_description: 'Architect scalable web APIs, relational data models, caching layers, and microservices.',
    description: 'Backend developers engineer the core business logic, database integrations, authentication services, and API architectures that power user-facing applications.',
    skills: [
      { skill_slug: 'nodejs', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'typescript', importance: 'required', proficiency_target: 'working', display_order: 2 },
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'postgresql', importance: 'required', proficiency_target: 'proficient', display_order: 4 },
      { skill_slug: 'rest-apis', importance: 'required', proficiency_target: 'proficient', display_order: 5 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'redis', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'system-design', importance: 'recommended', proficiency_target: 'working', display_order: 9 },
      { skill_slug: 'unit-testing', importance: 'recommended', proficiency_target: 'working', display_order: 10 },
      { skill_slug: 'aws', importance: 'optional', proficiency_target: 'beginner', display_order: 11 },
      { skill_slug: 'microservices', importance: 'optional', proficiency_target: 'beginner', display_order: 12 },
    ],
  },
  {
    slug: 'full-stack-developer',
    name: 'Full Stack Developer',
    category: 'software_development',
    difficulty: 'intermediate',
    estimated_months: 9,
    display_order: 4,
    is_featured: true,
    short_description: 'Master both client and server development to ship end-to-end web applications independently.',
    description: 'Full stack developers navigate the complete software stack: crafting responsive React interfaces, implementing Node/Python server logic, configuring database models, and deploying production code.',
    skills: [
      { skill_slug: 'javascript', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'typescript', importance: 'required', proficiency_target: 'working', display_order: 2 },
      { skill_slug: 'react', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'nodejs', importance: 'required', proficiency_target: 'proficient', display_order: 4 },
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'rest-apis', importance: 'required', proficiency_target: 'proficient', display_order: 7 },
      { skill_slug: 'nextjs', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'postgresql', importance: 'recommended', proficiency_target: 'working', display_order: 9 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'beginner', display_order: 10 },
      { skill_slug: 'system-design', importance: 'recommended', proficiency_target: 'beginner', display_order: 11 },
      { skill_slug: 'aws', importance: 'optional', proficiency_target: 'beginner', display_order: 12 },
    ],
  },
  {
    slug: 'qa-automation-engineer',
    name: 'QA Automation Engineer',
    category: 'qa_testing',
    difficulty: 'beginner',
    estimated_months: 6,
    display_order: 5,
    is_featured: true,
    short_description: 'Design automated test suites, end-to-end browser tests, and API validation in CI/CD.',
    description: 'QA Automation Engineers verify software reliability through automated test harnesses. They write programmatic scripts with Playwright, Selenium, and Python to catch regressions early.',
    skills: [
      { skill_slug: 'unit-testing', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'python', importance: 'required', proficiency_target: 'working', display_order: 2 },
      { skill_slug: 'automation-testing', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'api-testing', importance: 'required', proficiency_target: 'proficient', display_order: 4 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'playwright', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'selenium', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'sql', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'ci-cd', importance: 'recommended', proficiency_target: 'beginner', display_order: 9 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'beginner', display_order: 10 },
      { skill_slug: 'performance-testing', importance: 'optional', proficiency_target: 'beginner', display_order: 11 },
    ],
  },
  {
    slug: 'data-analyst',
    name: 'Data Analyst',
    category: 'data',
    difficulty: 'beginner',
    estimated_months: 5,
    display_order: 6,
    is_featured: true,
    short_description: 'Extract business insights using SQL, Excel, Python dataframes, and Power BI dashboards.',
    description: 'Data analysts interpret metrics, design interactive executive dashboards, and formulate data-driven strategic recommendations for stakeholders.',
    skills: [
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'excel', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'statistics', importance: 'required', proficiency_target: 'working', display_order: 3 },
      { skill_slug: 'data-visualization', importance: 'required', proficiency_target: 'proficient', display_order: 4 },
      { skill_slug: 'power-bi', importance: 'recommended', proficiency_target: 'proficient', display_order: 5 },
      { skill_slug: 'python', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'pandas', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'postgresql', importance: 'optional', proficiency_target: 'working', display_order: 8 },
    ],
  },
  {
    slug: 'data-scientist',
    name: 'Data Scientist',
    category: 'data',
    difficulty: 'intermediate',
    estimated_months: 8,
    display_order: 7,
    is_featured: true,
    short_description: 'Build predictive machine learning models, statistical experiments, and data pipelines.',
    description: 'Data scientists combine statistical rigor, machine learning algorithms, and deep domain understanding to solve complex quantitative forecasting and classification challenges.',
    skills: [
      { skill_slug: 'python', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'statistics', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'pandas', importance: 'required', proficiency_target: 'proficient', display_order: 4 },
      { skill_slug: 'numpy', importance: 'required', proficiency_target: 'proficient', display_order: 5 },
      { skill_slug: 'scikit-learn', importance: 'required', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'machine-learning', importance: 'required', proficiency_target: 'proficient', display_order: 7 },
      { skill_slug: 'data-visualization', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'pytorch', importance: 'optional', proficiency_target: 'beginner', display_order: 9 },
      { skill_slug: 'git', importance: 'recommended', proficiency_target: 'working', display_order: 10 },
    ],
  },
  {
    slug: 'ai-engineer',
    name: 'AI Engineer',
    category: 'ai_ml',
    difficulty: 'advanced',
    estimated_months: 9,
    display_order: 8,
    is_featured: true,
    short_description: 'Deploy deep learning models, LLM systems, and high-throughput inference APIs.',
    description: 'AI engineers bridge machine learning prototypes into production infrastructure, building inference pipelines, model evaluation metrics, and AI-enabled software features.',
    skills: [
      { skill_slug: 'python', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'machine-learning', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'pytorch', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'rest-apis', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'fastapi', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'algorithms', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'aws', importance: 'optional', proficiency_target: 'beginner', display_order: 8 },
    ],
  },
  {
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    category: 'ai_ml',
    difficulty: 'advanced',
    estimated_months: 9,
    display_order: 9,
    is_featured: false,
    short_description: 'Design MLOps pipelines, model training workflows, and production model serving.',
    description: 'ML Engineers focus on scaling machine learning in enterprise production: automated model retraining, dataset versioning, GPU acceleration, and low-latency inference APIs.',
    skills: [
      { skill_slug: 'python', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'machine-learning', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'scikit-learn', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'pytorch', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'sql', importance: 'required', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'docker', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'fastapi', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'ci-cd', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'kubernetes', importance: 'optional', proficiency_target: 'beginner', display_order: 9 },
    ],
  },
  {
    slug: 'devops-engineer',
    name: 'DevOps Engineer',
    category: 'devops_cloud',
    difficulty: 'intermediate',
    estimated_months: 7,
    display_order: 10,
    is_featured: true,
    short_description: 'Automate infrastructure as code, CI/CD pipelines, Docker containers, and Kubernetes clusters.',
    description: 'DevOps Engineers ensure software delivery reliability, maintain automated release pipelines, manage cloud resources, and optimize system uptime and observability.',
    skills: [
      { skill_slug: 'linux', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'docker', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'kubernetes', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'ci-cd', importance: 'required', proficiency_target: 'proficient', display_order: 5 },
      { skill_slug: 'aws', importance: 'required', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'bash-shell', importance: 'required', proficiency_target: 'proficient', display_order: 7 },
      { skill_slug: 'python', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'system-design', importance: 'recommended', proficiency_target: 'working', display_order: 9 },
      { skill_slug: 'web-security', importance: 'optional', proficiency_target: 'beginner', display_order: 10 },
    ],
  },
  {
    slug: 'cloud-engineer',
    name: 'Cloud Engineer',
    category: 'devops_cloud',
    difficulty: 'intermediate',
    estimated_months: 7,
    display_order: 11,
    is_featured: false,
    short_description: 'Deploy, configure, and secure enterprise architectures on cloud service platforms like AWS.',
    description: 'Cloud Engineers design scalable cloud infrastructure, virtual networks, identity policies, storage buckets, and serverless compute functions.',
    skills: [
      { skill_slug: 'aws', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'linux', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'docker', importance: 'required', proficiency_target: 'working', display_order: 3 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'kubernetes', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'ci-cd', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'python', importance: 'recommended', proficiency_target: 'working', display_order: 7 },
      { skill_slug: 'system-design', importance: 'recommended', proficiency_target: 'working', display_order: 8 },
      { skill_slug: 'web-security', importance: 'recommended', proficiency_target: 'working', display_order: 9 },
    ],
  },
  {
    slug: 'cybersecurity-analyst',
    name: 'Cybersecurity Analyst',
    category: 'cybersecurity',
    difficulty: 'intermediate',
    estimated_months: 7,
    display_order: 12,
    is_featured: true,
    short_description: 'Protect application assets, perform vulnerability assessments, and safeguard sensitive data.',
    description: 'Cybersecurity analysts assess systems for security weaknesses, analyze threat alerts, implement defensive security protocols, and enforce security policies.',
    skills: [
      { skill_slug: 'cybersecurity-fundamentals', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'linux', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'web-security', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'bash-shell', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'python', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'git', importance: 'recommended', proficiency_target: 'working', display_order: 6 },
      { skill_slug: 'docker', importance: 'optional', proficiency_target: 'beginner', display_order: 7 },
    ],
  },
  {
    slug: 'mobile-developer',
    name: 'Mobile Developer (Cross-Platform)',
    category: 'software_development',
    difficulty: 'intermediate',
    estimated_months: 6,
    display_order: 13,
    is_featured: false,
    short_description: 'Build native-feeling iOS and Android mobile applications using React Native and modern APIs.',
    description: 'Mobile developers construct performant applications for handheld mobile devices, handling offline persistence, touch gestures, and device APIs.',
    skills: [
      { skill_slug: 'typescript', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'react', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'git', importance: 'required', proficiency_target: 'working', display_order: 3 },
      { skill_slug: 'rest-apis', importance: 'required', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'unit-testing', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'nodejs', importance: 'recommended', proficiency_target: 'beginner', display_order: 6 },
      { skill_slug: 'figma', importance: 'optional', proficiency_target: 'beginner', display_order: 7 },
    ],
  },
  {
    slug: 'ui-ux-designer',
    name: 'UI/UX Designer',
    category: 'design',
    difficulty: 'beginner',
    estimated_months: 5,
    display_order: 14,
    is_featured: true,
    short_description: 'Design intuitive digital experiences, design systems, wireframes, and interactive prototypes.',
    description: 'UI/UX designers craft visually stunning, highly accessible product flows through user research, wireframing, component systems, and design tokens.',
    skills: [
      { skill_slug: 'figma', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'ui-design', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'ux-design', importance: 'required', proficiency_target: 'proficient', display_order: 3 },
      { skill_slug: 'html', importance: 'recommended', proficiency_target: 'working', display_order: 4 },
      { skill_slug: 'css', importance: 'recommended', proficiency_target: 'working', display_order: 5 },
      { skill_slug: 'agile-scrum', importance: 'recommended', proficiency_target: 'beginner', display_order: 6 },
    ],
  },
  {
    slug: 'product-manager',
    name: 'Technical Product Manager',
    category: 'product',
    difficulty: 'intermediate',
    estimated_months: 6,
    display_order: 15,
    is_featured: false,
    short_description: 'Drive feature prioritization, customer requirements, cross-functional sprints, and product metrics.',
    description: 'Technical product managers align business objectives with engineering execution, analyzing data analytics, defining user stories, and managing release roadmaps.',
    skills: [
      { skill_slug: 'product-strategy', importance: 'required', proficiency_target: 'proficient', display_order: 1 },
      { skill_slug: 'agile-scrum', importance: 'required', proficiency_target: 'proficient', display_order: 2 },
      { skill_slug: 'data-visualization', importance: 'recommended', proficiency_target: 'working', display_order: 3 },
      { skill_slug: 'sql', importance: 'optional', proficiency_target: 'beginner', display_order: 4 },
      { skill_slug: 'figma', importance: 'optional', proficiency_target: 'beginner', display_order: 5 },
      { skill_slug: 'system-design', importance: 'optional', proficiency_target: 'beginner', display_order: 6 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SKILL RELATIONSHIPS (Prerequisites & Graph Edges — ZERO CYCLES)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_RELATIONSHIPS: SeedRelationship[] = [
  // Web Foundations -> Advanced Web
  { source_slug: 'html', target_slug: 'css', relationship_type: 'prerequisite', strength: 1.0, notes: 'HTML structure precedes CSS styling.' },
  { source_slug: 'html', target_slug: 'javascript', relationship_type: 'prerequisite', strength: 1.0, notes: 'DOM structure is required to manipulate dynamic elements.' },
  { source_slug: 'javascript', target_slug: 'typescript', relationship_type: 'prerequisite', strength: 1.0, notes: 'TypeScript builds on JavaScript syntax with static typing.' },
  { source_slug: 'javascript', target_slug: 'react', relationship_type: 'prerequisite', strength: 1.0, notes: 'React is a library built on modern JavaScript.' },
  { source_slug: 'react', target_slug: 'nextjs', relationship_type: 'prerequisite', strength: 1.0, notes: 'Next.js extends React with server rendering and routing.' },
  { source_slug: 'javascript', target_slug: 'nodejs', relationship_type: 'prerequisite', strength: 1.0, notes: 'Node.js is a server runtime executing JavaScript.' },
  { source_slug: 'nodejs', target_slug: 'express', relationship_type: 'prerequisite', strength: 1.0, notes: 'Express is a framework running on Node.js.' },

  // Python -> Backend / Data / AI
  { source_slug: 'python', target_slug: 'django', relationship_type: 'prerequisite', strength: 1.0, notes: 'Django requires foundational Python knowledge.' },
  { source_slug: 'python', target_slug: 'fastapi', relationship_type: 'prerequisite', strength: 1.0, notes: 'FastAPI requires modern Python type hints.' },
  { source_slug: 'python', target_slug: 'pandas', relationship_type: 'prerequisite', strength: 1.0, notes: 'Pandas dataframes are manipulated in Python.' },
  { source_slug: 'python', target_slug: 'numpy', relationship_type: 'prerequisite', strength: 1.0, notes: 'NumPy arrays are the numerical basis of Python data computing.' },
  { source_slug: 'numpy', target_slug: 'scikit-learn', relationship_type: 'prerequisite', strength: 1.0, notes: 'Scikit-learn algorithms operate on NumPy matrices.' },
  { source_slug: 'python', target_slug: 'scikit-learn', relationship_type: 'prerequisite', strength: 1.0, notes: 'Python is the host language for Scikit-Learn.' },
  { source_slug: 'scikit-learn', target_slug: 'machine-learning', relationship_type: 'builds_on', strength: 1.0, notes: 'Scikit-Learn implements core ML algorithms.' },
  { source_slug: 'machine-learning', target_slug: 'pytorch', relationship_type: 'prerequisite', strength: 1.0, notes: 'Deep learning in PyTorch requires basic ML understanding.' },

  // SQL -> Relational Databases
  { source_slug: 'sql', target_slug: 'postgresql', relationship_type: 'prerequisite', strength: 1.0, notes: 'SQL is the query syntax for PostgreSQL.' },
  { source_slug: 'sql', target_slug: 'mysql', relationship_type: 'prerequisite', strength: 1.0, notes: 'SQL is the query syntax for MySQL.' },

  // Version Control & DevOps
  { source_slug: 'git', target_slug: 'github', relationship_type: 'prerequisite', strength: 1.0, notes: 'GitHub hosts Git repositories.' },
  { source_slug: 'git', target_slug: 'ci-cd', relationship_type: 'prerequisite', strength: 1.0, notes: 'CI/CD workflows trigger on Git commits.' },
  { source_slug: 'linux', target_slug: 'bash-shell', relationship_type: 'prerequisite', strength: 1.0, notes: 'Bash scripts automate Linux shell commands.' },
  { source_slug: 'linux', target_slug: 'docker', relationship_type: 'prerequisite', strength: 1.0, notes: 'Docker containers isolate Linux kernel processes.' },
  { source_slug: 'docker', target_slug: 'kubernetes', relationship_type: 'prerequisite', strength: 1.0, notes: 'Kubernetes orchestrates Docker containers.' },

  // Testing
  { source_slug: 'unit-testing', target_slug: 'automation-testing', relationship_type: 'prerequisite', strength: 1.0, notes: 'Automation test suites expand on unit test assertions.' },
  { source_slug: 'automation-testing', target_slug: 'selenium', relationship_type: 'prerequisite', strength: 1.0, notes: 'Selenium implements browser automation.' },
  { source_slug: 'automation-testing', target_slug: 'playwright', relationship_type: 'prerequisite', strength: 1.0, notes: 'Playwright implements browser automation.' },

  // Concepts & Architecture
  { source_slug: 'rest-apis', target_slug: 'graphql', relationship_type: 'related', strength: 0.8, notes: 'GraphQL is an alternative API paradigm to REST.' },
  { source_slug: 'data-structures', target_slug: 'algorithms', relationship_type: 'prerequisite', strength: 1.0, notes: 'Algorithms operate on underlying data structures.' },
  { source_slug: 'algorithms', target_slug: 'system-design', relationship_type: 'prerequisite', strength: 1.0, notes: 'System scaling decisions rely on algorithmic complexity.' },
  { source_slug: 'cybersecurity-fundamentals', target_slug: 'web-security', relationship_type: 'prerequisite', strength: 1.0, notes: 'Web security applies general security foundations.' },

  // Non-prerequisite relationships
  { source_slug: 'react', target_slug: 'nextjs', relationship_type: 'builds_on', strength: 1.0 },
  { source_slug: 'django', target_slug: 'postgresql', relationship_type: 'commonly_used_with', strength: 1.0 },
  { source_slug: 'fastapi', target_slug: 'docker', relationship_type: 'commonly_used_with', strength: 1.0 },
  { source_slug: 'postgresql', target_slug: 'redis', relationship_type: 'commonly_used_with', strength: 0.9 },
  { source_slug: 'selenium', target_slug: 'playwright', relationship_type: 'alternative', strength: 1.0 },
];
