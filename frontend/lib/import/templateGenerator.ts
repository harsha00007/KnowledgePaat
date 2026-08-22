import * as XLSX from 'xlsx';

export const SAMPLE_TEMPLATE_DATA = [
  {
    question_title: "What is the time complexity of Merge Sort in the worst case?",
    category: "DSA",
    difficulty: "Medium",
    question_type: "mcq",
    answer_type: "",
    option_a: "O(n²)",
    option_b: "O(n log n)",
    option_c: "O(n)",
    option_d: "O(log n)",
    correct_option: "B",
    answer: "O(n log n)",
    explanation: "Merge Sort recursively divides the array in half (log n levels) and performs O(n) work merging halves at each level, resulting in O(n log n) time across best, average, and worst cases.",
    pro_tips: "Remember the divide-and-conquer recurrence: T(n) = 2T(n/2) + O(n).",
    common_pitfalls: "Do not confuse Merge Sort with QuickSort which can degrade to O(n²) in the worst case.",
    technology_tags: "DSA, Algorithms, Sorting",
    company_tags: "Google, Amazon, Microsoft",
    minimum_plan: "free",
    status: "Active"
  },
  {
    question_title: "Which of the following is true about Python tuples compared to lists?",
    category: "Python",
    difficulty: "Easy",
    question_type: "mcq",
    answer_type: "",
    option_a: "Tuples are mutable and defined with []",
    option_b: "Tuples are immutable and consume less memory than lists",
    option_c: "Tuples cannot be used as dictionary keys under any condition",
    option_d: "Tuples support item assignment using index notation",
    correct_option: "B",
    answer: "Tuples are immutable and consume less memory than lists",
    explanation: "Tuples are immutable sequences in Python that have lower memory overhead than dynamic lists and can be used as dictionary keys when containing hashable elements.",
    pro_tips: "Use tuples for read-only fixed collections of heterogeneous data.",
    common_pitfalls: "Attempting in-place modification of tuple elements raises a TypeError.",
    technology_tags: "Python, Core, Data Structures",
    company_tags: "TCS, Infosys, Wipro",
    minimum_plan: "free",
    status: "Active"
  },
  {
    question_title: "What is Python and what are its key features?",
    category: "Python",
    difficulty: "Easy",
    question_type: "normal",
    answer_type: "short",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "",
    answer: "Python is a high-level, interpreted, dynamically-typed programming language created by Guido van Rossum. Key features include clean and readable syntax, vast standard library, cross-platform support, automatic memory management via garbage collection, and strong ecosystem for web, data science, and AI.",
    explanation: "Emphasize readability, dynamic typing, and multi-paradigm nature (OOP + functional + procedural).",
    pro_tips: "State Python's high-level nature, dynamic typing, and battery-included standard library concisely.",
    common_pitfalls: "Do not claim Python is compiled directly to machine code; it compiles to bytecode run by CPython VM.",
    technology_tags: "Python, Fundamentals, Backend",
    company_tags: "Google, Infosys, Accenture",
    minimum_plan: "free",
    status: "Active"
  },
  {
    question_title: "Explain database normalization and the differences between 1NF, 2NF, and 3NF.",
    category: "SQL",
    difficulty: "Medium",
    question_type: "normal",
    answer_type: "long",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "",
    answer: "Database normalization is the systematic process of organizing relational tables to minimize data redundancy and prevent insertion, update, and deletion anomalies.\n\n1. First Normal Form (1NF): Requires atomic values (no repeating groups or arrays) and a primary key.\n2. Second Normal Form (2NF): Must be in 1NF and have NO partial dependency (every non-key attribute must depend on the entire primary key).\n3. Third Normal Form (3NF): Must be in 2NF and have NO transitive dependency (non-key attributes must not depend on other non-key attributes).",
    explanation: "Use the classic adage: 'Every non-key attribute must provide a fact about the key, the whole key, and nothing but the key, so help me Codd.'",
    pro_tips: "Give a concrete student-course enrollment or order-customer table example.",
    common_pitfalls: "Confusing 2NF partial dependencies with 3NF transitive dependencies.",
    technology_tags: "SQL, Database, Architecture",
    company_tags: "Oracle, Microsoft, Amazon",
    minimum_plan: "starter",
    status: "Active"
  }
];

export const INSTRUCTIONS_DATA = [
  { Column: "question_title", Required: "YES", Allowed_Values: "Any text (min 5 chars)", Description: "The interview question prompt or title" },
  { Column: "category", Required: "YES", Allowed_Values: "Python, SQL, DSA, Web Development, OOP, Operating Systems, Git, HR Interview, etc.", Description: "The subject or domain of the question" },
  { Column: "difficulty", Required: "YES", Allowed_Values: "Easy, Medium, Hard", Description: "Difficulty level for students" },
  { Column: "question_type", Required: "NO", Allowed_Values: "normal, mcq", Description: "Set to 'normal' for written-answer/study question, or 'mcq' for Multiple-Choice (default: normal)" },
  { Column: "answer_type", Required: "NO", Allowed_Values: "short, long", Description: "For normal questions: 'short' or 'long' answer length (default: short)" },
  { Column: "option_a", Required: "YES (for MCQ)", Allowed_Values: "Option A text", Description: "First answer choice" },
  { Column: "option_b", Required: "YES (for MCQ)", Allowed_Values: "Option B text", Description: "Second answer choice" },
  { Column: "option_c", Required: "YES (for MCQ)", Allowed_Values: "Option C text", Description: "Third answer choice" },
  { Column: "option_d", Required: "YES (for MCQ)", Allowed_Values: "Option D text", Description: "Fourth answer choice" },
  { Column: "correct_option", Required: "YES (for MCQ)", Allowed_Values: "A, B, C, or D", Description: "The letter of the single correct choice" },
  { Column: "explanation", Required: "NO", Allowed_Values: "Explanation text", Description: "Detailed explanation of why the correct answer is right" },
  { Column: "answer", Required: "YES (for Normal)", Allowed_Values: "Comprehensive ideal answer", Description: "The model answer or study solution" },
  { Column: "pro_tips", Required: "NO", Allowed_Values: "Helpful advice", Description: "Pro tips to help candidate stand out" },
  { Column: "common_pitfalls", Required: "NO", Allowed_Values: "Common mistakes", Description: "Mistakes to avoid when answering" },
  { Column: "technology_tags", Required: "NO", Allowed_Values: "Comma-separated text", Description: "Tags like Python, React, SQL" },
  { Column: "company_tags", Required: "NO", Allowed_Values: "Comma-separated text", Description: "Companies like TCS, Amazon, Infosys" },
  { Column: "minimum_plan", Required: "NO", Allowed_Values: "free, starter, pro, premium", Description: "Access tier required to view this question" },
  { Column: "status", Required: "NO", Allowed_Values: "Active, Inactive", Description: "Publication status (default: Active)" },
];

/**
 * Generates an Excel template (.xlsx) buffer
 */
export function generateExcelTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template with sample rows
  const wsTemplate = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_DATA);
  wsTemplate['!cols'] = [
    { wch: 45 }, // question_title
    { wch: 18 }, // category
    { wch: 12 }, // difficulty
    { wch: 15 }, // question_type
    { wch: 30 }, // option_a
    { wch: 30 }, // option_b
    { wch: 30 }, // option_c
    { wch: 30 }, // option_d
    { wch: 15 }, // correct_option
    { wch: 40 }, // answer
    { wch: 45 }, // explanation
    { wch: 35 }, // pro_tips
    { wch: 35 }, // common_pitfalls
    { wch: 25 }, // technology_tags
    { wch: 25 }, // company_tags
    { wch: 15 }, // minimum_plan
    { wch: 10 }, // status
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, "Questions Template");

  // Sheet 2: Guidelines & Schema instructions
  const wsInstructions = XLSX.utils.json_to_sheet(INSTRUCTIONS_DATA);
  wsInstructions['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 45 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions & Rules");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Generates CSV template string
 */
export function generateCsvTemplate(): string {
  const headers = [
    "question_title",
    "category",
    "difficulty",
    "question_type",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "explanation",
    "answer",
    "pro_tips",
    "common_pitfalls",
    "technology_tags",
    "company_tags",
    "minimum_plan",
    "status"
  ];

  const rows = SAMPLE_TEMPLATE_DATA.map(row => [
    `"${row.question_title.replace(/"/g, '""')}"`,
    `"${row.category}"`,
    `"${row.difficulty}"`,
    `"${row.question_type}"`,
    `"${(row.option_a || '').replace(/"/g, '""')}"`,
    `"${(row.option_b || '').replace(/"/g, '""')}"`,
    `"${(row.option_c || '').replace(/"/g, '""')}"`,
    `"${(row.option_d || '').replace(/"/g, '""')}"`,
    `"${row.correct_option}"`,
    `"${(row.explanation || '').replace(/"/g, '""')}"`,
    `"${row.answer.replace(/"/g, '""')}"`,
    `"${row.pro_tips.replace(/"/g, '""')}"`,
    `"${row.common_pitfalls.replace(/"/g, '""')}"`,
    `"${row.technology_tags}"`,
    `"${row.company_tags}"`,
    `"${row.minimum_plan}"`,
    `"${row.status}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
