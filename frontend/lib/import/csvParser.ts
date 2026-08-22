import Papa from 'papaparse';
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
  if (['question_type', 'type', 'format'].includes(clean)) {
    return 'question_type';
  }
  if (['answer_type', 'answertype', 'response_type', 'length_type'].includes(clean)) {
    return 'answer_type';
  }
  if (['option_a', 'optiona', 'choice_a', 'choicea', 'option_1'].includes(clean)) {
    return 'option_a';
  }
  if (['option_b', 'optionb', 'choice_b', 'choiceb', 'option_2'].includes(clean)) {
    return 'option_b';
  }
  if (['option_c', 'optionc', 'choice_c', 'choicec', 'option_3'].includes(clean)) {
    return 'option_c';
  }
  if (['option_d', 'optiond', 'choice_d', 'choiced', 'option_4'].includes(clean)) {
    return 'option_d';
  }
  if (['correct_option', 'correct_answer', 'correct_choice', 'correct', 'correctoption', 'answer_key'].includes(clean)) {
    return 'correct_option';
  }
  if (['explanation', 'rationale', 'explanation_text', 'solution_explanation'].includes(clean)) {
    return 'explanation';
  }
  if (['answer', 'detailed_answer', 'ideal_answer', 'solution'].includes(clean)) {
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
  if (['estimated_time', 'time', 'duration'].includes(clean)) {
    return 'estimated_time';
  }

  return clean;
}

/**
 * Parses a CSV string or buffer into structured raw rows
 */
export async function parseCSV(content: string, fileName: string, fileSizeBytes: number): Promise<ParseResult> {
  const warnings: string[] = [];

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          results.errors.forEach(e => {
            warnings.push(`Line ${e.row}: ${e.message}`);
          });
        }

        const rows: RawImportRow[] = [];

        results.data.forEach((row, index) => {
          const canonicalRow: RawImportRow = {
            rowNumber: index + 2, // 1-based, line 1 is header
          };

          Object.entries(row).forEach(([key, val]) => {
            const canonicalKey = canonicalizeHeader(key);
            const strVal = val !== null && val !== undefined ? String(val).trim() : '';

            if (canonicalKey === 'title') canonicalRow.title = strVal;
            else if (canonicalKey === 'category') canonicalRow.category = strVal;
            else if (canonicalKey === 'difficulty') canonicalRow.difficulty = strVal;
            else if (canonicalKey === 'question_type') canonicalRow.question_type = strVal.toLowerCase() === 'descriptive' ? 'descriptive' : 'mcq';
            else if (canonicalKey === 'option_a') canonicalRow.option_a = strVal;
            else if (canonicalKey === 'option_b') canonicalRow.option_b = strVal;
            else if (canonicalKey === 'option_c') canonicalRow.option_c = strVal;
            else if (canonicalKey === 'option_d') canonicalRow.option_d = strVal;
            else if (canonicalKey === 'correct_option') canonicalRow.correct_option = strVal;
            else if (canonicalKey === 'explanation') canonicalRow.explanation = strVal;
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

          if (canonicalRow.title || canonicalRow.answer || canonicalRow.option_a) {
            rows.push(canonicalRow);
          }
        });

        resolve({
          fileName,
          fileType: 'csv',
          fileSizeBytes,
          totalRowsParsed: rows.length,
          rows,
          warnings,
        });
      },
      error: (error: Error) => {
        resolve({
          fileName,
          fileType: 'csv',
          fileSizeBytes,
          totalRowsParsed: 0,
          rows: [],
          warnings,
          error: `CSV Parsing failed: ${error.message}`,
        });
      }
    });
  });
}
