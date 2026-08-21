import fs from 'fs';
import path from 'path';
import { parseExcel } from '../lib/import/excelParser.js';
import { parseCSV } from '../lib/import/csvParser.js';
import { parseRawTextBlocks } from '../lib/import/textParser.js';
import { parseMarkdown } from '../lib/import/markdownParser.js';
import { validateImportRows } from '../lib/import/questionValidator.js';
import { normalizeQuestionTitle } from '../lib/import/questionNormalizer.js';

console.log('Testing bulk import parser engine...');
const fixturesDir = path.resolve('test_fixtures');

const mockCategories = [
  { id: 'cat-1', name: 'Technical' },
  { id: 'cat-2', name: 'HR & Behavioral' },
  { id: 'cat-3', name: 'Aptitude' },
  { id: 'cat-4', name: 'System Design' }
];

const mockDbTitles = new Set([
  normalizeQuestionTitle('What is Python?')
]);

const defaults = {
  defaultDifficulty: 'Medium',
  defaultMinimumPlan: 'free',
  defaultStatus: 'Active',
  defaultEstimatedTime: '5 mins'
};

let allPassed = true;

// 1. Test CSV Parser
try {
  const csvContent = fs.readFileSync(path.join(fixturesDir, 'sample_questions.csv'), 'utf-8');
  const res = await parseCSV(csvContent, 'sample_questions.csv', csvContent.length);
  console.log(`✓ CSV Parsed: ${res.totalRowsParsed} rows found.`);
  
  const val = validateImportRows(res.rows, mockCategories, mockDbTitles, defaults);
  console.log(`  - Valid: ${val.validCount}, Duplicates: ${val.duplicateCount}, Errors: ${val.errorCount}`);
  if (val.duplicateCount !== 1) {
    console.error('❌ Expected 1 duplicate in sample_questions.csv');
    allPassed = false;
  }
} catch (e) {
  console.error('❌ CSV Test failed:', e);
  allPassed = false;
}

// 2. Test XLSX Parser
try {
  const xlsxBuf = fs.readFileSync(path.join(fixturesDir, 'sample_questions.xlsx'));
  const res = await parseExcel(xlsxBuf, 'sample_questions.xlsx');
  console.log(`✓ XLSX Parsed: ${res.totalRowsParsed} rows found.`);
  
  const val = validateImportRows(res.rows, mockCategories, mockDbTitles, defaults);
  console.log(`  - Valid: ${val.validCount}, Duplicates: ${val.duplicateCount}, Errors: ${val.errorCount}`);
  if (val.validCount !== 3) {
    console.error('❌ Expected 3 valid questions in sample_questions.xlsx');
    allPassed = false;
  }
} catch (e) {
  console.error('❌ XLSX Test failed:', e);
  allPassed = false;
}

// 3. Test TXT Parser
try {
  const txtContent = fs.readFileSync(path.join(fixturesDir, 'sample_questions.txt'), 'utf-8');
  const res = parseRawTextBlocks(txtContent, 'sample_questions.txt', txtContent.length, 'txt');
  console.log(`✓ TXT Parsed: ${res.totalRowsParsed} rows found.`);
  
  const val = validateImportRows(res.rows, mockCategories, mockDbTitles, defaults);
  console.log(`  - Valid: ${val.validCount}, Duplicates: ${val.duplicateCount}, Errors: ${val.errorCount}`);
  if (val.validCount !== 2) {
    console.error('❌ Expected 2 valid questions in sample_questions.txt');
    allPassed = false;
  }
} catch (e) {
  console.error('❌ TXT Test failed:', e);
  allPassed = false;
}

// 4. Test MD Parser
try {
  const mdContent = fs.readFileSync(path.join(fixturesDir, 'sample_questions.md'), 'utf-8');
  const res = parseMarkdown(mdContent, 'sample_questions.md', mdContent.length);
  console.log(`✓ MD Parsed: ${res.totalRowsParsed} rows found.`);
  
  const val = validateImportRows(res.rows, mockCategories, mockDbTitles, defaults);
  console.log(`  - Valid: ${val.validCount}, Duplicates: ${val.duplicateCount}, Errors: ${val.errorCount}`);
  if (val.validCount !== 2) {
    console.error('❌ Expected 2 valid questions in sample_questions.md');
    allPassed = false;
  }
} catch (e) {
  console.error('❌ MD Test failed:', e);
  allPassed = false;
}

if (allPassed) {
  console.log('\n🎉 ALL PARSER & VALIDATION TESTS PASSED PERFECTLY!');
} else {
  console.error('\n❌ Some tests failed.');
  process.exit(1);
}
