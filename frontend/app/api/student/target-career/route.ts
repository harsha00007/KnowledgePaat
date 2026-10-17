import { NextRequest } from 'next/server';
import { handleStudentCareerRequest } from '@/lib/studentCareerSnapshot';
export const dynamic = 'force-dynamic';
export function PUT(req: NextRequest) { return handleStudentCareerRequest(req,true); }
