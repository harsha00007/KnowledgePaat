-- ============================================================
-- KnowledgePaat — Career Roadmap Platform
-- Phase 4: Production Catalog Seeding Migration
--
-- Contains 17 Full Career, Skill, Beginner & Best-Practice Roadmaps
-- Completely idempotent: running repeatedly produces no duplicate entries.
-- Preserves existing Phase 1, 2, and 3 schema, constraints and RLS.
-- ============================================================

DO $$
DECLARE
  v_roadmap_id UUID;
  v_sec_id UUID;
  v_node_id UUID;
  v_res_id UUID;
  v_src_id UUID;
  v_tgt_id UUID;
BEGIN

  -- ------------------------------------------------------------
  -- ROADMAP: Python Developer (python-developer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'python-developer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Python Developer', 'python-developer', 'Master Python fundamentals, object-oriented design, databases, web frameworks, APIs, and automated testing to become job ready.', 'A comprehensive, career-focused learning path taking you from core computer science and Python foundations to building production REST APIs, containerized microservices, and technical interview preparation.', 'Development', 'Beginner', '16 Weeks', 'Python Developer Career Roadmap | KnowledgePaat', 'Step-by-step career path to becoming a professional Python developer. Learn Python, SQL, FastAPI, Django, testing, and system design.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Python Developer',
      short_description = 'Master Python fundamentals, object-oriented design, databases, web frameworks, APIs, and automated testing to become job ready.',
      description = 'A comprehensive, career-focused learning path taking you from core computer science and Python foundations to building production REST APIs, containerized microservices, and technical interview preparation.',
      category = 'Development',
      difficulty = 'Beginner',
      estimated_duration = '16 Weeks',
      seo_title = 'Python Developer Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career path to becoming a professional Python developer. Learn Python, SQL, FastAPI, Django, testing, and system design.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Foundation & Environment
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-foundation';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Foundation & Environment', '01-foundation', 'Computational thinking, command line fundamentals, and version control.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Foundation & Environment',
      description = 'Computational thinking, command line fundamentals, and version control.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Computer Science Basics
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'cs-basics';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Computer Science Basics', 'cs-basics', 'Understand memory allocation, execution models, binary data, and how code runs on hardware.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Computer Science Basics',
      description = 'Understand memory allocation, execution models, binary data, and how code runs on hardware.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Binary & Memory') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Binary & Memory', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CPU Execution Cycle') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CPU Execution Cycle', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Interpreters vs Compilers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Interpreters vs Compilers', 3);
  END IF;
  -- Resource: Crash Course Computer Science
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://youtube.com/playlist?list=PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Crash Course Computer Science', 'Clear, animated visual breakdown of computational fundamentals.', 'YOUTUBE', 'CrashCourse', 'https://youtube.com/playlist?list=PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Terminal & Command Line
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'terminal-basics';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Terminal & Command Line', 'terminal-basics', 'Navigate filesystems, run shell scripts, inspect processes, and configure environment variables.', 'SKILL', 'Beginner', 60, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Terminal & Command Line',
      description = 'Navigate filesystems, run shell scripts, inspect processes, and configure environment variables.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 60,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Navigation (cd, ls, pwd)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Navigation (cd, ls, pwd)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'File Manipulation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'File Manipulation', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Environment Variables') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Environment Variables', 3);
  END IF;
  -- Resource: Command Line for Developers
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Understanding_client-side_tools/Command_line';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Command Line for Developers', 'Practical guide to modern shell navigation.', 'DOCUMENTATION', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Understanding_client-side_tools/Command_line', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Git & Version Control
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'git-basics';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Git & Version Control', 'git-basics', 'Track code revisions, manage branches, handle merge conflicts, and collaborate on GitHub.', 'SKILL', 'Beginner', 90, 3, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Git & Version Control',
      description = 'Track code revisions, manage branches, handle merge conflicts, and collaborate on GitHub.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Init, Add & Commit') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Init, Add & Commit', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Branching & Merging') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Branching & Merging', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Pull Requests on GitHub') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Pull Requests on GitHub', 3);
  END IF;
  -- Resource: Git Handbook & Workflows
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.github.com/en/get-started/using-git/about-git';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Git Handbook & Workflows', 'Official GitHub documentation on version control best practices.', 'DOCUMENTATION', 'GitHub Guides', 'https://docs.github.com/en/get-started/using-git/about-git', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 02 Python Core
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-python-core';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Python Core', '02-python-core', 'Variables, data types, control flow, functions, and module architecture.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Python Core',
      description = 'Variables, data types, control flow, functions, and module architecture.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Variables & Data Types
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-variables';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Variables & Data Types', 'python-variables', 'Learn dynamic typing, strings, numeric types, booleans, type hints, and memory references.', 'TOPIC', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Variables & Data Types',
      description = 'Learn dynamic typing, strings, numeric types, booleans, type hints, and memory references.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Primitive Data Types') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Primitive Data Types', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Type Conversion') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Type Conversion', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Type Hints & Annotations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Type Hints & Annotations', 3);
  END IF;
  -- Resource: Official Python Tutorial: Informal Introduction
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.python.org/3/tutorial/introduction.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Official Python Tutorial: Informal Introduction', 'Comprehensive Python docs covering syntax and primitives.', 'DOCUMENTATION', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/introduction.html', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Control Flow & Logic
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-control-flow';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Control Flow & Logic', 'python-control-flow', 'Master conditionals, loops, comprehension expressions, and exception error handling.', 'TOPIC', 'Beginner', 120, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Control Flow & Logic',
      description = 'Master conditionals, loops, comprehension expressions, and exception error handling.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'If-Else Conditionals') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'If-Else Conditionals', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'For and While Loops') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'For and While Loops', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Try-Except Blocks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Try-Except Blocks', 3);
  END IF;
  -- Resource: Control Flow in Python
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.python.org/3/tutorial/controlflow.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Control Flow in Python', 'Official guide to loops, conditionals, and error handling.', 'DOCUMENTATION', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/controlflow.html', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Functions & Scope
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-functions';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Functions & Scope', 'python-functions', 'Define reusable functions, understand lexical scoping, default parameters, and lambda syntax.', 'SKILL', 'Beginner', 120, 3, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Functions & Scope',
      description = 'Define reusable functions, understand lexical scoping, default parameters, and lambda syntax.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Parameters & Return Values') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Parameters & Return Values', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Local vs Global Scope') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Local vs Global Scope', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Lambda Functions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Lambda Functions', 3);
  END IF;
  -- Resource: Python Functions Deep Dive
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://realpython.com/defining-your-own-python-function/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Python Functions Deep Dive', 'Clear reference on positional/keyword args and variable scope.', 'ARTICLE', 'Real Python', 'https://realpython.com/defining-your-own-python-function/', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 03 Object-Oriented Programming
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-oop';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Object-Oriented Programming', '03-oop', 'Classes, inheritance, encapsulation, polymorphism, and dunder methods.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Object-Oriented Programming',
      description = 'Classes, inheritance, encapsulation, polymorphism, and dunder methods.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Classes & Objects
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-classes';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Classes & Objects', 'python-classes', 'Model business domains with classes, constructors (__init__), instance methods, and attributes.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Classes & Objects',
      description = 'Model business domains with classes, constructors (__init__), instance methods, and attributes.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Class Syntax & __init__') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Class Syntax & __init__', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Instance vs Class Attributes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Instance vs Class Attributes', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Methods and self') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Methods and self', 3);
  END IF;
  -- Resource: Object-Oriented Programming in Python
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://realpython.com/python3-object-oriented-programming/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Object-Oriented Programming in Python', 'Comprehensive guide to object architecture in Python.', 'ARTICLE', 'Real Python', 'https://realpython.com/python3-object-oriented-programming/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Inheritance & Magic Methods
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-magic-methods';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Inheritance & Magic Methods', 'python-magic-methods', 'Reuse behavior through class inheritance and customize operators using dunder methods.', 'SKILL', 'Intermediate', 120, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Inheritance & Magic Methods',
      description = 'Reuse behavior through class inheritance and customize operators using dunder methods.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 120,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Super() and Subclassing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Super() and Subclassing', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dunder Methods (__str__, __repr__)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dunder Methods (__str__, __repr__)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Encapsulation & Properties') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Encapsulation & Properties', 3);
  END IF;
  -- Resource: A Guide to Python Magic Methods
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://rszalski.github.io/magicmethods/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('A Guide to Python Magic Methods', 'Deep dive into Python operator overloading and dunder methods.', 'ARTICLE', 'Rafe Kettler / Real Python', 'https://rszalski.github.io/magicmethods/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 04 Data Structures & Collections
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-data-structures';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Data Structures & Collections', '04-data-structures', 'Built-in lists, dictionaries, sets, tuples, and collection algorithms.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Data Structures & Collections',
      description = 'Built-in lists, dictionaries, sets, tuples, and collection algorithms.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Lists, Tuples & Sets
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-sequences';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Lists, Tuples & Sets', 'python-sequences', 'Index, slice, sort, and manipulate ordered sequences and unique set collections.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Lists, Tuples & Sets',
      description = 'Index, slice, sort, and manipulate ordered sequences and unique set collections.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Slicing & Indexing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Slicing & Indexing', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'List Comprehensions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'List Comprehensions', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Set Math Operations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Set Math Operations', 3);
  END IF;
  -- Resource: Python Data Structures Guide
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.python.org/3/tutorial/datastructures.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Python Data Structures Guide', 'Official Python docs on sequence and mapping types.', 'DOCUMENTATION', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/datastructures.html', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Dictionaries & Hash Maps
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-dictionaries';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Dictionaries & Hash Maps', 'python-dictionaries', 'Understand key-value mappings, hashing, collision resolution, and JSON serialization.', 'SKILL', 'Beginner', 90, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Dictionaries & Hash Maps',
      description = 'Understand key-value mappings, hashing, collision resolution, and JSON serialization.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dictionary Methods') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dictionary Methods', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hashing Fundamentals') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hashing Fundamentals', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'JSON Serialization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'JSON Serialization', 3);
  END IF;
  -- Resource: Python Dictionaries Tutorial
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://realpython.com/python-dicts/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Python Dictionaries Tutorial', 'Step-by-step tutorial on dictionary operations and performance.', 'ARTICLE', 'Real Python', 'https://realpython.com/python-dicts/', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 05 Relational Databases & SQL
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-databases';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Relational Databases & SQL', '05-databases', 'Relational data modeling, SQL queries, indexes, and ORM abstractions.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Relational Databases & SQL',
      description = 'Relational data modeling, SQL queries, indexes, and ORM abstractions.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: SQL Fundamentals
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'sql-fundamentals';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'SQL Fundamentals', 'sql-fundamentals', 'Execute SELECT queries, JOIN tables, aggregate with GROUP BY, and manage constraints.', 'SKILL', 'Beginner', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'SQL Fundamentals',
      description = 'Execute SELECT queries, JOIN tables, aggregate with GROUP BY, and manage constraints.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'SELECT, WHERE & ORDER BY') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'SELECT, WHERE & ORDER BY', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'INNER & LEFT JOINs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'INNER & LEFT JOINs', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GROUP BY & Aggregations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GROUP BY & Aggregations', 3);
  END IF;
  -- Resource: SQLBolt Interactive SQL Lessons
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://sqlbolt.com/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('SQLBolt Interactive SQL Lessons', 'Hands-on interactive browser SQL tutorials.', 'PRACTICE', 'SQLBolt', 'https://sqlbolt.com/', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: PostgreSQL & Database Design
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'postgres-design';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'PostgreSQL & Database Design', 'postgres-design', 'Design normalized relational schemas, configure foreign keys, indexes, and transactions (ACID).', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'PostgreSQL & Database Design',
      description = 'Design normalized relational schemas, configure foreign keys, indexes, and transactions (ACID).',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Schema Normalization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Schema Normalization', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'B-Tree Indexes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'B-Tree Indexes', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ACID Transactions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ACID Transactions', 3);
  END IF;
  -- Resource: PostgreSQL Tutorial
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://www.postgresqltutorial.com/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('PostgreSQL Tutorial', 'Complete PostgreSQL guide covering setup and query optimization.', 'DOCUMENTATION', 'PostgresTutorial', 'https://www.postgresqltutorial.com/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 06 Web Development & Protocols
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-web-protocols';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 Web Development & Protocols', '06-web-protocols', 'Client-server model, HTTP methods, headers, status codes, and request lifecycles.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 Web Development & Protocols',
      description = 'Client-server model, HTTP methods, headers, status codes, and request lifecycles.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: HTTP & Network Protocols
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'http-protocols';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'HTTP & Network Protocols', 'http-protocols', 'Learn how browsers communicate with servers via GET, POST, PUT, DELETE, headers, and cookies.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'HTTP & Network Protocols',
      description = 'Learn how browsers communicate with servers via GET, POST, PUT, DELETE, headers, and cookies.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTTP Methods & Status Codes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTTP Methods & Status Codes', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Request/Response Headers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Request/Response Headers', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cookies & Sessions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cookies & Sessions', 3);
  END IF;
  -- Resource: An Overview of HTTP
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('An Overview of HTTP', 'MDN Web Docs comprehensive guide to the HTTP protocol.', 'DOCUMENTATION', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 07 REST APIs & FastAPI
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '07-fastapi';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '07 REST APIs & FastAPI', '07-fastapi', 'Async web frameworks, Pydantic validation, dependency injection, and JWT security.', 7, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '07 REST APIs & FastAPI',
      description = 'Async web frameworks, Pydantic validation, dependency injection, and JWT security.',
      sequence = 7,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: FastAPI Fundamentals
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fastapi-backend';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'FastAPI Fundamentals', 'fastapi-backend', 'Build high-performance asynchronous web APIs with automatic OpenAPI docs and Pydantic schemas.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'FastAPI Fundamentals',
      description = 'Build high-performance asynchronous web APIs with automatic OpenAPI docs and Pydantic schemas.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Path & Query Parameters') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Path & Query Parameters', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Pydantic Models') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Pydantic Models', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Async Endpoints') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Async Endpoints', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dependency Injection') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dependency Injection', 4);
  END IF;
  -- Resource: FastAPI Official Documentation
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://fastapi.tiangolo.com/tutorial/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('FastAPI Official Documentation', 'Interactive tutorial for building production APIs.', 'DOCUMENTATION', 'Tiangolo', 'https://fastapi.tiangolo.com/tutorial/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Authentication & Security
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'api-authentication';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Authentication & Security', 'api-authentication', 'Implement JWT token generation, password hashing (bcrypt), OAuth2 password bearer flow, and CORS protection.', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Authentication & Security',
      description = 'Implement JWT token generation, password hashing (bcrypt), OAuth2 password bearer flow, and CORS protection.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Password Hashing with Bcrypt') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Password Hashing with Bcrypt', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'JWT Token Minting & Verification') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'JWT Token Minting & Verification', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CORS & Security Headers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CORS & Security Headers', 3);
  END IF;
  -- Resource: FastAPI Security & OAuth2 Guide
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://fastapi.tiangolo.com/tutorial/security/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('FastAPI Security & OAuth2 Guide', 'Official guide to securing APIs with JWT and password hashing.', 'DOCUMENTATION', 'Tiangolo', 'https://fastapi.tiangolo.com/tutorial/security/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 08 Testing & Code Quality
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '08-testing';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '08 Testing & Code Quality', '08-testing', 'Unit testing, API integration testing, mocks, fixtures, and code coverage.', 8, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '08 Testing & Code Quality',
      description = 'Unit testing, API integration testing, mocks, fixtures, and code coverage.',
      sequence = 8,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: PyTest & Test-Driven Design
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'pytest-testing';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'PyTest & Test-Driven Design', 'pytest-testing', 'Write automated unit and integration tests using PyTest fixtures, parametrize, and TestClient.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'PyTest & Test-Driven Design',
      description = 'Write automated unit and integration tests using PyTest fixtures, parametrize, and TestClient.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'PyTest Assertions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'PyTest Assertions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Fixtures & Setup/Teardown') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Fixtures & Setup/Teardown', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'FastAPI TestClient') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'FastAPI TestClient', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mocking External APIs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mocking External APIs', 4);
  END IF;
  -- Resource: PyTest Documentation & Tutorial
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.pytest.org/en/stable/getting-started.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('PyTest Documentation & Tutorial', 'Official PyTest quickstart and fixture patterns.', 'DOCUMENTATION', 'pytest.org', 'https://docs.pytest.org/en/stable/getting-started.html', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 09 Docker & Deployment
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '09-deployment';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '09 Docker & Deployment', '09-deployment', 'Containerizing Python services, multi-stage Dockerfiles, and CI/CD pipelines.', 9, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '09 Docker & Deployment',
      description = 'Containerizing Python services, multi-stage Dockerfiles, and CI/CD pipelines.',
      sequence = 9,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Docker for Python Apps
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'docker-deployment';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Docker for Python Apps', 'docker-deployment', 'Write efficient Dockerfiles, manage requirements, run multi-container setups with Docker Compose, and configure healthchecks.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Docker for Python Apps',
      description = 'Write efficient Dockerfiles, manage requirements, run multi-container setups with Docker Compose, and configure healthchecks.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dockerfiles & Layers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dockerfiles & Layers', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Docker Compose Services') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Docker Compose Services', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Environment Secret Ingestion') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Environment Secret Ingestion', 3);
  END IF;
  -- Resource: Dockerizing a Python App
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.docker.com/language/python/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Dockerizing a Python App', 'Official Docker guide for packaging Python web applications.', 'DOCUMENTATION', 'Docker Docs', 'https://docs.docker.com/language/python/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 10 Portfolio Projects
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '10-projects';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '10 Portfolio Projects', '10-projects', 'Commercial-grade portfolio backend applications demonstrating production proficiency.', 10, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '10 Portfolio Projects',
      description = 'Commercial-grade portfolio backend applications demonstrating production proficiency.',
      sequence = 10,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: CLI Task & Expense Engine
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-cli-tracker';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'CLI Task & Expense Engine', 'project-cli-tracker', 'Build a terminal application with SQLite persistence, argument parsing (Click/Argparse), and report export.', 'MILESTONE', 'Beginner', 300, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'CLI Task & Expense Engine',
      description = 'Build a terminal application with SQLite persistence, argument parsing (Click/Argparse), and report export.',
      node_type = 'MILESTONE',
      difficulty = 'Beginner',
      estimated_minutes = 300,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CLI UX & Argparse') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CLI UX & Argparse', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'SQLite File Persistence') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'SQLite File Persistence', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CSV / JSON Export') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CSV / JSON Export', 3);
  END IF;
  -- Resource: Building Python Command-Line Tools
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://realpython.com/command-line-interfaces-python-argparse/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Building Python Command-Line Tools', 'Practical tutorial for building commercial CLI applications in Python.', 'ARTICLE', 'Real Python', 'https://realpython.com/command-line-interfaces-python-argparse/', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Production Job Portal REST API
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-job-portal';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Production Job Portal REST API', 'project-job-portal', 'Full backend with role-based auth (Recruiter / Candidate), resume uploads, search queries, and tests.', 'MILESTONE', 'Intermediate', 600, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Production Job Portal REST API',
      description = 'Full backend with role-based auth (Recruiter / Candidate), resume uploads, search queries, and tests.',
      node_type = 'MILESTONE',
      difficulty = 'Intermediate',
      estimated_minutes = 600,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Database Migrations (Alembic)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Database Migrations (Alembic)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Role-based Access Control') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Role-based Access Control', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Automated PyTest Suite') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Automated PyTest Suite', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dockerization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dockerization', 4);
  END IF;
  -- Resource: Building a Production REST API with FastAPI
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://testdriven.io/courses/tdd-fastapi/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Building a Production REST API with FastAPI', 'Architecture blueprint for scalable SaaS backends in Python.', 'ARTICLE', 'TestDriven.io', 'https://testdriven.io/courses/tdd-fastapi/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 11 Technical Interview Preparation
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '11-interview-prep';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '11 Technical Interview Preparation', '11-interview-prep', 'Algorithmic problem solving, Python internals, system design, and mock interviews.', 11, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '11 Technical Interview Preparation',
      description = 'Algorithmic problem solving, Python internals, system design, and mock interviews.',
      sequence = 11,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Python Technical Interview Mastery
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Python Technical Interview Mastery', 'python-interview-prep', 'Practice frequent Python coding questions, memory concepts, time complexity analysis, and behavioral questions.', 'CHECKPOINT', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Python Technical Interview Mastery',
      description = 'Practice frequent Python coding questions, memory concepts, time complexity analysis, and behavioral questions.',
      node_type = 'CHECKPOINT',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Time & Space Complexity') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Time & Space Complexity', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Python Internals & GIL') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Python Internals & GIL', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'System Design Basics') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'System Design Basics', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mock Interviews') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mock Interviews', 4);
  END IF;
  -- Resource: Python Interview Questions & Coding Exercises
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://leetcode.com/problemset/all/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Python Interview Questions & Coding Exercises', 'Top technical interview questions for Python backend candidates.', 'PRACTICE', 'LeetCode / KnowledgePaat', 'https://leetcode.com/problemset/all/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 12 Job Ready Milestone
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '12-job-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '12 Job Ready Milestone', '12-job-ready', 'Portfolio review, GitHub readiness, resume alignment, and application launchpad.', 12, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '12 Job Ready Milestone',
      description = 'Portfolio review, GitHub readiness, resume alignment, and application launchpad.',
      sequence = 12,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Career Launchpad & Application Readiness
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'python-job-ready';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Career Launchpad & Application Readiness', 'python-job-ready', 'Polish GitHub repositories with clean READMEs, deploy live APIs to render/fly.io, and begin junior/mid developer applications.', 'MILESTONE', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Career Launchpad & Application Readiness',
      description = 'Polish GitHub repositories with clean READMEs, deploy live APIs to render/fly.io, and begin junior/mid developer applications.',
      node_type = 'MILESTONE',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Portfolio READMEs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Portfolio READMEs', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Live Cloud Deployments') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Live Cloud Deployments', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Resume Keyword Alignment') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Resume Keyword Alignment', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Job Application Strategy') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Job Application Strategy', 4);
  END IF;
  -- Resource: Junior Developer Portfolio Guide
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://knowledgepaat.com/career-guides/software-developer-portfolio';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Junior Developer Portfolio Guide', 'Comprehensive advice on presenting portfolio projects to engineering recruiters.', 'ARTICLE', 'KnowledgePaat Career Guides', 'https://knowledgepaat.com/career-guides/software-developer-portfolio', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Inter-node relationships for python-developer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'cs-basics';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'terminal-basics';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'terminal-basics';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'git-basics';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'git-basics';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-variables';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-variables';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-control-flow';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-control-flow';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-functions';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-functions';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-classes';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-classes';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-magic-methods';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-functions';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-sequences';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-sequences';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-dictionaries';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-dictionaries';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-fundamentals';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-fundamentals';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'postgres-design';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'postgres-design';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'http-protocols';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'http-protocols';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fastapi-backend';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fastapi-backend';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'api-authentication';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'api-authentication';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'pytest-testing';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'pytest-testing';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-deployment';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-classes';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-cli-tracker';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-fundamentals';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-cli-tracker';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-deployment';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-job-portal';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-job-portal';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-interview-prep';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'python-job-ready';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Frontend Developer (frontend-developer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'frontend-developer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Frontend Developer', 'frontend-developer', 'Master HTML, CSS, JavaScript, React, TypeScript, Next.js, and web performance to build stunning, accessible user interfaces.', 'Step-by-step career pathway from web foundations and modern JavaScript to building production React/Next.js applications with state management, accessibility, and high performance.', 'Development', 'Beginner', '16 Weeks', 'Frontend Developer Career Roadmap | KnowledgePaat', 'Step-by-step career path to becoming a professional Frontend Developer. Learn HTML, CSS, JavaScript, React, Next.js, and UI architecture.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Frontend Developer',
      short_description = 'Master HTML, CSS, JavaScript, React, TypeScript, Next.js, and web performance to build stunning, accessible user interfaces.',
      description = 'Step-by-step career pathway from web foundations and modern JavaScript to building production React/Next.js applications with state management, accessibility, and high performance.',
      category = 'Development',
      difficulty = 'Beginner',
      estimated_duration = '16 Weeks',
      seo_title = 'Frontend Developer Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career path to becoming a professional Frontend Developer. Learn HTML, CSS, JavaScript, React, Next.js, and UI architecture.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Web Foundations
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-web-foundations';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Web Foundations', '01-web-foundations', 'The bedrock of every website: how the web works, semantic markup, and styling.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Web Foundations',
      description = 'The bedrock of every website: how the web works, semantic markup, and styling.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: How the Web Works & DNS
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'how-web-works';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'How the Web Works & DNS', 'how-web-works', 'Client-server model, HTTP/HTTPS request cycle, DNS resolution, and browser rendering engines.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'How the Web Works & DNS',
      description = 'Client-server model, HTTP/HTTPS request cycle, DNS resolution, and browser rendering engines.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTTP Verbs & Status Codes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTTP Verbs & Status Codes', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'DNS & IP Routing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'DNS & IP Routing', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Browser Rendering Engine') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Browser Rendering Engine', 3);
  END IF;
  -- Resource: How the Web Works — MDN
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('How the Web Works — MDN', 'Clear beginner guide to web protocols and networking.', 'DOCUMENTATION', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Semantic HTML5
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'html-semantics';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Semantic HTML5', 'html-semantics', 'Accessible documents, semantic landmarks (header, nav, main, article), forms, and SEO tags.', 'SKILL', 'Beginner', 120, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Semantic HTML5',
      description = 'Accessible documents, semantic landmarks (header, nav, main, article), forms, and SEO tags.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Document Structure') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Document Structure', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Semantic Tags & Landmarks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Semantic Tags & Landmarks', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Forms, Inputs & Validation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Forms, Inputs & Validation', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Meta Tags & OpenGraph') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Meta Tags & OpenGraph', 4);
  END IF;
  -- Node: Modern CSS3, Flexbox & Grid
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'css-layout-mastery';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Modern CSS3, Flexbox & Grid', 'css-layout-mastery', 'Box model, CSS specificity, Flexbox alignment, CSS Grid 2D layouts, and media queries.', 'SKILL', 'Beginner', 180, 3, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Modern CSS3, Flexbox & Grid',
      description = 'Box model, CSS specificity, Flexbox alignment, CSS Grid 2D layouts, and media queries.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Box Model & Margins') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Box Model & Margins', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Flexbox Alignment & Justification') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Flexbox Alignment & Justification', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CSS Grid Multi-Column Systems') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CSS Grid Multi-Column Systems', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Responsive Breakpoints') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Responsive Breakpoints', 4);
  END IF;
  -- Resource: Learn CSS — web.dev
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://web.dev/learn/css';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Learn CSS — web.dev', 'Official Google web developers course covering modern layout architectures.', 'DOCUMENTATION', 'Google web.dev', 'https://web.dev/learn/css', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 02 JavaScript & DOM Mechanics
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-javascript-core';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 JavaScript & DOM Mechanics', '02-javascript-core', 'The programming language of the web: ES6+ syntax, asynchronous operations, and DOM manipulation.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 JavaScript & DOM Mechanics',
      description = 'The programming language of the web: ES6+ syntax, asynchronous operations, and DOM manipulation.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: JavaScript Core & ES6+
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'javascript-fundamentals';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'JavaScript Core & ES6+', 'javascript-fundamentals', 'Types, closures, arrow functions, destructuring, rest/spread, array methods (map, filter, reduce).', 'SKILL', 'Beginner', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'JavaScript Core & ES6+',
      description = 'Types, closures, arrow functions, destructuring, rest/spread, array methods (map, filter, reduce).',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Variables (let/const) & Scope') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Variables (let/const) & Scope', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Arrays & Objects Manipulation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Arrays & Objects Manipulation', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Arrow Functions & Closures') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Arrow Functions & Closures', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Modules (import/export)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Modules (import/export)', 4);
  END IF;
  -- Node: DOM Manipulation & Events
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'dom-manipulation';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'DOM Manipulation & Events', 'dom-manipulation', 'Querying elements, event listeners, bubbling & capturing, dynamic rendering, and local storage.', 'TOPIC', 'Beginner', 150, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'DOM Manipulation & Events',
      description = 'Querying elements, event listeners, bubbling & capturing, dynamic rendering, and local storage.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 150,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'querySelector & classList') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'querySelector & classList', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Event Delegation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Event Delegation', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Event Bubbling vs Capturing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Event Bubbling vs Capturing', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'localStorage & sessionStorage') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'localStorage & sessionStorage', 4);
  END IF;
  -- Node: Async JavaScript & Fetch API
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'async-javascript';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Async JavaScript & Fetch API', 'async-javascript', 'Event loop, Promises, async/await syntax, calling REST APIs, and error handling.', 'SKILL', 'Intermediate', 180, 3, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Async JavaScript & Fetch API',
      description = 'Event loop, Promises, async/await syntax, calling REST APIs, and error handling.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Event Loop & Microtask Queue') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Event Loop & Microtask Queue', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Promises & Promise.all') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Promises & Promise.all', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Async/Await Syntax') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Async/Await Syntax', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Fetch API & JSON Parsing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Fetch API & JSON Parsing', 4);
  END IF;
  -- Resource: JavaScript.info: Promises & Async
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://javascript.info/async';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('JavaScript.info: Promises & Async', 'In-depth visual explanation of JavaScript asynchronous execution.', 'ARTICLE', 'JavaScript.info', 'https://javascript.info/async', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 03 React & Component Architecture
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-react-ecosystem';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 React & Component Architecture', '03-react-ecosystem', 'Declarative UI, component lifecycle, hooks, state management, and reusable design systems.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 React & Component Architecture',
      description = 'Declarative UI, component lifecycle, hooks, state management, and reusable design systems.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: React Fundamentals & JSX
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'react-fundamentals';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'React Fundamentals & JSX', 'react-fundamentals', 'Components, props, JSX syntax rules, conditional rendering, and list mapping with unique keys.', 'SKILL', 'Intermediate', 210, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'React Fundamentals & JSX',
      description = 'Components, props, JSX syntax rules, conditional rendering, and list mapping with unique keys.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 210,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Component Mental Model') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Component Mental Model', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Props & Composition') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Props & Composition', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'JSX Rules') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'JSX Rules', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Lists & Keys') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Lists & Keys', 4);
  END IF;
  -- Resource: React Official Documentation (Quick Start)
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://react.dev/learn';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('React Official Documentation (Quick Start)', 'The authoritative modern React interactive documentation.', 'DOCUMENTATION', 'React.dev', 'https://react.dev/learn', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: React Hooks & State Management
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'react-hooks';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'React Hooks & State Management', 'react-hooks', 'useState, useEffect, useRef, useMemo, useCallback, and building custom reusable hooks.', 'SKILL', 'Intermediate', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'React Hooks & State Management',
      description = 'useState, useEffect, useRef, useMemo, useCallback, and building custom reusable hooks.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'useState & Immutability') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'useState & Immutability', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'useEffect & Dependencies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'useEffect & Dependencies', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'useRef for DOM Access') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'useRef for DOM Access', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Custom Hook Extraction') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Custom Hook Extraction', 4);
  END IF;
  -- Section: 04 TypeScript & Next.js Framework
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-typescript-nextjs';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 TypeScript & Next.js Framework', '04-typescript-nextjs', 'Type safety, Next.js App Router, server-side rendering, and production web deployment.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 TypeScript & Next.js Framework',
      description = 'Type safety, Next.js App Router, server-side rendering, and production web deployment.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: TypeScript for Frontend Developers
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'typescript-frontend';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'TypeScript for Frontend Developers', 'typescript-frontend', 'Interfaces, type unions, generics, typing React props, hooks, and API responses.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'TypeScript for Frontend Developers',
      description = 'Interfaces, type unions, generics, typing React props, hooks, and API responses.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Types vs Interfaces') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Types vs Interfaces', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Typing React Props & Events') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Typing React Props & Events', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Generics & Utility Types') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Generics & Utility Types', 3);
  END IF;
  -- Node: Next.js App Router & SSR
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'nextjs-app-router';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Next.js App Router & SSR', 'nextjs-app-router', 'Server components, client components, file-system routing, API routes, and metadata optimization.', 'SKILL', 'Intermediate', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Next.js App Router & SSR',
      description = 'Server components, client components, file-system routing, API routes, and metadata optimization.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Server vs Client Components') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Server vs Client Components', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dynamic Route Segments') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dynamic Route Segments', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Loading & Error States') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Loading & Error States', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'SEO & Metadata') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'SEO & Metadata', 4);
  END IF;
  -- Resource: Next.js Official Foundations Course
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://nextjs.org/learn';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Next.js Official Foundations Course', 'Official interactive course from Vercel for modern full-stack frontend development.', 'DOCUMENTATION', 'Vercel Next.js', 'https://nextjs.org/learn', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 05 Portfolio Projects
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-portfolio-projects';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Portfolio Projects', '05-portfolio-projects', 'Commercial-grade UI applications proving mastery of layout, state, and API integration.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Portfolio Projects',
      description = 'Commercial-grade UI applications proving mastery of layout, state, and API integration.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: E-Commerce Storefront with Cart & Checkout
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-ecommerce-store';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'E-Commerce Storefront with Cart & Checkout', 'project-ecommerce-store', 'High-performance React/Next.js store featuring product filters, search, responsive cart, and checkout flow.', 'MILESTONE', 'Intermediate', 600, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'E-Commerce Storefront with Cart & Checkout',
      description = 'High-performance React/Next.js store featuring product filters, search, responsive cart, and checkout flow.',
      node_type = 'MILESTONE',
      difficulty = 'Intermediate',
      estimated_minutes = 600,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Optimistic Cart Updates') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Optimistic Cart Updates', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Tailwind CSS Aesthetics') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Tailwind CSS Aesthetics', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Lighthouse 90+ Performance') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Lighthouse 90+ Performance', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Vercel Deployment') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Vercel Deployment', 4);
  END IF;
  -- Section: 06 Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 Technical Interview & Job Ready', '06-interview-ready', 'Prepare for DOM coding rounds, React architectural questions, and web accessibility standards.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 Technical Interview & Job Ready',
      description = 'Prepare for DOM coding rounds, React architectural questions, and web accessibility standards.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Frontend Technical Interview Mastery
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'frontend-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Frontend Technical Interview Mastery', 'frontend-interview-prep', 'Machine coding rounds, vanilla JS polyfills, React lifecycle questions, and CSS layout challenges.', 'CHECKPOINT', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Frontend Technical Interview Mastery',
      description = 'Machine coding rounds, vanilla JS polyfills, React lifecycle questions, and CSS layout challenges.',
      node_type = 'CHECKPOINT',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Machine Coding Rounds') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Machine Coding Rounds', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Debounce & Throttle Polyfills') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Debounce & Throttle Polyfills', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Virtual DOM & Performance') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Virtual DOM & Performance', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Behavioral Interview Tips') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Behavioral Interview Tips', 4);
  END IF;
  -- Inter-node relationships for frontend-developer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'how-web-works';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'html-semantics';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'html-semantics';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'css-layout-mastery';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'css-layout-mastery';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'javascript-fundamentals';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'javascript-fundamentals';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'dom-manipulation';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'dom-manipulation';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'async-javascript';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'async-javascript';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'react-fundamentals';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'react-fundamentals';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'react-hooks';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'react-hooks';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'typescript-frontend';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'typescript-frontend';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'nextjs-app-router';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'nextjs-app-router';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-ecommerce-store';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-ecommerce-store';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'frontend-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Backend Developer (backend-developer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'backend-developer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Backend Developer', 'backend-developer', 'Master server-side architectures, database design, REST/GraphQL APIs, caching, queues, Docker, and scalable system design.', 'Complete career path for backend engineers. Learn database normalization, high-throughput API design, authentication, message queues, containerization, and distributed system fundamentals.', 'Development', 'Intermediate', '16 Weeks', 'Backend Developer Career Roadmap | KnowledgePaat', 'Master server architecture, SQL/NoSQL databases, REST APIs, caching with Redis, Docker, and system design.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Backend Developer',
      short_description = 'Master server-side architectures, database design, REST/GraphQL APIs, caching, queues, Docker, and scalable system design.',
      description = 'Complete career path for backend engineers. Learn database normalization, high-throughput API design, authentication, message queues, containerization, and distributed system fundamentals.',
      category = 'Development',
      difficulty = 'Intermediate',
      estimated_duration = '16 Weeks',
      seo_title = 'Backend Developer Career Roadmap | KnowledgePaat',
      seo_description = 'Master server architecture, SQL/NoSQL databases, REST APIs, caching with Redis, Docker, and system design.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Server Runtimes & Languages
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-server-runtimes';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Server Runtimes & Languages', '01-server-runtimes', 'Foundations of server-side programming, asynchronous I/O, and HTTP protocols.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Server Runtimes & Languages',
      description = 'Foundations of server-side programming, asynchronous I/O, and HTTP protocols.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: HTTP Protocol, Status Codes & Headers
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'http-protocols';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'HTTP Protocol, Status Codes & Headers', 'http-protocols', 'Deep dive into HTTP/1.1, HTTP/2, request methods, idempotency, caching headers, and SSL/TLS.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'HTTP Protocol, Status Codes & Headers',
      description = 'Deep dive into HTTP/1.1, HTTP/2, request methods, idempotency, caching headers, and SSL/TLS.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTTP Methods & Idempotency') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTTP Methods & Idempotency', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Status Codes (2xx, 3xx, 4xx, 5xx)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Status Codes (2xx, 3xx, 4xx, 5xx)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Headers & Caching') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Headers & Caching', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTTPS Handshake') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTTPS Handshake', 4);
  END IF;
  -- Resource: HTTP Guide — MDN
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://developer.mozilla.org/en-US/docs/Web/HTTP';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('HTTP Guide — MDN', 'Comprehensive guide to HTTP protocols, headers, and status codes.', 'DOCUMENTATION', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Web/HTTP', 'Development', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Server-Side Language Mastery (Node.js/Python/Go)
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'server-language';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Server-Side Language Mastery (Node.js/Python/Go)', 'server-language', 'Asynchronous event loop, multi-threading vs concurrency, streams, and file I/O operations.', 'SKILL', 'Intermediate', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Server-Side Language Mastery (Node.js/Python/Go)',
      description = 'Asynchronous event loop, multi-threading vs concurrency, streams, and file I/O operations.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Event Loop & Worker Threads') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Event Loop & Worker Threads', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Buffer & Streams') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Buffer & Streams', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Environment Configuration') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Environment Configuration', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Process Management') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Process Management', 4);
  END IF;
  -- Section: 02 Database Architecture & Storage
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-databases';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Database Architecture & Storage', '02-databases', 'Relational data modeling, indexing, ACID transactions, and NoSQL document stores.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Database Architecture & Storage',
      description = 'Relational data modeling, indexing, ACID transactions, and NoSQL document stores.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: PostgreSQL & Relational Data Modeling
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'postgresql-data-modeling';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'PostgreSQL & Relational Data Modeling', 'postgresql-data-modeling', 'Normalization (1NF-3NF), primary & foreign keys, constraints, triggers, and transactions.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'PostgreSQL & Relational Data Modeling',
      description = 'Normalization (1NF-3NF), primary & foreign keys, constraints, triggers, and transactions.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Database Schema Normalization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Database Schema Normalization', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ACID Transactions & Isolation Levels') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ACID Transactions & Isolation Levels', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Foreign Keys & Cascades') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Foreign Keys & Cascades', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Stored Procedures & Triggers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Stored Procedures & Triggers', 4);
  END IF;
  -- Node: Query Optimization & Indexing
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'sql-indexing-optimization';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Query Optimization & Indexing', 'sql-indexing-optimization', 'EXPLAIN ANALYZE, B-Tree indexes, composite indexes, full-text search, and N+1 query prevention.', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Query Optimization & Indexing',
      description = 'EXPLAIN ANALYZE, B-Tree indexes, composite indexes, full-text search, and N+1 query prevention.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'B-Tree & Hash Indexes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'B-Tree & Hash Indexes', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'EXPLAIN ANALYZE Execution Plans') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'EXPLAIN ANALYZE Execution Plans', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Preventing N+1 Queries') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Preventing N+1 Queries', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Connection Pooling (PgBouncer)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Connection Pooling (PgBouncer)', 4);
  END IF;
  -- Resource: Use The Index, Luke!
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://use-the-index-luke.com/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Use The Index, Luke!', 'The definitive guide to database indexing for developers.', 'ARTICLE', 'Markus Winand', 'https://use-the-index-luke.com/', 'Development', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 03 API Engineering & Security
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-api-engineering';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 API Engineering & Security', '03-api-engineering', 'RESTful conventions, rate limiting, JWT authentication, and input validation.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 API Engineering & Security',
      description = 'RESTful conventions, rate limiting, JWT authentication, and input validation.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: RESTful API Design & OpenAPI Spec
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'rest-api-design';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'RESTful API Design & OpenAPI Spec', 'rest-api-design', 'Resource-oriented URLs, payload versioning, error payloads, and automated OpenAPI documentation.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'RESTful API Design & OpenAPI Spec',
      description = 'Resource-oriented URLs, payload versioning, error payloads, and automated OpenAPI documentation.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Resource Naming Conventions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Resource Naming Conventions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Pagination (Cursor vs Offset)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Pagination (Cursor vs Offset)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'OpenAPI / Swagger Generation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'OpenAPI / Swagger Generation', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Input Validation Schemas') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Input Validation Schemas', 4);
  END IF;
  -- Node: Backend Security & Token Auth
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'backend-auth-security';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Backend Security & Token Auth', 'backend-auth-security', 'JWT token signing, refresh tokens, role-based access control (RBAC), and SQL injection defenses.', 'SKILL', 'Intermediate', 210, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Backend Security & Token Auth',
      description = 'JWT token signing, refresh tokens, role-based access control (RBAC), and SQL injection defenses.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 210,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Access & Refresh Tokens') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Access & Refresh Tokens', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Password Hashing (Argon2 / Bcrypt)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Password Hashing (Argon2 / Bcrypt)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CORS & CSRF Defense') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CORS & CSRF Defense', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Rate Limiting Algorithms (Token Bucket)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Rate Limiting Algorithms (Token Bucket)', 4);
  END IF;
  -- Section: 04 Caching, Queues & Scaling
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-caching-queues';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Caching, Queues & Scaling', '04-caching-queues', 'In-memory caching, message queues, and background task execution.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Caching, Queues & Scaling',
      description = 'In-memory caching, message queues, and background task execution.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Redis Caching & Key-Value Patterns
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'redis-caching';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Redis Caching & Key-Value Patterns', 'redis-caching', 'Cache-aside pattern, TTL eviction, write-through caching, rate limiting, and distributed locks.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Redis Caching & Key-Value Patterns',
      description = 'Cache-aside pattern, TTL eviction, write-through caching, rate limiting, and distributed locks.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cache-Aside Pattern') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cache-Aside Pattern', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cache Invalidation & Thundering Herd') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cache Invalidation & Thundering Herd', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Redis Data Structures (Hashes, Sets, Lists)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Redis Data Structures (Hashes, Sets, Lists)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Distributed Locks with Redlock') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Distributed Locks with Redlock', 4);
  END IF;
  -- Node: Message Queues & Event-Driven Design
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'message-queues-events';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Message Queues & Event-Driven Design', 'message-queues-events', 'Asynchronous task workers, RabbitMQ / Kafka / BullMQ, retry policies, and dead letter queues.', 'SKILL', 'Advanced', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Message Queues & Event-Driven Design',
      description = 'Asynchronous task workers, RabbitMQ / Kafka / BullMQ, retry policies, and dead letter queues.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Publisher-Subscriber Pattern') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Publisher-Subscriber Pattern', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Worker Queues & Consumer Groups') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Worker Queues & Consumer Groups', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dead Letter Queues (DLQ)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dead Letter Queues (DLQ)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Idempotent Consumer Processing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Idempotent Consumer Processing', 4);
  END IF;
  -- Section: 05 Containerization & Portfolio Projects
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-portfolio-projects';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Containerization & Portfolio Projects', '05-portfolio-projects', 'Docker packaging, multi-container compose setups, and full backend applications.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Containerization & Portfolio Projects',
      description = 'Docker packaging, multi-container compose setups, and full backend applications.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Docker & Multi-Stage Builds
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'docker-backend';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Docker & Multi-Stage Builds', 'docker-backend', 'Dockerfile instructions, slim production images, environment isolation, and Docker Compose.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Docker & Multi-Stage Builds',
      description = 'Dockerfile instructions, slim production images, environment isolation, and Docker Compose.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dockerfiles & Layers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dockerfiles & Layers', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-Stage Optimization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-Stage Optimization', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Docker Compose Services') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Docker Compose Services', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Volume & Network Mounting') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Volume & Network Mounting', 4);
  END IF;
  -- Node: Scalable Microservices Backend Project
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-microservices-backend';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Scalable Microservices Backend Project', 'project-microservices-backend', 'Distributed backend incorporating PostgreSQL, Redis cache, RabbitMQ event queues, and Docker Compose.', 'MILESTONE', 'Advanced', 600, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Scalable Microservices Backend Project',
      description = 'Distributed backend incorporating PostgreSQL, Redis cache, RabbitMQ event queues, and Docker Compose.',
      node_type = 'MILESTONE',
      difficulty = 'Advanced',
      estimated_minutes = 600,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Microservice Decomposition') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Microservice Decomposition', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Asynchronous Message Processing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Asynchronous Message Processing', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Integration Test Suite') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Integration Test Suite', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Docker Compose Deployment') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Docker Compose Deployment', 4);
  END IF;
  -- Section: 06 Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 Technical Interview & Job Ready', '06-interview-ready', 'System design interviews, database questions, and backend architectural case studies.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 Technical Interview & Job Ready',
      description = 'System design interviews, database questions, and backend architectural case studies.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Backend System Design & Coding Mastery
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'backend-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Backend System Design & Coding Mastery', 'backend-interview-prep', 'Design URL shorteners, news feeds, chat apps, and practice database scaling interview scenarios.', 'CHECKPOINT', 'Advanced', 300, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Backend System Design & Coding Mastery',
      description = 'Design URL shorteners, news feeds, chat apps, and practice database scaling interview scenarios.',
      node_type = 'CHECKPOINT',
      difficulty = 'Advanced',
      estimated_minutes = 300,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CAP Theorem & Trade-offs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CAP Theorem & Trade-offs', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Horizontal Scaling & Sharding') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Horizontal Scaling & Sharding', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Load Balancers (Nginx/HAProxy)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Load Balancers (Nginx/HAProxy)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'System Design Framework') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'System Design Framework', 4);
  END IF;
  -- Inter-node relationships for backend-developer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'http-protocols';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'server-language';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'server-language';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'postgresql-data-modeling';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'postgresql-data-modeling';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-indexing-optimization';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-indexing-optimization';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'rest-api-design';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'rest-api-design';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'backend-auth-security';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'backend-auth-security';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'redis-caching';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'redis-caching';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'message-queues-events';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'message-queues-events';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-backend';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-backend';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-microservices-backend';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-microservices-backend';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'backend-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Full Stack Developer (full-stack-developer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'full-stack-developer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Full Stack Developer', 'full-stack-developer', 'Bridge frontend UI, backend API engineering, database architecture, DevOps, and cloud deployment to ship complete web applications.', 'The complete end-to-end pathway for full stack engineers. Master React, TypeScript, Next.js, Node.js backend architectures, SQL databases, authentication, CI/CD, and production deployment.', 'Development', 'Intermediate', '20 Weeks', 'Full Stack Developer Career Roadmap | KnowledgePaat', 'Step-by-step career roadmap for Full Stack Developers. Master React, Node.js, PostgreSQL, Next.js, and cloud deployment.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Full Stack Developer',
      short_description = 'Bridge frontend UI, backend API engineering, database architecture, DevOps, and cloud deployment to ship complete web applications.',
      description = 'The complete end-to-end pathway for full stack engineers. Master React, TypeScript, Next.js, Node.js backend architectures, SQL databases, authentication, CI/CD, and production deployment.',
      category = 'Development',
      difficulty = 'Intermediate',
      estimated_duration = '20 Weeks',
      seo_title = 'Full Stack Developer Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career roadmap for Full Stack Developers. Master React, Node.js, PostgreSQL, Next.js, and cloud deployment.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Frontend Layer (UI & State)
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-frontend-layer';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Frontend Layer (UI & State)', '01-frontend-layer', 'Component architecture, responsive design, React hooks, and client state management.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Frontend Layer (UI & State)',
      description = 'Component architecture, responsive design, React hooks, and client state management.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: React & TypeScript UI Development
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fullstack-react-ts';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'React & TypeScript UI Development', 'fullstack-react-ts', 'Type-safe component design, hooks, state handling, and Tailwind CSS styling.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'React & TypeScript UI Development',
      description = 'Type-safe component design, hooks, state handling, and Tailwind CSS styling.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Component Composition') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Component Composition', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hooks & Custom Hooks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hooks & Custom Hooks', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'TypeScript Interfaces') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'TypeScript Interfaces', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Tailwind CSS') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Tailwind CSS', 4);
  END IF;
  -- Section: 02 Backend & API Architecture
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-backend-architecture';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Backend & API Architecture', '02-backend-architecture', 'Server runtimes, RESTful APIs, request validation, and business logic.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Backend & API Architecture',
      description = 'Server runtimes, RESTful APIs, request validation, and business logic.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Node.js / Express / Next.js Server Actions
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fullstack-server-architecture';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Node.js / Express / Next.js Server Actions', 'fullstack-server-architecture', 'Building REST endpoints, server-side data mutations, middleware, and request validation.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Node.js / Express / Next.js Server Actions',
      description = 'Building REST endpoints, server-side data mutations, middleware, and request validation.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Server Routing & Middleware') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Server Routing & Middleware', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Server Actions / API Handlers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Server Actions / API Handlers', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Input Validation (Zod)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Input Validation (Zod)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Error Handling') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Error Handling', 4);
  END IF;
  -- Section: 03 Database & Persistence
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-database-layer';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Database & Persistence', '03-database-layer', 'Relational data modeling, Prisma/Drizzle ORM, schema migrations, and indexing.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Database & Persistence',
      description = 'Relational data modeling, Prisma/Drizzle ORM, schema migrations, and indexing.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: PostgreSQL & Modern ORM Layer
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fullstack-database-orm';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'PostgreSQL & Modern ORM Layer', 'fullstack-database-orm', 'Model relational data with PostgreSQL, execute queries with Prisma or Drizzle, and manage migrations.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'PostgreSQL & Modern ORM Layer',
      description = 'Model relational data with PostgreSQL, execute queries with Prisma or Drizzle, and manage migrations.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'PostgreSQL Schema Design') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'PostgreSQL Schema Design', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ORM Queries & Relationships') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ORM Queries & Relationships', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Database Migrations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Database Migrations', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Connection Pooling') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Connection Pooling', 4);
  END IF;
  -- Section: 04 Authentication & Production Security
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-auth-security';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Authentication & Production Security', '04-auth-security', 'Secure session handling, token authentication, role-based permissions, and data protection.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Authentication & Production Security',
      description = 'Secure session handling, token authentication, role-based permissions, and data protection.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: End-to-End Authentication & RBAC
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fullstack-auth-security';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'End-to-End Authentication & RBAC', 'fullstack-auth-security', 'OAuth2 providers, JWT sessions, password hashing, and role-based access control.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'End-to-End Authentication & RBAC',
      description = 'OAuth2 providers, JWT sessions, password hashing, and role-based access control.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'JWT & Secure Cookies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'JWT & Secure Cookies', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'OAuth2 / Social Logins') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'OAuth2 / Social Logins', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Role-Based Access Control') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Role-Based Access Control', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CSRF & Security Headers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CSRF & Security Headers', 4);
  END IF;
  -- Section: 05 Full Stack Portfolio Project
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-portfolio-project';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Full Stack Portfolio Project', '05-portfolio-project', 'Ship a full-featured commercial SaaS web application from scratch.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Full Stack Portfolio Project',
      description = 'Ship a full-featured commercial SaaS web application from scratch.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Commercial SaaS Application with Billing
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-saas-platform';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Commercial SaaS Application with Billing', 'project-saas-platform', 'Multi-tenant project management platform with real-time updates, dashboard, and Stripe payments.', 'MILESTONE', 'Advanced', 720, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Commercial SaaS Application with Billing',
      description = 'Multi-tenant project management platform with real-time updates, dashboard, and Stripe payments.',
      node_type = 'MILESTONE',
      difficulty = 'Advanced',
      estimated_minutes = 720,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Full Stack Architecture') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Full Stack Architecture', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Real-time WebSocket / Polling') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Real-time WebSocket / Polling', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Stripe Webhooks & Checkout') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Stripe Webhooks & Checkout', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CI/CD Vercel & Supabase') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CI/CD Vercel & Supabase', 4);
  END IF;
  -- Section: 06 Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 Technical Interview & Job Ready', '06-interview-ready', 'Full stack system design questions, live coding rounds, and engineering portfolio reviews.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 Technical Interview & Job Ready',
      description = 'Full stack system design questions, live coding rounds, and engineering portfolio reviews.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Full Stack Interview & System Integration
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'fullstack-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Full Stack Interview & System Integration', 'fullstack-interview-prep', 'Master full request lifecycles, database normalization vs denormalization, and behavioral scenarios.', 'CHECKPOINT', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Full Stack Interview & System Integration',
      description = 'Master full request lifecycles, database normalization vs denormalization, and behavioral scenarios.',
      node_type = 'CHECKPOINT',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Full Web Request Lifecycle') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Full Web Request Lifecycle', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Frontend-Backend Contract Design') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Frontend-Backend Contract Design', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Scalability Case Studies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Scalability Case Studies', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mock Technical Interviews') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mock Technical Interviews', 4);
  END IF;
  -- Inter-node relationships for full-stack-developer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-react-ts';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-server-architecture';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-server-architecture';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-database-orm';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-database-orm';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-auth-security';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-auth-security';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-saas-platform';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-saas-platform';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'fullstack-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: QA Automation Engineer (qa-automation-engineer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'qa-automation-engineer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'QA Automation Engineer', 'qa-automation-engineer', 'Master test pyramids, Playwright, Selenium, REST API automation, CI/CD pipeline integration, and performance testing to become job ready.', 'Comprehensive career pathway for Quality Assurance & SDET professionals. Learn test design methodologies, UI automation frameworks with Playwright and TypeScript, backend API testing, and continuous test execution in CI/CD.', 'QA & Testing', 'Beginner', '14 Weeks', 'QA Automation Engineer Career Roadmap | KnowledgePaat', 'Step-by-step career roadmap to become a QA Automation Engineer / SDET. Learn Playwright, Selenium, Postman, Jest, and CI/CD pipelines.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'QA Automation Engineer',
      short_description = 'Master test pyramids, Playwright, Selenium, REST API automation, CI/CD pipeline integration, and performance testing to become job ready.',
      description = 'Comprehensive career pathway for Quality Assurance & SDET professionals. Learn test design methodologies, UI automation frameworks with Playwright and TypeScript, backend API testing, and continuous test execution in CI/CD.',
      category = 'QA & Testing',
      difficulty = 'Beginner',
      estimated_duration = '14 Weeks',
      seo_title = 'QA Automation Engineer Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career roadmap to become a QA Automation Engineer / SDET. Learn Playwright, Selenium, Postman, Jest, and CI/CD pipelines.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Testing Fundamentals & Test Strategy
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-testing-fundamentals';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Testing Fundamentals & Test Strategy', '01-testing-fundamentals', 'Test methodologies, bug life cycle, test pyramids, and test case design techniques.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Testing Fundamentals & Test Strategy',
      description = 'Test methodologies, bug life cycle, test pyramids, and test case design techniques.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Software Testing Principles & Test Pyramids
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'testing-principles';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Software Testing Principles & Test Pyramids', 'testing-principles', 'Unit vs Integration vs E2E testing, black box vs white box techniques, and regression planning.', 'TOPIC', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Software Testing Principles & Test Pyramids',
      description = 'Unit vs Integration vs E2E testing, black box vs white box techniques, and regression planning.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Test Pyramid & Ice Cream Cone Anti-pattern') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Test Pyramid & Ice Cream Cone Anti-pattern', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Equivalence Partitioning & Boundary Value Analysis') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Equivalence Partitioning & Boundary Value Analysis', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Bug Life Cycle & Severity vs Priority') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Bug Life Cycle & Severity vs Priority', 3);
  END IF;
  -- Resource: Practical Test Pyramid Guide
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://martinfowler.com/articles/practical-test-pyramid.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Practical Test Pyramid Guide', 'Martin Fowler breakdown of balancing unit, service, and UI tests.', 'ARTICLE', 'Martin Fowler', 'https://martinfowler.com/articles/practical-test-pyramid.html', 'QA & Testing', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Test Management & Bug Reporting
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'test-management';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Test Management & Bug Reporting', 'test-management', 'Writing reproducible bug tickets, test plans, and managing test suites in Jira / TestRail.', 'TOPIC', 'Beginner', 60, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Test Management & Bug Reporting',
      description = 'Writing reproducible bug tickets, test plans, and managing test suites in Jira / TestRail.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 60,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Writing Actionable Bug Reports') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Writing Actionable Bug Reports', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Test Scenario vs Test Case Writing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Test Scenario vs Test Case Writing', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Traceability Matrix') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Traceability Matrix', 3);
  END IF;
  -- Section: 02 Programming for Test Automation
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-programming-for-qa';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Programming for Test Automation', '02-programming-for-qa', 'Core TypeScript/Python programming skills required to author robust automation code.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Programming for Test Automation',
      description = 'Core TypeScript/Python programming skills required to author robust automation code.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: JavaScript / TypeScript for QA
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'typescript-for-qa';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'JavaScript / TypeScript for QA', 'typescript-for-qa', 'Variables, loops, async/await, promises, assertions, and modern ES6 syntax for test scripting.', 'SKILL', 'Beginner', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'JavaScript / TypeScript for QA',
      description = 'Variables, loops, async/await, promises, assertions, and modern ES6 syntax for test scripting.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Async/Await & Promises in Testing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Async/Await & Promises in Testing', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Functions & Scope') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Functions & Scope', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'TypeScript Types & Interfaces') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'TypeScript Types & Interfaces', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Package Management with npm') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Package Management with npm', 4);
  END IF;
  -- Section: 03 Web UI Automation with Playwright
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-web-ui-automation';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Web UI Automation with Playwright', '03-web-ui-automation', 'Next-generation web testing: auto-waiting, Page Object Model, parallel execution, and trace viewers.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Web UI Automation with Playwright',
      description = 'Next-generation web testing: auto-waiting, Page Object Model, parallel execution, and trace viewers.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Playwright Framework Architecture
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'playwright-architecture';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Playwright Framework Architecture', 'playwright-architecture', 'Selectors, assertions, handling dynamic SPAs, auto-waiting, screenshots, and visual testing.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Playwright Framework Architecture',
      description = 'Selectors, assertions, handling dynamic SPAs, auto-waiting, screenshots, and visual testing.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Locators (role, text, testId)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Locators (role, text, testId)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Auto-Waiting & Assertions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Auto-Waiting & Assertions', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Handling Iframes, Popups & Tabs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Handling Iframes, Popups & Tabs', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Playwright Trace Viewer') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Playwright Trace Viewer', 4);
  END IF;
  -- Resource: Playwright Official Documentation
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://playwright.dev/docs/intro';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Playwright Official Documentation', 'Official comprehensive tutorials for browser automation and test runners.', 'DOCUMENTATION', 'Microsoft Playwright', 'https://playwright.dev/docs/intro', 'QA & Testing', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Page Object Model (POM) Design Pattern
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'page-object-model';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Page Object Model (POM) Design Pattern', 'page-object-model', 'Structuring maintainable, scalable test suites by separating page locators from test logic.', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Page Object Model (POM) Design Pattern',
      description = 'Structuring maintainable, scalable test suites by separating page locators from test logic.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Page Object Model Architecture') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Page Object Model Architecture', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Reusable Component Helpers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Reusable Component Helpers', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Fixtures in Playwright') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Fixtures in Playwright', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Configuring Parallel Workers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Configuring Parallel Workers', 4);
  END IF;
  -- Section: 04 Backend API Automation Testing
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-api-testing';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Backend API Automation Testing', '04-api-testing', 'Validating REST APIs, status codes, JSON schema validation, and mock servers.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Backend API Automation Testing',
      description = 'Validating REST APIs, status codes, JSON schema validation, and mock servers.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: REST API Automation with Playwright / Postman
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'api-automation-testing';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'REST API Automation with Playwright / Postman', 'api-automation-testing', 'Sending GET/POST/PUT/DELETE requests, validating response bodies, auth headers, and JSON schemas.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'REST API Automation with Playwright / Postman',
      description = 'Sending GET/POST/PUT/DELETE requests, validating response bodies, auth headers, and JSON schemas.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTTP Status Assertions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTTP Status Assertions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'JSON Schema Validation (Ajv)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'JSON Schema Validation (Ajv)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Auth Token Chaining in Tests') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Auth Token Chaining in Tests', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mocking Network Responses') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mocking Network Responses', 4);
  END IF;
  -- Section: 05 CI/CD Test Pipelines & Portfolio Project
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-cicd-portfolio';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 CI/CD Test Pipelines & Portfolio Project', '05-cicd-portfolio', 'Continuous testing in GitHub Actions, test reporting, and enterprise framework project.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 CI/CD Test Pipelines & Portfolio Project',
      description = 'Continuous testing in GitHub Actions, test reporting, and enterprise framework project.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: CI/CD Automated Test Pipelines
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'cicd-test-pipelines';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'CI/CD Automated Test Pipelines', 'cicd-test-pipelines', 'Triggering automated suites on pull requests, parallel test matrix, and publishing HTML reports.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'CI/CD Automated Test Pipelines',
      description = 'Triggering automated suites on pull requests, parallel test matrix, and publishing HTML reports.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GitHub Actions Workflow YAML') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GitHub Actions Workflow YAML', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Headless Browser Execution') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Headless Browser Execution', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HTML Test Reports & Artifacts') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HTML Test Reports & Artifacts', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Handling Flaky Tests & Retries') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Handling Flaky Tests & Retries', 4);
  END IF;
  -- Node: Production Test Automation Suite Project
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-qa-automation-framework';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Production Test Automation Suite Project', 'project-qa-automation-framework', 'Full enterprise test suite with UI and API coverage, Page Object Model, and CI/CD GitHub Actions pipeline.', 'MILESTONE', 'Intermediate', 480, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Production Test Automation Suite Project',
      description = 'Full enterprise test suite with UI and API coverage, Page Object Model, and CI/CD GitHub Actions pipeline.',
      node_type = 'MILESTONE',
      difficulty = 'Intermediate',
      estimated_minutes = 480,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'E2E User Flow Coverage') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'E2E User Flow Coverage', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'API Mocking & Data Seed') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'API Mocking & Data Seed', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cross-Browser Test Matrix') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cross-Browser Test Matrix', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Clean Code in Test Automation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Clean Code in Test Automation', 4);
  END IF;
  -- Section: 06 QA Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 QA Technical Interview & Job Ready', '06-interview-ready', 'Test scenario brainstorming rounds, automation coding challenges, and QA leadership interviews.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 QA Technical Interview & Job Ready',
      description = 'Test scenario brainstorming rounds, automation coding challenges, and QA leadership interviews.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: QA & SDET Technical Interview Preparation
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'qa-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'QA & SDET Technical Interview Preparation', 'qa-interview-prep', 'Practice locator strategy questions, scenario testing for real-world products, and coding challenges.', 'CHECKPOINT', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'QA & SDET Technical Interview Preparation',
      description = 'Practice locator strategy questions, scenario testing for real-world products, and coding challenges.',
      node_type = 'CHECKPOINT',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Test Case Writing for Complex Features') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Test Case Writing for Complex Features', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Debugging Flaky Automation Scenarios') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Debugging Flaky Automation Scenarios', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Selenium vs Playwright Comparison') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Selenium vs Playwright Comparison', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mock Interview Practice') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mock Interview Practice', 4);
  END IF;
  -- Inter-node relationships for qa-automation-engineer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'testing-principles';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'test-management';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'test-management';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'typescript-for-qa';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'typescript-for-qa';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'playwright-architecture';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'playwright-architecture';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'page-object-model';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'page-object-model';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'api-automation-testing';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'api-automation-testing';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'cicd-test-pipelines';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'cicd-test-pipelines';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-qa-automation-framework';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-qa-automation-framework';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'qa-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Data Analyst (data-analyst)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'data-analyst';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Data Analyst', 'data-analyst', 'Master advanced SQL queries, Python data analysis with Pandas, interactive BI dashboards (Power BI / Tableau), and statistical storytelling.', 'Structured career path for aspiring Data Analysts and BI Professionals. Learn to query relational data warehouses, clean and transform messy datasets, calculate key business metrics, and deliver executive-ready visualizations.', 'Data', 'Beginner', '14 Weeks', 'Data Analyst Career Roadmap | KnowledgePaat', 'Step-by-step career path to becoming a Data Analyst. Master SQL, Pandas, Power BI, Tableau, data modeling, and business storytelling.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Data Analyst',
      short_description = 'Master advanced SQL queries, Python data analysis with Pandas, interactive BI dashboards (Power BI / Tableau), and statistical storytelling.',
      description = 'Structured career path for aspiring Data Analysts and BI Professionals. Learn to query relational data warehouses, clean and transform messy datasets, calculate key business metrics, and deliver executive-ready visualizations.',
      category = 'Data',
      difficulty = 'Beginner',
      estimated_duration = '14 Weeks',
      seo_title = 'Data Analyst Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career path to becoming a Data Analyst. Master SQL, Pandas, Power BI, Tableau, data modeling, and business storytelling.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Advanced SQL & Business Intelligence Querying
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-sql-data-analysis';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Advanced SQL & Business Intelligence Querying', '01-sql-data-analysis', 'The foundation of data analytics: extracting, aggregating, filtering, and joining enterprise data.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Advanced SQL & Business Intelligence Querying',
      description = 'The foundation of data analytics: extracting, aggregating, filtering, and joining enterprise data.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: SQL Querying, Aggregations & Joins
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'sql-querying-aggregations';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'SQL Querying, Aggregations & Joins', 'sql-querying-aggregations', 'Master multi-table INNER/LEFT/FULL OUTER joins, GROUP BY aggregations, HAVING filters, and CASE WHEN logic.', 'SKILL', 'Beginner', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'SQL Querying, Aggregations & Joins',
      description = 'Master multi-table INNER/LEFT/FULL OUTER joins, GROUP BY aggregations, HAVING filters, and CASE WHEN logic.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-table JOIN Strategies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-table JOIN Strategies', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GROUP BY & Summary Statistics') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GROUP BY & Summary Statistics', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Conditional Logic with CASE WHEN') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Conditional Logic with CASE WHEN', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Date & String Manipulation Functions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Date & String Manipulation Functions', 4);
  END IF;
  -- Resource: Mode Analytics SQL Tutorial
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://mode.com/sql-tutorial/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Mode Analytics SQL Tutorial', 'The gold standard interactive guide to SQL for data analysts.', 'DOCUMENTATION', 'Mode Analytics', 'https://mode.com/sql-tutorial/', 'Data', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Window Functions & Common Table Expressions (CTEs)
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'sql-window-functions-ctes';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Window Functions & Common Table Expressions (CTEs)', 'sql-window-functions-ctes', 'ROW_NUMBER, RANK, DENSE_RANK, running totals with SUM OVER, lag/lead comparisons, and nested CTEs.', 'SKILL', 'Intermediate', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Window Functions & Common Table Expressions (CTEs)',
      description = 'ROW_NUMBER, RANK, DENSE_RANK, running totals with SUM OVER, lag/lead comparisons, and nested CTEs.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ROW_NUMBER vs DENSE_RANK') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ROW_NUMBER vs DENSE_RANK', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'LEAD & LAG Month-over-Month Calcs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'LEAD & LAG Month-over-Month Calcs', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Running Totals & Moving Averages') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Running Totals & Moving Averages', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Modular Queries with WITH (CTEs)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Modular Queries with WITH (CTEs)', 4);
  END IF;
  -- Section: 02 Python for Data Analysis
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-python-data-analysis';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Python for Data Analysis', '02-python-data-analysis', 'Data manipulation with Pandas, numerical computing with NumPy, and exploratory data analysis (EDA).', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Python for Data Analysis',
      description = 'Data manipulation with Pandas, numerical computing with NumPy, and exploratory data analysis (EDA).',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Pandas & NumPy Data Wrangling
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'pandas-data-wrangling';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Pandas & NumPy Data Wrangling', 'pandas-data-wrangling', 'DataFrames, Series, filtering, indexing, handling missing values, pivoting, and merging data.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Pandas & NumPy Data Wrangling',
      description = 'DataFrames, Series, filtering, indexing, handling missing values, pivoting, and merging data.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'DataFrame Indexing & loc/iloc') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'DataFrame Indexing & loc/iloc', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Handling Missing Data (dropna/fillna)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Handling Missing Data (dropna/fillna)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GroupBy & Aggregation Pipelines') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GroupBy & Aggregation Pipelines', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Merging & Concatenating DataFrames') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Merging & Concatenating DataFrames', 4);
  END IF;
  -- Resource: 10 Minutes to Pandas
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://pandas.pydata.org/docs/user_guide/10min.html';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('10 Minutes to Pandas', 'Official quick-start guide to Pandas data structures and workflows.', 'DOCUMENTATION', 'PyData / Pandas', 'https://pandas.pydata.org/docs/user_guide/10min.html', 'Data', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Exploratory Data Analysis (EDA) & Visualization
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'eda-data-visualization';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Exploratory Data Analysis (EDA) & Visualization', 'eda-data-visualization', 'Discovering patterns, correlations, distributions, and outliers with Matplotlib and Seaborn.', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Exploratory Data Analysis (EDA) & Visualization',
      description = 'Discovering patterns, correlations, distributions, and outliers with Matplotlib and Seaborn.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Histograms & Box Plots') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Histograms & Box Plots', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Scatter Plots & Correlation Heatmaps') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Scatter Plots & Correlation Heatmaps', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Outlier Detection Techniques') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Outlier Detection Techniques', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Communicating Analytical Insights') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Communicating Analytical Insights', 4);
  END IF;
  -- Section: 03 Business Intelligence Dashboards (Power BI / Tableau)
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-bi-dashboards';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Business Intelligence Dashboards (Power BI / Tableau)', '03-bi-dashboards', 'Dimensional modeling, star schemas, DAX measures, and executive dashboard design.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Business Intelligence Dashboards (Power BI / Tableau)',
      description = 'Dimensional modeling, star schemas, DAX measures, and executive dashboard design.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Data Modeling & Dashboard Architecture
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'powerbi-tableau-modeling';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Data Modeling & Dashboard Architecture', 'powerbi-tableau-modeling', 'Star schemas, fact vs dimension tables, building calculated measures, and user-friendly filtering.', 'SKILL', 'Intermediate', 210, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Data Modeling & Dashboard Architecture',
      description = 'Star schemas, fact vs dimension tables, building calculated measures, and user-friendly filtering.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 210,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Star Schema & Snowflake Schema') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Star Schema & Snowflake Schema', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Fact vs Dimension Tables') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Fact vs Dimension Tables', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Calculated Fields & DAX / LOD Expressions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Calculated Fields & DAX / LOD Expressions', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dashboard UX & Visual Hierarchy') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dashboard UX & Visual Hierarchy', 4);
  END IF;
  -- Section: 04 Analytics Portfolio Projects
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-analytics-projects';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Analytics Portfolio Projects', '04-analytics-projects', 'End-to-end case studies analyzing customer churn, sales revenue, and marketing funnel performance.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Analytics Portfolio Projects',
      description = 'End-to-end case studies analyzing customer churn, sales revenue, and marketing funnel performance.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Customer Churn & Retention Analytics Case Study
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-churn-analytics';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Customer Churn & Retention Analytics Case Study', 'project-churn-analytics', 'End-to-end cohort and retention analysis combining SQL extraction, Pandas cleaning, and an interactive BI dashboard.', 'MILESTONE', 'Intermediate', 480, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Customer Churn & Retention Analytics Case Study',
      description = 'End-to-end cohort and retention analysis combining SQL extraction, Pandas cleaning, and an interactive BI dashboard.',
      node_type = 'MILESTONE',
      difficulty = 'Intermediate',
      estimated_minutes = 480,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cohort Analysis & Retention Rates') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cohort Analysis & Retention Rates', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'RFM Customer Segmentation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'RFM Customer Segmentation', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Executive Presentation Deck') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Executive Presentation Deck', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Interactive Dashboard Deliverable') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Interactive Dashboard Deliverable', 4);
  END IF;
  -- Section: 05 Data Analyst Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Data Analyst Interview & Job Ready', '05-interview-ready', 'SQL technical screening tests, business metric case interviews, and portfolio presentations.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Data Analyst Interview & Job Ready',
      description = 'SQL technical screening tests, business metric case interviews, and portfolio presentations.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Data Analyst SQL Screening & Case Studies
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'data-analyst-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Data Analyst SQL Screening & Case Studies', 'data-analyst-interview-prep', 'Solve complex SQL problems live, explain trade-offs between metrics (CAC, LTV, Churn), and present case studies.', 'CHECKPOINT', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Data Analyst SQL Screening & Case Studies',
      description = 'Solve complex SQL problems live, explain trade-offs between metrics (CAC, LTV, Churn), and present case studies.',
      node_type = 'CHECKPOINT',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Live SQL Coding Interview Patterns') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Live SQL Coding Interview Patterns', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Business Metric Definitions (CAC, LTV, ARR)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Business Metric Definitions (CAC, LTV, ARR)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'A/B Testing Statistical Significance') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'A/B Testing Statistical Significance', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Behavioral Interview Practice') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Behavioral Interview Practice', 4);
  END IF;
  -- Inter-node relationships for data-analyst
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-querying-aggregations';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-window-functions-ctes';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'sql-window-functions-ctes';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'pandas-data-wrangling';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'pandas-data-wrangling';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'eda-data-visualization';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'eda-data-visualization';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'powerbi-tableau-modeling';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'powerbi-tableau-modeling';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-churn-analytics';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-churn-analytics';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'data-analyst-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: DevOps Engineer (devops-engineer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'devops-engineer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'DevOps Engineer', 'devops-engineer', 'Master Linux system administration, Docker containers, Kubernetes cluster management, CI/CD with GitHub Actions, Terraform IaC, and Prometheus monitoring.', 'Complete career path for DevOps and Cloud Infrastructure Engineers. Learn Linux networking, containerization, orchestration, automated deployment pipelines, infrastructure as code, and site reliability engineering.', 'DevOps & Cloud', 'Intermediate', '18 Weeks', 'DevOps Engineer Career Roadmap | KnowledgePaat', 'Step-by-step career path to becoming a DevOps Engineer. Master Linux, Docker, Kubernetes, Terraform, CI/CD, and AWS.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'DevOps Engineer',
      short_description = 'Master Linux system administration, Docker containers, Kubernetes cluster management, CI/CD with GitHub Actions, Terraform IaC, and Prometheus monitoring.',
      description = 'Complete career path for DevOps and Cloud Infrastructure Engineers. Learn Linux networking, containerization, orchestration, automated deployment pipelines, infrastructure as code, and site reliability engineering.',
      category = 'DevOps & Cloud',
      difficulty = 'Intermediate',
      estimated_duration = '18 Weeks',
      seo_title = 'DevOps Engineer Career Roadmap | KnowledgePaat',
      seo_description = 'Step-by-step career path to becoming a DevOps Engineer. Master Linux, Docker, Kubernetes, Terraform, CI/CD, and AWS.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Linux, Shell & Networking
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-linux-networking';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Linux, Shell & Networking', '01-linux-networking', 'System administration, Bash automation, permissions, process monitoring, and networking protocols.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Linux, Shell & Networking',
      description = 'System administration, Bash automation, permissions, process monitoring, and networking protocols.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Linux Administration & Shell Scripting
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'linux-admin-shell';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Linux Administration & Shell Scripting', 'linux-admin-shell', 'User management, permissions (chmod/chown), systemd services, cron jobs, and Bash scripting.', 'SKILL', 'Beginner', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Linux Administration & Shell Scripting',
      description = 'User management, permissions (chmod/chown), systemd services, cron jobs, and Bash scripting.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'File Permissions & Ownership') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'File Permissions & Ownership', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Process Management (ps, top, systemctl)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Process Management (ps, top, systemctl)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Bash Scripting & Automation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Bash Scripting & Automation', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'SSH Keys & Secure Shell Access') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'SSH Keys & Secure Shell Access', 4);
  END IF;
  -- Resource: Linux Journey — Grasshopper & Journeyman
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://linuxjourney.com/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Linux Journey — Grasshopper & Journeyman', 'Free, organized visual guide to learning Linux from scratch.', 'DOCUMENTATION', 'Linux Journey', 'https://linuxjourney.com/', 'DevOps & Cloud', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Networking Fundamentals for DevOps
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'networking-protocols-dns';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Networking Fundamentals for DevOps', 'networking-protocols-dns', 'TCP/IP model, DNS records, firewalls (iptables/ufw), reverse proxies (Nginx), and SSL/TLS certificates.', 'TOPIC', 'Beginner', 120, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Networking Fundamentals for DevOps',
      description = 'TCP/IP model, DNS records, firewalls (iptables/ufw), reverse proxies (Nginx), and SSL/TLS certificates.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'OSI Model vs TCP/IP') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'OSI Model vs TCP/IP', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'DNS Resolution (A, CNAME, MX)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'DNS Resolution (A, CNAME, MX)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Reverse Proxies with Nginx') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Reverse Proxies with Nginx', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'TLS/SSL Certificates & Certbot') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'TLS/SSL Certificates & Certbot', 4);
  END IF;
  -- Section: 02 Containers & Docker Ecosystem
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-containers-docker';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Containers & Docker Ecosystem', '02-containers-docker', 'Packaging applications, multi-stage builds, container networks, volumes, and Docker Compose.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Containers & Docker Ecosystem',
      description = 'Packaging applications, multi-stage builds, container networks, volumes, and Docker Compose.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Docker Containerization Mastery
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'docker-containerization-mastery';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Docker Containerization Mastery', 'docker-containerization-mastery', 'Writing minimal Dockerfiles, layer caching, non-root security, multi-stage builds, and Docker Compose.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Docker Containerization Mastery',
      description = 'Writing minimal Dockerfiles, layer caching, non-root security, multi-stage builds, and Docker Compose.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Container Namespaces & Cgroups') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Container Namespaces & Cgroups', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dockerfile Instructions & Optimization') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dockerfile Instructions & Optimization', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-Stage Builds') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-Stage Builds', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Docker Compose Multi-Container Orchestration') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Docker Compose Multi-Container Orchestration', 4);
  END IF;
  -- Resource: Docker Official Documentation & Guides
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://docs.docker.com/get-started/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Docker Official Documentation & Guides', 'Official guides for building, running, and securing containers.', 'DOCUMENTATION', 'Docker Docs', 'https://docs.docker.com/get-started/', 'DevOps & Cloud', 'Beginner', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 03 Kubernetes & Orchestration
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-kubernetes-orchestration';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Kubernetes & Orchestration', '03-kubernetes-orchestration', 'Deploying, scaling, and managing containerized workloads in high-availability clusters.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Kubernetes & Orchestration',
      description = 'Deploying, scaling, and managing containerized workloads in high-availability clusters.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Kubernetes Core Architecture & Objects
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'kubernetes-core-architecture';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Kubernetes Core Architecture & Objects', 'kubernetes-core-architecture', 'Control plane, worker nodes, Pods, Deployments, Services (ClusterIP/NodePort/LoadBalancer), and Ingress.', 'SKILL', 'Advanced', 300, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Kubernetes Core Architecture & Objects',
      description = 'Control plane, worker nodes, Pods, Deployments, Services (ClusterIP/NodePort/LoadBalancer), and Ingress.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 300,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Pods, Deployments & ReplicaSets') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Pods, Deployments & ReplicaSets', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Services & Ingress Controllers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Services & Ingress Controllers', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ConfigMaps & Secrets Management') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ConfigMaps & Secrets Management', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Persistent Volumes & Claims') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Persistent Volumes & Claims', 4);
  END IF;
  -- Resource: Kubernetes Official Tutorials
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://kubernetes.io/docs/tutorials/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('Kubernetes Official Tutorials', 'Interactive browser-based tutorials for learning Kubernetes fundamentals.', 'DOCUMENTATION', 'Kubernetes.io', 'https://kubernetes.io/docs/tutorials/', 'DevOps & Cloud', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 04 Infrastructure as Code (Terraform) & CI/CD
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-iac-cicd';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 Infrastructure as Code (Terraform) & CI/CD', '04-iac-cicd', 'Automating cloud infrastructure provisioning with Terraform and deployment pipelines with GitHub Actions.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 Infrastructure as Code (Terraform) & CI/CD',
      description = 'Automating cloud infrastructure provisioning with Terraform and deployment pipelines with GitHub Actions.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Terraform & Infrastructure as Code (IaC)
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'terraform-iac-cloud';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Terraform & Infrastructure as Code (IaC)', 'terraform-iac-cloud', 'HCL syntax, providers, state management, remote backend, modules, and provisioning AWS resources.', 'SKILL', 'Intermediate', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Terraform & Infrastructure as Code (IaC)',
      description = 'HCL syntax, providers, state management, remote backend, modules, and provisioning AWS resources.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'HCL Syntax & Resources') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'HCL Syntax & Resources', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Terraform State & S3 Remote Locking') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Terraform State & S3 Remote Locking', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Reusable Terraform Modules') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Reusable Terraform Modules', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Plan, Apply & Destroy Lifecycles') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Plan, Apply & Destroy Lifecycles', 4);
  END IF;
  -- Node: CI/CD Pipelines with GitHub Actions
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'github-actions-cicd';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'CI/CD Pipelines with GitHub Actions', 'github-actions-cicd', 'Workflows, triggers, matrix testing, secret management, building Docker images, and GitOps deployments.', 'SKILL', 'Intermediate', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'CI/CD Pipelines with GitHub Actions',
      description = 'Workflows, triggers, matrix testing, secret management, building Docker images, and GitOps deployments.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GitHub Actions Triggers & Jobs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GitHub Actions Triggers & Jobs', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Building & Pushing Images to Docker Hub / ECR') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Building & Pushing Images to Docker Hub / ECR', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Automated Test Matrix') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Automated Test Matrix', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GitOps with ArgoCD') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GitOps with ArgoCD', 4);
  END IF;
  -- Section: 05 Production DevOps Portfolio Project
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-devops-project';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 Production DevOps Portfolio Project', '05-devops-project', 'End-to-end cloud infrastructure and automated delivery pipeline.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 Production DevOps Portfolio Project',
      description = 'End-to-end cloud infrastructure and automated delivery pipeline.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: GitOps Kubernetes Deployment Pipeline Project
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-gitops-kubernetes';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'GitOps Kubernetes Deployment Pipeline Project', 'project-gitops-kubernetes', 'Provision AWS infrastructure via Terraform, build images with GitHub Actions, and deploy to Kubernetes via ArgoCD.', 'MILESTONE', 'Advanced', 600, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'GitOps Kubernetes Deployment Pipeline Project',
      description = 'Provision AWS infrastructure via Terraform, build images with GitHub Actions, and deploy to Kubernetes via ArgoCD.',
      node_type = 'MILESTONE',
      difficulty = 'Advanced',
      estimated_minutes = 600,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Terraform Cloud Provisioning') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Terraform Cloud Provisioning', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GitHub Actions CI') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GitHub Actions CI', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ArgoCD GitOps Synchronizer') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ArgoCD GitOps Synchronizer', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Prometheus & Grafana Monitoring Dashboard') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Prometheus & Grafana Monitoring Dashboard', 4);
  END IF;
  -- Section: 06 DevOps Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '06-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '06 DevOps Technical Interview & Job Ready', '06-interview-ready', 'Scenario-based troubleshooting, site reliability incident response, and architecture design.', 6, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '06 DevOps Technical Interview & Job Ready',
      description = 'Scenario-based troubleshooting, site reliability incident response, and architecture design.',
      sequence = 6,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: DevOps & SRE Interview Preparation
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'devops-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'DevOps & SRE Interview Preparation', 'devops-interview-prep', 'Practice Kubernetes crash-loop troubleshooting, Linux permission problems, and disaster recovery design.', 'CHECKPOINT', 'Advanced', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'DevOps & SRE Interview Preparation',
      description = 'Practice Kubernetes crash-loop troubleshooting, Linux permission problems, and disaster recovery design.',
      node_type = 'CHECKPOINT',
      difficulty = 'Advanced',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Troubleshooting Pod CrashLoopBackOff') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Troubleshooting Pod CrashLoopBackOff', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Incident Response & Postmortems') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Incident Response & Postmortems', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'SLA / SLO / SLI Calculations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'SLA / SLO / SLI Calculations', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cloud Cost Optimization Strategies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cloud Cost Optimization Strategies', 4);
  END IF;
  -- Inter-node relationships for devops-engineer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'linux-admin-shell';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'networking-protocols-dns';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'networking-protocols-dns';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-containerization-mastery';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-containerization-mastery';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'kubernetes-core-architecture';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'kubernetes-core-architecture';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'terraform-iac-cloud';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'terraform-iac-cloud';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'github-actions-cicd';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'github-actions-cicd';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-gitops-kubernetes';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-gitops-kubernetes';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'devops-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: AI Engineer (ai-engineer)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'ai-engineer';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'AI Engineer', 'ai-engineer', 'Master Python for AI, Prompt Engineering, LangChain, Vector Databases, Retrieval-Augmented Generation (RAG), and Autonomous AI Agents.', 'Cutting-edge career pathway for Generative AI and LLM Application Engineers. Learn to build production RAG systems with vector embeddings, orchestrate multi-agent workflows, implement guardrails, and deploy scalable AI APIs.', 'AI', 'Intermediate', '16 Weeks', 'AI Engineer Career Roadmap | KnowledgePaat', 'Master Generative AI, LangChain, Vector Databases, RAG architectures, and Autonomous AI Agents.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'AI Engineer',
      short_description = 'Master Python for AI, Prompt Engineering, LangChain, Vector Databases, Retrieval-Augmented Generation (RAG), and Autonomous AI Agents.',
      description = 'Cutting-edge career pathway for Generative AI and LLM Application Engineers. Learn to build production RAG systems with vector embeddings, orchestrate multi-agent workflows, implement guardrails, and deploy scalable AI APIs.',
      category = 'AI',
      difficulty = 'Intermediate',
      estimated_duration = '16 Weeks',
      seo_title = 'AI Engineer Career Roadmap | KnowledgePaat',
      seo_description = 'Master Generative AI, LangChain, Vector Databases, RAG architectures, and Autonomous AI Agents.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Python for AI & Model Foundations
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-ai-foundations';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Python for AI & Model Foundations', '01-ai-foundations', 'Vector mathematics, embedding representations, and foundation model mechanics.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Python for AI & Model Foundations',
      description = 'Vector mathematics, embedding representations, and foundation model mechanics.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Foundation Models & Transformer Mechanics
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'transformer-foundations';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Foundation Models & Transformer Mechanics', 'transformer-foundations', 'Attention mechanisms, tokenization, context windows, temperature, and top-p sampling parameters.', 'TOPIC', 'Intermediate', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Foundation Models & Transformer Mechanics',
      description = 'Attention mechanisms, tokenization, context windows, temperature, and top-p sampling parameters.',
      node_type = 'TOPIC',
      difficulty = 'Intermediate',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Self-Attention & Transformer Architecture') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Self-Attention & Transformer Architecture', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Tokenization & Byte-Pair Encoding') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Tokenization & Byte-Pair Encoding', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Temperature & Sampling Hyperparameters') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Temperature & Sampling Hyperparameters', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Context Windows & Token Pricing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Context Windows & Token Pricing', 4);
  END IF;
  -- Resource: The Illustrated Transformer — Jay Alammar
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://jalammar.github.io/illustrated-transformer/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('The Illustrated Transformer — Jay Alammar', 'The classic visual breakdown of transformer neural networks and attention.', 'ARTICLE', 'Jay Alammar', 'https://jalammar.github.io/illustrated-transformer/', 'AI', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Node: Advanced Prompt Engineering & Guardrails
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'prompt-engineering-guardrails';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Advanced Prompt Engineering & Guardrails', 'prompt-engineering-guardrails', 'Few-shot prompting, Chain of Thought (CoT), structured outputs (JSON schema), and jailbreak defense.', 'SKILL', 'Intermediate', 150, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Advanced Prompt Engineering & Guardrails',
      description = 'Few-shot prompting, Chain of Thought (CoT), structured outputs (JSON schema), and jailbreak defense.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Chain-of-Thought (CoT) Prompting') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Chain-of-Thought (CoT) Prompting', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'System Prompts & Personas') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'System Prompts & Personas', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Structured JSON Output Enforcing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Structured JSON Output Enforcing', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Guardrails & Prompt Injection Defenses') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Guardrails & Prompt Injection Defenses', 4);
  END IF;
  -- Section: 02 Vector Databases & Retrieval-Augmented Generation (RAG)
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-vector-rag';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Vector Databases & Retrieval-Augmented Generation (RAG)', '02-vector-rag', 'Document ingestion, chunking algorithms, embeddings, vector search, and RAG pipelines.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Vector Databases & Retrieval-Augmented Generation (RAG)',
      description = 'Document ingestion, chunking algorithms, embeddings, vector search, and RAG pipelines.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Vector Embeddings & Semantic Search
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'vector-embeddings-search';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Vector Embeddings & Semantic Search', 'vector-embeddings-search', 'Generating dense vector embeddings, cosine similarity, Pinecone / Chroma / Qdrant, and indexing.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Vector Embeddings & Semantic Search',
      description = 'Generating dense vector embeddings, cosine similarity, Pinecone / Chroma / Qdrant, and indexing.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dense Vector Embeddings') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dense Vector Embeddings', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cosine Similarity vs Euclidean Distance') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cosine Similarity vs Euclidean Distance', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Vector Databases (ChromaDB / Pinecone)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Vector Databases (ChromaDB / Pinecone)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Approximate Nearest Neighbors (ANN / HNSW)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Approximate Nearest Neighbors (ANN / HNSW)', 4);
  END IF;
  -- Node: Production RAG Architecture
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'production-rag-architecture';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Production RAG Architecture', 'production-rag-architecture', 'Document chunking strategies, semantic routing, re-ranking, query rewriting, and citation verification.', 'SKILL', 'Advanced', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Production RAG Architecture',
      description = 'Document chunking strategies, semantic routing, re-ranking, query rewriting, and citation verification.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Recursive Character Chunking') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Recursive Character Chunking', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hybrid Search (Sparse BM25 + Dense Vectors)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hybrid Search (Sparse BM25 + Dense Vectors)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Re-Ranking with Cross-Encoders') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Re-Ranking with Cross-Encoders', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Ragas & TruLens Evaluation Metrics') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Ragas & TruLens Evaluation Metrics', 4);
  END IF;
  -- Resource: LangChain Retrieval-Augmented Generation (RAG) Guide
  SELECT id INTO v_res_id FROM career_resources WHERE url = 'https://python.langchain.com/docs/use_cases/question_answering/';
  IF v_res_id IS NULL THEN
    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)
    VALUES ('LangChain Retrieval-Augmented Generation (RAG) Guide', 'Official LangChain documentation for building end-to-end question answering systems.', 'DOCUMENTATION', 'LangChain', 'https://python.langchain.com/docs/use_cases/question_answering/', 'AI', 'Intermediate', 45, true, true)
    RETURNING id INTO v_res_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)
    VALUES (v_node_id, v_res_id, true, 1);
  END IF;
  -- Section: 03 AI Agents, Tools & Function Calling
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-ai-agents';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 AI Agents, Tools & Function Calling', '03-ai-agents', 'Autonomous reasoning loops (ReAct), tool calling, state machines, and multi-agent coordination.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 AI Agents, Tools & Function Calling',
      description = 'Autonomous reasoning loops (ReAct), tool calling, state machines, and multi-agent coordination.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Function Calling & Tool Execution
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'function-calling-tools';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Function Calling & Tool Execution', 'function-calling-tools', 'Supplying JSON schemas to LLMs for structured tool invocation (database lookup, web search, calculator).', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Function Calling & Tool Execution',
      description = 'Supplying JSON schemas to LLMs for structured tool invocation (database lookup, web search, calculator).',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'OpenAI / Anthropic Tool Calling API') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'OpenAI / Anthropic Tool Calling API', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Pydantic Tool Definitions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Pydantic Tool Definitions', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Handling Errors in Tool Execution') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Handling Errors in Tool Execution', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Stateful Chat Memory') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Stateful Chat Memory', 4);
  END IF;
  -- Node: Autonomous Multi-Agent Workflows (LangGraph / CrewAI)
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'multi-agent-workflows';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Autonomous Multi-Agent Workflows (LangGraph / CrewAI)', 'multi-agent-workflows', 'State graph workflows, planning agents, human-in-the-loop validation, and agent supervisor patterns.', 'SKILL', 'Advanced', 240, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Autonomous Multi-Agent Workflows (LangGraph / CrewAI)',
      description = 'State graph workflows, planning agents, human-in-the-loop validation, and agent supervisor patterns.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 240,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ReAct Reasoning Pattern') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ReAct Reasoning Pattern', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'LangGraph State Graphs & Cycles') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'LangGraph State Graphs & Cycles', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Human-in-the-Loop Interventions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Human-in-the-Loop Interventions', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-Agent Collaboration') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-Agent Collaboration', 4);
  END IF;
  -- Section: 04 AI Engineering Portfolio Project
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '04-ai-portfolio-project';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '04 AI Engineering Portfolio Project', '04-ai-portfolio-project', 'Deploy a commercial enterprise AI assistant with cited RAG and tool integration.', 4, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '04 AI Engineering Portfolio Project',
      description = 'Deploy a commercial enterprise AI assistant with cited RAG and tool integration.',
      sequence = 4,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Enterprise Document Intelligence & Research Agent
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-enterprise-rag-agent';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Enterprise Document Intelligence & Research Agent', 'project-enterprise-rag-agent', 'Full-stack AI app parsing legal/financial documents, generating verified answers with source citations, and running analytical queries.', 'MILESTONE', 'Advanced', 600, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Enterprise Document Intelligence & Research Agent',
      description = 'Full-stack AI app parsing legal/financial documents, generating verified answers with source citations, and running analytical queries.',
      node_type = 'MILESTONE',
      difficulty = 'Advanced',
      estimated_minutes = 600,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-PDF Ingestion Pipeline') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-PDF Ingestion Pipeline', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hybrid Search with Cohere Re-Ranking') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hybrid Search with Cohere Re-Ranking', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Streaming UI with Next.js & FastAPI') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Streaming UI with Next.js & FastAPI', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hallucination Evaluation Suite') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hallucination Evaluation Suite', 4);
  END IF;
  -- Section: 05 AI Technical Interview & Job Ready
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '05-interview-ready';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '05 AI Technical Interview & Job Ready', '05-interview-ready', 'RAG failure mode questions, context window optimization, fine-tuning trade-offs, and system design for AI.', 5, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '05 AI Technical Interview & Job Ready',
      description = 'RAG failure mode questions, context window optimization, fine-tuning trade-offs, and system design for AI.',
      sequence = 5,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: AI Engineer Technical Interview Preparation
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'ai-interview-prep';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'AI Engineer Technical Interview Preparation', 'ai-interview-prep', 'Master system design for LLM applications, token economics, latency reduction, and evaluation benchmarks.', 'CHECKPOINT', 'Advanced', 240, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'AI Engineer Technical Interview Preparation',
      description = 'Master system design for LLM applications, token economics, latency reduction, and evaluation benchmarks.',
      node_type = 'CHECKPOINT',
      difficulty = 'Advanced',
      estimated_minutes = 240,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'RAG vs Fine-Tuning Decision Framework') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'RAG vs Fine-Tuning Decision Framework', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mitigating Hallucinations in Production') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mitigating Hallucinations in Production', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'LLM System Design (Caching, Streaming, Cost)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'LLM System Design (Caching, Streaming, Cost)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Mock Technical Interview') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Mock Technical Interview', 4);
  END IF;
  -- Inter-node relationships for ai-engineer
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'transformer-foundations';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'prompt-engineering-guardrails';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'prompt-engineering-guardrails';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'vector-embeddings-search';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'vector-embeddings-search';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'production-rag-architecture';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'production-rag-architecture';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'function-calling-tools';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'function-calling-tools';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'multi-agent-workflows';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'multi-agent-workflows';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-enterprise-rag-agent';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-enterprise-rag-agent';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'ai-interview-prep';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Python (python)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'python';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Python', 'python', 'Deep-dive into the Python programming language: memory model, iterators, generators, decorators, concurrency, and performance tuning.', 'Technology-focused roadmap for mastering Python from core language syntax to advanced metaprogramming, asynchronous programming with asyncio, and clean software architecture.', 'Development', 'Intermediate', '8 Weeks', 'Python Language Skill Roadmap | KnowledgePaat', 'Comprehensive technology roadmap for Python. Master syntax, OOP, dunder methods, generators, asyncio, and clean code.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Python',
      short_description = 'Deep-dive into the Python programming language: memory model, iterators, generators, decorators, concurrency, and performance tuning.',
      description = 'Technology-focused roadmap for mastering Python from core language syntax to advanced metaprogramming, asynchronous programming with asyncio, and clean software architecture.',
      category = 'Development',
      difficulty = 'Intermediate',
      estimated_duration = '8 Weeks',
      seo_title = 'Python Language Skill Roadmap | KnowledgePaat',
      seo_description = 'Comprehensive technology roadmap for Python. Master syntax, OOP, dunder methods, generators, asyncio, and clean code.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Core Syntax & Built-ins
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-core-syntax';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Core Syntax & Built-ins', '01-core-syntax', 'Primitive types, collections, control flow, functions, and standard library.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Core Syntax & Built-ins',
      description = 'Primitive types, collections, control flow, functions, and standard library.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Data Structures & Pythonic Idioms
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'pythonic-idioms';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Data Structures & Pythonic Idioms', 'pythonic-idioms', 'List/dict/set comprehensions, unpacking, zip/enumerate, and the collections module.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Data Structures & Pythonic Idioms',
      description = 'List/dict/set comprehensions, unpacking, zip/enumerate, and the collections module.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Comprehensions & Generator Expressions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Comprehensions & Generator Expressions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'collections.defaultdict & Counter') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'collections.defaultdict & Counter', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Unpacking & Slicing Tricks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Unpacking & Slicing Tricks', 3);
  END IF;
  -- Section: 02 Advanced Python Patterns
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-advanced-patterns';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Advanced Python Patterns', '02-advanced-patterns', 'Iterators, generators, decorators, context managers, and dunder methods.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Advanced Python Patterns',
      description = 'Iterators, generators, decorators, context managers, and dunder methods.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Decorators & Closures
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'decorators-closures';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Decorators & Closures', 'decorators-closures', 'Higher-order functions, functools.wraps, parameterized decorators, and class decorators.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Decorators & Closures',
      description = 'Higher-order functions, functools.wraps, parameterized decorators, and class decorators.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Closures & Lexical Scoping') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Closures & Lexical Scoping', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Writing Custom Decorators') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Writing Custom Decorators', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'functools.wraps & functools.lru_cache') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'functools.wraps & functools.lru_cache', 3);
  END IF;
  -- Node: Generators, Iterators & Context Managers
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'generators-iterators-context';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Generators, Iterators & Context Managers', 'generators-iterators-context', 'yield statements, generator pipelines, __iter__ / __next__, and with statement protocols.', 'SKILL', 'Intermediate', 150, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Generators, Iterators & Context Managers',
      description = 'yield statements, generator pipelines, __iter__ / __next__, and with statement protocols.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'yield & Memory Efficiency') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'yield & Memory Efficiency', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Iterator Protocol') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Iterator Protocol', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'contextlib & __enter__ / __exit__') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'contextlib & __enter__ / __exit__', 3);
  END IF;
  -- Section: 03 Asynchronous Python (asyncio)
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-asyncio';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Asynchronous Python (asyncio)', '03-asyncio', 'Cooperative multitasking, event loops, tasks, coroutines, and async I/O.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Asynchronous Python (asyncio)',
      description = 'Cooperative multitasking, event loops, tasks, coroutines, and async I/O.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: asyncio Event Loops & Coroutines
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'asyncio-event-loops';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'asyncio Event Loops & Coroutines', 'asyncio-event-loops', 'Understanding async/await, asyncio.gather, Task objects, and handling async timeouts.', 'SKILL', 'Advanced', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'asyncio Event Loops & Coroutines',
      description = 'Understanding async/await, asyncio.gather, Task objects, and handling async timeouts.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Coroutines vs Threads vs Processes') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Coroutines vs Threads vs Processes', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'asyncio.gather & Task Groups') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'asyncio.gather & Task Groups', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Async Context Managers & Iterators') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Async Context Managers & Iterators', 3);
  END IF;
  -- Inter-node relationships for python
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'pythonic-idioms';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'decorators-closures';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'decorators-closures';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'generators-iterators-context';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'generators-iterators-context';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'asyncio-event-loops';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: React (react)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'react';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'React', 'react', 'Deep-dive into React: JSX, component composition, hooks, state machines, reconciliation, performance profiling, and server components.', 'Focused technology roadmap for mastering React. Learn component design patterns, custom hooks, context optimization, virtual DOM mechanics, and transition to React 19 / Server Components.', 'Development', 'Intermediate', '8 Weeks', 'React Skill Roadmap | KnowledgePaat', 'Complete technology roadmap for React. Master hooks, state management, memoization, custom hooks, and React 19.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'React',
      short_description = 'Deep-dive into React: JSX, component composition, hooks, state machines, reconciliation, performance profiling, and server components.',
      description = 'Focused technology roadmap for mastering React. Learn component design patterns, custom hooks, context optimization, virtual DOM mechanics, and transition to React 19 / Server Components.',
      category = 'Development',
      difficulty = 'Intermediate',
      estimated_duration = '8 Weeks',
      seo_title = 'React Skill Roadmap | KnowledgePaat',
      seo_description = 'Complete technology roadmap for React. Master hooks, state management, memoization, custom hooks, and React 19.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Core React & JSX
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-core-react';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Core React & JSX', '01-core-react', 'JSX compilation, props, rendering cycle, and synthetic events.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Core React & JSX',
      description = 'JSX compilation, props, rendering cycle, and synthetic events.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Component Composition & Children Pattern
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'component-composition';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Component Composition & Children Pattern', 'component-composition', 'Avoid prop drilling using slot patterns, children prop, and modular layout components.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Component Composition & Children Pattern',
      description = 'Avoid prop drilling using slot patterns, children prop, and modular layout components.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Children Prop & Inversion of Control') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Children Prop & Inversion of Control', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Compound Component Pattern') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Compound Component Pattern', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Component Separation of Concerns') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Component Separation of Concerns', 3);
  END IF;
  -- Section: 02 Hooks & Lifecycle Mechanics
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-hooks-lifecycle';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Hooks & Lifecycle Mechanics', '02-hooks-lifecycle', 'State, effects, refs, and custom hook abstractions.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Hooks & Lifecycle Mechanics',
      description = 'State, effects, refs, and custom hook abstractions.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Mastering useEffect & Sync with External Systems
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'useeffect-mastery';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Mastering useEffect & Sync with External Systems', 'useeffect-mastery', 'Understanding dependency arrays, cleanup functions, race condition handling, and avoiding unnecessary effects.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Mastering useEffect & Sync with External Systems',
      description = 'Understanding dependency arrays, cleanup functions, race condition handling, and avoiding unnecessary effects.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Effect Cleanup Functions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Effect Cleanup Functions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Synchronizing with Browser APIs / WebSockets') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Synchronizing with Browser APIs / WebSockets', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Handling AbortControllers & Race Conditions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Handling AbortControllers & Race Conditions', 3);
  END IF;
  -- Node: Custom Hooks Architecture
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'custom-hooks-architecture';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Custom Hooks Architecture', 'custom-hooks-architecture', 'Extracting stateful business logic into reusable testable hooks (useDebounce, useMediaQuery, useFetch).', 'SKILL', 'Intermediate', 150, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Custom Hooks Architecture',
      description = 'Extracting stateful business logic into reusable testable hooks (useDebounce, useMediaQuery, useFetch).',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hook Rules & Linting') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hook Rules & Linting', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Extracting State & Handlers') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Extracting State & Handlers', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Testing Custom Hooks with React Testing Library') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Testing Custom Hooks with React Testing Library', 3);
  END IF;
  -- Section: 03 Performance & Rendering Optimization
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-performance-optimization';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Performance & Rendering Optimization', '03-performance-optimization', 'Re-render mitigation, memoization, lazy loading, and React profiling.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Performance & Rendering Optimization',
      description = 'Re-render mitigation, memoization, lazy loading, and React profiling.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: useMemo, useCallback & React Profiler
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'react-memoization-profiler';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'useMemo, useCallback & React Profiler', 'react-memoization-profiler', 'Measuring render durations, memoizing expensive calculations, and stabilizing callback references.', 'SKILL', 'Advanced', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'useMemo, useCallback & React Profiler',
      description = 'Measuring render durations, memoizing expensive calculations, and stabilizing callback references.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'React Profiler in DevTools') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'React Profiler in DevTools', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'useMemo vs useCallback Trade-offs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'useMemo vs useCallback Trade-offs', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'React.memo & Shallow Equality Checks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'React.memo & Shallow Equality Checks', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Code Splitting with React.lazy & Suspense') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Code Splitting with React.lazy & Suspense', 4);
  END IF;
  -- Inter-node relationships for react
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'component-composition';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'useeffect-mastery';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'useeffect-mastery';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'custom-hooks-architecture';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'custom-hooks-architecture';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'react-memoization-profiler';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: SQL & Relational Databases (sql)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'sql';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'SQL & Relational Databases', 'sql', 'Deep-dive into SQL, relational data modeling, query optimization, execution plans, indexes, transactions, and stored procedures.', 'Master the language of relational data. From core CRUD and joins to window functions, recursive CTEs, indexing internals, lock contention, and PostgreSQL tuning.', 'Data', 'Beginner', '8 Weeks', 'SQL Skill Roadmap | KnowledgePaat', 'Master SQL queries, database indexing, joins, window functions, and database performance tuning.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'SQL & Relational Databases',
      short_description = 'Deep-dive into SQL, relational data modeling, query optimization, execution plans, indexes, transactions, and stored procedures.',
      description = 'Master the language of relational data. From core CRUD and joins to window functions, recursive CTEs, indexing internals, lock contention, and PostgreSQL tuning.',
      category = 'Data',
      difficulty = 'Beginner',
      estimated_duration = '8 Weeks',
      seo_title = 'SQL Skill Roadmap | KnowledgePaat',
      seo_description = 'Master SQL queries, database indexing, joins, window functions, and database performance tuning.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Data Definition & Querying
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-ddl-querying';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Data Definition & Querying', '01-ddl-querying', 'Schema creation, constraints, CRUD queries, filtering, and joins.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Data Definition & Querying',
      description = 'Schema creation, constraints, CRUD queries, filtering, and joins.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Relational Schemas & Constraints
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'schemas-constraints';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Relational Schemas & Constraints', 'schemas-constraints', 'Primary keys, foreign keys, unique constraints, check constraints, and cascading actions.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Relational Schemas & Constraints',
      description = 'Primary keys, foreign keys, unique constraints, check constraints, and cascading actions.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Primary & Foreign Keys') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Primary & Foreign Keys', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ON DELETE CASCADE / SET NULL') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ON DELETE CASCADE / SET NULL', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Data Types & Nullability') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Data Types & Nullability', 3);
  END IF;
  -- Section: 02 Analytical & Advanced SQL
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-advanced-sql';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Analytical & Advanced SQL', '02-advanced-sql', 'Window functions, subqueries, common table expressions, and pivots.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Analytical & Advanced SQL',
      description = 'Window functions, subqueries, common table expressions, and pivots.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Window Functions & Ranking
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'window-functions-ranking';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Window Functions & Ranking', 'window-functions-ranking', 'ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and running sums with partition clauses.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Window Functions & Ranking',
      description = 'ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and running sums with partition clauses.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'PARTITION BY & ORDER BY') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'PARTITION BY & ORDER BY', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'ROW_NUMBER vs RANK vs DENSE_RANK') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'ROW_NUMBER vs RANK vs DENSE_RANK', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'LEAD & LAG Time Comparisons') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'LEAD & LAG Time Comparisons', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cumulative Aggregations') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cumulative Aggregations', 4);
  END IF;
  -- Section: 03 Performance, Indexing & Transactions
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-performance-indexing';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Performance, Indexing & Transactions', '03-performance-indexing', 'Execution plans (EXPLAIN), B-Tree indexes, partial indexes, and ACID transactions.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Performance, Indexing & Transactions',
      description = 'Execution plans (EXPLAIN), B-Tree indexes, partial indexes, and ACID transactions.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Indexing Mechanics & Query Tuning
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'indexing-query-tuning';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Indexing Mechanics & Query Tuning', 'indexing-query-tuning', 'Reading EXPLAIN plans, index scans vs seq scans, composite index column ordering, and vacuuming.', 'SKILL', 'Advanced', 210, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Indexing Mechanics & Query Tuning',
      description = 'Reading EXPLAIN plans, index scans vs seq scans, composite index column ordering, and vacuuming.',
      node_type = 'SKILL',
      difficulty = 'Advanced',
      estimated_minutes = 210,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'EXPLAIN ANALYZE Cost & Actual Time') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'EXPLAIN ANALYZE Cost & Actual Time', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Index Leftmost Prefix Rule') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Index Leftmost Prefix Rule', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Covering Indexes (INCLUDE)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Covering Indexes (INCLUDE)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Transactions & Deadlocks') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Transactions & Deadlocks', 4);
  END IF;
  -- Inter-node relationships for sql
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'schemas-constraints';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'window-functions-ranking';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'window-functions-ranking';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'indexing-query-tuning';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Docker & Containers (docker)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'docker';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Docker & Containers', 'docker', 'Deep-dive into containerization: Dockerfile directives, multi-stage builds, networking, volumes, compose files, and security hardening.', 'Comprehensive technology roadmap for Docker. Learn container runtime mechanics, image layer optimization, environment reproducibility, multi-container orchestration with Docker Compose, and production security.', 'DevOps & Cloud', 'Beginner', '6 Weeks', 'Docker & Containers Skill Roadmap | KnowledgePaat', 'Master Docker containerization, Dockerfiles, multi-stage builds, networking, volumes, and Docker Compose.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Docker & Containers',
      short_description = 'Deep-dive into containerization: Dockerfile directives, multi-stage builds, networking, volumes, compose files, and security hardening.',
      description = 'Comprehensive technology roadmap for Docker. Learn container runtime mechanics, image layer optimization, environment reproducibility, multi-container orchestration with Docker Compose, and production security.',
      category = 'DevOps & Cloud',
      difficulty = 'Beginner',
      estimated_duration = '6 Weeks',
      seo_title = 'Docker & Containers Skill Roadmap | KnowledgePaat',
      seo_description = 'Master Docker containerization, Dockerfiles, multi-stage builds, networking, volumes, and Docker Compose.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Container Mechanics & Basic Commands
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-container-mechanics';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Container Mechanics & Basic Commands', '01-container-mechanics', 'Understanding container isolation, Docker CLI commands, and pulling/running images.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Container Mechanics & Basic Commands',
      description = 'Understanding container isolation, Docker CLI commands, and pulling/running images.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Container Lifecycles & Docker CLI
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'container-lifecycles-cli';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Container Lifecycles & Docker CLI', 'container-lifecycles-cli', 'docker run, ps, exec, logs, port mapping (-p), environment flags (-e), and container restarts.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Container Lifecycles & Docker CLI',
      description = 'docker run, ps, exec, logs, port mapping (-p), environment flags (-e), and container restarts.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Containers vs Virtual Machines') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Containers vs Virtual Machines', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Port Forwarding & Detached Mode') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Port Forwarding & Detached Mode', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Inspecting Container Logs & Exec Shell') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Inspecting Container Logs & Exec Shell', 3);
  END IF;
  -- Section: 02 Dockerfile Mastery & Layer Caching
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-dockerfile-optimization';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Dockerfile Mastery & Layer Caching', '02-dockerfile-optimization', 'Authoring efficient Dockerfiles, multi-stage builds, and minimizing image footprint.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Dockerfile Mastery & Layer Caching',
      description = 'Authoring efficient Dockerfiles, multi-stage builds, and minimizing image footprint.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Multi-Stage Builds & Minimal Images
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'multistage-builds-minimal-images';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Multi-Stage Builds & Minimal Images', 'multistage-builds-minimal-images', 'Using alpine/distroless bases, caching dependencies, and non-root USER execution for security.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Multi-Stage Builds & Minimal Images',
      description = 'Using alpine/distroless bases, caching dependencies, and non-root USER execution for security.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Layer Caching Strategies') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Layer Caching Strategies', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Multi-Stage Build Syntax') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Multi-Stage Build Syntax', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Distroless & Alpine Bases') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Distroless & Alpine Bases', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Running as Non-Root User') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Running as Non-Root User', 4);
  END IF;
  -- Section: 03 Networking, Volumes & Docker Compose
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-networking-volumes-compose';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Networking, Volumes & Docker Compose', '03-networking-volumes-compose', 'Persistent storage, container-to-container communication, and multi-service compose stacks.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Networking, Volumes & Docker Compose',
      description = 'Persistent storage, container-to-container communication, and multi-service compose stacks.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Docker Compose & Multi-Service Stacks
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'docker-compose-stacks';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Docker Compose & Multi-Service Stacks', 'docker-compose-stacks', 'Defining web servers, databases, and redis caches in declarative docker-compose.yml files.', 'SKILL', 'Intermediate', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Docker Compose & Multi-Service Stacks',
      description = 'Defining web servers, databases, and redis caches in declarative docker-compose.yml files.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Named Volumes & Bind Mounts') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Named Volumes & Bind Mounts', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Bridge Networks & Service Discovery') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Bridge Networks & Service Discovery', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Environment Files (.env)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Environment Files (.env)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Healthchecks & depends_on') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Healthchecks & depends_on', 4);
  END IF;
  -- Inter-node relationships for docker
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'container-lifecycles-cli';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'multistage-builds-minimal-images';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'multistage-builds-minimal-images';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'docker-compose-stacks';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Git & GitHub (git-github)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'git-github';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Git & GitHub', 'git-github', 'Master version control: branching strategies, commit history, merge conflict resolution, rebasing, stashing, and pull request workflows.', 'Essential roadmap for every software engineer. Learn Git internal mechanics (trees, commits, blobs), branching strategies, interactive rebasing, cherry-picking, stash management, and collaborative GitHub pull request etiquette.', 'Development', 'Beginner', '4 Weeks', 'Git & GitHub Skill Roadmap | KnowledgePaat', 'Master Git version control, branching, merge conflicts, interactive rebase, and GitHub pull requests.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Git & GitHub',
      short_description = 'Master version control: branching strategies, commit history, merge conflict resolution, rebasing, stashing, and pull request workflows.',
      description = 'Essential roadmap for every software engineer. Learn Git internal mechanics (trees, commits, blobs), branching strategies, interactive rebasing, cherry-picking, stash management, and collaborative GitHub pull request etiquette.',
      category = 'Development',
      difficulty = 'Beginner',
      estimated_duration = '4 Weeks',
      seo_title = 'Git & GitHub Skill Roadmap | KnowledgePaat',
      seo_description = 'Master Git version control, branching, merge conflicts, interactive rebase, and GitHub pull requests.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Fundamentals & Daily Commands
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-fundamentals';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Fundamentals & Daily Commands', '01-fundamentals', 'Repositories, staging area, commits, inspection, and remotes.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Fundamentals & Daily Commands',
      description = 'Repositories, staging area, commits, inspection, and remotes.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Git Architecture & Staging Workflow
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'git-staging-workflow';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Git Architecture & Staging Workflow', 'git-staging-workflow', 'Working directory vs staging area vs commit history, git status, diff, log, and checkout.', 'SKILL', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Git Architecture & Staging Workflow',
      description = 'Working directory vs staging area vs commit history, git status, diff, log, and checkout.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Working Directory & Index') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Working Directory & Index', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Atomic Commits & Good Commit Messages') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Atomic Commits & Good Commit Messages', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Inspecting History with git log --oneline') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Inspecting History with git log --oneline', 3);
  END IF;
  -- Section: 02 Branching, Merging & Conflict Resolution
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-branching-merging';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Branching, Merging & Conflict Resolution', '02-branching-merging', 'Feature branches, fast-forward merges, 3-way merges, and solving conflict markers.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Branching, Merging & Conflict Resolution',
      description = 'Feature branches, fast-forward merges, 3-way merges, and solving conflict markers.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Branching Strategies & Resolving Conflicts
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'branching-conflicts';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Branching Strategies & Resolving Conflicts', 'branching-conflicts', 'Git flow, trunk-based development, reading conflict markers (<<<<<<<, =======, >>>>>>>), and merging.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Branching Strategies & Resolving Conflicts',
      description = 'Git flow, trunk-based development, reading conflict markers (<<<<<<<, =======, >>>>>>>), and merging.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Trunk-Based Development vs Git Flow') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Trunk-Based Development vs Git Flow', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Merge Conflict Markers & Resolution') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Merge Conflict Markers & Resolution', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Git Stash & Work in Progress') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Git Stash & Work in Progress', 3);
  END IF;
  -- Section: 03 Advanced Git & Team Collaboration
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-advanced-git';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Advanced Git & Team Collaboration', '03-advanced-git', 'Interactive rebase, cherry-pick, reset vs revert, and GitHub PR reviews.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Advanced Git & Team Collaboration',
      description = 'Interactive rebase, cherry-pick, reset vs revert, and GitHub PR reviews.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Interactive Rebase, Cherry-Pick & Clean History
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'rebase-cherry-pick';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Interactive Rebase, Cherry-Pick & Clean History', 'rebase-cherry-pick', 'Squashing commits with rebase -i, picking specific fixes, undoing mistakes with reflog and reset.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Interactive Rebase, Cherry-Pick & Clean History',
      description = 'Squashing commits with rebase -i, picking specific fixes, undoing mistakes with reflog and reset.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Interactive Rebase (squash, fixup, reword)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Interactive Rebase (squash, fixup, reword)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'git cherry-pick') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'git cherry-pick', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'git reflog for Disaster Recovery') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'git reflog for Disaster Recovery', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'GitHub Pull Request Review Workflows') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'GitHub Pull Request Review Workflows', 4);
  END IF;
  -- Inter-node relationships for git-github
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'git-staging-workflow';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'branching-conflicts';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'branching-conflicts';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'rebase-cherry-pick';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Programming Fundamentals (programming-fundamentals)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'programming-fundamentals';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Programming Fundamentals', 'programming-fundamentals', 'Start coding from zero. Learn variables, logic, loops, functions, problem solving, and build your very first interactive programs in plain English.', 'The friendliest entry point to software development. No prior experience required. Understand how code instructs a computer, master core problem solving logic, and build confidence with quick, satisfying micro-projects.', 'Development', 'Beginner', '6 Weeks', 'Programming Fundamentals for Beginners | KnowledgePaat', 'Learn to code from scratch. Understand variables, conditions, loops, functions, and simple programming logic in plain English.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Programming Fundamentals',
      short_description = 'Start coding from zero. Learn variables, logic, loops, functions, problem solving, and build your very first interactive programs in plain English.',
      description = 'The friendliest entry point to software development. No prior experience required. Understand how code instructs a computer, master core problem solving logic, and build confidence with quick, satisfying micro-projects.',
      category = 'Development',
      difficulty = 'Beginner',
      estimated_duration = '6 Weeks',
      seo_title = 'Programming Fundamentals for Beginners | KnowledgePaat',
      seo_description = 'Learn to code from scratch. Understand variables, conditions, loops, functions, and simple programming logic in plain English.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 What is Code? (Plain English Mental Models)
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-what-is-code';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 What is Code? (Plain English Mental Models)', '01-what-is-code', 'Demystifying computers: instructions, inputs, outputs, and writing your first lines.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 What is Code? (Plain English Mental Models)',
      description = 'Demystifying computers: instructions, inputs, outputs, and writing your first lines.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: How Computers Follow Instructions
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'how-computers-work';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'How Computers Follow Instructions', 'how-computers-work', 'A computer is just a machine following step-by-step recipes. Learn about inputs, processing, outputs, and errors.', 'TOPIC', 'Beginner', 60, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'How Computers Follow Instructions',
      description = 'A computer is just a machine following step-by-step recipes. Learn about inputs, processing, outputs, and errors.',
      node_type = 'TOPIC',
      difficulty = 'Beginner',
      estimated_minutes = 60,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Input, Processing & Output') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Input, Processing & Output', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'What Happens When Code Runs') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'What Happens When Code Runs', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Why Syntax Errors Happen and How to Fix Them') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Why Syntax Errors Happen and How to Fix Them', 3);
  END IF;
  -- Node: Variables: Storing Information in Memory
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'variables-storing-information';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Variables: Storing Information in Memory', 'variables-storing-information', 'Variables are labeled boxes holding text, numbers, or true/false values.', 'SKILL', 'Beginner', 60, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Variables: Storing Information in Memory',
      description = 'Variables are labeled boxes holding text, numbers, or true/false values.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 60,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Text (Strings)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Text (Strings)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Numbers (Integers & Decimals)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Numbers (Integers & Decimals)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Yes/No (Booleans)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Yes/No (Booleans)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Changing Values') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Changing Values', 4);
  END IF;
  -- Section: 02 Making Decisions & Repeating Tasks
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-decisions-loops';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Making Decisions & Repeating Tasks', '02-decisions-loops', 'If-else conditions, loops, and building interactive text programs.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Making Decisions & Repeating Tasks',
      description = 'If-else conditions, loops, and building interactive text programs.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: If-Else Conditions: Making Decisions in Code
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'conditions-if-else';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'If-Else Conditions: Making Decisions in Code', 'conditions-if-else', 'Check passwords, validate user age, and direct program flow based on logical rules.', 'SKILL', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'If-Else Conditions: Making Decisions in Code',
      description = 'Check passwords, validate user age, and direct program flow based on logical rules.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'if, else if, else Rules') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'if, else if, else Rules', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Comparisons (>, <, ==)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Comparisons (>, <, ==)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Combining Conditions (AND / OR)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Combining Conditions (AND / OR)', 3);
  END IF;
  -- Node: Loops: Repeating Tasks Automatically
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'loops-repetition';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Loops: Repeating Tasks Automatically', 'loops-repetition', 'Process lists of items, count numbers, and repeat operations without writing redundant code.', 'SKILL', 'Beginner', 90, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Loops: Repeating Tasks Automatically',
      description = 'Process lists of items, count numbers, and repeat operations without writing redundant code.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'While Loops (Repeat While True)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'While Loops (Repeat While True)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'For Loops (Repeat Through a List)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'For Loops (Repeat Through a List)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Breaking Out of Loops') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Breaking Out of Loops', 3);
  END IF;
  -- Section: 03 Reusable Blocks & Your First Project
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-functions-projects';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Reusable Blocks & Your First Project', '03-functions-projects', 'Packaging logic into functions and building a complete text adventure game.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Reusable Blocks & Your First Project',
      description = 'Packaging logic into functions and building a complete text adventure game.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Functions: Packaging Reusable Recipes
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'functions-recipes';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Functions: Packaging Reusable Recipes', 'functions-recipes', 'Give a block of code a name, pass inputs (parameters), and receive an answer (return value).', 'SKILL', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Functions: Packaging Reusable Recipes',
      description = 'Give a block of code a name, pass inputs (parameters), and receive an answer (return value).',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Defining Functions') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Defining Functions', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Passing Inputs (Arguments)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Passing Inputs (Arguments)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Returning Answers (return)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Returning Answers (return)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Reusing Code in Multiple Places') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Reusing Code in Multiple Places', 4);
  END IF;
  -- Node: Your First Project: Interactive Text Adventure Game
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-text-game';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Your First Project: Interactive Text Adventure Game', 'project-text-game', 'Combine variables, conditionals, loops, and functions into a playable interactive text-based game.', 'MILESTONE', 'Beginner', 180, 2, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Your First Project: Interactive Text Adventure Game',
      description = 'Combine variables, conditionals, loops, and functions into a playable interactive text-based game.',
      node_type = 'MILESTONE',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Game State Tracking') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Game State Tracking', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'User Input Parsing') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'User Input Parsing', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Displaying Choices & Endings') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Displaying Choices & Endings', 3);
  END IF;
  -- Inter-node relationships for programming-fundamentals
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'how-computers-work';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'variables-storing-information';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'variables-storing-information';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'conditions-if-else';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'conditions-if-else';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'loops-repetition';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'loops-repetition';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'functions-recipes';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'functions-recipes';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-text-game';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Frontend Beginner (frontend-beginner)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'frontend-beginner';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Frontend Beginner', 'frontend-beginner', 'Start building websites from scratch. Learn HTML tags, CSS styling, responsive mobile layouts, and simple interactive JavaScript.', 'A gentle introduction to building for the web. Learn how web pages are structured, how to style them with modern CSS, and how to add basic interactivity with JavaScript.', 'Development', 'Beginner', '6 Weeks', 'Frontend Beginner Roadmap | KnowledgePaat', 'Beginner-friendly roadmap to building web pages with HTML, CSS, and basic JavaScript. No prior experience needed.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Frontend Beginner',
      short_description = 'Start building websites from scratch. Learn HTML tags, CSS styling, responsive mobile layouts, and simple interactive JavaScript.',
      description = 'A gentle introduction to building for the web. Learn how web pages are structured, how to style them with modern CSS, and how to add basic interactivity with JavaScript.',
      category = 'Development',
      difficulty = 'Beginner',
      estimated_duration = '6 Weeks',
      seo_title = 'Frontend Beginner Roadmap | KnowledgePaat',
      seo_description = 'Beginner-friendly roadmap to building web pages with HTML, CSS, and basic JavaScript. No prior experience needed.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Building Your First Web Page
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-first-page';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Building Your First Web Page', '01-first-page', 'HTML headings, paragraphs, links, images, and page structure.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Building Your First Web Page',
      description = 'HTML headings, paragraphs, links, images, and page structure.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: HTML: The Skeleton of the Web
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'html-skeleton';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'HTML: The Skeleton of the Web', 'html-skeleton', 'Learn opening and closing tags, headings, paragraphs, links, and inserting images.', 'SKILL', 'Beginner', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'HTML: The Skeleton of the Web',
      description = 'Learn opening and closing tags, headings, paragraphs, links, and inserting images.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Headings (h1-h6)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Headings (h1-h6)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Paragraphs and Text Formatting') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Paragraphs and Text Formatting', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Links (<a>) and Images (<img>)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Links (<a>) and Images (<img>)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Lists (ul, ol, li)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Lists (ul, ol, li)', 4);
  END IF;
  -- Section: 02 Making it Look Beautiful with CSS
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-styling-css';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Making it Look Beautiful with CSS', '02-styling-css', 'Colors, fonts, padding, margins, borders, and centering elements.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Making it Look Beautiful with CSS',
      description = 'Colors, fonts, padding, margins, borders, and centering elements.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: CSS: Colors, Fonts & Box Model
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'css-colors-boxmodel';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'CSS: Colors, Fonts & Box Model', 'css-colors-boxmodel', 'Style your page with hex colors, Google Fonts, spacing (margin/padding), and rounded corners.', 'SKILL', 'Beginner', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'CSS: Colors, Fonts & Box Model',
      description = 'Style your page with hex colors, Google Fonts, spacing (margin/padding), and rounded corners.',
      node_type = 'SKILL',
      difficulty = 'Beginner',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Color Palettes & Backgrounds') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Color Palettes & Backgrounds', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Google Fonts & Typography') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Google Fonts & Typography', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Padding vs Margin Box Model') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Padding vs Margin Box Model', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Centering with Flexbox') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Centering with Flexbox', 4);
  END IF;
  -- Section: 03 Your First Portfolio Website
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-portfolio-website';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Your First Portfolio Website', '03-portfolio-website', 'Assemble a personal profile website and deploy it live for free on the web.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Your First Portfolio Website',
      description = 'Assemble a personal profile website and deploy it live for free on the web.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Build & Publish a Personal Profile Page
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'project-profile-page';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Build & Publish a Personal Profile Page', 'project-profile-page', 'Create an attractive responsive bio page featuring your social links, about me, and contact form.', 'MILESTONE', 'Beginner', 180, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Build & Publish a Personal Profile Page',
      description = 'Create an attractive responsive bio page featuring your social links, about me, and contact form.',
      node_type = 'MILESTONE',
      difficulty = 'Beginner',
      estimated_minutes = 180,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Hero Banner with Profile Photo') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Hero Banner with Profile Photo', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Social Links & Bio Section') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Social Links & Bio Section', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Publishing Free to GitHub Pages') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Publishing Free to GitHub Pages', 3);
  END IF;
  -- Inter-node relationships for frontend-beginner
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'html-skeleton';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'css-colors-boxmodel';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'css-colors-boxmodel';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'project-profile-page';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: API Security (api-security)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'api-security';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'API Security', 'api-security', 'Production engineering standard: OWASP API Top 10, JWT hardening, rate limiting, SQL injection defense, CORS, and secret management.', 'Comprehensive best-practice roadmap for securing modern web and microservice APIs. Master vulnerability mitigation across broken object level authorization (BOLA), rate limiting, credential handling, and automated security scans.', 'Cybersecurity', 'Intermediate', '4 Weeks', 'API Security Best Practices Roadmap | KnowledgePaat', 'Production guide to API security: OWASP API Top 10, authentication hardening, BOLA prevention, and rate limiting.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'API Security',
      short_description = 'Production engineering standard: OWASP API Top 10, JWT hardening, rate limiting, SQL injection defense, CORS, and secret management.',
      description = 'Comprehensive best-practice roadmap for securing modern web and microservice APIs. Master vulnerability mitigation across broken object level authorization (BOLA), rate limiting, credential handling, and automated security scans.',
      category = 'Cybersecurity',
      difficulty = 'Intermediate',
      estimated_duration = '4 Weeks',
      seo_title = 'API Security Best Practices Roadmap | KnowledgePaat',
      seo_description = 'Production guide to API security: OWASP API Top 10, authentication hardening, BOLA prevention, and rate limiting.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 OWASP API Top 10 & Threat Modeling
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-owasp-api-top-10';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 OWASP API Top 10 & Threat Modeling', '01-owasp-api-top-10', 'The most dangerous vulnerabilities in modern APIs and how attackers exploit them.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 OWASP API Top 10 & Threat Modeling',
      description = 'The most dangerous vulnerabilities in modern APIs and how attackers exploit them.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Broken Object Level Authorization (BOLA / IDOR)
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'bola-idor-prevention';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Broken Object Level Authorization (BOLA / IDOR)', 'bola-idor-prevention', 'Ensure users can only access their own records by checking ownership at the database/service layer.', 'SKILL', 'Intermediate', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Broken Object Level Authorization (BOLA / IDOR)',
      description = 'Ensure users can only access their own records by checking ownership at the database/service layer.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'IDOR Vulnerability Examples') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'IDOR Vulnerability Examples', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Enforcing Tenant / User Ownership in SQL') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Enforcing Tenant / User Ownership in SQL', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'UUIDs vs Incremental IDs (Obfuscation vs Auth)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'UUIDs vs Incremental IDs (Obfuscation vs Auth)', 3);
  END IF;
  -- Section: 02 Authentication & Token Hardening
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-auth-token-hardening';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Authentication & Token Hardening', '02-auth-token-hardening', 'JWT signing algorithms, short expiration windows, refresh tokens, and revocation.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Authentication & Token Hardening',
      description = 'JWT signing algorithms, short expiration windows, refresh tokens, and revocation.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: JWT Best Practices & Token Rotation
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'jwt-hardening-rotation';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'JWT Best Practices & Token Rotation', 'jwt-hardening-rotation', 'Use RS256/EdDSA asymmetric keys, short-lived access tokens, httpOnly secure cookies, and token revocation lists.', 'SKILL', 'Intermediate', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'JWT Best Practices & Token Rotation',
      description = 'Use RS256/EdDSA asymmetric keys, short-lived access tokens, httpOnly secure cookies, and token revocation lists.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Asymmetric Signing (RS256)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Asymmetric Signing (RS256)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'httpOnly SameSite Cookies vs localStorage') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'httpOnly SameSite Cookies vs localStorage', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Refresh Token Rotation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Refresh Token Rotation', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Blacklisting Revoked Tokens in Redis') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Blacklisting Revoked Tokens in Redis', 4);
  END IF;
  -- Section: 03 Rate Limiting, CORS & Input Sanitization
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-rate-limiting-sanitization';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Rate Limiting, CORS & Input Sanitization', '03-rate-limiting-sanitization', 'Defending against DDoS, credential stuffing, injection attacks, and cross-origin exploits.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Rate Limiting, CORS & Input Sanitization',
      description = 'Defending against DDoS, credential stuffing, injection attacks, and cross-origin exploits.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Rate Limiting, Schema Validation & CORS
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'rate-limiting-cors-validation';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Rate Limiting, Schema Validation & CORS', 'rate-limiting-cors-validation', 'Token bucket / sliding window rate limiting in Redis, strict schema validation, and locked-down CORS policies.', 'SKILL', 'Intermediate', 150, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Rate Limiting, Schema Validation & CORS',
      description = 'Token bucket / sliding window rate limiting in Redis, strict schema validation, and locked-down CORS policies.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 150,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Sliding Window Rate Limiting') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Sliding Window Rate Limiting', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Strict JSON Schema / Zod Validation') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Strict JSON Schema / Zod Validation', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CORS Origin Whitelisting (No Access-Control-Allow-Origin: *)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CORS Origin Whitelisting (No Access-Control-Allow-Origin: *)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Security Headers (CSP, HSTS)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Security Headers (CSP, HSTS)', 4);
  END IF;
  -- Inter-node relationships for api-security
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'bola-idor-prevention';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'jwt-hardening-rotation';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'jwt-hardening-rotation';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'rate-limiting-cors-validation';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- ROADMAP: Frontend Performance (frontend-performance)
  -- ------------------------------------------------------------
  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = 'frontend-performance';
  IF v_roadmap_id IS NULL THEN
    INSERT INTO career_roadmaps (
      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active
    ) VALUES (
      'Frontend Performance', 'frontend-performance', 'Production engineering standard: Core Web Vitals (LCP, INP, CLS), bundle optimization, tree shaking, image compression, and edge caching.', 'Engineering best-practice guide to high-performance web applications. Master browser rendering mechanics, optimize JavaScript bundle payloads, eliminate layout shifts, and achieve 95+ Google Lighthouse scores.', 'Development', 'Intermediate', '4 Weeks', 'Frontend Performance Best Practices Roadmap | KnowledgePaat', 'Optimize web performance: Core Web Vitals (LCP, INP, CLS), JavaScript bundle splitting, asset compression, and caching.', true
    ) RETURNING id INTO v_roadmap_id;
  ELSE
    UPDATE career_roadmaps SET
      title = 'Frontend Performance',
      short_description = 'Production engineering standard: Core Web Vitals (LCP, INP, CLS), bundle optimization, tree shaking, image compression, and edge caching.',
      description = 'Engineering best-practice guide to high-performance web applications. Master browser rendering mechanics, optimize JavaScript bundle payloads, eliminate layout shifts, and achieve 95+ Google Lighthouse scores.',
      category = 'Development',
      difficulty = 'Intermediate',
      estimated_duration = '4 Weeks',
      seo_title = 'Frontend Performance Best Practices Roadmap | KnowledgePaat',
      seo_description = 'Optimize web performance: Core Web Vitals (LCP, INP, CLS), JavaScript bundle splitting, asset compression, and caching.',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_roadmap_id;
  END IF;

  -- Section: 01 Core Web Vitals & Metrics
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '01-core-web-vitals';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '01 Core Web Vitals & Metrics', '01-core-web-vitals', 'Understanding Google performance benchmarks: LCP, INP, and CLS.', 1, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '01 Core Web Vitals & Metrics',
      description = 'Understanding Google performance benchmarks: LCP, INP, and CLS.',
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Understanding LCP, INP & CLS Benchmarks
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'understanding-core-web-vitals';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Understanding LCP, INP & CLS Benchmarks', 'understanding-core-web-vitals', 'Largest Contentful Paint (<2.5s), Interaction to Next Paint (<200ms), and Cumulative Layout Shift (<0.1).', 'TOPIC', 'Intermediate', 90, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Understanding LCP, INP & CLS Benchmarks',
      description = 'Largest Contentful Paint (<2.5s), Interaction to Next Paint (<200ms), and Cumulative Layout Shift (<0.1).',
      node_type = 'TOPIC',
      difficulty = 'Intermediate',
      estimated_minutes = 90,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'LCP (Largest Contentful Paint)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'LCP (Largest Contentful Paint)', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'INP (Interaction to Next Paint)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'INP (Interaction to Next Paint)', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'CLS (Cumulative Layout Shift)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'CLS (Cumulative Layout Shift)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Field Data vs Lab Data') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Field Data vs Lab Data', 4);
  END IF;
  -- Section: 02 Bundle Size & JavaScript Execution
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '02-bundle-optimization';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '02 Bundle Size & JavaScript Execution', '02-bundle-optimization', 'Code splitting, dynamic imports, tree shaking, and eliminating render-blocking scripts.', 2, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '02 Bundle Size & JavaScript Execution',
      description = 'Code splitting, dynamic imports, tree shaking, and eliminating render-blocking scripts.',
      sequence = 2,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Dynamic Imports & Tree-Shaking
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'dynamic-imports-treeshaking';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Dynamic Imports & Tree-Shaking', 'dynamic-imports-treeshaking', 'Route-based code splitting, lazy-loading heavy libraries (charts, rich text editors), and analyzing webpack/vite bundle sizes.', 'SKILL', 'Intermediate', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Dynamic Imports & Tree-Shaking',
      description = 'Route-based code splitting, lazy-loading heavy libraries (charts, rich text editors), and analyzing webpack/vite bundle sizes.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Dynamic import() & React.lazy') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Dynamic import() & React.lazy', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Analyzing Bundles with Webpack Bundle Analyzer') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Analyzing Bundles with Webpack Bundle Analyzer', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Tree Shaking & Side-Effects Flag') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Tree Shaking & Side-Effects Flag', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Deferring Non-Critical JavaScript') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Deferring Non-Critical JavaScript', 4);
  END IF;
  -- Section: 03 Media & Asset Optimization
  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = '03-media-caching';
  IF v_sec_id IS NULL THEN
    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)
    VALUES (v_roadmap_id, '03 Media & Asset Optimization', '03-media-caching', 'Next-gen image formats (AVIF/WebP), responsive srcsets, font subsetting, and HTTP caching.', 3, true, true)
    RETURNING id INTO v_sec_id;
  ELSE
    UPDATE career_roadmap_sections SET
      title = '03 Media & Asset Optimization',
      description = 'Next-gen image formats (AVIF/WebP), responsive srcsets, font subsetting, and HTTP caching.',
      sequence = 3,
      is_required = true,
      is_active = true
    WHERE id = v_sec_id;
  END IF;

  -- Node: Next-Gen Images, Web Fonts & Edge Caching
  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = 'images-fonts-edge-caching';
  IF v_node_id IS NULL THEN
    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)
    VALUES (v_sec_id, 'Next-Gen Images, Web Fonts & Edge Caching', 'images-fonts-edge-caching', 'AVIF compression, explicit width/height to stop CLS, self-hosting fonts with font-display: swap, and Cache-Control headers.', 'SKILL', 'Intermediate', 120, 1, true, true)
    RETURNING id INTO v_node_id;
  ELSE
    UPDATE career_roadmap_nodes SET
      title = 'Next-Gen Images, Web Fonts & Edge Caching',
      description = 'AVIF compression, explicit width/height to stop CLS, self-hosting fonts with font-display: swap, and Cache-Control headers.',
      node_type = 'SKILL',
      difficulty = 'Intermediate',
      estimated_minutes = 120,
      sequence = 1,
      is_required = true,
      is_active = true
    WHERE id = v_node_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'AVIF / WebP Compression') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'AVIF / WebP Compression', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Explicit Dimensions to Prevent CLS') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Explicit Dimensions to Prevent CLS', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Self-hosting Variable Fonts (font-display: swap)') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Self-hosting Variable Fonts (font-display: swap)', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = 'Cache-Control: immutable & CDN Edge Caching') THEN
    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, 'Cache-Control: immutable & CDN Edge Caching', 4);
  END IF;
  -- Inter-node relationships for frontend-performance
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'understanding-core-web-vitals';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'dynamic-imports-treeshaking';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;
  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'dynamic-imports-treeshaking';
  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = 'images-fonts-edge-caching';
  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN
      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)
      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');
    END IF;
  END IF;

  RAISE NOTICE 'Phase 4 Career Roadmap Catalog Seed Completed Successfully.';
END $$;
