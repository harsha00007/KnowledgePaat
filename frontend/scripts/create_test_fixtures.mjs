import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const fixturesDir = path.resolve('test_fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. CSV Sample
const csvData = `question_title,category,difficulty,answer,pro_tips,common_pitfalls,technology_tags,company_tags,minimum_plan,status
"What is a Promise in JavaScript?","Technical","Easy","A Promise in JavaScript is an object representing the eventual completion or failure of an asynchronous operation and its resulting value. It can be in one of three states: pending, fulfilled, or rejected.","Explain the three states clearly.","Do not forget to handle rejection with .catch() or try/catch.","JavaScript, Async, ES6","Amazon, Infosys","free","Active"
"Explain the ACID properties of a Database Transaction.","Technical","Medium","ACID stands for Atomicity (all or nothing), Consistency (preserves database invariants), Isolation (concurrent transactions do not interfere), and Durability (committed data survives system failures).","Give real-world bank transfer example.","Confusing isolation levels like Read Committed with Serializability.","SQL, Database, Backend","Oracle, Microsoft","starter","Active"
"What is a Promise in JavaScript?","Technical","Easy","Duplicate question test row","","","","","free","Active"
"Tell me about a time you worked under high pressure.","HR & Behavioral","Medium","In our college hackathon, we had only 24 hours to deliver an AI-powered resume analyzer. I prioritized the core MVP features, delegated UI and backend tasks, and we won 2nd place.","Use STAR method.","Avoid saying you never feel pressure.","Behavioral, Teamwork","Google, Accenture","pro","Active"
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_questions.csv'), csvData, 'utf-8');
console.log('Created sample_questions.csv');

// 2. XLSX Sample
const xlsxRows = [
  {
    question_title: "What is the difference between TCP and UDP?",
    category: "Technical",
    difficulty: "Easy",
    answer: "TCP is connection-oriented, reliable, provides ordered delivery and error checking via handshakes. UDP is connectionless, lightweight, and faster without delivery guarantees, ideal for live streaming and gaming.",
    pro_tips: "Contrast reliability vs speed.",
    common_pitfalls: "Not mentioning use cases like HTTP vs VoIP.",
    technology_tags: "Networking, Protocols",
    company_tags: "Cisco, TCS",
    minimum_plan: "free",
    status: "Active"
  },
  {
    question_title: "How do you optimize slow SQL queries in PostgreSQL?",
    category: "Technical",
    difficulty: "Hard",
    answer: "Use EXPLAIN ANALYZE to identify sequential scans and slow join nodes, add targeted composite or B-tree indexes, avoid SELECT *, normalize/denormalize appropriately, and tune work_mem or connection pooling.",
    pro_tips: "Mention execution plans and index usage.",
    common_pitfalls: "Over-indexing tables which slows down write operations.",
    technology_tags: "PostgreSQL, SQL, Performance",
    company_tags: "Uber, Stripe",
    minimum_plan: "premium",
    status: "Active"
  },
  {
    question_title: "Describe a situation where you had a disagreement with your project lead.",
    category: "HR & Behavioral",
    difficulty: "Medium",
    answer: "My lead preferred deploying on bare-metal servers, while I suggested containerizing with Docker for portability. I created a benchmark showing 40% faster deploy cycles, and we agreed to pilot Docker for non-production environments first.",
    pro_tips: "Focus on data-driven discussion rather than ego.",
    common_pitfalls: "Blaming management or portraying yourself as always right.",
    technology_tags: "Behavioral, Leadership",
    company_tags: "Amazon, Deloitte",
    minimum_plan: "pro",
    status: "Active"
  }
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(xlsxRows);
XLSX.utils.book_append_sheet(wb, ws, "Questions");
XLSX.writeFile(wb, path.join(fixturesDir, 'sample_questions.xlsx'));
console.log('Created sample_questions.xlsx');

// 3. TXT Sample
const txtData = `Question 1: What is Dependency Injection in software architecture?
Category: Technical
Difficulty: Medium
Answer: Dependency Injection is a design pattern where an object receives its dependencies from an external source rather than creating them internally, increasing testability, decoupling, and maintainability.
Pro Tips: Mention inversion of control (IoC) containers.
Common Pitfalls: Over-engineering simple scripts with complex DI frameworks.
Technology Tags: Architecture, Design Patterns, OOP
Company Tags: Microsoft, Thoughtworks
Minimum Plan: starter
Status: Active

Question 2: What is your greatest professional achievement?
Category: HR & Behavioral
Difficulty: Easy
Answer: Leading a 4-person team in developing an automated attendance management system using OpenCV and Python, which reduced administrative logging time by 80% for our college department.
Pro Tips: Quantify results with metrics and percentage improvements.
Common Pitfalls: Being overly modest or taking sole credit for team efforts.
Technology Tags: Leadership, Communication
Company Tags: Infosys, Wipro
Minimum Plan: free
Status: Active
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_questions.txt'), txtData, 'utf-8');
console.log('Created sample_questions.txt');

// 4. Markdown Sample
const mdData = `## Question 1: Explain the CAP Theorem in Distributed Systems
- Category: Technical
- Difficulty: Hard
- Answer: The CAP theorem states that a distributed data store can only provide two of three guarantees simultaneously: Consistency (every read receives the latest write), Availability (every non-failing node returns a response), and Partition Tolerance (the system continues to operate despite arbitrary network partitions).
- Pro Tips: Emphasize that network partitions (P) are unavoidable in distributed systems, so systems must choose between CP or AP.
- Common Pitfalls: Assuming a system can choose CA in a real distributed network.
- Technology Tags: Distributed Systems, Architecture, Database
- Company Tags: Google, Meta, Netflix
- Minimum Plan: premium
- Status: Active

## Question 2: Why do you want to join our company?
- Category: HR & Behavioral
- Difficulty: Easy
- Answer: I have closely followed your innovative work in scalable cloud infrastructure. My background in full-stack web development and database optimization aligns directly with your platform team goals, and I am excited to contribute to high-impact products.
- Pro Tips: Research recent company news, engineering blogs, and core values.
- Common Pitfalls: Giving a generic answer that could apply to any company.
- Technology Tags: Culture, Motivation
- Company Tags: TCS, Cognizant
- Minimum Plan: free
- Status: Active
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_questions.md'), mdData, 'utf-8');
console.log('Created sample_questions.md');
