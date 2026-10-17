-- ============================================================
-- KnowledgePaat — Career Roadmap Resource Engine
-- Phase 2 Demo Seed Script
--
-- Idempotent seed script.
-- Seeds sample curated learning resources and attaches them to
-- existing Phase 1 Python Developer roadmap nodes.
-- ============================================================

DO $$
DECLARE
  v_res_py_fund UUID;
  v_res_py_oop UUID;
  v_res_sql UUID;
  v_res_git UUID;
  v_res_rest UUID;
  v_res_django UUID;

  v_node_py_fund UUID;
  v_node_py_oop UUID;
  v_node_sql UUID;
  v_node_git UUID;
  v_node_rest UUID;
  v_node_django UUID;
BEGIN

  -- 1. Insert Sample Resources into career_resources

  -- Python Fundamentals Video Guide
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'Python for Beginners — Full Course',
    'Comprehensive introduction to Python syntax, variables, lists, dictionaries, and functions.',
    'YOUTUBE', 'freeCodeCamp', 'https://youtube.com/watch?v=rfscVS0vtbw',
    260, 'Beginner', 'Development', true, 'English', 'Mike Dane', 4.9, true, 1, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_res_py_fund;

  -- Official Python Documentation
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'Official Python 3 Documentation & Tutorial',
    'The official Python tutorial covering language specifications, standard libraries, and built-in types.',
    'DOCUMENTATION', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/',
    180, 'Beginner', 'Development', true, 'English', 'Python Core Team', 4.8, false, 2, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now();

  -- Python OOP Complete Guide
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'Python OOP Complete Course — Object Oriented Programming',
    'Master classes, inheritance, dunder methods, encapsulation, and polymorphism with real examples.',
    'YOUTUBE', 'Tech With Tim', 'https://youtube.com/watch?v=JeznW_7DlB0',
    120, 'Intermediate', 'Development', true, 'English', 'Tim Ruscica', 4.9, true, 1, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_res_py_oop;

  -- Git & GitHub Crash Course
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'Git & GitHub Tutorial for Beginners',
    'Hands-on guide to repositories, staging, committing, branching, and remote collaboration.',
    'YOUTUBE', 'Traversy Media', 'https://youtube.com/watch?v=SWYqp7iY_Tc',
    70, 'Beginner', 'Development', true, 'English', 'Brad Traversy', 4.8, true, 1, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_res_git;

  -- SQL Fundamentals
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'SQL Tutorial — Full Database Course for Beginners',
    'Learn relational database design, SQL queries, table creation, joins, and aggregates.',
    'YOUTUBE', 'freeCodeCamp', 'https://youtube.com/watch?v=HXV3zeRR3h4',
    260, 'Beginner', 'Data', true, 'English', 'Mike Dane', 4.9, true, 1, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_res_sql;

  -- REST API Guide
  INSERT INTO career_resources (
    title, description, resource_type, provider, url,
    duration_minutes, difficulty, category, is_free, language, instructor, rating, is_recommended, priority, is_active
  ) VALUES (
    'RESTful APIs in 100 Seconds & Practical Overview',
    'Quick conceptual guide to HTTP verbs, resources, JSON payloads, and status codes.',
    'YOUTUBE', 'Fireship', 'https://youtube.com/watch?v=-MTSQjw5DrM',
    15, 'Intermediate', 'Development', true, 'English', 'Jeff Delaney', 4.9, true, 1, true
  )
  ON CONFLICT (url) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_res_rest;

  -- 2. Lookup existing node IDs from Phase 1 demo roadmap
  SELECT id INTO v_node_py_fund FROM career_roadmap_nodes WHERE slug = 'py-fundamentals' LIMIT 1;
  SELECT id INTO v_node_py_oop  FROM career_roadmap_nodes WHERE slug = 'py-oop' LIMIT 1;
  SELECT id INTO v_node_git     FROM career_roadmap_nodes WHERE slug = 'git-basics' LIMIT 1;
  SELECT id INTO v_node_sql     FROM career_roadmap_nodes WHERE slug = 'sql-fundamentals' LIMIT 1;
  SELECT id INTO v_node_rest    FROM career_roadmap_nodes WHERE slug = 'rest-api' LIMIT 1;

  -- 3. Attach Resources to Nodes (Idempotent)

  -- Attach to py-fundamentals
  IF v_node_py_fund IS NOT NULL AND v_res_py_fund IS NOT NULL THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, priority, is_recommended)
    VALUES (v_node_py_fund, v_res_py_fund, 1, true)
    ON CONFLICT (node_id, resource_id) DO NOTHING;
  END IF;

  -- Attach to py-oop
  IF v_node_py_oop IS NOT NULL AND v_res_py_oop IS NOT NULL THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, priority, is_recommended)
    VALUES (v_node_py_oop, v_res_py_oop, 1, true)
    ON CONFLICT (node_id, resource_id) DO NOTHING;
  END IF;

  -- Attach to git-basics
  IF v_node_git IS NOT NULL AND v_res_git IS NOT NULL THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, priority, is_recommended)
    VALUES (v_node_git, v_res_git, 1, true)
    ON CONFLICT (node_id, resource_id) DO NOTHING;
  END IF;

  -- Attach to sql-fundamentals
  IF v_node_sql IS NOT NULL AND v_res_sql IS NOT NULL THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, priority, is_recommended)
    VALUES (v_node_sql, v_res_sql, 1, true)
    ON CONFLICT (node_id, resource_id) DO NOTHING;
  END IF;

  -- Attach to rest-api
  IF v_node_rest IS NOT NULL AND v_res_rest IS NOT NULL THEN
    INSERT INTO career_roadmap_node_resources (node_id, resource_id, priority, is_recommended)
    VALUES (v_node_rest, v_res_rest, 1, true)
    ON CONFLICT (node_id, resource_id) DO NOTHING;
  END IF;

END $$;
