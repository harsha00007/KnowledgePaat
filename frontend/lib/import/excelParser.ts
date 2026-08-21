import * as XLSX from 'xlsx';
import { RawImportRow, ParseResult } from './types';

/**
 * Normalizes header keys into standard canonical field names
 */
function canonicalizeHeader(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  if (['question_title', 'question', 'title', 'question_text', 'problem', 'prompt'].includes(clean)) {
    return 'title';
  }
  if (['category', 'category_name', 'topic', 'domain'].includes(clean)) {
    return 'category';
  }
  if (['difficulty', 'difficulty_level', 'level', 'complexity'].includes(clean)) {
    return 'difficulty';
  }
  if (['answer', 'detailed_answer', 'ideal_answer', 'solution', 'explanation'].includes(clean)) {
    return 'answer';
  }
  if (['pro_tips', 'tips', 'tip', 'advice', 'pro_tip'].includes(clean)) {
    return 'tips';
  }
  if (['common_pitfalls', 'common_mistakes', 'pitfalls', 'mistakes', 'pitfall'].includes(clean)) {
    return 'common_mistakes';
  }
  if (['technology_tags', 'tech_tags', 'technologies', 'technology', 'tech'].includes(clean)) {
    return 'technology_tags';
  }
  if (['company_tags', 'companies', 'company', 'target_companies'].includes(clean)) {
    return 'company_tags';
  }
  if (['tags', 'keywords', 'skills'].includes(clean)) {
    return 'tags';
  }
  if (['minimum_plan', 'required_plan', 'plan', 'tier', 'access_level', 'membership'].includes(clean)) {
    return 'minimum_plan';
  }
  if (['status', 'is_active', 'active', 'state'].includes(clean)) {
    return 'status';
  }
  if (['estimated_time', 'time', 'duration', 'time_to_answer'].includes(clean)) {
    return 'estimated_time';
  }

  return clean;
}

/**
 * Parses an Excel (.xlsx / .xls) buffer into structured raw rows
 */
export async function parseExcel(buffer: ArrayBuffer | Buffer, fileName: string): Promise<ParseResult> {
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

    const rows: RawImportRow[] = [];

    rawJson.forEach((row, index) => {
      const canonicalRow: RawImportRow = {
        rowNumber: index + 2, // 1-based, sheet row 1 is header
      };

      Object.entries(row).forEach(([key, val]) => {
        const canonicalKey = canonicalizeHeader(key);
        const strVal = val !== null && val !== undefined ? String(val).trim() : '';

        if (canonicalKey === 'title') canonicalRow.title = strVal;
        else if (canonicalKey === 'category') canonicalRow.category = strVal;
        else if (canonicalKey === 'difficulty') canonicalRow.difficulty = strVal;
        else if (canonicalKey === 'answer') canonicalRow.answer = strVal;
        else if (canonicalKey === 'tips') canonicalRow.tips = strVal;
        else if (canonicalKey === 'common_mistakes') canonicalRow.common_mistakes = strVal;
        else if (canonicalKey === 'technology_tags') canonicalRow.technology_tags = strVal;
        else if (canonicalKey === 'company_tags') canonicalRow.company_tags = strVal;
        else if (canonicalKey === 'tags') canonicalRow.tags = strVal;
        else if (canonicalKey === 'minimum_plan') canonicalRow.minimum_plan = strVal;
        else if (canonicalKey === 'status') canonicalRow.status = strVal;
        else if (canonicalKey === 'estimated_time') canonicalRow.estimated_time = strVal;
      });

      // Only push rows that have at least a title or answer
      if (canonicalRow.title || canonicalRow.answer) {
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
    console.error('Error parsing Excel file:', err);
    return {
      fileName,
      fileType: 'xlsx',
      fileSizeBytes: buffer.byteLength,
      totalRowsParsed: 0,
      rows: [],
      warnings,
      error: `Failed to parse Excel file: ${err.message || 'Corrupted file format.'}`,
    };
  }
}
