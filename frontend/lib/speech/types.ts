export interface TranscribeAudioInput {
  audioBuffer: ArrayBuffer;
  mimeType: string;
  language?: string;
  filename?: string;
}

export interface TranscriptionResult {
  transcript: string;
  language: string;
  duration_seconds?: number;
  confidence: number;
  isFallback?: boolean;
}

export interface SpeechToTextError {
  code: string;
  message: string;
}
