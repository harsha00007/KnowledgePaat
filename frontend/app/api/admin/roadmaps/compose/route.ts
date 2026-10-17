import { NextRequest } from 'next/server';
import { handleComposerRequest } from '@/lib/roadmapComposerApi';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) { return handleComposerRequest(req,true); }
