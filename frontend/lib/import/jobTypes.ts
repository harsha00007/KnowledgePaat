export interface RawJobRow {
  rowNumber: number;
  company_name?: string;
  job_title?: string;
  title?: string;
  location?: string;
  work_mode?: string;
  experience?: string;
  experience_level?: string;
  minimum_plan?: string;
  employment_type?: string;
  salary?: string;
  compensation?: string;
  salary_range?: string;
  apply_url?: string;
  official_apply_url?: string;
  short_description?: string;
  full_description?: string;
  description?: string;
  required_skills?: string | string[];
  skills?: string | string[];
  responsibilities?: string | string[];
  category?: string;
  status?: string;
  company_logo_url?: string;
  rawText?: string;
}

export type ValidWorkMode = 'Remote' | 'Hybrid' | 'On-site';
export type ValidExperienceLevel = 'Fresher' | '0-1 Years' | '1-3 Years' | '3+ Years';
export type ValidEmploymentType = 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
export type ValidMinimumPlan = 'free' | 'starter' | 'pro' | 'premium';
export type ValidJobStatus = 'Active' | 'Inactive';

export interface ValidatedJobRow {
  rowNumber: number;
  company_name: string;
  title: string;
  location: string;
  work_mode: ValidWorkMode;
  experience: string;
  minimum_plan: ValidMinimumPlan;
  access_type: 'Free' | 'Premium';
  employment_type: ValidEmploymentType;
  salary: string | null;
  apply_url: string;
  short_description: string;
  full_description: string;
  required_skills: string[];
  responsibilities: string[];
  category: string;
  status: ValidJobStatus;
  company_logo_url?: string | null;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  duplicateSignature?: string;
  errors: string[];
  warnings: string[];
}

export interface JobImportDefaults {
  defaultWorkMode: ValidWorkMode;
  defaultExperience: string;
  defaultMinimumPlan: ValidMinimumPlan;
  defaultEmploymentType: ValidEmploymentType;
  defaultStatus: ValidJobStatus;
  defaultCategory: string;
}

export interface JobParseResult {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  totalRowsParsed: number;
  rows: RawJobRow[];
  warnings: string[];
  error?: string;
}

export interface JobValidationSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  validatedRows: ValidatedJobRow[];
}

export interface JobBatchImportResult {
  batchId: string;
  totalProcessed: number;
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; title: string; company: string; error: string }>;
}
