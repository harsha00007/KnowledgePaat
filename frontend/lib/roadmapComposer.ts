import { createClient } from '@/utils/supabase/server';
import { isCatalogId } from './catalogIntegrity';
import { getCareerCompositionSnapshot } from './skillGraph';
import { buildComposerPlan, ComposerError, composerMessages } from './roadmapComposerPlan';
import { logger } from './logger';
import type { ComposerInput, ComposerOptions, ComposerPreview, ComposerResult } from '@/types/roadmapComposer';

export function parseComposerInput(value: unknown, generate = false): ComposerInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(k => !['careerId', 'fingerprint', 'title', 'difficulty', 'targetDuration'].includes(k)) || !isCatalogId(input.careerId)) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  if (input.title !== undefined && (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.trim().length > 200)) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  if (input.difficulty !== undefined && !['Beginner','Intermediate','Advanced'].includes(input.difficulty as string)) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  if (input.targetDuration !== undefined && (typeof input.targetDuration !== 'string' || !input.targetDuration.trim() || input.targetDuration.trim().length > 100)) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  if ((generate || input.fingerprint !== undefined) && (typeof input.fingerprint !== 'string' || !/^[a-f0-9]{32}$/.test(input.fingerprint))) throw new ComposerError('INVALID_INPUT', composerMessages.INVALID_INPUT);
  return { ...input, title: typeof input.title === 'string' ? input.title.trim() : undefined, targetDuration: typeof input.targetDuration === 'string' ? input.targetDuration.trim() : undefined } as ComposerInput;
}
function mappedError(error: unknown): ComposerError {
  if (error instanceof ComposerError) return error;
  const code = (error as { message?: string })?.message || '';
  const known = Object.hasOwn(composerMessages, code);
  return new ComposerError(known ? code : 'ROADMAP_GENERATION_FAILED', known ? composerMessages[code] : composerMessages.ROADMAP_GENERATION_FAILED,
    code === 'CAREER_NOT_FOUND' ? 404 : ['PREVIEW_STALE','ROADMAP_ALREADY_EXISTS'].includes(code) ? 409 : ['FORBIDDEN','UNAUTHORIZED'].includes(code) ? 403 : known ? 422 : 503);
}
const getOptions = ({ title, difficulty, targetDuration }: ComposerInput): ComposerOptions => ({ ...(title ? {title} : {}), ...(difficulty ? {difficulty} : {}), ...(targetDuration ? {targetDuration} : {}) });
export async function previewCareerRoadmap(input: ComposerInput): Promise<ComposerPreview> {
  try { const { snapshot, fingerprint } = await getCareerCompositionSnapshot(input.careerId); return buildComposerPlan(snapshot, fingerprint, getOptions(input)); }
  catch (error) { throw mappedError(error); }
}
export async function composeCareerRoadmap(input: ComposerInput): Promise<ComposerResult> {
  const started = Date.now();
  logger.info('Roadmap composition started', { careerId: input.careerId });
  try {
    const supabase = await createClient();
    // Existing compositions are immutable to the composer, including published ones.
    const { data: existing, error: lookupError } = await supabase.from('career_roadmaps').select('id').eq('composer_career_id',input.careerId).eq('composer_version',1).maybeSingle();
    if (lookupError) throw lookupError;
    const preview = existing ? null : await previewCareerRoadmap(input);
    if (preview && preview.fingerprint !== input.fingerprint) throw new ComposerError('PREVIEW_STALE',composerMessages.PREVIEW_STALE,409);
    const { data, error } = await supabase.rpc('phase_b_compose_roadmap', { career_id: input.careerId, expected_fingerprint: input.fingerprint, ordered_skill_ids: preview?.orderedSkillIds || [], options: getOptions(input) });
    if (error) throw error;
    if (!data || !isCatalogId(data.roadmapId) || !['created','existing'].includes(data.status)) throw new Error('Invalid composition result.');
    logger.info('Roadmap composition completed',{ careerId: input.careerId, roadmapId: data.roadmapId, nodeCount: data.nodeCount, resourceCount: data.resourceCount, durationMs: Date.now()-started });
    return data;
  } catch (error) {
    const safeError = mappedError(error);
    logger.error('Roadmap composition failed',safeError,{ careerId: input.careerId, code: safeError.code, durationMs: Date.now()-started });
    throw safeError;
  }
}
