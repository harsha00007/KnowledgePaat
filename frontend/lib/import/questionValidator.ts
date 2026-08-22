import { 
  RawImportRow, 
  ValidatedQuestionRow, 
  ImportDefaults, 
  ValidationSummary 
} from './types';
import { 
  cleanText, 
  normalizeDifficulty, 
  normalizeMinimumPlan, 
  normalizeStatus, 
  normalizeTags, 
  normalizeQuestionTitle 
} from './questionNormalizer';

export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * Validates a list of raw import rows against existing categories and existing questions in database.
 */
export function validateImportRows(
  rows: RawImportRow[],
  categories: CategoryOption[],
  existingDbTitles: Set<string>,
  defaults: ImportDefaults,
  categoryMappings: Record<string, string> = {} // maps raw category string -> category_id
): ValidationSummary {
  const categoryNameMap = new Map<string, CategoryOption>();
  const categoryIdMap = new Map<string, CategoryOption>();

  categories.forEach(cat => {
    categoryNameMap.set(cat.name.toLowerCase().trim(), cat);
    categoryIdMap.set(cat.id, cat);
  });

  const seenInFileTitles = new Map<string, number>(); // normalizedTitle -> first rowNumber
  const unmappedCategoriesSet = new Set<string>();

  const validatedRows: ValidatedQuestionRow[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const raw of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isDuplicate = false;
    let duplicateReason: string | undefined;

    const title = cleanText(raw.title);
    const rawOptA = cleanText(raw.option_a);
    const rawOptB = cleanText(raw.option_b);
    const rawOptC = cleanText(raw.option_c);
    const rawOptD = cleanText(raw.option_d);
    const rawCorrect = (cleanText(raw.correct_option) || '').toUpperCase().trim();
    const explanation = cleanText(raw.explanation);
    let answer = cleanText(raw.answer);
    const tips = raw.tips ? cleanText(raw.tips) : null;
    const commonMistakes = raw.common_mistakes ? cleanText(raw.common_mistakes) : null;
    const estimatedTime = cleanText(raw.estimated_time) || defaults.defaultEstimatedTime || '5 mins';

    // Determine question type (support 'normal', 'mcq', and legacy 'descriptive')
    const rawType = (raw.question_type || '').toLowerCase().trim();
    const isExplicitNormal = rawType === 'normal' || rawType === 'descriptive';
    const isExplicitMcq = rawType === 'mcq';
    const hasMcqFields = !!(rawOptA || rawOptB || rawOptC || rawOptD || rawCorrect);
    
    const isMcq = isExplicitMcq || (!isExplicitNormal && hasMcqFields);
    const questionType: 'normal' | 'mcq' = isMcq ? 'mcq' : 'normal';

    // 1. Validate Question Title
    if (!title) {
      errors.push('Question title is required.');
    } else if (title.length < 5) {
      warnings.push('Question title is very short (under 5 characters).');
    }

    // 2. Validate MCQ or Normal Question
    let validCorrectOption: 'A' | 'B' | 'C' | 'D' | undefined = undefined;
    let answerType: 'short' | 'long' = raw.answer_type === 'long' || raw.answer_type === 'short' 
      ? raw.answer_type 
      : (answer && answer.length > 200 ? 'long' : 'short');

    if (isMcq) {
      if (!rawOptA) errors.push('Option A is required for MCQ.');
      if (!rawOptB) errors.push('Option B is required for MCQ.');
      if (!rawOptC) errors.push('Option C is required for MCQ.');
      if (!rawOptD) errors.push('Option D is required for MCQ.');

      // Check for identical options
      const optSet = new Set([rawOptA, rawOptB, rawOptC, rawOptD].filter(Boolean));
      if (optSet.size > 0 && optSet.size < 4 && rawOptA && rawOptB && rawOptC && rawOptD) {
        errors.push('All 4 MCQ options must be distinct. Some options are identical.');
      }

      // Check correct option
      if (!rawCorrect) {
        errors.push('Correct option (A, B, C, or D) is required for MCQ.');
      } else {
        const firstLetter = rawCorrect.charAt(0);
        if (['A', 'B', 'C', 'D'].includes(firstLetter)) {
          validCorrectOption = firstLetter as 'A' | 'B' | 'C' | 'D';
        } else if (rawCorrect === '1') validCorrectOption = 'A';
        else if (rawCorrect === '2') validCorrectOption = 'B';
        else if (rawCorrect === '3') validCorrectOption = 'C';
        else if (rawCorrect === '4') validCorrectOption = 'D';
        else {
          errors.push(`Invalid correct option "${rawCorrect}". Must be A, B, C, or D.`);
        }
      }

      // If answer is empty for MCQ, generate from correct option or explanation
      if (!answer) {
        if (validCorrectOption === 'A') answer = rawOptA;
        else if (validCorrectOption === 'B') answer = rawOptB;
        else if (validCorrectOption === 'C') answer = rawOptC;
        else if (validCorrectOption === 'D') answer = rawOptD;
        else answer = explanation || 'Multiple choice question';
      }
    } else {
      // Normal / Written-Answer Question
      if (!answer) {
        errors.push('Ideal Model Answer is required for normal questions.');
      } else if (answer.length < 10) {
        warnings.push('Ideal answer is very brief (under 10 characters).');
      }
    }

    // 3. Duplicate Detection (Signature: question_type + category + normalizedTitle)
    const normTitle = normalizeQuestionTitle(title);
    const normalizedCat = (raw.category || '').toLowerCase().trim();
    const dupSignature = `${questionType}:::${normalizedCat}:::${normTitle}`;
    const legacyDupSignature = `${normTitle}`;

    if (normTitle) {
      if (seenInFileTitles.has(dupSignature)) {
        isDuplicate = true;
        duplicateReason = `Duplicate ${questionType.toUpperCase()} question within this file (matches Row ${seenInFileTitles.get(dupSignature)})`;
        duplicateCount++;
      } else if (existingDbTitles.has(dupSignature) || existingDbTitles.has(legacyDupSignature)) {
        isDuplicate = true;
        duplicateReason = `A ${questionType.toUpperCase()} question with this title already exists in the database.`;
        duplicateCount++;
      } else {
        seenInFileTitles.set(dupSignature, raw.rowNumber);
      }
    }

    // 4. Category Resolution
    const rawCategory = (raw.category || '').trim();
    let matchedCategory: CategoryOption | undefined;

    // Check explicit mapping first
    if (rawCategory && categoryMappings[rawCategory]) {
      matchedCategory = categoryIdMap.get(categoryMappings[rawCategory]);
    }

    // Check exact name match
    if (!matchedCategory && rawCategory) {
      matchedCategory = categoryNameMap.get(rawCategory.toLowerCase());
    }

    // Fallback to default category
    if (!matchedCategory && defaults.defaultCategoryId) {
      matchedCategory = categoryIdMap.get(defaults.defaultCategoryId);
      if (rawCategory) {
        warnings.push(`Category "${rawCategory}" was not found. Defaulting to "${matchedCategory?.name}".`);
      }
    }

    // If still not matched
    let categoryName = '';
    let categoryId: string | undefined;

    if (matchedCategory) {
      categoryName = matchedCategory.name;
      categoryId = matchedCategory.id;
    } else {
      if (rawCategory) {
        unmappedCategoriesSet.add(rawCategory);
        categoryName = rawCategory;
        errors.push(`Unrecognized category "${rawCategory}". Please map it before importing.`);
      } else {
        errors.push('Category is required. Select a default category or map existing ones.');
      }
    }

    // 5. Difficulty, Plan & Status Normalization
    const difficulty = raw.difficulty ? normalizeDifficulty(raw.difficulty) : defaults.defaultDifficulty;
    const minPlan = raw.minimum_plan ? normalizeMinimumPlan(raw.minimum_plan) : defaults.defaultMinimumPlan;
    const status = raw.status ? normalizeStatus(raw.status) : defaults.defaultStatus;
    const accessType = minPlan === 'free' ? 'Free' : 'Premium';

    // 6. Tags
    const technologyTags = normalizeTags(raw.technology_tags);
    const companyTags = normalizeTags(raw.company_tags);
    const tags = normalizeTags(raw.tags);

    const isValid = errors.length === 0 && !isDuplicate;
    if (isValid) {
      validCount++;
    } else if (errors.length > 0) {
      errorCount++;
    }
    if (warnings.length > 0) {
      warningCount++;
    }

    validatedRows.push({
      rowNumber: raw.rowNumber,
      title,
      categoryName,
      categoryId,
      difficulty,
      question_type: questionType,
      answer_type: answerType,
      option_a: rawOptA || undefined,
      option_b: rawOptB || undefined,
      option_c: rawOptC || undefined,
      option_d: rawOptD || undefined,
      correct_option: validCorrectOption,
      explanation: explanation || undefined,
      answer,
      tips,
      common_mistakes: commonMistakes,
      technology_tags: technologyTags,
      company_tags: companyTags,
      tags,
      minimum_plan: minPlan,
      access_type: accessType,
      status,
      estimated_time: estimatedTime,
      isValid,
      isDuplicate,
      duplicateReason,
      errors,
      warnings,
    });
  }

  return {
    totalRows: rows.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    unmappedCategories: Array.from(unmappedCategoriesSet),
    validatedRows,
  };
}
