import { RawJobRow, JobParseResult } from './jobTypes';

/**
 * Extracts key-value fields from a single text block
 */
function extractJobFieldsFromBlock(block: string, index: number): RawJobRow | null {
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const row: RawJobRow = {
    rowNumber: index + 1,
    rawText: block,
  };

  let currentKey = '';
  let currentValue = '';

  const saveCurrentField = () => {
    if (!currentKey) return;
    const k = currentKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const val = currentValue.trim();

    if (['company', 'company_name', 'organization', 'employer'].includes(k)) {
      row.company_name = val;
    } else if (['title', 'job_title', 'role', 'position', 'designation'].includes(k)) {
      row.title = val;
    } else if (['location', 'city', 'place'].includes(k)) {
      row.location = val;
    } else if (['work_mode', 'mode', 'workplace_type'].includes(k)) {
      row.work_mode = val;
    } else if (['experience', 'experience_level', 'exp'].includes(k)) {
      row.experience = val;
    } else if (['plan', 'minimum_plan', 'required_plan', 'tier'].includes(k)) {
      row.minimum_plan = val;
    } else if (['employment_type', 'job_type', 'type'].includes(k)) {
      row.employment_type = val;
    } else if (['salary', 'compensation', 'package', 'ctc', 'stipend', 'pay'].includes(k)) {
      row.salary = val;
    } else if (['apply_url', 'official_apply_url', 'application_url', 'apply_link', 'url', 'link'].includes(k)) {
      row.apply_url = val;
    } else if (['short_description', 'summary', 'overview', 'brief'].includes(k)) {
      row.short_description = val;
    } else if (['description', 'full_description', 'job_description', 'about_the_job'].includes(k)) {
      row.full_description = val;
    } else if (['skills', 'required_skills', 'technologies', 'tech_stack', 'requirements'].includes(k)) {
      row.required_skills = val;
    } else if (['responsibilities', 'role_responsibilities', 'duties', 'what_you_will_do'].includes(k)) {
      row.responsibilities = val;
    } else if (['category', 'domain', 'department'].includes(k)) {
      row.category = val;
    } else if (['status', 'is_active', 'active'].includes(k)) {
      row.status = val;
    }

    currentKey = '';
    currentValue = '';
  };

  // Pattern matching for "Key: Value" lines
  const keyValueRegex = /^(company(?:\s*name)?|job\s*title|title|role|position|location|work\s*mode|experience(?:\s*level)?|minimum\s*plan|plan|employment\s*type|job\s*type|salary|compensation|package|ctc|apply\s*url|official\s*apply\s*url|url|link|skills|required\s*skills|responsibilities|short\s*description|full\s*description|description|category|status)\s*[:=-]\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(keyValueRegex);
    if (match) {
      saveCurrentField();
      currentKey = match[1];
      currentValue = match[2] || '';
    } else if (currentKey) {
      // Continuation line for multi-line description or responsibilities
      currentValue += (currentValue ? '\n' : '') + line;
    }
  }
  saveCurrentField();

  // If standard labeled fields weren't found, try heuristic fallback for simple blocks:
  // Line 1: Title or Company - Title
  // Line 2: Company or Location
  if (!row.title && !row.company_name && lines.length >= 2) {
    const firstLine = lines[0].replace(/^(?:job\s*\d+[:.-]?|#+)\s*/i, '').trim();
    if (firstLine.includes(' at ') || firstLine.includes(' - ') || firstLine.includes(' | ')) {
      const parts = firstLine.split(/\s+(?:at|-|\|)\s+/);
      if (parts.length >= 2) {
        row.title = parts[0].trim();
        row.company_name = parts[1].trim();
      }
    }
  }

  // Look for standalone URLs in the block if apply_url not found
  if (!row.apply_url) {
    const urlMatch = block.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) {
      row.apply_url = urlMatch[0];
    }
  }

  if (row.company_name || row.title || row.apply_url) {
    return row;
  }

  return null;
}

/**
 * Extracts job posting blocks from raw text using pattern matching and delimiters
 */
export function parseRawJobTextBlocks(
  text: string,
  fileName: string,
  fileSizeBytes: number,
  fileType: string = 'txt'
): JobParseResult {
  const warnings: string[] = [];
  const clean = text.trim();

  if (!clean) {
    return {
      fileName,
      fileType,
      fileSizeBytes,
      totalRowsParsed: 0,
      rows: [],
      warnings: [],
      error: 'The uploaded text document is completely empty.',
    };
  }

  // Split into job blocks using common section delimiters
  let rawBlocks: string[] = [];

  if (/(?:^|\n)(?:job\s*\d+|#{1,3}\s+job|==+|--+)/i.test(clean)) {
    rawBlocks = clean.split(/(?:^|\n)(?=(?:job\s*\d+|#{1,3}\s+job|==+|--+))/i);
  } else if (clean.includes('\n\n\n')) {
    rawBlocks = clean.split(/\n\s*\n\s*\n+/);
  } else {
    // Split by double newlines or Company: labels
    rawBlocks = clean.split(/(?:^|\n\s*\n)(?=(?:company|job\s*title|title)\s*[:=-])/i);
    if (rawBlocks.length <= 1) {
      rawBlocks = clean.split(/\n\s*\n+/);
    }
  }

  const rows: RawJobRow[] = [];
  let blockIndex = 0;

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (trimmed.length < 15) continue; // Ignore tiny fragments

    const extracted = extractJobFieldsFromBlock(trimmed, blockIndex);
    if (extracted) {
      rows.push(extracted);
      blockIndex++;
    }
  }

  if (rows.length === 0) {
    warnings.push('Could not detect distinct job structures in the document.');
    return {
      fileName,
      fileType,
      fileSizeBytes,
      totalRowsParsed: 0,
      rows: [],
      warnings,
      error: 'No recognizable job postings found. Please format jobs with "Company:", "Job Title:", "Location:", and "Apply URL:".',
    };
  }

  return {
    fileName,
    fileType,
    fileSizeBytes,
    totalRowsParsed: rows.length,
    rows,
    warnings,
  };
}
