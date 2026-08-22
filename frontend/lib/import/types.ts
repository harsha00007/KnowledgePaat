export interface RawImportRow {
  rowNumber: number;
  title?: string;
  category?: string;
  difficulty?: string;
  question_type?: 'normal' | 'mcq' | 'descriptive';
  answer_type?: 'short' | 'long';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  explanation?: string;
  answer?: string;
  tips?: string;
  common_mistakes?: string;
  technology_tags?: string | string[];
  company_tags?: string | string[];
  tags?: string | string[];
  minimum_plan?: string;
  status?: string;
  estimated_time?: string;
  rawText?: string;
}

export interface ValidatedQuestionRow {
  rowNumber: number;
  title: string;
  categoryName: string;
  categoryId?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_type: 'normal' | 'mcq' | 'descriptive';
  answer_type?: 'short' | 'long';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  answer: string;
  tips: string | null;
  common_mistakes: string | null;
  technology_tags: string[];
  company_tags: string[];
  tags: string[];
  minimum_plan: 'free' | 'starter' | 'pro' | 'premium';
  access_type: 'Free' | 'Premium';
  status: 'Active' | 'Inactive';
  estimated_time: string;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  errors: string[];
  warnings: string[];
}

export interface ImportDefaults {
  defaultCategoryId?: string;
  defaultCategoryName?: string;
  defaultDifficulty: 'Easy' | 'Medium' | 'Hard';
  defaultMinimumPlan: 'free' | 'starter' | 'pro' | 'premium';
  defaultStatus: 'Active' | 'Inactive';
  defaultEstimatedTime?: string;
}

export interface ParseResult {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  totalRowsParsed: number;
  rows: RawImportRow[];
  warnings: string[];
  error?: string;
}

export interface ValidationSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  unmappedCategories: string[];
  validatedRows: ValidatedQuestionRow[];
}

export interface BatchImportResult {
  batchId: string;
  totalProcessed: number;
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; title: string; error: string }>;
}
