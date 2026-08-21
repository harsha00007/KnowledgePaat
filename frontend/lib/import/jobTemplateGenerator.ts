import * as XLSX from 'xlsx';

export const SAMPLE_JOB_TEMPLATE_DATA = [
  {
    company_name: "Acme Technologies",
    job_title: "Junior Python Developer",
    location: "Bangalore, India",
    work_mode: "Hybrid",
    experience_level: "Fresher",
    minimum_plan: "free",
    employment_type: "Full-time",
    compensation: "₹4–6 LPA",
    official_apply_url: "https://careers.acme.example.com/jobs/py-dev-101",
    short_description: "Exciting entry-level opportunity to build scalable backend services with Python and FastAPI.",
    full_description: "We are seeking a proactive Junior Python Developer to join our backend engineering team. You will write clean, well-tested Python code, build RESTful APIs, interact with PostgreSQL databases, and collaborate with frontend developers in an agile environment.",
    required_skills: "Python, SQL, FastAPI, Git, REST APIs",
    responsibilities: "Build and maintain microservices; Write unit tests; Optimize SQL queries; Participate in daily standups and code reviews.",
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
    official_apply_url: "https://cloudscale.example.com/careers/frontend-react",
    short_description: "Build responsive modern web applications using Next.js, React 19, and TypeScript.",
    full_description: "CloudScale Systems is looking for a passionate Frontend Engineer with hands-on experience in React, TypeScript, and modern CSS frameworks. You will translate UI/UX designs into responsive web interfaces with smooth animations and robust state management.",
    required_skills: "React, TypeScript, Next.js, Tailwind CSS, Redux/Zustand",
    responsibilities: "Develop reusable UI components; Integrate REST and GraphQL endpoints; Ensure cross-browser and mobile responsiveness; Monitor client-side performance.",
    category: "Software Development",
    status: "Active"
  },
  {
    company_name: "QuantData Analytics",
    job_title: "Associate Data Analyst",
    location: "Hyderabad, India",
    work_mode: "On-site",
    experience_level: "Fresher",
    minimum_plan: "pro",
    employment_type: "Full-time",
    compensation: "₹5–7 LPA",
    official_apply_url: "https://quantdata.example.com/jobs/data-analyst-hyd",
    short_description: "Transform complex business datasets into actionable insights, dashboards, and reports.",
    full_description: "Join our Business Intelligence team to analyze customer behavior and operational metrics. You will extract data using SQL, perform statistical analysis with Python/Pandas, and create automated Power BI dashboards for leadership teams.",
    required_skills: "SQL, Python, Pandas, Power BI, Advanced Excel, Statistics",
    responsibilities: "Query relational databases; Clean and validate raw datasets; Build interactive KPI dashboards; Present weekly insight summaries to department heads.",
    category: "Data & Analytics",
    status: "Active"
  },
  {
    company_name: "PixelCraft Studios",
    job_title: "UI/UX Design Intern",
    location: "Mumbai, India",
    work_mode: "Hybrid",
    experience_level: "Fresher",
    minimum_plan: "free",
    employment_type: "Internship",
    compensation: "₹20,000/month",
    official_apply_url: "https://pixelcraft.example.com/internships/ui-ux",
    short_description: "3-month paid internship with pre-placement offer for exceptional UI/UX designers.",
    full_description: "PixelCraft is seeking a creative UI/UX Intern to assist in crafting intuitive product flows and interactive design systems in Figma. You will conduct user interviews, sketch wireframes, and create high-fidelity prototypes.",
    required_skills: "Figma, Wireframing, UI Prototyping, Design Systems, User Research",
    responsibilities: "Create user journey maps and wireframes; Design high-fidelity UI components; Conduct usability tests with beta testers; Prepare design asset handoffs for engineering.",
    category: "Design & UI/UX",
    status: "Active"
  }
];

export const JOB_INSTRUCTIONS_DATA = [
  { Column: "company_name", Required: "YES", Allowed_Values: "Any text (min 2 chars)", Description: "Employer or hiring company name (e.g. Acme Technologies)" },
  { Column: "job_title", Required: "YES", Allowed_Values: "Any text (min 3 chars)", Description: "Role title (e.g. Junior Python Developer, Data Analyst)" },
  { Column: "location", Required: "YES", Allowed_Values: "City, Country, or 'Remote'", Description: "Work location (e.g. Bangalore, India or Remote)" },
  { Column: "work_mode", Required: "NO", Allowed_Values: "Remote, Hybrid, On-site", Description: "Workplace arrangement (default: Remote)" },
  { Column: "experience_level", Required: "NO", Allowed_Values: "Fresher, 0-1 Years, 1-3 Years, 3+ Years", Description: "Required experience level (default: Fresher)" },
  { Column: "minimum_plan", Required: "NO", Allowed_Values: "free, starter, pro, premium", Description: "Subscription tier required to view this job (default: free)" },
  { Column: "employment_type", Required: "NO", Allowed_Values: "Full-time, Part-time, Internship, Contract", Description: "Employment schedule type (default: Full-time)" },
  { Column: "compensation", Required: "NO", Allowed_Values: "Text (e.g. ₹4–6 LPA, ₹25,000/mo)", Description: "Salary package, stipend, or compensation range" },
  { Column: "official_apply_url", Required: "YES", Allowed_Values: "Web URL starting with http:// or https://", Description: "Direct link to company application page or portal" },
  { Column: "short_description", Required: "NO", Allowed_Values: "1-2 sentences summary", Description: "Brief role summary displayed on listing cards" },
  { Column: "full_description", Required: "NO", Allowed_Values: "Detailed job description", Description: "Complete role overview and expectations" },
  { Column: "required_skills", Required: "NO", Allowed_Values: "Comma-separated list (e.g. Python, SQL, React)", Description: "Key technical and domain skills required" },
  { Column: "responsibilities", Required: "NO", Allowed_Values: "Semicolon or comma-separated tasks", Description: "Key day-to-day duties and deliverables" },
  { Column: "category", Required: "NO", Allowed_Values: "Software Development, Data & Analytics, Design, etc.", Description: "Job department or functional domain (default: Software Development)" },
  { Column: "status", Required: "NO", Allowed_Values: "Active, Inactive", Description: "Publishing status (default: Active)" },
];

/**
 * Generates an Excel template (.xlsx) buffer for jobs
 */
export function generateJobExcelTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template with sample rows
  const wsTemplate = XLSX.utils.json_to_sheet(SAMPLE_JOB_TEMPLATE_DATA);
  wsTemplate['!cols'] = [
    { wch: 25 }, // company_name
    { wch: 30 }, // job_title
    { wch: 20 }, // location
    { wch: 14 }, // work_mode
    { wch: 18 }, // experience_level
    { wch: 15 }, // minimum_plan
    { wch: 18 }, // employment_type
    { wch: 18 }, // compensation
    { wch: 45 }, // official_apply_url
    { wch: 40 }, // short_description
    { wch: 60 }, // full_description
    { wch: 35 }, // required_skills
    { wch: 45 }, // responsibilities
    { wch: 22 }, // category
    { wch: 12 }, // status
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, "Jobs Template");

  // Sheet 2: Guidelines & Schema instructions
  const wsInstructions = XLSX.utils.json_to_sheet(JOB_INSTRUCTIONS_DATA);
  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 40 },
    { wch: 55 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions & Rules");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Generates CSV template string for jobs
 */
export function generateJobCsvTemplate(): string {
  const headers = [
    "company_name",
    "job_title",
    "location",
    "work_mode",
    "experience_level",
    "minimum_plan",
    "employment_type",
    "compensation",
    "official_apply_url",
    "short_description",
    "full_description",
    "required_skills",
    "responsibilities",
    "category",
    "status"
  ];

  const rows = SAMPLE_JOB_TEMPLATE_DATA.map(row => [
    `"${row.company_name.replace(/"/g, '""')}"`,
    `"${row.job_title.replace(/"/g, '""')}"`,
    `"${row.location.replace(/"/g, '""')}"`,
    `"${row.work_mode}"`,
    `"${row.experience_level}"`,
    `"${row.minimum_plan}"`,
    `"${row.employment_type}"`,
    `"${row.compensation}"`,
    `"${row.official_apply_url}"`,
    `"${row.short_description.replace(/"/g, '""')}"`,
    `"${row.full_description.replace(/"/g, '""')}"`,
    `"${row.required_skills.replace(/"/g, '""')}"`,
    `"${row.responsibilities.replace(/"/g, '""')}"`,
    `"${row.category}"`,
    `"${row.status}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
