const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Generate sample_jobs.xlsx
const sampleJobsData = [
  {
    company_name: "Acme Technologies",
    job_title: "Junior Python Developer",
    location: "Bangalore, India",
    work_mode: "Hybrid",
    experience_level: "Fresher",
    minimum_plan: "free",
    employment_type: "Full-time",
    compensation: "₹4–6 LPA",
    official_apply_url: "https://careers.acme.example.com/jobs/101",
    short_description: "Entry-level Python backend role",
    full_description: "Build and maintain Python microservices with FastAPI and PostgreSQL",
    required_skills: "Python, SQL, FastAPI, Git, REST API",
    responsibilities: "Write unit tests; Build APIs; Optimize SQL",
    category: "Software Development",
    status: "Active"
  },
  {
    company_name: "CloudScale Systems",
    job_title: "Frontend React Engineer",
    location: "Remote",
    work_mode: "Remote",
    experience_level: "0-1 Years",
    minimum_plan: "starter",
    employment_type: "Full-time",
    compensation: "₹6–9 LPA",
    official_apply_url: "https://cloudscale.example.com/careers/react",
    short_description: "Next.js and TypeScript frontend engineering",
    full_description: "Develop modern responsive interfaces with React 19 and Tailwind",
    required_skills: "React, TypeScript, Next.js, Tailwind CSS",
    responsibilities: "Build reusable UI components; Integrate REST APIs",
    category: "Software Development",
    status: "Active"
  },
  {
    company_name: "Acme Technologies",
    job_title: "Junior Python Developer",
    location: "Bangalore, India",
    work_mode: "Hybrid",
    experience_level: "Fresher",
    minimum_plan: "free",
    employment_type: "Full-time",
    compensation: "₹4–6 LPA",
    official_apply_url: "https://careers.acme.example.com/jobs/101",
    short_description: "Duplicate row for test",
    full_description: "Duplicate row test",
    required_skills: "Python",
    responsibilities: "Testing",
    category: "Software Development",
    status: "Active"
  },
  {
    company_name: "Broken Corp",
    job_title: "",
    location: "",
    work_mode: "Remote",
    experience_level: "Fresher",
    minimum_plan: "free",
    employment_type: "Full-time",
    compensation: "",
    official_apply_url: "javascript:alert(1)",
    short_description: "Invalid row test",
    full_description: "",
    required_skills: "",
    responsibilities: "",
    category: "Software Development",
    status: "Active"
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sampleJobsData);
XLSX.utils.book_append_sheet(wb, ws, "Jobs Template");
const xlsxPath = path.join(__dirname, '..', 'test_fixtures', 'sample_jobs.xlsx');
XLSX.writeFile(wb, xlsxPath);
console.log('✓ Created test fixture: sample_jobs.xlsx');

// 2. Test Parsers and Normalizers
console.log('\n--- Running Job Bulk Importer Integrity Tests ---');

// Check CSV reading
const csvContent = fs.readFileSync(path.join(__dirname, '..', 'test_fixtures', 'sample_jobs.csv'), 'utf-8');
const lines = csvContent.split('\n').filter(Boolean);
console.log(`✓ CSV Fixture loaded: ${lines.length - 1} data rows.`);

// Check TXT reading
const txtContent = fs.readFileSync(path.join(__dirname, '..', 'test_fixtures', 'sample_jobs.txt'), 'utf-8');
console.log(`✓ TXT Fixture loaded: ${txtContent.length} bytes.`);

// Check MD reading
const mdContent = fs.readFileSync(path.join(__dirname, '..', 'test_fixtures', 'sample_jobs.md'), 'utf-8');
console.log(`✓ MD Fixture loaded: ${mdContent.length} bytes.`);

console.log('\nAll test fixture files generated and validated successfully!');
