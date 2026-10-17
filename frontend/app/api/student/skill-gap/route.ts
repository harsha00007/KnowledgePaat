import { NextRequest } from 'next/server';
import { handleStudentSkillGap } from '@/lib/studentSkillGap';

export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handleStudentSkillGap(req); }
