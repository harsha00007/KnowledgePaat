import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { transcribeAudio } from '@/lib/speech/speechToText';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Enforce Rate Limit for Voice-to-Text Audio Transcription
    const rl = await checkRateLimit(`speech_to_text:${user.id}`, RATE_LIMIT_POLICIES.SPEECH_TO_TEXT);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | Blob | null;
    const mimeType = (formData.get('mimeType') as string) || 'audio/webm';
    const language = (formData.get('language') as string) || 'en';

    if (!audioFile) {
      return NextResponse.json({ error: 'Missing audio file in request.' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Audio recording was empty. Please record your answer again.' }, { status: 400 });
    }

    const result = await transcribeAudio({
      audioBuffer: arrayBuffer,
      mimeType,
      language,
      filename: 'answer.webm'
    });

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      language: result.language,
      duration_seconds: result.duration_seconds,
      confidence: result.confidence,
      isFallback: result.isFallback || false
    });

  } catch (err: any) {
    console.error('API speech-to-text error:', err);
    return NextResponse.json({ 
      error: err.message || 'Speech-to-text conversion failed. Please try again or switch to text mode.' 
    }, { status: 500 });
  }
}
