import * as XLSX from 'xlsx';

export const SAMPLE_TEMPLATE_DATA = [
  {
    question_title: "Explain the difference between let, const, and var in JavaScript.",
    category: "Technical",
    difficulty: "Easy",
    answer: "var is function-scoped and hoisted with undefined initialization. let and const are block-scoped and exist in the Temporal Dead Zone until initialized. const cannot be reassigned after declaration.",
    pro_tips: "Start by mentioning scope (block vs function), then hoisting behavior, and finally mutability.",
    common_pitfalls: "Do not say const objects are completely immutable; their properties can still be modified unless frozen with Object.freeze().",
    technology_tags: "JavaScript, Web Development, Frontend",
    company_tags: "TCS, Infosys, Wipro, Amazon",
    minimum_plan: "free",
    status: "Active"
  },
  {
    question_title: "What is an Index in SQL and how does a B-Tree index work?",
    category: "Technical",
    difficulty: "Medium",
    answer: "An index is a database data structure that improves the speed of data retrieval operations on a table at the cost of additional storage and slower writes. A B-Tree index maintains sorted key-pointer pairs in a self-balancing tree structure allowing O(log N) lookup, insertion, and deletion.",
    pro_tips: "Draw a simple balanced tree hierarchy or give an analogy like a book index.",
    common_pitfalls: "Do not forget to mention that excessive indexing degrades INSERT/UPDATE/DELETE performance.",
    technology_tags: "SQL, PostgreSQL, Database, Backend",
    company_tags: "Microsoft, Oracle, Cognizant",
    minimum_plan: "starter",
    status: "Active"
  },
  {
    question_title: "Tell me about a time you had to resolve a conflict within your team.",
    category: "HR & Behavioral",
    difficulty: "Medium",
    answer: "During our final semester capstone project, our team disagreed on whether to use SQL or NoSQL for our data layer. I organized an objective evaluation session comparing query performance, schema flexibility, and project deadlines. We reached a consensus to use PostgreSQL, which satisfied all requirements and delivered on schedule.",
    pro_tips: "Structure your response using the STAR method: Situation, Task, Action, Result.",
    common_pitfalls: "Never speak negatively about former teammates or place personal blame.",
    technology_tags: "Behavioral, Leadership, Communication",
    company_tags: "Accenture, Deloitte, Google",
    minimum_plan: "pro",
    status: "Active"
  },
  {
    question_title: "How does the virtual DOM work in React and how does reconciliation happen?",
    category: "Technical",
    difficulty: "Hard",
    answer: "The Virtual DOM is a lightweight in-memory representation of the real DOM. When component state changes, React creates a new VDOM tree and diffs it against the previous snapshot using a heuristic O(N) diffing algorithm. It then batches and applies the minimal set of required mutations to the real DOM.",
    pro_tips: "Mention keys in lists and how they help React track elements across renders efficiently.",
    common_pitfalls: "Do not say Virtual DOM is faster than real DOM in all scenarios; it is fast because it minimizes expensive layout reflows.",
    technology_tags: "React, Frontend, JavaScript",
    company_tags: "Meta, Uber, Flipkart",
    minimum_plan: "premium",
    status: "Active"
  }
];

export const INSTRUCTIONS_DATA = [
  { Column: "question_title", Required: "YES", Allowed_Values: "Any text (min 5 chars)", Description: "The interview question prompt or title" },
  { Column: "category", Required: "YES", Allowed_Values: "Technical, HR & Behavioral, Aptitude, System Design, or custom", Description: "The subject or domain of the question" },
  { Column: "difficulty", Required: "YES", Allowed_Values: "Easy, Medium, Hard", Description: "Difficulty level for students" },
  { Column: "answer", Required: "YES", Allowed_Values: "Any detailed answer", Description: "The comprehensive model answer" },
  { Column: "pro_tips", Required: "NO", Allowed_Values: "Helpful advice", Description: "Pro tips to help the candidate stand out" },
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
    { wch: 60 }, // answer
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
    { wch: 12 },
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
