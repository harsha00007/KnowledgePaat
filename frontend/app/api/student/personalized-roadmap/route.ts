import { NextRequest } from 'next/server';
import { handleStudentPersonalizedRoadmap } from '@/lib/studentPersonalizedRoadmap';

export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handleStudentPersonalizedRoadmap(req); }
