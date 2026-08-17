import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status } = body as { taskId: string; status: 'pending' | 'in_progress' | 'completed' | 'skipped' };

    if (!taskId || !status) {
      return NextResponse.json({ error: 'Missing taskId or status.' }, { status: 400 });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('career_plan_tasks')
      .update({
        status,
        completed_at: completedAt
      })
      .eq('id', taskId)
      .eq('student_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: data
    });

  } catch (err: any) {
    console.error('Error updating career task:', err);
    return NextResponse.json({ error: err.message || 'Failed to update task.' }, { status: 500 });
  }
}
