import { RawImportRow, ParseResult } from './types';

/**
 * Extracts question-answer blocks from raw text using regex pattern matching
 */
export function parseRawTextBlocks(text: string, fileName: string, fileSizeBytes: number, fileType: string = 'txt'): ParseResult {
  const warnings: string[] = [];
  const rows: RawImportRow[] = [];

  if (!text || text.trim().length === 0) {
    return {
      fileName,
      fileType,
      fileSizeBytes,
      totalRowsParsed: 0,
      rows: [],
      warnings: ['File contains no readable text.'],
      error: 'The uploaded file is empty.',
    };
  }

  // Normalize line endings
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strategy 1: Look for explicit Question / Q delimiters:
  // e.g. "Question 1:", "Q1.", "Q:", "### Question", "## Q1", "1. What is..."
  const questionDelimiterRegex = /(?:^|\n)(?:#{1,4}\s*)?(?:(?:Question|Q)\s*(?:#|\d+)?[:.\-)]|\d+\.\s+)(?=\s*[A-Z0-9"'])/gi;

  const matches = [...clean.matchAll(questionDelimiterRegex)];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index! + (matches[i][0].startsWith('\n') ? 1 : 0);
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : clean.length;
      const block = clean.substring(startIndex, endIndex).trim();

      const parsed = parseSingleQuestionBlock(block, i + 1);
      if (parsed.title || parsed.answer) {
        rows.push(parsed);
      }
    }
  } else {
    // Strategy 2: Split by double newlines and attempt to extract Q&A
    const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    let currentRow: Partial<RawImportRow> | null = null;
    let rowNum = 1;

    for (const para of paragraphs) {
      if (/^(?:Question|Q\d*|What|Explain|How|Why|Describe|Can you|Define|Compare)\b/i.test(para)) {
        if (currentRow && (currentRow.title || currentRow.answer)) {
          rows.push({
            rowNumber: rowNum++,
            ...currentRow,
          });
        }
        currentRow = {
          title: para.replace(/^(?:Question\s*\d*[:.-]?|Q\d*[:.-]?)\s*/i, '').trim(),
        };
      } else if (currentRow) {
        if (!currentRow.answer) {
          currentRow.answer = para.replace(/^(?:Answer|Ans|Solution)[:.-]?\s*/i, '').trim();
        } else {
          currentRow.answer += '\n\n' + para;
        }
      }
    }

    if (currentRow && (currentRow.title || currentRow.answer)) {
      rows.push({
        rowNumber: rowNum++,
        ...currentRow,
      });
    }
  }

  if (rows.length === 0) {
    warnings.push('Could not detect distinct question blocks. Please ensure questions start with "Q1.", "Question:", or numbering.');
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

/**
 * Parses a single structured or semi-structured question text block
 */
function parseSingleQuestionBlock(block: string, rowNumber: number): RawImportRow {
  const row: RawImportRow = {
    rowNumber,
    rawText: block,
  };

  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return row;

  let currentField: string = 'title';
  let titleParts: string[] = [];
  let answerParts: string[] = [];
  let tipsParts: string[] = [];
  let mistakeParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for field markers
    if (/^(?:Category|Topic|Domain)[:.-]\s*/i.test(line)) {
      row.category = line.replace(/^(?:Category|Topic|Domain)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Difficulty|Level)[:.-]\s*/i.test(line)) {
      row.difficulty = line.replace(/^(?:Difficulty|Level)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Answer|Ans|Ideal Answer|Solution|Explanation)[:.-]\s*/i.test(line)) {
      const rest = line.replace(/^(?:Answer|Ans|Ideal Answer|Solution|Explanation)[:.-]\s*/i, '').trim();
      if (rest) answerParts.push(rest);
      currentField = 'answer';
    } else if (/^(?:Pro Tips|Tips|Tip|Advice)[:.-]\s*/i.test(line)) {
      const rest = line.replace(/^(?:Pro Tips|Tips|Tip|Advice)[:.-]\s*/i, '').trim();
      if (rest) tipsParts.push(rest);
      currentField = 'tips';
    } else if (/^(?:Common Pitfalls|Common Mistakes|Pitfalls|Mistakes)[:.-]\s*/i.test(line)) {
      const rest = line.replace(/^(?:Common Pitfalls|Common Mistakes|Pitfalls|Mistakes)[:.-]\s*/i, '').trim();
      if (rest) mistakeParts.push(rest);
      currentField = 'common_mistakes';
    } else if (/^(?:Technology Tags|Tech Tags|Technologies|Technology)[:.-]\s*/i.test(line)) {
      row.technology_tags = line.replace(/^(?:Technology Tags|Tech Tags|Technologies|Technology)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Company Tags|Companies|Company)[:.-]\s*/i.test(line)) {
      row.company_tags = line.replace(/^(?:Company Tags|Companies|Company)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Minimum Plan|Required Plan|Plan)[:.-]\s*/i.test(line)) {
      row.minimum_plan = line.replace(/^(?:Minimum Plan|Required Plan|Plan)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Status|State)[:.-]\s*/i.test(line)) {
      row.status = line.replace(/^(?:Status|State)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else if (/^(?:Estimated Time|Time)[:.-]\s*/i.test(line)) {
      row.estimated_time = line.replace(/^(?:Estimated Time|Time)[:.-]\s*/i, '').trim();
      currentField = 'other';
    } else {
      // Continuation of current field
      if (i === 0 || currentField === 'title') {
        const cleanLine = line.replace(/^(?:(?:Question|Q)\s*(?:#|\d+)?[:.\-)]|\d+\.\s+)\s*/i, '').trim();
        if (cleanLine) titleParts.push(cleanLine);
      } else if (currentField === 'answer') {
        answerParts.push(line);
      } else if (currentField === 'tips') {
        tipsParts.push(line);
      } else if (currentField === 'common_mistakes') {
        mistakeParts.push(line);
      }
    }
  }

  row.title = titleParts.join(' ').trim();
  row.answer = answerParts.join('\n').trim();
  if (tipsParts.length > 0) row.tips = tipsParts.join('\n').trim();
  if (mistakeParts.length > 0) row.common_mistakes = mistakeParts.join('\n').trim();

  return row;
}
