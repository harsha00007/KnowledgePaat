import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csjywuflkvohytbvglxf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_k7fUFPAJoKrn4_ghTkJDqw_ejUHMOHA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface CategorySeed {
  name: string;
  description: string;
  order_index: number;
}

interface QuestionSeed {
  category_name: string;
  title: string;
  answer: string;
  tips: string;
  common_mistakes: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_time: string;
  technology_tags: string[];
  company_tags: string[];
  minimum_plan: string;
}

interface TestConfigSeed {
  title: string;
  description: string;
  category_name: string;
  mode: 'practice' | 'timed_test' | 'ai_adaptive';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Adaptive';
  question_count: number;
  time_per_question: number;
  minimum_plan: 'free' | 'starter' | 'pro' | 'premium';
  is_recommended: boolean;
  status: 'Active';
}

const CATEGORIES: CategorySeed[] = [
  { name: 'Python', description: 'Core Python programming, data structures, OOP, decorators, and ecosystem.', order_index: 1 },
  { name: 'SQL', description: 'Relational databases, queries, joins, indexing, normalization, and transactions.', order_index: 2 },
  { name: 'DSA', description: 'Data Structures and Algorithms for technical interviews and coding rounds.', order_index: 3 },
  { name: 'Web Development', description: 'Frontend, backend, HTTP protocols, REST APIs, and modern web architecture.', order_index: 4 },
  { name: 'OOP', description: 'Object-Oriented Programming principles, design patterns, and polymorphism.', order_index: 5 },
  { name: 'Operating Systems', description: 'Processes, concurrency, threads, memory management, and file systems.', order_index: 6 },
  { name: 'Git', description: 'Version control workflows, branching, merging, rebasing, and conflict resolution.', order_index: 7 },
  { name: 'HR Interview', description: 'Behavioral, situational, and culture-fit interview questions.', order_index: 8 },
  { name: 'Managerial Interview', description: 'Leadership, ownership, conflict resolution, and STAR-based managerial scenarios.', order_index: 9 },
];

const QUESTIONS: QuestionSeed[] = [
  // --- PYTHON EASY ---
  {
    category_name: 'Python',
    title: 'What is Python and what are its key features?',
    answer: 'Python is a high-level, interpreted, dynamically-typed programming language. Key features include readable syntax, dynamic typing, automatic memory management via garbage collection, large standard library, and support for multiple paradigms (OOP, functional, procedural).',
    tips: 'Mention interpreted nature and dynamic typing clearly.',
    common_mistakes: 'Calling Python purely functional or purely OOP.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Python', 'Core'],
    company_tags: ['Google', 'TCS', 'Infosys'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Python',
    title: 'What is the difference between a list and a tuple in Python?',
    answer: 'Lists are mutable (can be modified after creation) and defined with square brackets []. Tuples are immutable (cannot be altered) and defined with parentheses (). Tuples are faster, consume less memory, and can be used as dictionary keys if they contain only hashable elements.',
    tips: 'Emphasize mutability and hashability as dictionary keys.',
    common_mistakes: 'Claiming tuples cannot contain mutable objects (a tuple can contain a list).',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Python', 'Data Structures'],
    company_tags: ['Amazon', 'Wipro'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Python',
    title: 'What is the difference between == and is operators in Python?',
    answer: 'The == operator checks for equality of values (calls __eq__), while the is operator checks for identity, meaning both variables point to the exact same object in memory (compares id()).',
    tips: 'Use `a is None` instead of `a == None` as a best practice.',
    common_mistakes: 'Thinking == and is always behave identically for small integers due to integer caching.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Python'],
    company_tags: ['Microsoft', 'Accenture'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Python',
    title: 'What are list comprehensions and why are they used?',
    answer: 'List comprehension provides a concise syntax for creating a new list from an existing iterable based on a condition or transformation: `[expression for item in iterable if condition]`. They are generally faster and more readable than standard for-loops with append.',
    tips: 'Show a quick 1-line syntax example.',
    common_mistakes: 'Writing deeply nested list comprehensions that reduce code readability.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Python'],
    company_tags: ['Flipkart', 'Cognizant'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Python',
    title: 'What is a Python virtual environment and why should you use it?',
    answer: 'A virtual environment (venv) is an isolated environment containing its own Python interpreter and site-packages. It allows different projects to use separate dependencies and versions without conflicting with global packages or other projects.',
    tips: 'Mention tools like venv, pipenv, or poetry.',
    common_mistakes: 'Installing all packages globally and running into dependency collisions.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Python', 'Tooling'],
    company_tags: ['Infosys', 'TCS'],
    minimum_plan: 'free'
  },

  // --- PYTHON MEDIUM / HARD / ADAPTIVE ---
  {
    category_name: 'Python',
    title: 'Explain decorators in Python and how to write a custom decorator.',
    answer: 'A decorator is a callable that takes another function as an argument, extends or modifies its behavior without modifying its source code, and returns the modified callable. It uses the @syntax. Under the hood: `func = decorator(func)`.',
    tips: 'Always use functools.wraps inside custom decorators to preserve metadata.',
    common_mistakes: 'Forgetting to return the inner wrapper function from the decorator.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['Python', 'Advanced'],
    company_tags: ['Google', 'Meta', 'Amazon'],
    minimum_plan: 'pro'
  },
  {
    category_name: 'Python',
    title: 'What are Python Generators and the yield keyword?',
    answer: 'Generators are functions that return an iterator yielding one item at a time using the yield keyword. Unlike regular functions that return an entire dataset at once, generators produce items lazily on demand, drastically reducing memory usage for large data pipelines.',
    tips: 'Highlight memory efficiency (O(1) memory vs O(N)).',
    common_mistakes: 'Confusing return with yield.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['Python', 'Generators'],
    company_tags: ['Uber', 'Swiggy'],
    minimum_plan: 'pro'
  },
  {
    category_name: 'Python',
    title: 'What is the Global Interpreter Lock (GIL) and how does it affect multithreading in Python?',
    answer: 'The GIL is a mutex used by CPython to ensure only one native thread executes Python bytecode at any given time. Because of the GIL, CPU-bound tasks do not achieve parallelism with threading. For CPU-bound tasks, multiprocessing or C-extensions are used instead.',
    tips: 'Differentiate between I/O-bound tasks (threading works well) and CPU-bound tasks (multiprocessing required).',
    common_mistakes: 'Claiming Python cannot do multithreading at all (threading is effective for I/O bound tasks).',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Python', 'Concurrency', 'Internals'],
    company_tags: ['Netflix', 'Google', 'Meta'],
    minimum_plan: 'pro'
  },
  {
    category_name: 'Python',
    title: 'Explain Python Metaclasses and when you would use them.',
    answer: 'A metaclass is a "class of a class" that defines how a class is constructed and behaves. Just as an object is an instance of a class, a class is an instance of a metaclass (by default type). They are used for automatic API registration, validation, and framework construction (e.g., Django ORM).',
    tips: 'Quote Tim Peters: "Metaclasses are deeper magic that 99% of users should never worry about."',
    common_mistakes: 'Overusing metaclasses when simple decorators or class inheritance would suffice.',
    difficulty: 'Hard',
    estimated_time: '6 mins',
    technology_tags: ['Python', 'Metaclasses'],
    company_tags: ['Stripe', 'Amazon'],
    minimum_plan: 'pro'
  },
  {
    category_name: 'Python',
    title: 'How does Python handle memory management and garbage collection?',
    answer: 'Python uses two primary memory management techniques: Reference Counting and a Generational Cyclic Garbage Collector (with 3 generations: 0, 1, 2). When an object reference count drops to 0, memory is freed immediately. The cyclic GC detects and collects reference cycles.',
    tips: 'Mention the gc module and __del__ method.',
    common_mistakes: 'Assuming Python only uses mark-and-sweep GC without reference counting.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Python', 'Memory'],
    company_tags: ['Microsoft', 'Oracle'],
    minimum_plan: 'pro'
  },

  // --- SQL (MEDIUM) ---
  {
    category_name: 'SQL',
    title: 'What is the difference between INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN?',
    answer: 'INNER JOIN returns rows when there is a match in both tables. LEFT JOIN returns all rows from the left table and matched rows from the right (NULL if no match). RIGHT JOIN returns all rows from right table and matched from left. FULL OUTER JOIN returns all rows when there is a match in either left or right table.',
    tips: 'Draw or explain Venn diagrams mentally.',
    common_mistakes: 'Using WHERE filters on the right table in a LEFT JOIN which accidentally converts it into an INNER JOIN.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['SQL', 'Joins', 'Databases'],
    company_tags: ['Amazon', 'Flipkart', 'TCS'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'SQL',
    title: 'Explain Database Normalization (1NF, 2NF, 3NF, BCNF).',
    answer: 'Normalization is the process of organizing database tables to reduce redundancy and prevent insert/update/delete anomalies. 1NF: Atomic values and unique rows. 2NF: In 1NF and no partial dependencies on composite keys. 3NF: In 2NF and no transitive dependencies (non-key attributes depend only on primary key). BCNF: Stricter 3NF where every determinant is a candidate key.',
    tips: 'Summarize 3NF as: "Every attribute must depend on the key, the whole key, and nothing but the key."',
    common_mistakes: 'Confusing 2NF partial dependency with 3NF transitive dependency.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['SQL', 'Normalization'],
    company_tags: ['Oracle', 'Google', 'Accenture'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'SQL',
    title: 'What is a Database Index, how does a B-Tree index work, and what are the trade-offs?',
    answer: 'An index is a data structure (commonly B-Tree or Hash) that speeds up data retrieval queries (SELECT, WHERE, JOIN) at the expense of additional storage space and slower write operations (INSERT, UPDATE, DELETE) because indexes must be updated on every write.',
    tips: 'Mention composite indexes and index selectivity.',
    common_mistakes: 'Assuming more indexes is always better regardless of write load.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['SQL', 'Indexing', 'Performance'],
    company_tags: ['Uber', 'Microsoft'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'SQL',
    title: 'What are ACID properties in database transactions?',
    answer: 'ACID ensures reliable database transactions: Atomicity (all-or-nothing execution), Consistency (database transitions from one valid state to another satisfying constraints), Isolation (concurrent transactions execute independently without interfering), Durability (committed changes persist even during power loss/crashes).',
    tips: 'Give a real-world bank transfer example for Atomicity.',
    common_mistakes: 'Confusing Consistency in ACID with Consistency in CAP theorem.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['SQL', 'Transactions'],
    company_tags: ['JPMorgan', 'Goldman Sachs', 'Amazon'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'SQL',
    title: 'What is the difference between WHERE and HAVING clauses in SQL?',
    answer: 'WHERE filters individual rows before any grouping or aggregation (GROUP BY) occurs and cannot contain aggregate functions. HAVING filters aggregated groups after GROUP BY and can use aggregate functions like COUNT(), SUM(), AVG().',
    tips: 'State clearly: WHERE filters rows; HAVING filters grouped aggregates.',
    common_mistakes: 'Using aggregate functions inside the WHERE clause.',
    difficulty: 'Medium',
    estimated_time: '3 mins',
    technology_tags: ['SQL', 'Queries'],
    company_tags: ['Infosys', 'Capgemini'],
    minimum_plan: 'starter'
  },

  // --- DSA (MEDIUM) ---
  {
    category_name: 'DSA',
    title: 'Explain Time and Space Complexity and Big-O Notation.',
    answer: 'Big-O notation describes the upper bound of runtime or memory requirements as input size N grows toward infinity. Common complexities ordered from best to worst: O(1) constant, O(log N) logarithmic, O(N) linear, O(N log N) linearithmic, O(N^2) quadratic, O(2^N) exponential.',
    tips: 'Mention that Big-O ignores constant factors and lower-order terms.',
    common_mistakes: 'Confusing worst-case Big-O with average-case Theta notation.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['DSA', 'Algorithms'],
    company_tags: ['Amazon', 'Google', 'Adobe'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'DSA',
    title: 'How does a Hash Table work, and how are hash collisions handled?',
    answer: 'A Hash Table maps keys to values using a hash function that calculates an index in an array. Average lookup, insert, and delete are O(1). Collisions occur when two keys produce the same hash index. Common resolution strategies: 1) Chaining (linked lists or balanced trees at each bucket), 2) Open Addressing (Linear Probing, Quadratic Probing, Double Hashing).',
    tips: 'Mention load factor and dynamic resizing when load factor exceeds threshold (typically 0.75).',
    common_mistakes: 'Saying worst-case hash table lookup is always O(1) (worst case is O(N) if all keys collide).',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['DSA', 'Data Structures'],
    company_tags: ['Microsoft', 'Meta', 'Uber'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'DSA',
    title: 'What is the difference between BFS (Breadth-First Search) and DFS (Depth-First Search)?',
    answer: 'BFS explores a graph level by level using a Queue (FIFO), optimal for finding the shortest path in unweighted graphs. DFS explores as deep as possible along each branch before backtracking using a Stack (LIFO) or recursion, commonly used for topological sorting, cycle detection, and maze solving.',
    tips: 'Identify data structures: BFS uses Queue, DFS uses Stack/Recursion.',
    common_mistakes: 'Forgetting to maintain a visited set in graphs with cycles, causing infinite loops.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['DSA', 'Graphs'],
    company_tags: ['Amazon', 'Apple', 'Swiggy'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'DSA',
    title: 'Explain Binary Search and write its time complexity recurrence.',
    answer: 'Binary Search finds the position of a target value within a sorted array by repeatedly dividing the search interval in half: compare target to middle element; if equal return index; if target < middle search left half; else search right half. Recurrence: T(N) = T(N/2) + O(1), giving O(log N) time and O(1) auxiliary space.',
    tips: 'Prevent integer overflow in midpoint calculation: use `mid = low + (high - low) // 2`.',
    common_mistakes: 'Attempting binary search on unsorted arrays.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['DSA', 'Searching'],
    company_tags: ['TCS', 'Infosys', 'Wipro'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'DSA',
    title: 'What is Dynamic Programming and what are its two main approaches?',
    answer: 'Dynamic Programming solves optimization problems by breaking them down into overlapping subproblems with optimal substructure. Two approaches: 1) Top-Down with Memoization (recursive formulation with cache), 2) Bottom-Up with Tabulation (iterative DP table construction from base cases up).',
    tips: 'Mention classic examples: Fibonacci, 0/1 Knapsack, Longest Common Subsequence.',
    common_mistakes: 'Confusing Divide & Conquer (independent subproblems) with Dynamic Programming (overlapping subproblems).',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['DSA', 'Dynamic Programming'],
    company_tags: ['Google', 'Adobe', 'Amazon'],
    minimum_plan: 'starter'
  },

  // --- WEB DEVELOPMENT (EASY) ---
  {
    category_name: 'Web Development',
    title: 'What is the difference between HTTP GET and POST methods?',
    answer: 'GET requests retrieve data from a server, pass parameters in the URL query string, are cached, bookmarked, and idempotent (should not modify server state). POST requests submit data in the request body to create/modify resources, are not cached, and are non-idempotent.',
    tips: 'Explain idempotency and security implications (sensitive data in URL vs body).',
    common_mistakes: 'Thinking POST is automatically encrypted without HTTPS.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Web Development', 'HTTP'],
    company_tags: ['Cognizant', 'TCS', 'Accenture'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Web Development',
    title: 'What is a RESTful API and what are its core architectural constraints?',
    answer: 'REST (Representational State Transfer) is an architectural style for web services. Core constraints: 1) Client-Server separation, 2) Statelessness (every request contains all context), 3) Cacheability, 4) Uniform Interface (standard HTTP verbs: GET, POST, PUT, DELETE, PATCH), 5) Layered System.',
    tips: 'Map HTTP verbs to CRUD operations clearly.',
    common_mistakes: 'Thinking REST requires JSON (REST can use XML or plain text).',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Web Development', 'APIs'],
    company_tags: ['Infosys', 'Wipro'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Web Development',
    title: 'What are HTTP Status Codes and what do 2xx, 3xx, 4xx, 5xx represent?',
    answer: 'HTTP status codes indicate the result of a server request: 1xx Informational, 2xx Success (200 OK, 201 Created), 3xx Redirection (301 Moved Permanently, 304 Not Modified), 4xx Client Error (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found), 5xx Server Error (500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable).',
    tips: 'Know difference between 401 (Unauthenticated) and 403 (Unauthorized/Forbidden).',
    common_mistakes: 'Returning 200 OK with an error payload in the response body.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Web Development', 'HTTP'],
    company_tags: ['Amazon', 'Capgemini'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Web Development',
    title: 'What is CORS (Cross-Origin Resource Sharing) and why does it exist?',
    answer: 'CORS is a browser security mechanism that restricts web pages from making AJAX/Fetch requests to a different domain, protocol, or port than the one serving the web page (Same-Origin Policy). The server can permit cross-origin access by sending HTTP headers such as `Access-Control-Allow-Origin: *`.',
    tips: 'Mention preflight OPTIONS requests.',
    common_mistakes: 'Thinking CORS is enforced by the backend server rather than the browser.',
    difficulty: 'Easy',
    estimated_time: '4 mins',
    technology_tags: ['Web Development', 'Security'],
    company_tags: ['Google', 'Meta'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Web Development',
    title: 'What is JSON Web Token (JWT) and how is it structured?',
    answer: 'JWT is an open standard (RFC 7519) for securely transmitting information between parties as a compact JSON object. It consists of three parts separated by dots: Header (algorithm & token type), Payload (claims like user id and expiration), and Signature (HMAC or RSA signature using secret key).',
    tips: 'Emphasize that base64url encoding is not encryption (payload is readable by anyone).',
    common_mistakes: 'Storing sensitive passwords or API keys inside the JWT payload.',
    difficulty: 'Easy',
    estimated_time: '4 mins',
    technology_tags: ['Web Development', 'Authentication'],
    company_tags: ['Swiggy', 'Zomato'],
    minimum_plan: 'free'
  },

  // --- OOP (MEDIUM) ---
  {
    category_name: 'OOP',
    title: 'What are the 4 fundamental pillars of Object-Oriented Programming?',
    answer: '1) Encapsulation: Bundling data and methods that operate on that data within a class while restricting direct access (private/protected). 2) Abstraction: Hiding internal complexity and showing only essential interfaces (abstract classes/interfaces). 3) Inheritance: Deriving new classes from existing ones to reuse code. 4) Polymorphism: The ability for different classes to respond to the same method call in their own specific way.',
    tips: 'Provide real-world code examples for each pillar.',
    common_mistakes: 'Confusing Encapsulation (data hiding) with Abstraction (interface simplification).',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['OOP', 'Software Engineering'],
    company_tags: ['Oracle', 'Microsoft', 'TCS'],
    minimum_plan: 'free'
  },
  {
    category_name: 'OOP',
    title: 'What is Polymorphism and what is the difference between Compile-Time and Runtime Polymorphism?',
    answer: 'Polymorphism allows objects to take multiple forms. Compile-Time (Static) Polymorphism is resolved at compile time via Method Overloading or Operator Overloading. Runtime (Dynamic) Polymorphism is resolved at runtime via Method Overriding using virtual functions / dynamic dispatch.',
    tips: 'Mention that Python does not support classic method overloading natively but achieves runtime polymorphism dynamically.',
    common_mistakes: 'Mixing up overloading (same name, different params) and overriding (same name & params in subclass).',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['OOP'],
    company_tags: ['Infosys', 'Amazon'],
    minimum_plan: 'free'
  },
  {
    category_name: 'OOP',
    title: 'What are SOLID Design Principles in Object-Oriented Software Design?',
    answer: 'S: Single Responsibility (a class has one reason to change). O: Open/Closed (open for extension, closed for modification). L: Liskov Substitution (subtypes must be substitutable for base types). I: Interface Segregation (prefer small client-specific interfaces). D: Dependency Inversion (depend on abstractions, not concrete implementations).',
    tips: 'Walk through Liskov Substitution with the classic Rectangle-Square violation example.',
    common_mistakes: 'Reciting acronyms without knowing practical code examples.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['OOP', 'Design Patterns'],
    company_tags: ['Google', 'Adobe', 'Meta'],
    minimum_plan: 'free'
  },
  {
    category_name: 'OOP',
    title: 'What is the difference between an Abstract Class and an Interface?',
    answer: 'An Abstract Class can contain both abstract methods and concrete implemented methods, instance fields, and state. An Interface contains only method signatures/contracts (though modern languages allow default methods). A class can implement multiple interfaces (multiple inheritance of type) but typically inherit from only one class.',
    tips: 'Use "is-a" for abstract classes and "can-do" for interfaces.',
    common_mistakes: 'Using abstract classes when purely an interface contract is needed.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['OOP'],
    company_tags: ['Java', 'C++', 'Wipro'],
    minimum_plan: 'free'
  },
  {
    category_name: 'OOP',
    title: 'What is the difference between Composition and Inheritance ("Favor composition over inheritance")?',
    answer: 'Inheritance is an "is-a" relationship where a subclass acquires behavior from a superclass (tight coupling). Composition is a "has-a" relationship where a class contains references to other objects to delegate functionality (loose coupling). Composition allows dynamic swapping of behavior at runtime and avoids fragile base class problems.',
    tips: 'Quote the Gang of Four principle: "Favor object composition over class inheritance."',
    common_mistakes: 'Creating deeply nested inheritance hierarchies that break when requirements change.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['OOP', 'Design Patterns'],
    company_tags: ['Netflix', 'Microsoft'],
    minimum_plan: 'free'
  },

  // --- OPERATING SYSTEMS (MEDIUM) ---
  {
    category_name: 'Operating Systems',
    title: 'What is the difference between a Process and a Thread?',
    answer: 'A Process is an executing instance of a program with its own independent address space, memory, and resources (heavyweight). A Thread is a lightweight unit of execution within a process; all threads of a process share the same memory space (heap, code, global data) but have their own registers and stack.',
    tips: 'Highlight context switching overhead (processes are slower to switch than threads).',
    common_mistakes: 'Thinking threads don\'t have their own call stack.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['Operating Systems', 'Concurrency'],
    company_tags: ['Microsoft', 'Google', 'Qualcomm'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'Operating Systems',
    title: 'What is Virtual Memory, Paging, and Page Fault?',
    answer: 'Virtual Memory creates an illusion of large contiguous memory by abstracting physical RAM with disk storage (swap). Paging divides virtual memory into fixed-size blocks (pages) and physical memory into page frames. A Page Fault is a hardware interrupt triggered when a program accesses a virtual page that is currently not loaded into physical RAM.',
    tips: 'Mention TLB (Translation Lookaside Buffer) for caching page table lookups.',
    common_mistakes: 'Confusing internal fragmentation in paging with external fragmentation in segmentation.',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['Operating Systems', 'Memory'],
    company_tags: ['Intel', 'Amazon', 'Cisco'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'Operating Systems',
    title: 'What is a Deadlock and what are the 4 Coffman conditions required for deadlock?',
    answer: 'A Deadlock is a state where a set of processes are blocked because each process is holding a resource and waiting for another resource held by another process. Four conditions: 1) Mutual Exclusion (non-shareable resources), 2) Hold and Wait, 3) No Preemption (resources cannot be forcibly taken), 4) Circular Wait (cycle in resource allocation graph).',
    tips: 'Mention Banker\'s algorithm for deadlock avoidance.',
    common_mistakes: 'Thinking deadlock can occur if any single condition is broken (all 4 must hold simultaneously).',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['Operating Systems', 'Concurrency'],
    company_tags: ['Samsung', 'Oracle'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'Operating Systems',
    title: 'Explain CPU Scheduling Algorithms (FCFS, SJF, Round Robin, Priority Scheduling).',
    answer: 'CPU scheduling decides which ready process gets CPU time: 1) FCFS (First-Come First-Served): Simple, non-preemptive, suffers from Convoy Effect. 2) SJF (Shortest Job First): Optimal average waiting time but risk of starvation. 3) Round Robin: Preemptive, gives each process a fixed time quantum, ideal for time-sharing. 4) Priority: Highest priority runs first, uses aging to prevent starvation.',
    tips: 'Explain the effect of time quantum size in Round Robin (too large = FCFS, too small = excessive context switching).',
    common_mistakes: 'Forgetting to mention starvation handling (aging technique).',
    difficulty: 'Medium',
    estimated_time: '5 mins',
    technology_tags: ['Operating Systems', 'Scheduling'],
    company_tags: ['TCS', 'Infosys', 'Capgemini'],
    minimum_plan: 'starter'
  },
  {
    category_name: 'Operating Systems',
    title: 'What is a Semaphore, Mutex, and how do they differ in process synchronization?',
    answer: 'A Mutex (Mutual Exclusion) is a locking mechanism where only the thread that acquired the lock can release it (ownership semantics). A Semaphore is a signaling mechanism with an integer counter: Counting Semaphore allows N threads concurrent access; Binary Semaphore (0 or 1) acts like a lock but can be signaled/unlocked by any thread.',
    tips: 'Summarize: Mutex is a lock with ownership; Semaphore is a signaling mechanism.',
    common_mistakes: 'Thinking Mutex and Binary Semaphore are 100% identical in ownership semantics.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['Operating Systems', 'Concurrency'],
    company_tags: ['Nvidia', 'Apple'],
    minimum_plan: 'starter'
  },

  // --- GIT (MIXED: EASY, MEDIUM, HARD) ---
  {
    category_name: 'Git',
    title: 'What is Git and what is the difference between Git and GitHub?',
    answer: 'Git is a distributed version control system (DVCS) that tracks file changes locally on your machine. GitHub is a cloud-based hosting platform and web service that hosts Git repositories and provides collaboration tools (Pull Requests, Issues, CI/CD Actions).',
    tips: 'State clearly that Git works 100% offline on your local machine.',
    common_mistakes: 'Using Git and GitHub as interchangeable terms.',
    difficulty: 'Easy',
    estimated_time: '2 mins',
    technology_tags: ['Git', 'DevOps'],
    company_tags: ['TCS', 'Accenture'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Git',
    title: 'What are the 3 states/trees of Git (Working Directory, Staging Area, Repository)?',
    answer: '1) Working Directory: Local filesystem where files are modified. 2) Staging Area (Index): Tracks changes selected to be committed next (`git add`). 3) Local Repository: Stores the committed snapshots permanently (`git commit`).',
    tips: 'Mention `git status` to see files across these trees.',
    common_mistakes: 'Assuming `git commit` directly commits unstaged changes.',
    difficulty: 'Easy',
    estimated_time: '3 mins',
    technology_tags: ['Git'],
    company_tags: ['Infosys', 'Wipro'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Git',
    title: 'What is the difference between git merge and git rebase?',
    answer: '`git merge` creates a new 3-way merge commit combining histories, preserving the complete branching history and commit timestamps. `git rebase` reapplies commits from one branch onto the tip of another branch, producing a linear, clean commit history without merge commits.',
    tips: 'Golden rule: Never rebase commits that have been pushed to a shared public branch.',
    common_mistakes: 'Rebasing public main/master branch, causing history divergence for teammates.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Git', 'Branching'],
    company_tags: ['Meta', 'Google', 'Stripe'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Git',
    title: 'What is git stash and when should you use it?',
    answer: '`git stash` temporarily shelves (stashes) uncommitted changes in your working directory so you can switch branches or pull updates without committing half-finished work. You can restore stashed changes later with `git stash pop` or `git stash apply`.',
    tips: 'Use `git stash -u` to include untracked files.',
    common_mistakes: 'Forgetting that `git stash drop` permanently removes a stash.',
    difficulty: 'Medium',
    estimated_time: '3 mins',
    technology_tags: ['Git'],
    company_tags: ['Amazon', 'Microsoft'],
    minimum_plan: 'free'
  },
  {
    category_name: 'Git',
    title: 'What is the difference between git reset, git revert, and git checkout?',
    answer: '`git reset` moves the branch HEAD pointer backwards (can modify working directory and staging with --hard). `git revert` creates a new commit that undoes the changes of a previous commit (safe for shared public branches). `git checkout` switches branches or restores working tree files.',
    tips: 'Use git revert for public history and git reset for private local branches.',
    common_mistakes: 'Using `git reset --hard` on shared branches.',
    difficulty: 'Medium',
    estimated_time: '4 mins',
    technology_tags: ['Git', 'Advanced'],
    company_tags: ['Uber', 'Swiggy'],
    minimum_plan: 'free'
  },

  // --- MANAGERIAL INTERVIEW (HARD) ---
  {
    category_name: 'Managerial Interview',
    title: 'Tell me about a time you handled a major conflict within your engineering team.',
    answer: 'Use the STAR method: Situation (describe the disagreement regarding technical architecture or deadlines), Task (my responsibility to resolve tension without alienating teammates), Action (organized a 1-on-1, listened actively, created objective evaluation criteria based on data and trade-offs), Result (reached team consensus, delivered project on time, improved team trust).',
    tips: 'Focus on empathy, data-driven compromise, and positive project outcomes.',
    common_mistakes: 'Blaming colleagues or claiming you never have conflicts.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Leadership', 'STAR Method'],
    company_tags: ['Amazon', 'Google', 'Meta'],
    minimum_plan: 'premium'
  },
  {
    category_name: 'Managerial Interview',
    title: 'How do you prioritize competing tasks when multiple stakeholders demand urgent delivery?',
    answer: 'I use the Eisenhower Matrix and business impact evaluation: 1) Align with business objectives and OKRs, 2) Evaluate ROI vs engineering effort, 3) Communicate transparently with stakeholders about trade-offs, 4) Break tasks into incremental deliverables to unblock critical dependencies.',
    tips: 'Show that you say "No" constructively by offering phased alternatives.',
    common_mistakes: 'Saying you will work 80 hours a week to do everything simultaneously.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Project Management', 'Prioritization'],
    company_tags: ['Microsoft', 'Apple'],
    minimum_plan: 'premium'
  },
  {
    category_name: 'Managerial Interview',
    title: 'Describe a project that failed or missed a critical deadline. What did you learn and how did you adapt?',
    answer: 'Situation & Task: Underestimated technical complexity of legacy integration. Action: Conducted a blameless post-mortem, identified root causes (unclear API contracts and optimistic estimates), instituted mandatory RFC design reviews and spike sprint estimations. Result: Subsequent releases delivered with 95% on-time predictability and zero production downtime.',
    tips: 'Highlight ownership, accountability, and systemic improvements created from failure.',
    common_mistakes: 'Blaming external vendors or management.',
    difficulty: 'Hard',
    estimated_time: '6 mins',
    technology_tags: ['Engineering Leadership', 'Post-Mortem'],
    company_tags: ['Netflix', 'Amazon'],
    minimum_plan: 'premium'
  },
  {
    category_name: 'Managerial Interview',
    title: 'How do you handle an underperforming team member who is struggling to meet deliverables?',
    answer: '1) Immediate private 1-on-1 to understand if issues are personal, skill-gap, or tooling hurdles. 2) Set clear, measurable 30-day goals with pair-programming support. 3) Provide continuous weekly feedback. 4) If performance does not improve after documented support, partner with HR for appropriate transition while maintaining professionalism.',
    tips: 'Demonstrate supportive coaching before punitive action.',
    common_mistakes: 'Ignoring underperformance until annual performance reviews.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['People Management', 'Mentorship'],
    company_tags: ['Uber', 'Salesforce'],
    minimum_plan: 'premium'
  },
  {
    category_name: 'Managerial Interview',
    title: 'How do you manage technical debt versus delivering new business features?',
    answer: 'I advocate for allocating 20% of every sprint to tech debt, infrastructure refactoring, and automated testing. I translate technical debt into business language (e.g., "resolving this reduces checkout latency by 200ms and cuts crash rates by 40%"), creating a shared backlog prioritized alongside product features.',
    tips: 'Show that you bridge engineering needs with commercial/business ROI.',
    common_mistakes: 'Treating tech debt as a purely engineering secret hidden from product managers.',
    difficulty: 'Hard',
    estimated_time: '5 mins',
    technology_tags: ['Engineering Architecture', 'Technical Debt'],
    company_tags: ['Google', 'Airbnb', 'Stripe'],
    minimum_plan: 'premium'
  }
];

const TEST_CONFIGS: TestConfigSeed[] = [
  {
    title: 'Python Fundamentals Assessment',
    description: 'Assess your core Python fundamentals and prepare for entry-level technical interviews.',
    category_name: 'Python',
    mode: 'timed_test',
    difficulty: 'Easy',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'free',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'SQL Interview Essentials',
    description: 'Practice SQL fundamentals, joins, filtering, transactions, and database concepts.',
    category_name: 'SQL',
    mode: 'timed_test',
    difficulty: 'Medium',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'starter',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'DSA Core Assessment',
    description: 'Test your understanding of core data structures and algorithms used in technical interviews.',
    category_name: 'DSA',
    mode: 'timed_test',
    difficulty: 'Medium',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'starter',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'Web Development Fundamentals',
    description: 'Evaluate your understanding of HTTP, REST APIs, authentication, and modern web concepts.',
    category_name: 'Web Development',
    mode: 'timed_test',
    difficulty: 'Easy',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'free',
    is_recommended: false,
    status: 'Active'
  },
  {
    title: 'OOP Interview Practice',
    description: 'Practice object-oriented programming concepts frequently asked in technical interviews.',
    category_name: 'OOP',
    mode: 'practice',
    difficulty: 'Medium',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'free',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'Operating Systems Assessment',
    description: 'Evaluate your understanding of processes, threads, memory management, and operating-system fundamentals.',
    category_name: 'Operating Systems',
    mode: 'timed_test',
    difficulty: 'Medium',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'starter',
    is_recommended: false,
    status: 'Active'
  },
  {
    title: 'Git & Version Control Practice',
    description: 'Practice Git commands, branching, merging, and version-control concepts.',
    category_name: 'Git',
    mode: 'practice',
    difficulty: 'Mixed',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'free',
    is_recommended: false,
    status: 'Active'
  },
  {
    title: 'Python Advanced Challenge',
    description: 'Challenge yourself with advanced Python concepts and technical interview scenarios.',
    category_name: 'Python',
    mode: 'ai_adaptive',
    difficulty: 'Adaptive',
    question_count: 5,
    time_per_question: 90,
    minimum_plan: 'pro',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'HR Freshers Assessment',
    description: 'Practice commonly asked HR interview questions for college students and freshers.',
    category_name: 'HR Interview',
    mode: 'timed_test',
    difficulty: 'Easy',
    question_count: 5,
    time_per_question: 60,
    minimum_plan: 'free',
    is_recommended: true,
    status: 'Active'
  },
  {
    title: 'Managerial Interview Practice',
    description: 'Practice leadership, ownership, conflict resolution, and STAR-based managerial scenarios.',
    category_name: 'Managerial Interview',
    mode: 'practice',
    difficulty: 'Hard',
    question_count: 5,
    time_per_question: 90,
    minimum_plan: 'premium',
    is_recommended: false,
    status: 'Active'
  }
];

async function runSeed() {
  console.log("=================================================");
  console.log("STARTING TEST CONFIGURATION & QUESTION SEED");
  console.log("=================================================");

  // 1. Ensure Categories
  console.log("\n1. Ensuring Categories...");
  const categoryMap = new Map<string, string>(); // name -> id

  for (const cat of CATEGORIES) {
    // Check if exists
    const { data: existing } = await supabase
      .from('interview_categories')
      .select('id, name')
      .eq('name', cat.name)
      .maybeSingle();

    if (existing) {
      categoryMap.set(existing.name, existing.id);
      console.log(`- Category "${cat.name}" exists [${existing.id}]`);
    } else {
      const { data: created, error } = await supabase
        .from('interview_categories')
        .insert({
          name: cat.name,
          description: cat.description,
          order_index: cat.order_index,
          status: 'Active',
          is_active: true,
          minimum_plan: 'free'
        })
        .select('id, name')
        .single();

      if (error) {
        console.error(`❌ Error inserting category "${cat.name}":`, error.message);
      } else if (created) {
        categoryMap.set(created.name, created.id);
        console.log(`+ Created category "${cat.name}" [${created.id}]`);
      }
    }
  }

  // 2. Ensure Questions
  console.log("\n2. Ensuring Questions Pool...");
  let questionsCreated = 0;
  let questionsSkipped = 0;

  for (const q of QUESTIONS) {
    const catId = categoryMap.get(q.category_name);
    if (!catId) {
      console.error(`❌ Unknown category "${q.category_name}" for question "${q.title}"`);
      continue;
    }

    // Check if question exists by title
    const { data: existingQ } = await supabase
      .from('interview_questions')
      .select('id, title, category_id')
      .eq('title', q.title)
      .maybeSingle();

    if (existingQ) {
      // If question was previously under wrong category (e.g. HR Interview), update its category_id!
      if (existingQ.category_id !== catId) {
        await supabase
          .from('interview_questions')
          .update({ category_id: catId })
          .eq('id', existingQ.id);
        console.log(`~ Updated category for question: "${q.title}" -> ${q.category_name}`);
      }
      questionsSkipped++;
    } else {
      const { error: insertErr } = await supabase
        .from('interview_questions')
        .insert({
          category_id: catId,
          title: q.title,
          answer: q.answer,
          tips: q.tips,
          common_mistakes: q.common_mistakes,
          difficulty: q.difficulty,
          estimated_time: q.estimated_time,
          technology_tags: q.technology_tags,
          company_tags: q.company_tags,
          status: 'Active',
          is_active: true,
          minimum_plan: q.minimum_plan,
          access_type: q.minimum_plan === 'free' ? 'Free' : 'Premium'
        });

      if (insertErr) {
        console.error(`❌ Error inserting question "${q.title}":`, insertErr.message);
      } else {
        questionsCreated++;
      }
    }
  }
  console.log(`Questions: ${questionsCreated} created, ${questionsSkipped} existing/updated.`);

  // 3. Fetch Active Question Counts per Category & Difficulty
  console.log("\n3. Validating Question Pools...");
  const { data: allActiveQs } = await supabase
    .from('interview_questions')
    .select('id, category_id, difficulty, status')
    .eq('status', 'Active');

  const poolCounts: Record<string, Record<string, number>> = {};
  allActiveQs?.forEach(q => {
    if (!poolCounts[q.category_id]) {
      poolCounts[q.category_id] = { Easy: 0, Medium: 0, Hard: 0, Mixed: 0, Adaptive: 0, Total: 0 };
    }
    const diff = q.difficulty || 'Medium';
    poolCounts[q.category_id][diff] = (poolCounts[q.category_id][diff] || 0) + 1;
    poolCounts[q.category_id].Mixed = (poolCounts[q.category_id].Mixed || 0) + 1;
    poolCounts[q.category_id].Adaptive = (poolCounts[q.category_id].Adaptive || 0) + 1;
    poolCounts[q.category_id].Total = (poolCounts[q.category_id].Total || 0) + 1;
  });

  // 4. Create Test Configurations
  console.log("\n4. Creating Test Configurations...");
  let configsCreated = 0;
  let configsSkippedDuplicate = 0;
  let configsSkippedPool = 0;

  for (const test of TEST_CONFIGS) {
    const catId = categoryMap.get(test.category_name);
    if (!catId) {
      console.error(`❌ Category "${test.category_name}" not found for test "${test.title}"`);
      configsSkippedPool++;
      continue;
    }

    // Check pool
    const catPool = poolCounts[catId] || { Easy: 0, Medium: 0, Hard: 0, Mixed: 0, Adaptive: 0, Total: 0 };
    let availableForDiff = 0;
    if (test.difficulty === 'Mixed' || test.difficulty === 'Adaptive') {
      availableForDiff = catPool.Total;
    } else {
      availableForDiff = catPool[test.difficulty] || 0;
    }

    if (availableForDiff < 3) {
      console.warn(`⚠️ Skipped "${test.title}" due to insufficient question pool: only ${availableForDiff} active questions available for ${test.category_name} (${test.difficulty}).`);
      configsSkippedPool++;
      continue;
    }

    let actualCount = test.question_count;
    if (actualCount > availableForDiff) {
      console.log(`ℹ️ Question count reduced from ${actualCount} to ${availableForDiff} for "${test.title}" because only ${availableForDiff} active questions are available.`);
      actualCount = availableForDiff;
    }

    // Duplicate Check
    const { data: existingTest } = await supabase
      .from('interview_test_configs')
      .select('id, title')
      .eq('title', test.title)
      .maybeSingle();

    if (existingTest) {
      console.log(`- Test "${test.title}" already exists — skipped.`);
      configsSkippedDuplicate++;
      continue;
    }

    // Insert Test Configuration
    const { error: testErr } = await supabase
      .from('interview_test_configs')
      .insert({
        title: test.title,
        description: test.description,
        category_id: catId,
        mode: test.mode,
        difficulty: test.difficulty,
        question_count: actualCount,
        time_per_question: test.time_per_question,
        minimum_plan: test.minimum_plan,
        is_recommended: test.is_recommended,
        status: 'Active'
      });

    if (testErr) {
      console.error(`❌ Error creating test "${test.title}":`, testErr.message);
    } else {
      console.log(`+ Created Test "${test.title}" | Mode: ${test.mode} | Diff: ${test.difficulty} | Qs: ${actualCount} | Plan: ${test.minimum_plan} | Rec: ${test.is_recommended}`);
      configsCreated++;
    }
  }

  // 5. Ensure prep_settings has [5, 10, 20, 30, 40, 50]
  await supabase
    .from('interview_prep_settings')
    .upsert({
      id: 'global',
      practice_mode_enabled: true,
      timed_test_mode_enabled: true,
      ai_adaptive_mode_enabled: true,
      practice_minimum_plan: 'free',
      timed_test_minimum_plan: 'free',
      ai_adaptive_minimum_plan: 'premium',
      allowed_question_counts: [5, 10, 20, 30, 40, 50],
      allowed_time_limits: [30, 45, 60, 90, 120]
    });

  console.log("\n=================================================");
  console.log(`SUMMARY: ${configsCreated} created, ${configsSkippedDuplicate} duplicates skipped, ${configsSkippedPool} pool issues.`);
  console.log("=================================================");
}

runSeed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
