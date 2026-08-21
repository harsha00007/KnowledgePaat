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
    const answer = cleanText(raw.answer);
    const tips = raw.tips ? cleanText(raw.tips) : null;
    const commonMistakes = raw.common_mistakes ? cleanText(raw.common_mistakes) : null;
    const estimatedTime = cleanText(raw.estimated_time) || defaults.defaultEstimatedTime || '5 mins';

    // 1. Validate Question Title
    if (!title) {
      errors.push('Question title is required.');
    } else if (title.length < 5) {
      warnings.push('Question title is very short (under 5 characters).');
    }

    // 2. Validate Answer
    if (!answer) {
      errors.push('Answer content is required.');
    } else if (answer.length < 10) {
      warnings.push('Answer is very brief (under 10 characters).');
    }

    // 3. Duplicate Detection
    const normTitle = normalizeQuestionTitle(title);
    if (normTitle) {
      if (seenInFileTitles.has(normTitle)) {
        isDuplicate = true;
        duplicateReason = `Duplicate question within this file (matches Row ${seenInFileTitles.get(normTitle)})`;
        duplicateCount++;
      } else if (existingDbTitles.has(normTitle)) {
        isDuplicate = true;
        duplicateReason = 'Question already exists in the database.';
        duplicateCount++;
      } else {
        seenInFileTitles.set(normTitle, raw.rowNumber);
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
