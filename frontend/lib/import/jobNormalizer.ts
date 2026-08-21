import { normalizePlanId, PlanId } from '@/config/plans';
import { 
  ValidWorkMode, 
  ValidEmploymentType, 
  ValidMinimumPlan, 
  ValidJobStatus 
} from './jobTypes';

/**
 * Cleans and trims raw text strings
 */
export function cleanText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Normalizes work mode to 'Remote' | 'Hybrid' | 'On-site'
 */
export function normalizeWorkMode(mode?: string | null, fallback: ValidWorkMode = 'Remote'): { value: ValidWorkMode; isRecognized: boolean } {
  if (!mode) return { value: fallback, isRecognized: true };
  const clean = mode.toLowerCase().trim().replace(/[-_ ]+/g, '');

  if (['remote', 'workfromhome', 'wfh', 'telecommute', 'online'].includes(clean)) {
    return { value: 'Remote', isRecognized: true };
  }
  if (['hybrid', 'mixed', 'flexible'].includes(clean)) {
    return { value: 'Hybrid', isRecognized: true };
  }
  if (['onsite', 'inperson', 'office', 'in office', 'site'].includes(clean)) {
    return { value: 'On-site', isRecognized: true };
  }

  return { value: fallback, isRecognized: false };
}

/**
 * Normalizes experience level
 */
export function normalizeExperience(exp?: string | null, fallback: string = 'Fresher'): string {
  if (!exp) return fallback;
  const clean = exp.toLowerCase().trim();

  if (['fresher', '0', '0 yrs', '0 years', 'entry', 'entry level', 'graduate', 'fresh graduate', 'intern'].includes(clean)) {
    return 'Fresher';
  }
  if (['0-1', '0-1 yrs', '0-1 years', '0 to 1', '0 to 1 year', '1 year', '1 yr'].includes(clean)) {
    return '0-1 Years';
  }
  if (['1-3', '1-3 yrs', '1-3 years', '1 to 3', '2 years', '2-3 years'].includes(clean)) {
    return '1-3 Years';
  }
  if (['3+', '3+ yrs', '3+ years', '3-5 years', '5+ years', 'senior', 'experienced'].includes(clean)) {
    return '3+ Years';
  }

  // Capitalize nicely if custom
  return exp.trim().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Normalizes employment type
 */
export function normalizeEmploymentType(type?: string | null, fallback: ValidEmploymentType = 'Full-time'): { value: ValidEmploymentType; isRecognized: boolean } {
  if (!type) return { value: fallback, isRecognized: true };
  const clean = type.toLowerCase().trim().replace(/[-_ ]+/g, '');

  if (['fulltime', 'permanent', 'regular', 'ft'].includes(clean)) {
    return { value: 'Full-time', isRecognized: true };
  }
  if (['parttime', 'pt'].includes(clean)) {
    return { value: 'Part-time', isRecognized: true };
  }
  if (['internship', 'intern', 'trainee', 'apprentice'].includes(clean)) {
    return { value: 'Internship', isRecognized: true };
  }
  if (['contract', 'contractor', 'freelance', 'temporary', 'temp'].includes(clean)) {
    return { value: 'Contract', isRecognized: true };
  }

  return { value: fallback, isRecognized: false };
}

/**
 * Normalizes minimum plan value to 'free' | 'starter' | 'pro' | 'premium'
 */
export function normalizeJobPlan(plan?: string | null, fallback: ValidMinimumPlan = 'free'): ValidMinimumPlan {
  if (!plan) return fallback;
  const norm = normalizePlanId(plan);
  if (['free', 'starter', 'pro', 'premium'].includes(norm)) {
    return norm as ValidMinimumPlan;
  }
  return fallback;
}

/**
 * Normalizes status to 'Active' | 'Inactive'
 */
export function normalizeJobStatus(status?: string | null, fallback: ValidJobStatus = 'Active'): ValidJobStatus {
  if (!status) return fallback;
  const clean = status.toLowerCase().trim();
  if (['active', 'published', 'open', 'live', 'enabled', 'true', '1'].includes(clean)) {
    return 'Active';
  }
  if (['inactive', 'closed', 'draft', 'disabled', 'false', '0', 'archived'].includes(clean)) {
    return 'Inactive';
  }
  return fallback;
}

/**
 * Normalizes tags / skills / responsibilities into clean string array
 */
export function normalizeArrayField(val?: string | string[] | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(s => cleanText(s)).filter(Boolean);
  }
  // Split by comma, semicolon, bullet points, or newlines
  return String(val)
    .split(/[,;\n\r•\t]+/)
    .map(s => cleanText(s.replace(/^[-*•]\s*/, '')))
    .filter(s => s.length > 0);
}

/**
 * Validates whether a URL is a legitimate web URL (http:// or https://)
 * Rejects javascript:, data:, file:, etc.
 */
export function isValidApplyUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return false;
  }
  if (/^(javascript|data|file|vbscript):/i.test(clean)) {
    return false;
  }
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates normalized canonical signature for duplicate job detection
 * Canonical format: `company:::title:::location`
 */
export function createJobDuplicateSignature(
  company?: string | null, 
  title?: string | null, 
  location?: string | null
): string {
  const c = cleanText(company).toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = cleanText(title).toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = cleanText(location).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${c}:::${t}:::${l}`;
}
