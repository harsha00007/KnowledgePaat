-- ==============================================================================
-- GRADZENX: COMPLETE INTERVIEW PREPARATION & MCQ SAMPLE TEST CONFIGURATIONS SETUP
-- ==============================================================================
-- Safe and idempotent: creates tables, columns, indexes, RLS policies,
-- 9 topic categories, rich realistic 4-option MCQ question bank, and the 10 sample tests.
-- Run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Extend interview_categories table
CREATE TABLE IF NOT EXISTS public.interview_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_categories
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'BookOpen',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Extend interview_questions table
CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.interview_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    estimated_time TEXT NOT NULL DEFAULT '5 mins',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'mcq',
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'short',
ADD COLUMN IF NOT EXISTS option_a TEXT,
ADD COLUMN IF NOT EXISTS option_b TEXT,
ADD COLUMN IF NOT EXISTS option_c TEXT,
ADD COLUMN IF NOT EXISTS option_d TEXT,
ADD COLUMN IF NOT EXISTS correct_option TEXT,
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS correct_option_index INTEGER,
ADD COLUMN IF NOT EXISTS tips TEXT,
ADD COLUMN IF NOT EXISTS common_mistakes TEXT,
ADD COLUMN IF NOT EXISTS company_tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS technology_tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Create interview_prep_settings table (Global Platform Settings)
CREATE TABLE IF NOT EXISTS public.interview_prep_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    practice_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    timed_test_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    ai_adaptive_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    practice_minimum_plan TEXT NOT NULL DEFAULT 'free',
    timed_test_minimum_plan TEXT NOT NULL DEFAULT 'free',
    ai_adaptive_minimum_plan TEXT NOT NULL DEFAULT 'premium',
    allowed_question_counts INTEGER[] DEFAULT '{5, 10, 20, 30, 40, 50}'::INTEGER[],
    allowed_time_limits INTEGER[] DEFAULT '{30, 45, 60, 90, 120}'::INTEGER[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create interview_test_configs table (Admin Tests)
CREATE TABLE IF NOT EXISTS public.interview_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.interview_categories(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'timed_test', -- 'practice', 'timed_test', 'ai_adaptive'
    difficulty TEXT NOT NULL DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard', 'Mixed', 'Adaptive'
    question_count INTEGER NOT NULL DEFAULT 5,
    time_per_question INTEGER NOT NULL DEFAULT 60, -- in seconds
    minimum_plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'premium'
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    allowed_question_counts INTEGER[] DEFAULT '{5, 10, 20}'::INTEGER[],
    allowed_time_limits INTEGER[] DEFAULT '{45, 60, 90}'::INTEGER[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_test_configs_cat ON public.interview_test_configs(category_id);
CREATE INDEX IF NOT EXISTS idx_interview_test_configs_status ON public.interview_test_configs(status);
CREATE INDEX IF NOT EXISTS idx_interview_test_configs_rec ON public.interview_test_configs(is_recommended);

-- 5. Create student_test_attempts table (Test Analytics & Scorecards)
CREATE TABLE IF NOT EXISTS public.student_test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_config_id UUID REFERENCES public.interview_test_configs(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.interview_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'timed_test',
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score_percentage NUMERIC NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'in_progress', 'abandoned'
    answers_payload JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_student ON public.student_test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_test_attempts_test ON public.student_test_attempts(test_config_id);
CREATE INDEX IF NOT EXISTS idx_student_test_attempts_created ON public.student_test_attempts(created_at);

-- 6. Enable RLS
ALTER TABLE public.interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_prep_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_test_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;

-- 7. Policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.interview_categories;
CREATE POLICY "Anyone can view categories" ON public.interview_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.interview_categories;
CREATE POLICY "Admins manage categories" ON public.interview_categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view questions" ON public.interview_questions;
CREATE POLICY "Anyone can view questions" ON public.interview_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage questions" ON public.interview_questions;
CREATE POLICY "Admins manage questions" ON public.interview_questions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view prep settings" ON public.interview_prep_settings;
CREATE POLICY "Anyone can view prep settings" ON public.interview_prep_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage prep settings" ON public.interview_prep_settings;
CREATE POLICY "Admins manage prep settings" ON public.interview_prep_settings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view active test configs" ON public.interview_test_configs;
CREATE POLICY "Anyone can view active test configs" ON public.interview_test_configs FOR SELECT USING (COALESCE(status, 'Active') = 'Active' OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage test configs" ON public.interview_test_configs;
CREATE POLICY "Admins manage test configs" ON public.interview_test_configs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Students view own test attempts" ON public.student_test_attempts;
CREATE POLICY "Students view own test attempts" ON public.student_test_attempts FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Students insert own test attempts" ON public.student_test_attempts;
CREATE POLICY "Students insert own test attempts" ON public.student_test_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage test attempts" ON public.student_test_attempts;
CREATE POLICY "Admins manage test attempts" ON public.student_test_attempts FOR ALL USING (public.is_admin());

-- 8. Grants
GRANT ALL ON TABLE public.interview_categories TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_questions TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_prep_settings TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_test_configs TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.student_test_attempts TO authenticated, service_role, anon;

-- ==============================================================================
-- 9. POPULATE SAMPLE CATEGORIES, MCQ QUESTION POOLS, AND 10 TEST CONFIGURATIONS
-- ==============================================================================
DO $$
DECLARE
  v_cat_python UUID;
  v_cat_sql UUID;
  v_cat_dsa UUID;
  v_cat_web UUID;
  v_cat_oop UUID;
  v_cat_os UUID;
  v_cat_git UUID;
  v_cat_hr UUID;
  v_cat_mgr UUID;
BEGIN
  -- Insert Categories
  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('Python', 'Core Python programming, data structures, OOP, decorators, and ecosystem.', 1, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_python;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('SQL', 'Relational databases, queries, joins, indexing, normalization, and transactions.', 2, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_sql;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('DSA', 'Data Structures and Algorithms for technical interviews and coding rounds.', 3, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_dsa;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('Web Development', 'Frontend, backend, HTTP protocols, REST APIs, and modern web architecture.', 4, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_web;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('OOP', 'Object-Oriented Programming principles, design patterns, and polymorphism.', 5, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_oop;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('Operating Systems', 'Processes, concurrency, threads, memory management, and file systems.', 6, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_os;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('Git', 'Version control workflows, branching, merging, rebasing, and conflict resolution.', 7, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_git;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('HR Interview', 'Behavioral, situational, and culture-fit interview questions.', 8, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_hr;

  INSERT INTO public.interview_categories (name, description, order_index, status, is_active, minimum_plan)
  VALUES ('Managerial Interview', 'Leadership, ownership, conflict resolution, and STAR-based managerial scenarios.', 9, 'Active', true, 'free')
  ON CONFLICT (name) DO UPDATE SET status = 'Active', is_active = true
  RETURNING id INTO v_cat_mgr;

  -- ----------------------------------------------------------------------------
  -- PYTHON MCQS
  -- ----------------------------------------------------------------------------
  
  -- Python 1
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'What is the primary difference between a list and a tuple in Python?',
    'mcq',
    'Lists are immutable whereas tuples are mutable',
    'Lists are mutable whereas tuples are immutable',
    'Tuples can only store numbers while lists store any type',
    'Lists are defined using () while tuples use []',
    'B', 1,
    '["Lists are immutable whereas tuples are mutable", "Lists are mutable whereas tuples are immutable", "Tuples can only store numbers while lists store any type", "Lists are defined using () while tuples use []"]'::JSONB,
    'Lists are mutable sequences defined with square brackets [], meaning their elements can be modified, appended, or removed. Tuples are immutable sequences defined with parentheses (), meaning they cannot be altered after creation.',
    'Lists are mutable whereas tuples are immutable',
    'Highlight that tuple immutability allows them to be used as dictionary keys when containing hashable elements.',
    'Claiming tuples cannot contain mutable objects (a tuple can contain a list).',
    'Easy', '2 mins', ARRAY['Python', 'Data Structures'], ARRAY['Amazon', 'Wipro', 'TCS'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- Python 2
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'What will the expression "a is b" evaluate to in Python?',
    'mcq',
    'True if a and b have the same value',
    'True only if a and b reference the exact same object in memory',
    'True if a and b have the same data type',
    'True if a and b are both non-zero numbers',
    'B', 1,
    '["True if a and b have the same value", "True only if a and b reference the exact same object in memory", "True if a and b have the same data type", "True if a and b are both non-zero numbers"]'::JSONB,
    'The "==" operator checks value equality (calls __eq__), while the "is" operator checks memory identity (compares id(a) == id(b)).',
    'True only if a and b reference the exact same object in memory',
    'Use `a is None` instead of `a == None` as standard PEP8 practice.',
    'Confusing value equality (==) with identity (is).',
    'Easy', '2 mins', ARRAY['Python', 'Core'], ARRAY['Microsoft', 'Accenture'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- Python 3
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'What is the output of `[x**2 for x in range(5) if x % 2 == 0]` in Python?',
    'mcq',
    '[1, 9]',
    '[0, 4, 16]',
    '[0, 1, 4, 9, 16]',
    '[4, 16]',
    'B', 1,
    '["[1, 9]", "[0, 4, 16]", "[0, 1, 4, 9, 16]", "[4, 16]"]'::JSONB,
    'range(5) yields 0, 1, 2, 3, 4. Even numbers are 0, 2, 4. Their squares are 0^2=0, 2^2=4, 4^2=16. The resulting list is [0, 4, 16].',
    '[0, 4, 16]',
    'List comprehensions combine mapping and filtering into a single readable line.',
    'Forgetting that 0 is an even number (0 % 2 == 0 is True).',
    'Easy', '2 mins', ARRAY['Python'], ARRAY['Flipkart', 'Cognizant'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- Python 4
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'Which built-in Python function returns the memory address of an object?',
    'mcq',
    'address()',
    'loc()',
    'id()',
    'pointer()',
    'C', 2,
    '["address()", "loc()", "id()", "pointer()"]'::JSONB,
    'The built-in `id()` function returns an integer representing the object identity/memory address in CPython.',
    'id()',
    'Two objects with non-overlapping lifetimes may have the same id() value.',
    'Thinking Python exposes raw memory pointers directly.',
    'Easy', '2 mins', ARRAY['Python', 'Internals'], ARRAY['Google', 'TCS'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- Python 5
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'What happens when a default mutable argument (e.g. def func(x=[])) is used in Python?',
    'mcq',
    'A new list is created every time the function is called',
    'The list is evaluated once at function definition time and shared across all calls',
    'Python throws a SyntaxError during execution',
    'The list is automatically converted into an immutable tuple',
    'B', 1,
    '["A new list is created every time the function is called", "The list is evaluated once at function definition time and shared across all calls", "Python throws a SyntaxError during execution", "The list is automatically converted into an immutable tuple"]'::JSONB,
    'Default parameter values are evaluated once when the function definition is executed, so the same mutable list is reused across subsequent function invocations.',
    'The list is evaluated once at function definition time and shared across all calls',
    'Use `def func(x=None): if x is None: x = []` to avoid default argument mutation.',
    'Assuming default arguments are re-instantiated on every call.',
    'Easy', '2 mins', ARRAY['Python', 'Functions'], ARRAY['Amazon', 'Infosys'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- Python Advanced (Adaptive / Pro)
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_python,
    'What is the Global Interpreter Lock (GIL) in CPython and what is its primary effect?',
    'mcq',
    'It prevents all multithreading in Python programs',
    'It ensures only one native thread executes Python bytecode at any given moment, limiting CPU-bound parallelism',
    'It automatically locks database transactions across processes',
    'It prevents memory leaks by locking cyclic references',
    'B', 1,
    '["It prevents all multithreading in Python programs", "It ensures only one native thread executes Python bytecode at any given moment, limiting CPU-bound parallelism", "It automatically locks database transactions across processes", "It prevents memory leaks by locking cyclic references"]'::JSONB,
    'The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. CPU-bound multithreading does not scale, but I/O-bound threading works effectively.',
    'It ensures only one native thread executes Python bytecode at any given moment, limiting CPU-bound parallelism',
    'For CPU parallelism in Python, use multiprocessing or C extensions instead of threading.',
    'Claiming threading is useless in Python (it is highly effective for I/O operations).',
    'Hard', '3 mins', ARRAY['Python', 'Concurrency', 'Internals'], ARRAY['Google', 'Netflix', 'Meta'], 'Active', 'pro', 'Premium'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- SQL MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_sql,
    'Which SQL clause is used to filter aggregated groups after a GROUP BY statement?',
    'mcq',
    'WHERE',
    'ORDER BY',
    'HAVING',
    'FILTER',
    'C', 2,
    '["WHERE", "ORDER BY", "HAVING", "FILTER"]'::JSONB,
    'WHERE filters rows before aggregation occurs. HAVING filters aggregated groups after GROUP BY and can contain aggregate functions like COUNT(), SUM(), AVG().',
    'HAVING',
    'State clearly: WHERE filters individual rows, HAVING filters aggregated groups.',
    'Placing aggregate functions inside the WHERE clause.',
    'Medium', '2 mins', ARRAY['SQL', 'Queries'], ARRAY['Oracle', 'Amazon', 'Accenture'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_sql,
    'What does a LEFT JOIN return when a row in the left table has no matching row in the right table?',
    'mcq',
    'The row is excluded from the result set',
    'The row is included with NULL values for all columns of the right table',
    'An SQL runtime error is thrown',
    'The right table row values are replaced with empty strings',
    'B', 1,
    '["The row is excluded from the result set", "The row is included with NULL values for all columns of the right table", "An SQL runtime error is thrown", "The right table row values are replaced with empty strings"]'::JSONB,
    'A LEFT JOIN returns all rows from the left table. If there is no matching record in the right table, the right table columns contain NULL.',
    'The row is included with NULL values for all columns of the right table',
    'Adding a WHERE filter on the right table in a LEFT JOIN can accidentally turn it into an INNER JOIN.',
    'Confusing LEFT JOIN with INNER JOIN.',
    'Medium', '2 mins', ARRAY['SQL', 'Joins'], ARRAY['Flipkart', 'TCS'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_sql,
    'What does the "A" in ACID database transactions stand for?',
    'mcq',
    'Availability',
    'Atomicity',
    'Asynchronous',
    'Authentication',
    'B', 1,
    '["Availability", "Atomicity", "Asynchronous", "Authentication"]'::JSONB,
    'Atomicity guarantees that all operations within a transaction complete successfully, or all changes are rolled back (all-or-nothing principle).',
    'Atomicity',
    'Bank transfer is the classic example: debiting one account and crediting another must both succeed or fail together.',
    'Confusing ACID Consistency with CAP theorem Consistency.',
    'Medium', '2 mins', ARRAY['SQL', 'Transactions'], ARRAY['JPMorgan', 'Goldman Sachs'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_sql,
    'What is the primary trade-off of adding indexes to database tables?',
    'mcq',
    'Faster reads and slower write operations (INSERT/UPDATE/DELETE)',
    'Faster writes and slower reads',
    'Reduced disk storage and higher CPU usage',
    'Automatic schema normalization at the cost of foreign key checks',
    'A', 0,
    '["Faster reads and slower write operations (INSERT/UPDATE/DELETE)", "Faster writes and slower reads", "Reduced disk storage and higher CPU usage", "Automatic schema normalization at the cost of foreign key checks"]'::JSONB,
    'Indexes speed up data retrieval (SELECT, WHERE, JOIN) via B-Tree or Hash lookups, but consume additional storage and slow down writes because indexes must be updated on every INSERT, UPDATE, and DELETE.',
    'Faster reads and slower write operations (INSERT/UPDATE/DELETE)',
    'Only index columns frequently used in WHERE filters, JOIN conditions, and ORDER BY clauses.',
    'Assuming indexing every column is optimal for high-throughput write systems.',
    'Medium', '2 mins', ARRAY['SQL', 'Indexing'], ARRAY['Uber', 'Microsoft'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_sql,
    'In database normalization, which normal form requires the removal of transitive dependencies?',
    'mcq',
    'First Normal Form (1NF)',
    'Second Normal Form (2NF)',
    'Third Normal Form (3NF)',
    'Boyce-Codd Normal Form (BCNF)',
    'C', 2,
    '["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"]'::JSONB,
    '3NF requires that a table is in 2NF and has no transitive dependencies—meaning non-key attributes must depend only on the primary key, and not on other non-key attributes.',
    'Third Normal Form (3NF)',
    'Summarize 3NF: "Every non-key attribute must depend on the key, the whole key, and nothing but the key."',
    'Confusing 2NF partial dependency with 3NF transitive dependency.',
    'Medium', '2 mins', ARRAY['SQL', 'Normalization'], ARRAY['Oracle', 'Accenture'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- DSA MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_dsa,
    'What is the worst-case time complexity of Merge Sort?',
    'mcq',
    'O(n²)',
    'O(n log n)',
    'O(n)',
    'O(log n)',
    'B', 1,
    '["O(n²)", "O(n log n)", "O(n)", "O(log n)"]'::JSONB,
    'Merge Sort divides the input array recursively into halves (log n depth) and merges halves in linear O(n) time, guaranteeing O(n log n) runtime in all cases (best, average, worst).',
    'O(n log n)',
    'Mention that Merge Sort is a stable sorting algorithm requiring O(n) auxiliary space.',
    'Confusing Merge Sort with QuickSort which degrades to O(n²) with bad pivot choices.',
    'Medium', '2 mins', ARRAY['DSA', 'Algorithms', 'Sorting'], ARRAY['Google', 'Amazon', 'Microsoft'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_dsa,
    'Which data structure operates on a First-In, First-Out (FIFO) basis?',
    'mcq',
    'Stack',
    'Queue',
    'Binary Search Tree',
    'Priority Queue',
    'B', 1,
    '["Stack", "Queue", "Binary Search Tree", "Priority Queue"]'::JSONB,
    'A Queue is a linear data structure that follows the FIFO principle where elements are inserted at the rear (enqueue) and removed from the front (dequeue).',
    'Queue',
    'Queues are fundamental in Breadth-First Search (BFS) graph traversals and task scheduling buffers.',
    'Confusing Queue (FIFO) with Stack (LIFO).',
    'Medium', '2 mins', ARRAY['DSA', 'Data Structures'], ARRAY['Infosys', 'TCS'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_dsa,
    'What is the average time complexity of searching for an element in a Hash Table?',
    'mcq',
    'O(1)',
    'O(log n)',
    'O(n)',
    'O(n log n)',
    'A', 0,
    '["O(1)", "O(log n)", "O(n)", "O(n log n)"]'::JSONB,
    'Hash tables calculate array indexes directly via hash functions, providing O(1) average time complexity for lookup, insert, and delete operations.',
    'O(1)',
    'Worst-case hash table lookup is O(n) if all keys hash to the same bucket (collision chaining).',
    'Claiming hash table lookup is strictly O(1) in the worst case.',
    'Medium', '2 mins', ARRAY['DSA', 'Hash Table'], ARRAY['Meta', 'Uber'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_dsa,
    'Which algorithm is commonly used to find the shortest path in an unweighted graph?',
    'mcq',
    'Depth-First Search (DFS)',
    'Breadth-First Search (BFS)',
    'Kruskal Algorithm',
    'Prim Algorithm',
    'B', 1,
    '["Depth-First Search (DFS)", "Breadth-First Search (BFS)", "Kruskal Algorithm", "Prim Algorithm"]'::JSONB,
    'BFS explores nodes level-by-level in increasing distance from the root using a Queue, guaranteeing the shortest path in unweighted graphs.',
    'Breadth-First Search (BFS)',
    'Dijkstra is used for weighted graphs with non-negative edges; BFS is optimal for unweighted graphs.',
    'Using DFS to find shortest paths in unweighted graphs.',
    'Medium', '2 mins', ARRAY['DSA', 'Graphs'], ARRAY['Amazon', 'Apple'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_dsa,
    'What condition is required to apply Binary Search on an array?',
    'mcq',
    'The array elements must all be distinct positive integers',
    'The array must be sorted in ascending or descending order',
    'The array must be implemented as a doubly linked list',
    'The array size must be a power of 2',
    'B', 1,
    '["The array elements must all be distinct positive integers", "The array must be sorted in ascending or descending order", "The array must be implemented as a doubly linked list", "The array size must be a power of 2"]'::JSONB,
    'Binary Search relies on sorted order to divide the search space in half at each step, yielding O(log n) time complexity.',
    'The array must be sorted in ascending or descending order',
    'Avoid integer overflow when calculating midpoint: use `low + (high - low) / 2`.',
    'Attempting Binary Search on unsorted collections without sorting first.',
    'Medium', '2 mins', ARRAY['DSA', 'Binary Search'], ARRAY['Adobe', 'Google'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- WEB DEVELOPMENT MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_web,
    'Which HTTP method is considered idempotent and used exclusively to retrieve data without side effects?',
    'mcq',
    'POST',
    'GET',
    'PATCH',
    'CONNECT',
    'B', 1,
    '["POST", "GET", "PATCH", "CONNECT"]'::JSONB,
    'GET requests retrieve data from a server, are idempotent (making multiple identical requests produces the same server state), and can be safely cached.',
    'GET',
    'GET parameters appear in the URL query string; sensitive data should not be sent via GET.',
    'Thinking POST is idempotent (POST creates new resources on repeated calls).',
    'Easy', '2 mins', ARRAY['Web Development', 'HTTP'], ARRAY['Cognizant', 'TCS'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_web,
    'What does the HTTP 401 status code indicate?',
    'mcq',
    'Forbidden: Server understands request but refuses to authorize it',
    'Unauthorized: Authentication is required and has failed or not been provided',
    'Not Found: The requested resource does not exist',
    'Method Not Allowed: HTTP verb is not supported for this endpoint',
    'B', 1,
    '["Forbidden: Server understands request but refuses to authorize it", "Unauthorized: Authentication is required and has failed or not been provided", "Not Found: The requested resource does not exist", "Method Not Allowed: HTTP verb is not supported for this endpoint"]'::JSONB,
    '401 Unauthorized indicates that the request lacks valid authentication credentials. 403 Forbidden indicates the client is authenticated but lacks permission.',
    'Unauthorized: Authentication is required and has failed or not been provided',
    'Remember: 401 = Unauthenticated (who are you?), 403 = Unauthorized/Forbidden (you cannot access this).',
    'Confusing 401 (missing credentials) with 403 (insufficient permissions).',
    'Easy', '2 mins', ARRAY['Web Development', 'HTTP'], ARRAY['Amazon', 'Capgemini'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_web,
    'Which security mechanism enforces that a web page cannot request resources from a different origin unless permitted?',
    'mcq',
    'CORS / Same-Origin Policy',
    'Cross-Site Scripting (XSS)',
    'SQL Injection Defense',
    'TLS Handshake Protocol',
    'A', 0,
    '["CORS / Same-Origin Policy", "Cross-Site Scripting (XSS)", "SQL Injection Defense", "TLS Handshake Protocol"]'::JSONB,
    'The Same-Origin Policy is enforced by the browser to restrict cross-origin requests. Servers use CORS headers (e.g. Access-Control-Allow-Origin) to explicitly permit access.',
    'CORS / Same-Origin Policy',
    'Highlight that CORS is enforced on the client/browser side, not by the server refusing connections.',
    'Thinking CORS is a backend security layer rather than a browser security policy.',
    'Easy', '2 mins', ARRAY['Web Development', 'Security'], ARRAY['Google', 'Meta'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_web,
    'How many parts make up a standard JSON Web Token (JWT), separated by dots?',
    'mcq',
    '2 (Header, Body)',
    '3 (Header, Payload, Signature)',
    '4 (Alg, Claims, Secret, Hash)',
    '5 (Version, Issuer, Subject, Expiry, Signature)',
    'B', 1,
    '["2 (Header, Body)", "3 (Header, Payload, Signature)", "4 (Alg, Claims, Secret, Hash)", "5 (Version, Issuer, Subject, Expiry, Signature)"]'::JSONB,
    'JWTs consist of three Base64URL-encoded parts separated by dots: Header (algorithm), Payload (claims like user id and expiry), and Signature (tamper-proof cryptographic hash).',
    '3 (Header, Payload, Signature)',
    'Base64URL encoding is not encryption: anyone can decode the payload, so do not store sensitive secrets inside.',
    'Storing plain-text passwords or API secrets in the JWT payload.',
    'Easy', '2 mins', ARRAY['Web Development', 'Authentication'], ARRAY['Swiggy', 'Zomato'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_web,
    'What does REST stand for in web architecture?',
    'mcq',
    'Relational Entity State Transfer',
    'Representational State Transfer',
    'Remote Execution Standard Token',
    'Real-time Endpoint Server Transport',
    'B', 1,
    '["Relational Entity State Transfer", "Representational State Transfer", "Remote Execution Standard Token", "Real-time Endpoint Server Transport"]'::JSONB,
    'REST stands for Representational State Transfer, an architectural style characterized by stateless communication, client-server separation, and standard HTTP operations.',
    'Representational State Transfer',
    'Mention core constraints: Statelessness, Uniform Interface, Cacheability, Client-Server.',
    'Thinking REST is a protocol like SOAP rather than an architectural design style.',
    'Easy', '2 mins', ARRAY['Web Development', 'APIs'], ARRAY['Infosys', 'Wipro'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- OOP MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_oop,
    'Which OOP principle is demonstrated when a subclass provides its own specific implementation of a method declared in its superclass?',
    'mcq',
    'Encapsulation',
    'Method Overriding (Runtime Polymorphism)',
    'Multiple Inheritance',
    'Data Abstraction',
    'B', 1,
    '["Encapsulation", "Method Overriding (Runtime Polymorphism)", "Multiple Inheritance", "Data Abstraction"]'::JSONB,
    'Method overriding allows a subclass to provide a specific implementation of a method already defined in its parent class, resolved dynamically at runtime (Dynamic Dispatch).',
    'Method Overriding (Runtime Polymorphism)',
    'Overloading = same method name with different parameters; Overriding = same signature in a derived class.',
    'Confusing method overloading with method overriding.',
    'Medium', '2 mins', ARRAY['OOP', 'Polymorphism'], ARRAY['Oracle', 'Microsoft', 'TCS'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_oop,
    'What does the Single Responsibility Principle (SRP) in SOLID state?',
    'mcq',
    'A class should have only one single method',
    'A class should have one, and only one, reason to change',
    'A class should only implement a single interface',
    'A module should never depend on external libraries',
    'B', 1,
    '["A class should have only one single method", "A class should have one, and only one, reason to change", "A class should only implement a single interface", "A module should never depend on external libraries"]'::JSONB,
    'The Single Responsibility Principle states that every module or class should be responsible for only one part of the software functionality and have one single reason to change.',
    'A class should have one, and only one, reason to change',
    'Give a clear example: separating database persistence logic from business domain logic.',
    'Thinking SRP means each class can only contain one method.',
    'Medium', '2 mins', ARRAY['OOP', 'SOLID'], ARRAY['Google', 'Meta'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_oop,
    'Why is object composition often preferred over class inheritance ("Favor composition over inheritance")?',
    'mcq',
    'Composition completely removes the need for interfaces',
    'Composition provides loose coupling and allows dynamic behavior swapping at runtime',
    'Inheritance runs slower in virtual machine interpreters',
    'Composition prevents memory fragmentation in garbage collectors',
    'B', 1,
    '["Composition completely removes the need for interfaces", "Composition provides loose coupling and allows dynamic behavior swapping at runtime", "Inheritance runs slower in virtual machine interpreters", "Composition prevents memory fragmentation in garbage collectors"]'::JSONB,
    'Composition represents a "has-a" relationship that decouples components, avoids fragile base class issues, and allows swapping behaviors dynamically at runtime.',
    'Composition provides loose coupling and allows dynamic behavior swapping at runtime',
    'Quote the Gang of Four principle: "Favor object composition over class inheritance."',
    'Creating deeply nested multi-level inheritance hierarchies.',
    'Medium', '2 mins', ARRAY['OOP', 'Design Patterns'], ARRAY['Netflix', 'Amazon'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_oop,
    'Which OOP concept hides internal data implementation details and exposes only safe public interfaces?',
    'mcq',
    'Inheritance',
    'Encapsulation',
    'Polymorphism',
    'Composition',
    'B', 1,
    '["Inheritance", "Encapsulation", "Polymorphism", "Composition"]'::JSONB,
    'Encapsulation bundles data and methods together while restricting direct access to internal fields using private/protected modifiers and getter/setter methods.',
    'Encapsulation',
    'Encapsulation protects object integrity and prevents unauthorized external mutations.',
    'Confusing Encapsulation (data hiding) with Abstraction (interface contract).',
    'Medium', '2 mins', ARRAY['OOP'], ARRAY['Infosys', 'Wipro'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_oop,
    'In the SOLID principles, what does the Liskov Substitution Principle (LSP) guarantee?',
    'mcq',
    'Subclasses can be replaced with base class instances without breaking application correctness',
    'Classes must be open for modification and closed for extension',
    'High-level modules should depend directly on concrete classes',
    'Interfaces must contain as many methods as possible',
    'A', 0,
    '["Subclasses can be replaced with base class instances without breaking application correctness", "Classes must be open for modification and closed for extension", "High-level modules should depend directly on concrete classes", "Interfaces must contain as many methods as possible"]'::JSONB,
    'LSP states that objects of a superclass should be replaceable with objects of its subclasses without altering the correctness or desirable properties of the program.',
    'Subclasses can be replaced with base class instances without breaking application correctness',
    'Classic violation example: A Square subclassing Rectangle and breaking width/height invariants.',
    'Subclassing purely to reuse code while violating base contracts.',
    'Medium', '2 mins', ARRAY['OOP', 'SOLID'], ARRAY['Adobe', 'Microsoft'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- OPERATING SYSTEMS MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_os,
    'What is the primary difference in memory sharing between processes and threads?',
    'mcq',
    'Processes share memory space; threads have isolated address spaces',
    'Threads within the same process share heap and global data; processes have independent address spaces',
    'Threads cannot allocate dynamic memory',
    'Processes share the same CPU call stack',
    'B', 1,
    '["Processes share memory space; threads have isolated address spaces", "Threads within the same process share heap and global data; processes have independent address spaces", "Threads cannot allocate dynamic memory", "Processes share the same CPU call stack"]'::JSONB,
    'Threads of the same process share the same virtual address space, heap, and open file descriptors, but maintain their own individual CPU registers and call stack.',
    'Threads within the same process share heap and global data; processes have independent address spaces',
    'Highlight context-switching overhead: switching threads is much faster than switching processes.',
    'Thinking threads don''t have their own private stack.',
    'Medium', '2 mins', ARRAY['Operating Systems', 'Concurrency'], ARRAY['Qualcomm', 'Microsoft', 'Google'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_os,
    'Which of the following is NOT one of the four Coffman conditions necessary for a Deadlock to occur?',
    'mcq',
    'Mutual Exclusion',
    'Hold and Wait',
    'Preemptive Resource Allocation',
    'Circular Wait',
    'C', 2,
    '["Mutual Exclusion", "Hold and Wait", "Preemptive Resource Allocation", "Circular Wait"]'::JSONB,
    'The 4 Coffman conditions are: 1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption (resources cannot be forcibly taken), 4) Circular Wait. "Preemptive Resource Allocation" actually prevents deadlocks.',
    'Preemptive Resource Allocation',
    'If any single one of the four Coffman conditions is prevented, deadlock cannot occur.',
    'Confusing "No Preemption" with "Preemption".',
    'Medium', '2 mins', ARRAY['Operating Systems', 'Deadlock'], ARRAY['Intel', 'Samsung', 'Oracle'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_os,
    'What hardware event occurs when a process accesses a virtual memory page not currently mapped in physical RAM?',
    'mcq',
    'Segmentation Fault',
    'Page Fault',
    'Bus Error',
    'Stack Overflow',
    'B', 1,
    '["Segmentation Fault", "Page Fault", "Bus Error", "Stack Overflow"]'::JSONB,
    'A Page Fault is a hardware interrupt triggered by the Memory Management Unit (MMU) when an accessed virtual memory page must be retrieved from secondary swap storage into physical RAM.',
    'Page Fault',
    'Page Faults are normal virtual memory operations handled by the OS page replacement algorithm (e.g. LRU).',
    'Confusing a standard Page Fault with a fatal Segmentation Fault.',
    'Medium', '2 mins', ARRAY['Operating Systems', 'Memory'], ARRAY['Intel', 'Cisco'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_os,
    'Which CPU scheduling algorithm gives each process a fixed slice of execution time (quantum) in circular order?',
    'mcq',
    'First-Come First-Served (FCFS)',
    'Shortest Job First (SJF)',
    'Round Robin (RR)',
    'Priority Preemptive Scheduling',
    'C', 2,
    '["First-Come First-Served (FCFS)", "Shortest Job First (SJF)", "Round Robin (RR)", "Priority Preemptive Scheduling"]'::JSONB,
    'Round Robin scheduling is a preemptive algorithm designed for time-sharing operating systems where each ready process is assigned a cyclic time slice (quantum).',
    'Round Robin (RR)',
    'If the time quantum is too large, RR behaves like FCFS; if too small, context-switch overhead degrades performance.',
    'Thinking Round Robin causes starvation (it prevents starvation by guaranteeing equal turn).',
    'Medium', '2 mins', ARRAY['Operating Systems', 'Scheduling'], ARRAY['TCS', 'Capgemini'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_os,
    'What is the key difference in ownership semantics between a Mutex and a Binary Semaphore?',
    'mcq',
    'A Mutex can be unlocked by any thread, while a Semaphore can only be unlocked by the thread that locked it',
    'A Mutex has ownership semantics (only the locking thread can unlock it), while a Semaphore is a signaling mechanism unlockable by any thread',
    'A Mutex supports integer counting, whereas a Semaphore only supports 0 or 1',
    'Semaphores are implemented in user space only, whereas Mutexes are hardware-only',
    'B', 1,
    '["A Mutex can be unlocked by any thread, while a Semaphore can only be unlocked by the thread that locked it", "A Mutex has ownership semantics (only the locking thread can unlock it), while a Semaphore is a signaling mechanism unlockable by any thread", "A Mutex supports integer counting, whereas a Semaphore only supports 0 or 1", "Semaphores are implemented in user space only, whereas Mutexes are hardware-only"]'::JSONB,
    'A Mutex enforces strict ownership semantics: only the thread that acquired the lock can release it. A Semaphore is a signaling mechanism where any thread can signal/unlock the resource.',
    'A Mutex has ownership semantics (only the locking thread can unlock it), while a Semaphore is a signaling mechanism unlockable by any thread',
    'Summarize: Mutex is a locking mechanism with ownership; Semaphore is a signaling mechanism.',
    'Assuming Mutex and Binary Semaphore are 100% identical.',
    'Medium', '2 mins', ARRAY['Operating Systems', 'Concurrency'], ARRAY['Apple', 'Nvidia'], 'Active', 'starter', 'Premium'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- GIT MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_git,
    'What is the primary difference between `git merge` and `git rebase`?',
    'mcq',
    'git merge is destructive, whereas git rebase is non-destructive',
    'git merge creates a 3-way merge commit preserving history, whereas git rebase rewrites commits to create a linear history',
    'git merge only works on remote repositories, while git rebase works locally',
    'git rebase automatically resolves all merge conflicts without user intervention',
    'B', 1,
    '["git merge is destructive, whereas git rebase is non-destructive", "git merge creates a 3-way merge commit preserving history, whereas git rebase rewrites commits to create a linear history", "git merge only works on remote repositories, while git rebase works locally", "git rebase automatically resolves all merge conflicts without user intervention"]'::JSONB,
    '`git merge` creates a new commit that ties together the histories of both branches. `git rebase` moves or combines a sequence of commits to a new base commit, creating a linear history.',
    'git merge creates a 3-way merge commit preserving history, whereas git rebase rewrites commits to create a linear history',
    'Golden rule of rebasing: Never rebase commits that have been pushed to a public/shared repository branch.',
    'Rebasing shared main branches and disrupting teammates'' local histories.',
    'Medium', '2 mins', ARRAY['Git', 'Branching'], ARRAY['Google', 'Meta', 'Stripe'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_git,
    'Which command temporarily saves uncommitted changes in your working directory without making a commit?',
    'mcq',
    'git stash',
    'git save',
    'git freeze',
    'git shelf',
    'A', 0,
    '["git stash", "git save", "git freeze", "git shelf"]'::JSONB,
    '`git stash` takes your uncommitted changes (both staged and unstaged), saves them on a temporary stack, and cleans your working directory so you can switch branches.',
    'git stash',
    'Use `git stash pop` to apply and remove the top stash, or `git stash apply` to keep it in the stash list.',
    'Forgetting that `git stash drop` permanently deletes a stash.',
    'Easy', '2 mins', ARRAY['Git'], ARRAY['Amazon', 'Microsoft'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_git,
    'Which Git command creates a new commit that safely undoes the changes of a previous commit on a shared public branch?',
    'mcq',
    'git reset --hard',
    'git revert',
    'git rollback',
    'git checkout -f',
    'B', 1,
    '["git reset --hard", "git revert", "git rollback", "git checkout -f"]'::JSONB,
    '`git revert <commit-hash>` generates a new commit that applies inverse diffs, undoing the target commit without rewriting existing history.',
    'git revert',
    'Use `git revert` for shared public branches and `git reset` for private local branches.',
    'Using `git reset --hard` on pushed public branches.',
    'Medium', '2 mins', ARRAY['Git', 'History'], ARRAY['Uber', 'Swiggy'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_git,
    'What are the 3 internal trees/states in Git?',
    'mcq',
    'Working Directory, Staging Area (Index), Local Repository (HEAD)',
    'Client, Middleware, Server',
    'Branch, Tag, Commit',
    'Source, Binary, Release',
    'A', 0,
    '["Working Directory, Staging Area (Index), Local Repository (HEAD)", "Client, Middleware, Server", "Branch, Tag, Commit", "Source, Binary, Release"]'::JSONB,
    'Git tracks files across 3 trees: 1) Working Directory (active files on disk), 2) Staging Area / Index (prepared for next commit via `git add`), 3) Local Repository (committed snapshots).',
    'Working Directory, Staging Area (Index), Local Repository (HEAD)',
    '`git status` shows files moving between the working directory and staging area.',
    'Assuming git commit automatically includes untracked/unstaged files.',
    'Easy', '2 mins', ARRAY['Git', 'Core'], ARRAY['Infosys', 'TCS'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_git,
    'What is the difference between Git and GitHub?',
    'mcq',
    'Git is a closed-source protocol; GitHub is the open-source client',
    'Git is a local distributed version control system; GitHub is a cloud platform for hosting Git repositories',
    'Git only works on Windows; GitHub runs on Linux servers',
    'Git requires an active internet connection to track file commits',
    'B', 1,
    '["Git is a closed-source protocol; GitHub is the open-source client", "Git is a local distributed version control system; GitHub is a cloud platform for hosting Git repositories", "Git only works on Windows; GitHub runs on Linux servers", "Git requires an active internet connection to track file commits"]'::JSONB,
    'Git is a command-line version control system that runs 100% locally and offline. GitHub is a cloud-based web service that hosts Git repositories and facilitates collaboration.',
    'Git is a local distributed version control system; GitHub is a cloud platform for hosting Git repositories',
    'Git was created by Linus Torvalds in 2005; GitHub is owned by Microsoft.',
    'Using the terms Git and GitHub interchangeably.',
    'Easy', '2 mins', ARRAY['Git', 'DevOps'], ARRAY['Accenture', 'Wipro'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- MANAGERIAL MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_mgr,
    'What is the recommended framework for answering behavioral and situational leadership interview questions?',
    'mcq',
    'SWOT (Strengths, Weaknesses, Opportunities, Threats)',
    'STAR (Situation, Task, Action, Result)',
    'AGILE (Assess, Goal, Iterate, Learn, Execute)',
    'PDCA (Plan, Do, Check, Act)',
    'B', 1,
    '["SWOT (Strengths, Weaknesses, Opportunities, Threats)", "STAR (Situation, Task, Action, Result)", "AGILE (Assess, Goal, Iterate, Learn, Execute)", "PDCA (Plan, Do, Check, Act)"]'::JSONB,
    'The STAR method provides a structured response format: Situation (context), Task (your specific challenge), Action (concrete steps you took), and Result (quantifiable positive business impact).',
    'STAR (Situation, Task, Action, Result)',
    'Always quantify the Result with metrics (e.g. reduced latency by 35%, shipped 2 weeks ahead of deadline).',
    'Spending too much time on Situation and forgetting to highlight personal Action and Results.',
    'Hard', '3 mins', ARRAY['Leadership', 'STAR Method'], ARRAY['Amazon', 'Google', 'Meta'], 'Active', 'premium', 'Premium'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_mgr,
    'When two senior engineers strongly disagree on system architecture, what is the best managerial approach to resolve the impasse?',
    'mcq',
    'Make an arbitrary top-down decision immediately without consulting them',
    'Facilitate an objective trade-off review based on data, latency benchmarks, scalability metrics, and business OKRs',
    'Let the engineers argue until one yields',
    'Outsource the architectural component to an external vendor',
    'B', 1,
    '["Make an arbitrary top-down decision immediately without consulting them", "Facilitate an objective trade-off review based on data, latency benchmarks, scalability metrics, and business OKRs", "Let the engineers argue until one yields", "Outsource the architectural component to an external vendor"]'::JSONB,
    'Effective technical managers facilitate structured decision-making by creating an RFC / design document comparing trade-offs, scalability, operational costs, and align consensus with business requirements.',
    'Facilitate an objective trade-off review based on data, latency benchmarks, scalability metrics, and business OKRs',
    'Emphasize Amazon''s principle: "Have Backbone; Disagree and Commit" once a data-driven decision is made.',
    'Taking sides emotionally or ignoring team conflict.',
    'Hard', '3 mins', ARRAY['Leadership', 'Conflict Resolution'], ARRAY['Amazon', 'Microsoft'], 'Active', 'premium', 'Premium'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- HR MCQS
  -- ----------------------------------------------------------------------------
  INSERT INTO public.interview_questions (
    category_id, title, question_type, option_a, option_b, option_c, option_d, correct_option, correct_option_index,
    options, explanation, answer, tips, common_mistakes, difficulty, estimated_time, technology_tags, company_tags, status, minimum_plan, access_type
  ) VALUES (
    v_cat_hr,
    'When asked "Tell me about yourself" in an HR interview, what should your primary focus be?',
    'mcq',
    'Recite your entire childhood biography and family background',
    'Summarize your relevant technical education, key projects, internship experiences, and why you are excited for this specific role',
    'Negotiate salary expectations and vacation days immediately',
    'List all the negative experiences you had at previous companies',
    'B', 1,
    '["Recite your entire childhood biography and family background", "Summarize your relevant technical education, key projects, internship experiences, and why you are excited for this specific role", "Negotiate salary expectations and vacation days immediately", "List all the negative experiences you had at previous companies"]'::JSONB,
    'A strong "Tell me about yourself" pitch follows the Present-Past-Future model: your current technical status, top achievements/projects, and how your skills directly solve problems for the hiring team.',
    'Summarize your relevant technical education, key projects, internship experiences, and why you are excited for this specific role',
    'Keep your introductory elevator pitch crisp and under 2 minutes.',
    'Re-reading your resume word-for-word without enthusiasm.',
    'Easy', '2 mins', ARRAY['HR Interview', 'Behavioral'], ARRAY['TCS', 'Infosys', 'Wipro'], 'Active', 'free', 'Free'
  ) ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- ENSURE 10 TEST CONFIGURATIONS EXIST
  -- ----------------------------------------------------------------------------
  -- 1. Python Fundamentals Assessment (Easy, Timed, Free, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Python Fundamentals Assessment') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Python Fundamentals Assessment', 'Assess your core Python fundamentals and prepare for entry-level technical interviews.', v_cat_python, 'timed_test', 'Easy', 5, 60, 'free', true, 'Active');
  END IF;

  -- 2. SQL Interview Essentials (Medium, Timed, Starter, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'SQL Interview Essentials') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('SQL Interview Essentials', 'Practice SQL fundamentals, joins, filtering, transactions, and database concepts.', v_cat_sql, 'timed_test', 'Medium', 5, 60, 'starter', true, 'Active');
  END IF;

  -- 3. DSA Core Assessment (Medium, Timed, Starter, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'DSA Core Assessment') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('DSA Core Assessment', 'Test your understanding of core data structures and algorithms used in technical interviews.', v_cat_dsa, 'timed_test', 'Medium', 5, 60, 'starter', true, 'Active');
  END IF;

  -- 4. Web Development Fundamentals (Easy, Timed, Free, Not Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Web Development Fundamentals') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Web Development Fundamentals', 'Evaluate your understanding of HTTP, REST APIs, authentication, and modern web concepts.', v_cat_web, 'timed_test', 'Easy', 5, 60, 'free', false, 'Active');
  END IF;

  -- 5. OOP Interview Practice (Medium, Practice, Free, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'OOP Interview Practice') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('OOP Interview Practice', 'Practice object-oriented programming concepts frequently asked in technical interviews.', v_cat_oop, 'practice', 'Medium', 5, 60, 'free', true, 'Active');
  END IF;

  -- 6. Operating Systems Assessment (Medium, Timed, Starter, Not Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Operating Systems Assessment') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Operating Systems Assessment', 'Evaluate your understanding of processes, threads, memory management, and operating-system fundamentals.', v_cat_os, 'timed_test', 'Medium', 5, 60, 'starter', false, 'Active');
  END IF;

  -- 7. Git & Version Control Practice (Mixed, Practice, Free, Not Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Git & Version Control Practice') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Git & Version Control Practice', 'Practice Git commands, branching, merging, and version-control concepts.', v_cat_git, 'practice', 'Mixed', 5, 60, 'free', false, 'Active');
  END IF;

  -- 8. Python Advanced Challenge (Adaptive, AI Adaptive, Pro, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Python Advanced Challenge') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Python Advanced Challenge', 'Challenge yourself with advanced Python concepts and technical interview scenarios.', v_cat_python, 'ai_adaptive', 'Adaptive', 5, 90, 'pro', true, 'Active');
  END IF;

  -- 9. HR Freshers Assessment (Easy, Timed, Free, Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'HR Freshers Assessment') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('HR Freshers Assessment', 'Practice commonly asked HR interview questions for college students and freshers.', v_cat_hr, 'timed_test', 'Easy', 5, 60, 'free', true, 'Active');
  END IF;

  -- 10. Managerial Interview Practice (Hard, Practice, Premium, Not Rec)
  IF NOT EXISTS (SELECT 1 FROM public.interview_test_configs WHERE title = 'Managerial Interview Practice') THEN
    INSERT INTO public.interview_test_configs (title, description, category_id, mode, difficulty, question_count, time_per_question, minimum_plan, is_recommended, status)
    VALUES ('Managerial Interview Practice', 'Practice leadership, ownership, conflict resolution, and STAR-based managerial scenarios.', v_cat_mgr, 'practice', 'Hard', 5, 90, 'premium', false, 'Active');
  END IF;

  -- Global Settings
  INSERT INTO public.interview_prep_settings (
    id, practice_mode_enabled, timed_test_mode_enabled, ai_adaptive_mode_enabled,
    practice_minimum_plan, timed_test_minimum_plan, ai_adaptive_minimum_plan,
    allowed_question_counts, allowed_time_limits
  )
  VALUES (
    'global', true, true, true,
    'free', 'free', 'premium',
    '{5, 10, 20, 30, 40, 50}', '{30, 45, 60, 90, 120}'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    allowed_question_counts = '{5, 10, 20, 30, 40, 50}',
    allowed_time_limits = '{30, 45, 60, 90, 120}',
    updated_at = now();

END $$;
