-- ============================================================
-- KnowledgePaat — Career Roadmap Engine
-- Phase 1 Demo Seed: Python Developer
--
-- Idempotent seed script.
-- Safe for local development and staging environments.
-- ============================================================

DO $$
DECLARE
  v_roadmap_id UUID;
  v_sec_foundation UUID;
  v_sec_core UUID;
  v_sec_db UUID;
  v_sec_web UUID;
  v_sec_api UUID;
  v_sec_projects UUID;
  v_sec_interview UUID;
  v_sec_ready UUID;

  -- Nodes
  v_node_cs UUID;
  v_node_git UUID;
  v_node_linux UUID;
  v_node_py_fund UUID;
  v_node_py_func UUID;
  v_node_py_oop UUID;
  v_node_py_except UUID;
  v_node_py_modules UUID;
  v_node_sql UUID;
  v_node_mysql UUID;
  v_node_postgres UUID;
  v_node_http UUID;
  v_node_django UUID;
  v_node_fastapi UUID;
  v_node_rest UUID;
  v_node_auth UUID;
  v_node_api_test UUID;
  v_node_proj_beg UUID;
  v_node_proj_int UUID;
  v_node_int_fund UUID;
  v_node_int_prep UUID;
  v_node_checkpoint UUID;
BEGIN

  -- 1. Create or fetch Python Developer roadmap
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'python-developer';

  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title,
      slug,
      short_description,
      description,
      category,
      difficulty,
      estimated_duration,
      seo_title,
      seo_description,
      is_active
    ) VALUES (
      'Python Developer',
      'python-developer',
      'Step-by-step career path to becoming a professional Python developer from fundamentals to job ready.',
      'This comprehensive career roadmap guides you through computer science basics, core Python programming, object-oriented concepts, relational databases, web frameworks, REST APIs, and production engineering practices.',
      'Development',
      'Beginner',
      '16 Weeks',
      'Python Developer Roadmap | KnowledgePaat',
      'Master Python programming, databases, web development, and APIs with the KnowledgePaat Python Developer Career Roadmap.',
      true
    ) RETURNING id INTO v_roadmap_id;
  END IF;

  -- 2. Sections
  -- 01 Foundation
  SELECT id INTO v_sec_foundation FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-foundation';
  IF v_sec_foundation IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Foundation', '01-foundation', 'Basic computational and toolchain fundamentals required for modern development.', 1, true, true)
    RETURNING id INTO v_sec_foundation;
  END IF;

  -- 02 Python Core
  SELECT id INTO v_sec_core FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-python-core';
  IF v_sec_core IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Python Core', '02-python-core', 'Syntax, data structures, functional paradigms, and object-oriented design in Python.', 2, true, true)
    RETURNING id INTO v_sec_core;
  END IF;

  -- 03 Database
  SELECT id INTO v_sec_db FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-database';
  IF v_sec_db IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Database', '03-database', 'Relational data modeling, querying, indexing, and ORM integration.', 3, true, true)
    RETURNING id INTO v_sec_db;
  END IF;

  -- 04 Web Development
  SELECT id INTO v_sec_web FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-web-development';
  IF v_sec_web IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Web Development', '04-web-development', 'Web protocols, MVC patterns, asynchronous request handling, and backend architectures.', 4, true, true)
    RETURNING id INTO v_sec_web;
  END IF;

  -- 05 APIs
  SELECT id INTO v_sec_api FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-apis';
  IF v_sec_api IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 APIs', '05-apis', 'RESTful API construction, status codes, token authentication, and automated endpoint testing.', 5, true, true)
    RETURNING id INTO v_sec_api;
  END IF;

  -- 06 Projects
  SELECT id INTO v_sec_projects FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-projects';
  IF v_sec_projects IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 Projects', '06-projects', 'Practical portfolio applications applying database, backend, and API engineering.', 6, true, true)
    RETURNING id INTO v_sec_projects;
  END IF;

  -- 07 Interview
  SELECT id INTO v_sec_interview FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '07-interview';
  IF v_sec_interview IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '07 Interview', '07-interview', 'Core technical question patterns, coding problem walkthroughs, and architecture reviews.', 7, true, true)
    RETURNING id INTO v_sec_interview;
  END IF;

  -- 08 Job Ready
  SELECT id INTO v_sec_ready FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '08-job-ready';
  IF v_sec_ready IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '08 Job Ready', '08-job-ready', 'Final competency validation and career readiness checkpoint.', 8, true, true)
    RETURNING id INTO v_sec_ready;
  END IF;

  -- 3. Insert Nodes for 01 Foundation
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_foundation, 'Computer Science Basics', 'cs-basics', 'Understand basic computing, memory, binary logic, and algorithms.', 'TOPIC', 'Beginner', 180, 1, true, true),
    (v_sec_foundation, 'Git & Version Control', 'git-basics', 'Learn branching, commits, merging, pulling, and collaborative git workflows.', 'SKILL', 'Beginner', 240, 2, true, true),
    (v_sec_foundation, 'Linux & Command Line', 'linux-basics', 'Master filesystem navigation, file permissions, shell commands, and bash environment.', 'SKILL', 'Beginner', 240, 3, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 4. Insert Nodes for 02 Python Core
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_core, 'Python Fundamentals', 'py-fundamentals', 'Variables, control flow, loops, data structures: lists, dicts, tuples, and sets.', 'SKILL', 'Beginner', 360, 1, true, true),
    (v_sec_core, 'Functions & Scopes', 'py-functions', 'Parameters, return values, lambda functions, closures, decorators, and scope rules.', 'SKILL', 'Beginner', 240, 2, true, true),
    (v_sec_core, 'Object-Oriented Programming (OOP)', 'py-oop', 'Classes, objects, constructors, inheritance, polymorphism, and encapsulation.', 'SKILL', 'Intermediate', 360, 3, true, true),
    (v_sec_core, 'Exception Handling', 'py-exceptions', 'Try-except-finally blocks, custom exceptions, and robust error management.', 'TOPIC', 'Beginner', 180, 4, true, true),
    (v_sec_core, 'Modules & Packages', 'py-modules', 'Pip, virtual environments, requirements.txt, and organizing modular code.', 'TOPIC', 'Beginner', 180, 5, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 5. Insert Nodes for 03 Database
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_db, 'SQL Fundamentals', 'sql-fundamentals', 'SELECT queries, JOINs, aggregations, GROUP BY, and data modeling constraints.', 'SKILL', 'Beginner', 300, 1, true, true),
    (v_sec_db, 'PostgreSQL Database', 'postgresql', 'ACID transactions, indexing, foreign keys, and connecting Python drivers.', 'SKILL', 'Intermediate', 300, 2, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 6. Insert Nodes for 04 Web Development
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_web, 'HTTP Protocols & Networking', 'http-basics', 'HTTP methods, status codes, request/response headers, cookies, and sessions.', 'TOPIC', 'Beginner', 180, 1, true, true),
    (v_sec_web, 'Django Framework', 'django', 'MVT pattern, ORM, migrations, views, templates, and admin dashboard.', 'SKILL', 'Intermediate', 480, 2, true, true),
    (v_sec_web, 'FastAPI Framework', 'fastapi', 'Modern async Python backend, Pydantic type validation, and automatic OpenAPI docs.', 'SKILL', 'Intermediate', 360, 3, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 7. Insert Nodes for 05 APIs
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_api, 'REST API Design', 'rest-api', 'Resource naming, JSON payloads, query params, pagination, and error representations.', 'SKILL', 'Intermediate', 300, 1, true, true),
    (v_sec_api, 'Authentication & Security', 'auth-security', 'JWT tokens, OAuth2 flows, password hashing with bcrypt, and CORS headers.', 'SKILL', 'Intermediate', 300, 2, true, true),
    (v_sec_api, 'API Automated Testing', 'api-testing', 'Pytest, test client, mocking, and automated endpoint assertions.', 'SKILL', 'Intermediate', 240, 3, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 8. Insert Nodes for 06 Projects
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_projects, 'Beginner Project: CLI Tool', 'project-cli', 'Build an interactive command-line application using Python file I/O and libraries.', 'MILESTONE', 'Beginner', 360, 1, true, true),
    (v_sec_projects, 'Intermediate Project: Web Backend API', 'project-api', 'Full backend service with PostgreSQL, authentication, and REST endpoints.', 'MILESTONE', 'Intermediate', 600, 2, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 9. Insert Nodes for 07 Interview
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_interview, 'Python Interview Fundamentals', 'interview-fundamentals', 'Core Python quirks, memory management, GIL, mutability, and generators.', 'TOPIC', 'Intermediate', 240, 1, true, true),
    (v_sec_interview, 'Technical Coding Preparation', 'interview-prep', 'Data structures, algorithms, complexity analysis, and live coding practice.', 'SKILL', 'Intermediate', 360, 2, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 10. Insert Nodes for 08 Job Ready
  INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
  VALUES
    (v_sec_ready, 'Career Readiness Checkpoint', 'career-checkpoint', 'Review portfolio projects, resume alignment, and technical readiness.', 'CHECKPOINT', 'Intermediate', 120, 1, true, true)
  ON CONFLICT (section_id, slug) DO NOTHING;

  -- 11. Populate Node Topics
  -- CS Basics topics
  SELECT id INTO v_node_cs FROM career_roadmap_nodes WHERE section_id = v_sec_foundation AND slug = 'cs-basics';
  IF v_node_cs IS NOT NULL THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES
      (v_node_cs, 'Binary and Number Systems', 1),
      (v_node_cs, 'Memory and Storage Hierarchy', 2),
      (v_node_cs, 'Basic Big-O Complexity', 3);
  END IF;

  -- Python Fundamentals topics
  SELECT id INTO v_node_py_fund FROM career_roadmap_nodes WHERE section_id = v_sec_core AND slug = 'py-fundamentals';
  IF v_node_py_fund IS NOT NULL THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES
      (v_node_py_fund, 'Data Types & Variables', 1),
      (v_node_py_fund, 'Lists, Tuples, Dictionaries, Sets', 2),
      (v_node_py_fund, 'Loops & Comprehensions', 3);
  END IF;

  -- Python OOP topics
  SELECT id INTO v_node_py_oop FROM career_roadmap_nodes WHERE section_id = v_sec_core AND slug = 'py-oop';
  IF v_node_py_oop IS NOT NULL THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES
      (v_node_py_oop, 'Classes and Objects', 1),
      (v_node_py_oop, 'Inheritance and MRO', 2),
      (v_node_py_oop, 'Polymorphism and Encapsulation', 3);
  END IF;

  -- 12. Create Relationships (Prerequisites & Next)
  -- Python Fundamentals -> Python OOP (NEXT)
  SELECT id INTO v_node_py_oop FROM career_roadmap_nodes WHERE section_id = v_sec_core AND slug = 'py-oop';
  IF v_node_py_fund IS NOT NULL AND v_node_py_oop IS NOT NULL THEN
    INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
    VALUES (v_node_py_fund, v_node_py_oop, 'PREREQUISITE')
    ON CONFLICT (source_node_id, target_node_id, relationship_type) DO NOTHING;
  END IF;

  -- Python OOP -> Django (PREREQUISITE)
  SELECT id INTO v_node_django FROM career_roadmap_nodes WHERE section_id = v_sec_web AND slug = 'django';
  IF v_node_py_oop IS NOT NULL AND v_node_django IS NOT NULL THEN
    INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
    VALUES (v_node_py_oop, v_node_django, 'PREREQUISITE')
    ON CONFLICT (source_node_id, target_node_id, relationship_type) DO NOTHING;
  END IF;

  -- SQL Fundamentals -> PostgreSQL (PREREQUISITE)
  SELECT id INTO v_node_sql FROM career_roadmap_nodes WHERE section_id = v_sec_db AND slug = 'sql-fundamentals';
  SELECT id INTO v_node_postgres FROM career_roadmap_nodes WHERE section_id = v_sec_db AND slug = 'postgresql';
  IF v_node_sql IS NOT NULL AND v_node_postgres IS NOT NULL THEN
    INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
    VALUES (v_node_sql, v_node_postgres, 'PREREQUISITE')
    ON CONFLICT (source_node_id, target_node_id, relationship_type) DO NOTHING;
  END IF;

  -- HTTP Basics -> REST API Design (PREREQUISITE)
  SELECT id INTO v_node_http FROM career_roadmap_nodes WHERE section_id = v_sec_web AND slug = 'http-basics';
  SELECT id INTO v_node_rest FROM career_roadmap_nodes WHERE section_id = v_sec_api AND slug = 'rest-api';
  IF v_node_http IS NOT NULL AND v_node_rest IS NOT NULL THEN
    INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
    VALUES (v_node_http, v_node_rest, 'PREREQUISITE')
    ON CONFLICT (source_node_id, target_node_id, relationship_type) DO NOTHING;
  END IF;

END $$;
