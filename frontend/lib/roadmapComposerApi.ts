import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { composeCareerRoadmap, parseComposerInput, previewCareerRoadmap } from './roadmapComposer';
import { ComposerError, composerMessages } from './roadmapComposerPlan';
import { logger } from './logger';

export async function handleComposerRequest(req: NextRequest, generate = false) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ code:'UNAUTHORIZED',error:composerMessages.UNAUTHORIZED },{status:401});
    const { data: profile, error: roleError } = await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
    if (roleError) throw roleError;
    if (profile?.role !== 'admin') return NextResponse.json({code:'FORBIDDEN',error:composerMessages.FORBIDDEN},{status:403});
    let body: unknown; try { body = await req.json(); } catch { throw new ComposerError('INVALID_INPUT',composerMessages.INVALID_INPUT,400); }
    const input = parseComposerInput(body,generate);
    const result = generate ? await composeCareerRoadmap(input) : await previewCareerRoadmap(input);
    return NextResponse.json(result,{ status:generate && 'status' in result && result.status==='created' ? 201 : 200, headers:{'Cache-Control':'no-store'} });
  } catch (error) {
    if (error instanceof ComposerError) return NextResponse.json({code:error.code,error:error.message},{status:error.status});
    logger.error('Composer API unavailable',new Error('Composer request failed.'));
    return NextResponse.json({code:'ROADMAP_GENERATION_FAILED',error:composerMessages.ROADMAP_GENERATION_FAILED},{status:503});
  }
}
