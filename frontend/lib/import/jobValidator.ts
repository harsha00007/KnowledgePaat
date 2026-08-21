import { 
  RawJobRow, 
  ValidatedJobRow, 
  JobImportDefaults, 
  JobValidationSummary,
  ValidWorkMode,
  ValidEmploymentType,
  ValidMinimumPlan,
  ValidJobStatus
} from './jobTypes';
import { 
  cleanText, 
  normalizeWorkMode, 
  normalizeExperience, 
  normalizeEmploymentType, 
  normalizeJobPlan, 
  normalizeJobStatus, 
  normalizeArrayField, 
  isValidApplyUrl, 
  createJobDuplicateSignature 
} from './jobNormalizer';

/**
 * Validates a list of raw job import rows against rules and existing database jobs
 */
export function validateJobRows(
  rows: RawJobRow[],
  existingDbSignatures: Set<string>,
  defaults: JobImportDefaults
): JobValidationSummary {
  const seenInFileSignatures = new Map<string, number>(); // signature -> first rowNumber
  const validatedRows: ValidatedJobRow[] = [];

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const raw of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isDuplicate = false;
    let duplicateReason: string | undefined;

    const companyName = cleanText(raw.company_name);
    const title = cleanText(raw.title || raw.job_title);
    const location = cleanText(raw.location);
    const applyUrl = cleanText(raw.apply_url || raw.official_apply_url);
    const rawSalary = cleanText(raw.salary || raw.compensation || raw.salary_range);
    const salary = rawSalary || null;
    const category = cleanText(raw.category) || defaults.defaultCategory || 'Software Development';

    const fullDescription = cleanText(raw.full_description || raw.description || raw.short_description);
    const shortDescription = cleanText(raw.short_description) || (fullDescription ? fullDescription.slice(0, 160) : '');

    const requiredSkills = normalizeArrayField(raw.required_skills || raw.skills);
    const responsibilities = normalizeArrayField(raw.responsibilities);

    // 1. Validate Company Name
    if (!companyName) {
      errors.push('Company Name is required.');
    } else if (companyName.length < 2) {
      warnings.push('Company Name is very short (under 2 characters).');
    }

    // 2. Validate Job Title
    if (!title) {
      errors.push('Job Title is required.');
    } else if (title.length < 3) {
      warnings.push('Job Title is very short (under 3 characters).');
    }

    // 3. Validate Location
    if (!location) {
      errors.push('Location is required (e.g., "Bangalore, India" or "Remote").');
    }

    // 4. Validate Apply URL
    if (!applyUrl) {
      errors.push('Official Apply URL is required.');
    } else if (!isValidApplyUrl(applyUrl)) {
      errors.push(`Invalid Apply URL "${applyUrl}". Must be a valid web URL starting with http:// or https://.`);
    }

    // 5. Work Mode Normalization & Validation
    const rawMode = raw.work_mode;
    const { value: workMode, isRecognized: isModeRecognized } = normalizeWorkMode(rawMode, defaults.defaultWorkMode);
    if (rawMode && !isModeRecognized) {
      warnings.push(`Work mode "${rawMode}" was not recognized. Defaulted to "${workMode}".`);
    }

    // 6. Experience Normalization
    const experience = raw.experience || raw.experience_level 
      ? normalizeExperience(raw.experience || raw.experience_level, defaults.defaultExperience) 
      : defaults.defaultExperience;

    // 7. Employment Type Normalization
    const rawEmp = raw.employment_type;
    const { value: employmentType, isRecognized: isEmpRecognized } = normalizeEmploymentType(rawEmp, defaults.defaultEmploymentType);
    if (rawEmp && !isEmpRecognized) {
      warnings.push(`Employment type "${rawEmp}" was not recognized. Defaulted to "${employmentType}".`);
    }

    // 8. Minimum Plan & Status Normalization
    const minimumPlan = normalizeJobPlan(raw.minimum_plan, defaults.defaultMinimumPlan);
    const accessType: 'Free' | 'Premium' = minimumPlan === 'free' ? 'Free' : 'Premium';
    const status = normalizeJobStatus(raw.status, defaults.defaultStatus);

    // 9. Optional Field Warnings
    if (!salary) {
      warnings.push('Compensation / Salary range not provided.');
    }
    if (!fullDescription && !shortDescription) {
      warnings.push('Job description is empty.');
    }
    if (requiredSkills.length === 0) {
      warnings.push('No required skills specified.');
    }

    // 10. Duplicate Detection
    const signature = createJobDuplicateSignature(companyName, title, location);
    if (signature && companyName && title) {
      if (seenInFileSignatures.has(signature)) {
        isDuplicate = true;
        duplicateReason = `Duplicate job within this file (matches Row ${seenInFileSignatures.get(signature)})`;
        duplicateCount++;
      } else if (existingDbSignatures.has(signature)) {
        isDuplicate = true;
        duplicateReason = 'Job already exists in database with matching Company, Title, and Location.';
        duplicateCount++;
      } else {
        seenInFileSignatures.set(signature, raw.rowNumber);
      }
    }

    const isValid = errors.length === 0 && !isDuplicate;

    if (!isValid && !isDuplicate) {
      errorCount++;
    } else if (isValid && warnings.length > 0) {
      validCount++;
      warningCount++;
    } else if (isValid) {
      validCount++;
    }

    validatedRows.push({
      rowNumber: raw.rowNumber,
      company_name: companyName,
      title,
      location,
      work_mode: workMode,
      experience,
      minimum_plan: minimumPlan,
      access_type: accessType,
      employment_type: employmentType,
      salary,
      apply_url: applyUrl,
      short_description: shortDescription,
      full_description: fullDescription,
      required_skills: requiredSkills,
      responsibilities,
      category,
      status,
      company_logo_url: raw.company_logo_url || null,
      isValid,
      isDuplicate,
      duplicateReason,
      duplicateSignature: signature,
      errors,
      warnings
    });
  }

  return {
    totalRows: rows.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    validatedRows
  };
}
