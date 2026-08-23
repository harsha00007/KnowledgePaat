import fs from 'fs';
import path from 'path';
import { 
  FeatureKey, 
  DEFAULT_FEATURE_FLAGS, 
  isStudentModuleEnabled 
} from '@/lib/featureFlags';

/**
 * Server-side helper to read flags directly from local fallback JSON / Supabase
 */
export async function getServerFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'feature_flags.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileData);
      if (parsed?.flags) {
        return { ...DEFAULT_FEATURE_FLAGS, ...parsed.flags };
      }
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_FEATURE_FLAGS;
}

/**
 * Server-side helper to evaluate whether a module is enabled
 */
export async function isServerModuleEnabled(moduleKey: FeatureKey): Promise<boolean> {
  const flags = await getServerFeatureFlags();
  return isStudentModuleEnabled(flags, moduleKey);
}
