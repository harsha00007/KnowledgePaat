import * as XLSX from 'xlsx';
import { RawJobRow, JobParseResult } from './jobTypes';

/**
 * Normalizes header keys into standard canonical field names for jobs
 */
function canonicalizeJobHeader(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
  
  if (['company_name', 'company', 'organization', 'employer', 'hiring_company'].includes(clean)) {
    return 'company_name';
  }
  if (['job_title', 'title', 'role', 'position', 'designation', 'job_name', 'job_role'].includes(clean)) {
    return 'title';
  }
  if (['location', 'city', 'job_location', 'work_location', 'place'].includes(clean)) {
    return 'location';
  }
  if (['work_mode', 'workplace_type', 'mode', 'work_type', 'location_type'].includes(clean)) {
    return 'work_mode';
  }
  if (['experience', 'experience_level', 'exp', 'years_of_experience', 'required_experience'].includes(clean)) {
    return 'experience';
  }
  if (['minimum_plan', 'required_plan', 'plan', 'tier', 'access_level', 'membership'].includes(clean)) {
    return 'minimum_plan';
  }
  if (['employment_type', 'job_type', 'contract_type', 'schedule', 'type'].includes(clean)) {
    return 'employment_type';
  }
  if (['salary', 'compensation', 'salary_range', 'package', 'ctc', 'pay', 'stipend'].includes(clean)) {
    return 'salary';
  }
  if (['apply_url', 'official_apply_url', 'application_url', 'apply_link', 'link', 'url'].includes(clean)) {
    return 'apply_url';
  }
  if (['short_description', 'summary', 'overview', 'brief', 'tagline'].includes(clean)) {
    return 'short_description';
  }
  if (['full_description', 'description', 'job_description', 'details', 'about_the_job'].includes(clean)) {
    return 'full_description';
  }
  if (['required_skills', 'skills', 'technologies', 'tech_stack', 'key_skills', 'requirements'].includes(clean)) {
    return 'required_skills';
  }
  if (['responsibilities', 'role_responsibilities', 'duties', 'what_you_will_do', 'key_responsibilities'].includes(clean)) {
    return 'responsibilities';
  }
  if (['category', 'domain', 'industry', 'department', 'job_category'].includes(clean)) {
    return 'category';
  }
  if (['status', 'is_active', 'active', 'state', 'publishing_status'].includes(clean)) {
    return 'status';
  }
  if (['company_logo_url', 'logo_url', 'logo', 'company_logo'].includes(clean)) {
    return 'company_logo_url';
  }

  return clean;
}

/**
 * Parses an Excel (.xlsx / .xls) buffer into structured raw job rows
 */
export async function parseJobExcel(buffer: ArrayBuffer | Buffer, fileName: string): Promise<JobParseResult> {
  const warnings: string[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        fileName,
        fileType: 'xlsx',
        fileSizeBytes: buffer.byteLength,
        totalRowsParsed: 0,
        rows: [],
        warnings: ['Workbook contains no sheets.'],
        error: 'The uploaded Excel file has no readable sheets.',
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (!rawJson || rawJson.length === 0) {
      return {
        fileName,
        fileType: 'xlsx',
        fileSizeBytes: buffer.byteLength,
        totalRowsParsed: 0,
        rows: [],
        warnings: ['The first sheet is empty.'],
        error: 'The uploaded Excel sheet contains no rows of data.',
      };
    }

    const rows: RawJobRow[] = [];

    rawJson.forEach((row, index) => {
      const canonicalRow: RawJobRow = {
        rowNumber: index + 2, // 1-based, sheet row 1 is header
      };

      Object.entries(row).forEach(([key, val]) => {
        const canonicalKey = canonicalizeJobHeader(key);
        const strVal = val !== null && val !== undefined ? String(val).trim() : '';

        if (canonicalKey === 'company_name') canonicalRow.company_name = strVal;
        else if (canonicalKey === 'title') canonicalRow.title = strVal;
        else if (canonicalKey === 'location') canonicalRow.location = strVal;
        else if (canonicalKey === 'work_mode') canonicalRow.work_mode = strVal;
        else if (canonicalKey === 'experience') canonicalRow.experience = strVal;
        else if (canonicalKey === 'minimum_plan') canonicalRow.minimum_plan = strVal;
        else if (canonicalKey === 'employment_type') canonicalRow.employment_type = strVal;
        else if (canonicalKey === 'salary') canonicalRow.salary = strVal;
        else if (canonicalKey === 'apply_url') canonicalRow.apply_url = strVal;
        else if (canonicalKey === 'short_description') canonicalRow.short_description = strVal;
        else if (canonicalKey === 'full_description') canonicalRow.full_description = strVal;
        else if (canonicalKey === 'required_skills') canonicalRow.required_skills = strVal;
        else if (canonicalKey === 'responsibilities') canonicalRow.responsibilities = strVal;
        else if (canonicalKey === 'category') canonicalRow.category = strVal;
        else if (canonicalKey === 'status') canonicalRow.status = strVal;
        else if (canonicalKey === 'company_logo_url') canonicalRow.company_logo_url = strVal;
      });

      // Only push rows that have at least a company name, title, or apply url
      if (canonicalRow.company_name || canonicalRow.title || canonicalRow.apply_url) {
        rows.push(canonicalRow);
      }
    });

    return {
      fileName,
      fileType: 'xlsx',
      fileSizeBytes: buffer.byteLength,
      totalRowsParsed: rows.length,
      rows,
      warnings,
    };
  } catch (err: any) {
    console.error('Error parsing Job Excel file:', err);
    return {
      fileName,
      fileType: 'xlsx',
      fileSizeBytes: buffer.byteLength,
      totalRowsParsed: 0,
      rows: [],
      warnings: [],
      error: `Failed to parse Excel file: ${err.message || 'Corrupted file format.'}`,
    };
  }
}
