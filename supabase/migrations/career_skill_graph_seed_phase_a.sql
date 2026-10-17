-- ============================================================
-- DATA ONLY: REVIEWED INSERT-ONLY SEEDS (CAREERS, SKILLS, GRAPH)
--
-- Seed counts:
--   - Skills: 56 Reusable Foundation Skills
--   - Careers: 15 Industry Career Tracks
--   - Relationships: 34 Cycle-Free Graph Edges
--
-- Apply schema and hardening separately. Existing rows are never overwritten. New careers remain drafts; review and publish through admin.
-- ============================================================

DO $$
DECLARE
  v_career_id UUID;
  v_skill_id UUID;
  v_source_id UUID;
  v_target_id UUID;
BEGIN

  -- ─────────────────────────────────────────────────────────────
  -- 1. SEED SKILLS
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'python', 'Python', 'Versatile, high-level programming language used in backend, data, AI, and automation.', 'Python is a widely adopted dynamically typed programming language known for readable syntax and rich ecosystem.',
    'software_development', 'language', 'beginner', 'published', 1, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'javascript', 'JavaScript', 'The core programming language of the modern web platform.', 'JavaScript powers dynamic behavior across client-side web applications and server-side runtimes like Node.js.',
    'software_development', 'language', 'beginner', 'published', 2, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'typescript', 'TypeScript', 'Typed superset of JavaScript that compiles to plain JavaScript.', 'TypeScript introduces static types, interfaces, and tooling advantages for large-scale application development.',
    'software_development', 'language', 'intermediate', 'published', 3, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'java', 'Java', 'Class-based, object-oriented language for enterprise backend systems.', 'Java powers robust enterprise platforms, Android legacy systems, and distributed backends.',
    'software_development', 'language', 'intermediate', 'published', 4, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'cpp', 'C++', 'High-performance systems programming language with low-level memory control.', 'C++ is widely utilized for system drivers, game engines, performance-critical backends, and embedded software.',
    'software_development', 'language', 'advanced', 'published', 5, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'sql', 'SQL', 'Standard query language for relational database management systems.', 'Structured Query Language (SQL) is used for querying, manipulating, and managing relational databases.',
    'data', 'language', 'beginner', 'published', 6, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'html', 'HTML5', 'Standard markup language for documents designed to be displayed in a web browser.', 'HTML provides the structural backbone and semantic accessibility for web pages.',
    'software_development', 'language', 'beginner', 'published', 7, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'css', 'CSS3', 'Style sheet language used for describing the presentation of web pages.', 'CSS controls layout, visual presentation, animations, and responsive media queries across devices.',
    'software_development', 'language', 'beginner', 'published', 8, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'bash-shell', 'Bash & Shell Scripting', 'Command line scripting for Unix/Linux automation and system tasks.', 'Bash scripts automate developer workflows, deployment pipelines, and server provisioning.',
    'devops_cloud', 'language', 'intermediate', 'published', 9, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'react', 'React', 'Declarative, component-driven JavaScript library for building user interfaces.', 'React enables efficient rendering and state-driven UI architecture for modern web applications.',
    'software_development', 'framework', 'intermediate', 'published', 10, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'nextjs', 'Next.js', 'Production React framework for server components, SSR, and API routes.', 'Next.js provides hybrid static & server rendering, file-based routing, and built-in performance optimization.',
    'software_development', 'framework', 'intermediate', 'published', 11, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'nodejs', 'Node.js', 'Asynchronous event-driven JavaScript runtime environment for backend servers.', 'Node.js enables developers to write fast, scalable backend microservices and APIs in JavaScript.',
    'software_development', 'platform', 'intermediate', 'published', 12, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'express', 'Express.js', 'Fast, unopinionated, minimalist web framework for Node.js.', 'Express handles HTTP routing, middleware processing, and REST API creation in Node environments.',
    'software_development', 'framework', 'beginner', 'published', 13, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'django', 'Django', 'High-level Python web framework that encourages rapid, secure development.', 'Django follows the batteries-included philosophy with ORM, authentication, and admin interfaces out of the box.',
    'software_development', 'framework', 'intermediate', 'published', 14, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'fastapi', 'FastAPI', 'Modern, fast (high-performance) web framework for building APIs with Python 3.8+.', 'FastAPI leverages standard Python type hints for automatic validation, serialization, and OpenAPI docs.',
    'software_development', 'framework', 'intermediate', 'published', 15, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'spring-boot', 'Spring Boot', 'Convention-over-configuration Java framework for microservices and cloud backends.', 'Spring Boot simplifies production-ready enterprise services with dependency injection and metrics.',
    'software_development', 'framework', 'advanced', 'published', 16, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'pandas', 'Pandas', 'Python data manipulation and analysis library with DataFrame structures.', 'Pandas provides powerful structures for cleaning, filtering, aggregating, and analyzing tabular datasets.',
    'data', 'library', 'intermediate', 'published', 17, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'numpy', 'NumPy', 'Fundamental package for scientific computing with multi-dimensional arrays in Python.', 'NumPy offers high-performance numerical operations and matrix manipulations in Python.',
    'data', 'library', 'beginner', 'published', 18, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'scikit-learn', 'Scikit-Learn', 'Simple and efficient tools for predictive data analysis and classical machine learning.', 'Scikit-Learn provides algorithms for classification, regression, clustering, and dimensionality reduction.',
    'ai_ml', 'library', 'intermediate', 'published', 19, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'pytorch', 'PyTorch', 'Open source machine learning framework that accelerates path from research to production.', 'PyTorch provides dynamic computation graphs and GPU acceleration for deep neural networks.',
    'ai_ml', 'framework', 'advanced', 'published', 20, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'postgresql', 'PostgreSQL', 'Powerful, open-source object-relational database system with SQL compliance.', 'PostgreSQL excels at ACID transactions, JSONB querying, indexing, and scalable relational data storage.',
    'software_development', 'database', 'intermediate', 'published', 21, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'mysql', 'MySQL', 'Widely deployed open-source relational database management system.', 'MySQL powers countless web applications, CMS platforms, and transaction logging systems.',
    'software_development', 'database', 'beginner', 'published', 22, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'mongodb', 'MongoDB', 'Document-oriented NoSQL database that stores data in JSON-like BSON documents.', 'MongoDB offers flexible schema designs, horizontal scaling via sharding, and document retrieval.',
    'software_development', 'database', 'intermediate', 'published', 23, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'redis', 'Redis', 'In-memory data structure store used as a distributed cache, message broker, and database.', 'Redis provides sub-millisecond responses for sessions, caching layers, and real-time pub/sub.',
    'software_development', 'database', 'intermediate', 'published', 24, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'git', 'Git', 'Distributed version control system for tracking changes in source code.', 'Git enables collaborative branching, merging, history inspection, and code version management.',
    'software_development', 'tool', 'beginner', 'published', 25, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'github', 'GitHub', 'Cloud hosting platform for Git repositories with PR workflows and Actions.', 'GitHub hosts version control repositories, peer code reviews, CI workflows, and project issue trackers.',
    'software_development', 'platform', 'beginner', 'published', 26, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'linux', 'Linux Fundamentals', 'Core concepts of Linux operating systems, permissions, filesystem, and CLI.', 'Linux underpins modern cloud infrastructure, server operating systems, and containerized runtimes.',
    'devops_cloud', 'platform', 'beginner', 'published', 27, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'docker', 'Docker', 'Containerization platform to package applications and dependencies into standardized containers.', 'Docker eliminates environment discrepancies between local development and production deployments.',
    'devops_cloud', 'tool', 'intermediate', 'published', 28, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'kubernetes', 'Kubernetes', 'Open-source container orchestration system for automating application deployment and scaling.', 'Kubernetes manages clusters of containerized workloads with declarative configurations and self-healing.',
    'devops_cloud', 'tool', 'advanced', 'published', 29, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'aws', 'AWS Cloud', 'Comprehensive cloud computing platform offering compute, storage, and networking services.', 'Amazon Web Services provides scalable infrastructure components like EC2, S3, RDS, Lambda, and IAM.',
    'devops_cloud', 'platform', 'intermediate', 'published', 30, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'postman', 'Postman', 'API platform for building, mocking, testing, and documenting HTTP APIs.', 'Postman simplifies manual and automated API request verification, environment variables, and test suites.',
    'qa_testing', 'tool', 'beginner', 'published', 31, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'figma', 'Figma', 'Collaborative cloud-based interface design and prototyping tool.', 'Figma allows designers and product teams to create wireframes, UI components, design systems, and clickable prototypes.',
    'design', 'tool', 'beginner', 'published', 32, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'rest-apis', 'REST APIs', 'Architectural style for designing networked applications over HTTP.', 'REST APIs leverage standard HTTP methods, stateless exchanges, JSON payloads, and clean resource routing.',
    'software_development', 'architecture', 'beginner', 'published', 33, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'graphql', 'GraphQL', 'Query language for APIs that lets clients request exactly the data they need.', 'GraphQL prevents over-fetching and under-fetching by exposing a strongly typed schema and single endpoint.',
    'software_development', 'architecture', 'intermediate', 'published', 34, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'microservices', 'Microservices Architecture', 'Architectural pattern structuring an application as a collection of loosely coupled services.', 'Microservices allow independent deployment, horizontal scaling, and isolated domain boundaries.',
    'software_development', 'architecture', 'advanced', 'published', 35, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'system-design', 'System Design', 'Designing high-scale, reliable, fault-tolerant distributed system architectures.', 'System design encompasses load balancing, caching, database partitioning, CAP theorem, and throughput tuning.',
    'software_development', 'architecture', 'advanced', 'published', 36, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'data-structures', 'Data Structures', 'Fundamental data organization formats such as arrays, linked lists, trees, and hash maps.', 'Data structures provide the core building blocks for memory-efficient and algorithmically optimal software.',
    'software_development', 'concept', 'beginner', 'published', 37, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'algorithms', 'Algorithms', 'Step-by-step computational procedures for searching, sorting, and optimization.', 'Understanding algorithmic complexity (Big-O), recursion, and dynamic programming enables performant software.',
    'software_development', 'concept', 'intermediate', 'published', 38, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'ci-cd', 'CI/CD Pipelines', 'Automated continuous integration and continuous deployment pipelines.', 'CI/CD practices automate build validation, testing, linting, security scans, and production deployments.',
    'devops_cloud', 'practice', 'intermediate', 'published', 39, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'unit-testing', 'Unit Testing', 'Software testing method where individual units or components of code are tested in isolation.', 'Unit testing verifies that discrete functions produce expected outputs given known inputs.',
    'qa_testing', 'practice', 'beginner', 'published', 40, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'automation-testing', 'Automation Testing', 'Automated execution of test scripts to validate software quality repeatedly.', 'Automation testing reduces regression defects, accelerates test cycles, and verifies web flows.',
    'qa_testing', 'practice', 'intermediate', 'published', 41, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'api-testing', 'API Testing', 'Validating API endpoints for functional correctness, reliability, status codes, and security.', 'API testing validates request contracts, schemas, authentication tokens, and payload edge cases.',
    'qa_testing', 'practice', 'intermediate', 'published', 42, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'selenium', 'Selenium', 'Browser automation framework for end-to-end testing of web applications.', 'Selenium controls web browsers programmatically to simulate real user interactions and assertions.',
    'qa_testing', 'tool', 'intermediate', 'published', 43, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'playwright', 'Playwright', 'Modern, fast end-to-end testing framework for Chromium, Firefox, and WebKit.', 'Playwright offers auto-waiting, network interception, multi-tab execution, and resilient selectors.',
    'qa_testing', 'tool', 'intermediate', 'published', 44, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'performance-testing', 'Performance & Load Testing', 'Testing system behavior under expected and peak workloads.', 'Load testing validates response latencies, bottlenecks, throughput limits, and resource utilization.',
    'qa_testing', 'practice', 'advanced', 'published', 45, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'statistics', 'Statistics & Probability', 'Mathematical foundation for inference, hypothesis testing, and quantitative reasoning.', 'Statistical concepts enable rigorous data analysis, A/B testing evaluation, and machine learning models.',
    'data', 'concept', 'beginner', 'published', 46, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'data-visualization', 'Data Visualization', 'Communicating data insights effectively using charts, graphs, and visual dashboards.', 'Data visualization turns complex quantitative metrics into actionable business narratives.',
    'data', 'practice', 'beginner', 'published', 47, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'power-bi', 'Power BI', 'Interactive business intelligence and data visualization platform by Microsoft.', 'Power BI connects to diverse data sources to produce live reports, DAX calculations, and dashboards.',
    'data', 'tool', 'intermediate', 'published', 48, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'excel', 'Advanced Excel', 'Spreadsheet formulas, pivot tables, VLOOKUP/XLOOKUP, and business modeling.', 'Excel remains an indispensable enterprise utility for financial modeling and ad-hoc data auditing.',
    'data', 'tool', 'beginner', 'published', 49, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'machine-learning', 'Machine Learning Fundamentals', 'Supervised, unsupervised, and reinforcement learning principles and model evaluation.', 'Machine learning algorithms detect patterns in training data to make predictions on unseen samples.',
    'ai_ml', 'concept', 'intermediate', 'published', 50, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'cybersecurity-fundamentals', 'Cybersecurity Fundamentals', 'Core concepts of information security: confidentiality, integrity, availability, and threat models.', 'Provides foundational understanding of attack vectors, defense in depth, and access control.',
    'cybersecurity', 'concept', 'beginner', 'published', 51, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'web-security', 'Web Application Security', 'Mitigating OWASP Top 10 vulnerabilities including XSS, SQLi, CSRF, and broken auth.', 'Practical security engineering to protect web applications against malicious exploitation.',
    'cybersecurity', 'practice', 'intermediate', 'published', 52, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'ui-design', 'UI Design Principles', 'Visual hierarchy, typography, color theory, and layout composition for digital interfaces.', 'UI design creates visually polished, accessible, and intuitive interactive interfaces.',
    'design', 'practice', 'beginner', 'published', 53, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'ux-design', 'UX Research & Design', 'User interviews, personas, journey mapping, usability testing, and wireframing.', 'UX design focuses on solving user pain points through empathetic research and iterative testing.',
    'design', 'practice', 'intermediate', 'published', 54, false
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'product-strategy', 'Product Strategy & Discovery', 'Defining product vision, market validation, feature prioritization, and roadmapping.', 'Guides cross-functional teams toward building products that solve validated customer needs.',
    'product', 'domain', 'intermediate', 'published', 55, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO skill_catalog (
    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured
  ) VALUES (
    'agile-scrum', 'Agile & Scrum Methodologies', 'Iterative product delivery frameworks, sprints, backlog grooming, and standups.', 'Agile methodologies facilitate continuous customer delivery and rapid adaptability to change.',
    'product', 'practice', 'beginner', 'published', 56, false
  ) ON CONFLICT (slug) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────
  -- 2. SEED CAREERS
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'python-developer', 'Python Developer', 'Build backend web services, automation scripts, and database integrations using modern Python.', 'Python developers design server-side application logic, maintain database systems, develop REST APIs, and integrate third-party services. Python is recognized for readability, ecosystem maturity, and versatility across backend, data, and automation domains.',
    'software_development', 'beginner', 6, 'draft', 1, true,
    'Python Developer Career Track | KnowledgePaat', 'Build backend web services, automation scripts, and database integrations using modern Python.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'frontend-developer', 'Frontend Developer', 'Create responsive, high-performance web user interfaces with React, TypeScript, and modern CSS.', 'Frontend developers build client-facing web applications. They translate Figma UI designs into interactive, accessible, and fast web experiences using HTML5, CSS3, modern JavaScript, and React.',
    'software_development', 'beginner', 6, 'draft', 2, true,
    'Frontend Developer Career Track | KnowledgePaat', 'Create responsive, high-performance web user interfaces with React, TypeScript, and modern CSS.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'backend-developer', 'Backend Developer', 'Architect scalable web APIs, relational data models, caching layers, and microservices.', 'Backend developers engineer the core business logic, database integrations, authentication services, and API architectures that power user-facing applications.',
    'software_development', 'intermediate', 7, 'draft', 3, true,
    'Backend Developer Career Track | KnowledgePaat', 'Architect scalable web APIs, relational data models, caching layers, and microservices.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'full-stack-developer', 'Full Stack Developer', 'Master both client and server development to ship end-to-end web applications independently.', 'Full stack developers navigate the complete software stack: crafting responsive React interfaces, implementing Node/Python server logic, configuring database models, and deploying production code.',
    'software_development', 'intermediate', 9, 'draft', 4, true,
    'Full Stack Developer Career Track | KnowledgePaat', 'Master both client and server development to ship end-to-end web applications independently.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'qa-automation-engineer', 'QA Automation Engineer', 'Design automated test suites, end-to-end browser tests, and API validation in CI/CD.', 'QA Automation Engineers verify software reliability through automated test harnesses. They write programmatic scripts with Playwright, Selenium, and Python to catch regressions early.',
    'qa_testing', 'beginner', 6, 'draft', 5, true,
    'QA Automation Engineer Career Track | KnowledgePaat', 'Design automated test suites, end-to-end browser tests, and API validation in CI/CD.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'data-analyst', 'Data Analyst', 'Extract business insights using SQL, Excel, Python dataframes, and Power BI dashboards.', 'Data analysts interpret metrics, design interactive executive dashboards, and formulate data-driven strategic recommendations for stakeholders.',
    'data', 'beginner', 5, 'draft', 6, true,
    'Data Analyst Career Track | KnowledgePaat', 'Extract business insights using SQL, Excel, Python dataframes, and Power BI dashboards.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'data-scientist', 'Data Scientist', 'Build predictive machine learning models, statistical experiments, and data pipelines.', 'Data scientists combine statistical rigor, machine learning algorithms, and deep domain understanding to solve complex quantitative forecasting and classification challenges.',
    'data', 'intermediate', 8, 'draft', 7, true,
    'Data Scientist Career Track | KnowledgePaat', 'Build predictive machine learning models, statistical experiments, and data pipelines.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'ai-engineer', 'AI Engineer', 'Deploy deep learning models, LLM systems, and high-throughput inference APIs.', 'AI engineers bridge machine learning prototypes into production infrastructure, building inference pipelines, model evaluation metrics, and AI-enabled software features.',
    'ai_ml', 'advanced', 9, 'draft', 8, true,
    'AI Engineer Career Track | KnowledgePaat', 'Deploy deep learning models, LLM systems, and high-throughput inference APIs.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'machine-learning-engineer', 'Machine Learning Engineer', 'Design MLOps pipelines, model training workflows, and production model serving.', 'ML Engineers focus on scaling machine learning in enterprise production: automated model retraining, dataset versioning, GPU acceleration, and low-latency inference APIs.',
    'ai_ml', 'advanced', 9, 'draft', 9, false,
    'Machine Learning Engineer Career Track | KnowledgePaat', 'Design MLOps pipelines, model training workflows, and production model serving.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'devops-engineer', 'DevOps Engineer', 'Automate infrastructure as code, CI/CD pipelines, Docker containers, and Kubernetes clusters.', 'DevOps Engineers ensure software delivery reliability, maintain automated release pipelines, manage cloud resources, and optimize system uptime and observability.',
    'devops_cloud', 'intermediate', 7, 'draft', 10, true,
    'DevOps Engineer Career Track | KnowledgePaat', 'Automate infrastructure as code, CI/CD pipelines, Docker containers, and Kubernetes clusters.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'cloud-engineer', 'Cloud Engineer', 'Deploy, configure, and secure enterprise architectures on cloud service platforms like AWS.', 'Cloud Engineers design scalable cloud infrastructure, virtual networks, identity policies, storage buckets, and serverless compute functions.',
    'devops_cloud', 'intermediate', 7, 'draft', 11, false,
    'Cloud Engineer Career Track | KnowledgePaat', 'Deploy, configure, and secure enterprise architectures on cloud service platforms like AWS.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'cybersecurity-analyst', 'Cybersecurity Analyst', 'Protect application assets, perform vulnerability assessments, and safeguard sensitive data.', 'Cybersecurity analysts assess systems for security weaknesses, analyze threat alerts, implement defensive security protocols, and enforce security policies.',
    'cybersecurity', 'intermediate', 7, 'draft', 12, true,
    'Cybersecurity Analyst Career Track | KnowledgePaat', 'Protect application assets, perform vulnerability assessments, and safeguard sensitive data.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'mobile-developer', 'Mobile Developer (Cross-Platform)', 'Build native-feeling iOS and Android mobile applications using React Native and modern APIs.', 'Mobile developers construct performant applications for handheld mobile devices, handling offline persistence, touch gestures, and device APIs.',
    'software_development', 'intermediate', 6, 'draft', 13, false,
    'Mobile Developer (Cross-Platform) Career Track | KnowledgePaat', 'Build native-feeling iOS and Android mobile applications using React Native and modern APIs.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'ui-ux-designer', 'UI/UX Designer', 'Design intuitive digital experiences, design systems, wireframes, and interactive prototypes.', 'UI/UX designers craft visually stunning, highly accessible product flows through user research, wireframing, component systems, and design tokens.',
    'design', 'beginner', 5, 'draft', 14, true,
    'UI/UX Designer Career Track | KnowledgePaat', 'Design intuitive digital experiences, design systems, wireframes, and interactive prototypes.'
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO career_catalog (
    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description
  ) VALUES (
    'product-manager', 'Technical Product Manager', 'Drive feature prioritization, customer requirements, cross-functional sprints, and product metrics.', 'Technical product managers align business objectives with engineering execution, analyzing data analytics, defining user stories, and managing release roadmaps.',
    'product', 'intermediate', 6, 'draft', 15, false,
    'Technical Product Manager Career Track | KnowledgePaat', 'Drive feature prioritization, customer requirements, cross-functional sprints, and product metrics.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────
  -- 3. SEED CAREER-SKILL MAPPINGS
  -- ─────────────────────────────────────────────────────────────
  -- Mappings for: Python Developer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'python-developer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'django';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'fastapi';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'postgresql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'unit-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'redis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 11, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 12, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Frontend Developer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'frontend-developer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'html';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'css';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'javascript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'typescript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'react';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 6, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'nextjs';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'unit-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'figma';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'graphql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 11, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 12, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Backend Developer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'backend-developer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'nodejs';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'typescript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'postgresql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 6, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'redis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'unit-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 11, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'microservices';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 12, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Full Stack Developer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'full-stack-developer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'javascript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'typescript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'react';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'nodejs';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 6, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 7, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'nextjs';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'postgresql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 11, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 12, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: QA Automation Engineer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'qa-automation-engineer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'unit-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'automation-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'api-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'playwright';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'selenium';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ci-cd';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'performance-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 11, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Data Analyst
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'data-analyst';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'excel';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'statistics';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'data-visualization';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'power-bi';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'proficient', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'pandas';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'postgresql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Data Scientist
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'data-scientist';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'statistics';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'pandas';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'numpy';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'scikit-learn';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 6, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'machine-learning';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 7, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'data-visualization';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'pytorch';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: AI Engineer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'ai-engineer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'machine-learning';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'pytorch';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'fastapi';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'algorithms';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Machine Learning Engineer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'machine-learning-engineer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'machine-learning';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'scikit-learn';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'pytorch';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'fastapi';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ci-cd';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'kubernetes';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: DevOps Engineer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'devops-engineer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'linux';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'kubernetes';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ci-cd';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 5, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 6, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'bash-shell';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 7, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'web-security';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 10, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Cloud Engineer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'cloud-engineer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'aws';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'linux';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'kubernetes';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ci-cd';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 8, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'web-security';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 9, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Cybersecurity Analyst
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'cybersecurity-analyst';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'cybersecurity-fundamentals';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'linux';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'web-security';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'bash-shell';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'python';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'docker';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Mobile Developer (Cross-Platform)
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'mobile-developer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'typescript';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'react';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'git';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'rest-apis';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'working', 4, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'unit-testing';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'nodejs';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'figma';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 7, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: UI/UX Designer
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'ui-ux-designer';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'figma';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ui-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'ux-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 3, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'html';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 4, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'css';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'agile-scrum';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'beginner', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- Mappings for: Technical Product Manager
  SELECT id INTO v_career_id FROM career_catalog WHERE slug = 'product-manager';
  IF v_career_id IS NOT NULL THEN
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'product-strategy';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 1, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'agile-scrum';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'required', 'proficient', 2, true
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'data-visualization';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'recommended', 'working', 3, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'sql';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 4, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'figma';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 5, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = 'system-design';
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO career_skill_map (
        career_id, skill_id, importance, proficiency_target, display_order, is_core
      ) VALUES (
        v_career_id, v_skill_id, 'optional', 'beginner', 6, false
      ) ON CONFLICT (career_id, skill_id) DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 4. SEED SKILL RELATIONSHIPS (GRAPH EDGES)
  -- ─────────────────────────────────────────────────────────────
  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'html';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'css';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'HTML structure precedes CSS styling.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'html';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'javascript';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'DOM structure is required to manipulate dynamic elements.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'javascript';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'typescript';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'TypeScript builds on JavaScript syntax with static typing.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'javascript';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'react';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'React is a library built on modern JavaScript.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'react';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'nextjs';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Next.js extends React with server rendering and routing.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'javascript';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'nodejs';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Node.js is a server runtime executing JavaScript.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'nodejs';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'express';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Express is a framework running on Node.js.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'python';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'django';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Django requires foundational Python knowledge.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'python';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'fastapi';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'FastAPI requires modern Python type hints.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'python';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'pandas';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Pandas dataframes are manipulated in Python.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'python';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'numpy';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'NumPy arrays are the numerical basis of Python data computing.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'numpy';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'scikit-learn';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Scikit-learn algorithms operate on NumPy matrices.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'python';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'scikit-learn';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Python is the host language for Scikit-Learn.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'scikit-learn';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'machine-learning';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'builds_on', 1, 'Scikit-Learn implements core ML algorithms.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'machine-learning';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'pytorch';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Deep learning in PyTorch requires basic ML understanding.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'sql';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'postgresql';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'SQL is the query syntax for PostgreSQL.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'sql';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'mysql';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'SQL is the query syntax for MySQL.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'git';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'github';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'GitHub hosts Git repositories.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'git';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'ci-cd';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'CI/CD workflows trigger on Git commits.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'linux';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'bash-shell';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Bash scripts automate Linux shell commands.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'linux';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'docker';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Docker containers isolate Linux kernel processes.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'docker';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'kubernetes';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Kubernetes orchestrates Docker containers.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'unit-testing';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'automation-testing';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Automation test suites expand on unit test assertions.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'automation-testing';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'selenium';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Selenium implements browser automation.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'automation-testing';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'playwright';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Playwright implements browser automation.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'rest-apis';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'graphql';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'related', 0.8, 'GraphQL is an alternative API paradigm to REST.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'data-structures';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'algorithms';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Algorithms operate on underlying data structures.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'algorithms';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'system-design';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'System scaling decisions rely on algorithmic complexity.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'cybersecurity-fundamentals';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'web-security';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'prerequisite', 1, 'Web security applies general security foundations.'
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'react';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'nextjs';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'builds_on', 1, NULL
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'django';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'postgresql';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'commonly_used_with', 1, NULL
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'fastapi';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'docker';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'commonly_used_with', 1, NULL
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'postgresql';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'redis';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'commonly_used_with', 0.9, NULL
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = 'selenium';
  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = 'playwright';
  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN
    INSERT INTO skill_relationships (
      source_skill_id, target_skill_id, relationship_type, strength, notes
    ) VALUES (
      v_source_id, v_target_id, 'alternative', 1, NULL
    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;
  END IF;

END $$;
