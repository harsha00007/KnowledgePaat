"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const MIN_RECORDING_DURATION = 3; // seconds
const MAX_RECORDING_DURATION = 180; // 3 minutes

interface VoiceRecorderProps {
  onTranscriptionSuccess: (transcript: string, durationSeconds?: number) => void;
  onCancelToText: () => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'recorded' | 'transcribing' | 'error';

export function VoiceRecorder({
  onTranscriptionSuccess,
  onCancelToText,
  disabled = false
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Voice Recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setState('requesting');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('error');
      setErrorMessage('Audio recording is not supported in this browser. Please use text answer.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlobObj = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlobObj);
        const url = URL.createObjectURL(audioBlobObj);
        setAudioUrl(url);
        setState('recorded');

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setState('recording');
      setRecordingDuration(0);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev + 1 >= MAX_RECORDING_DURATION) {
            handleStopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Microphone error:', err);
      setState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. You can enable microphone permissions in your browser settings or answer using text.');
      } else {
        setErrorMessage('Microphone unavailable or audio input error. Please try again or switch to text mode.');
      }
    }
  };

  // Pause Recording
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setState('paused');
      } catch (err) {
        console.warn('Pause not supported:', err);
      }
    }
  };

  // Resume Recording
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        timerIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            if (prev + 1 >= MAX_RECORDING_DURATION) {
              handleStopRecording();
              return MAX_RECORDING_DURATION;
            }
            return prev + 1;
          });
        }, 1000);
        setState('recording');
      } catch (err) {
        console.warn('Resume not supported:', err);
      }
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Reset / Record Again
  const handleRecordAgain = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingDuration(0);
    setErrorMessage(null);
    setState('idle');
  };

  // Toggle Audio Playback Preview
  const handleTogglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Convert Recorded Audio to Text via API
  const handleConvertToText = async () => {
    if (!audioBlob) return;

    if (recordingDuration < MIN_RECORDING_DURATION) {
      setErrorMessage(`Recording must be at least ${MIN_RECORDING_DURATION} seconds long. Please speak more clearly.`);
      return;
    }

    setState('transcribing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'answer.webm');
      formData.append('mimeType', audioBlob.type || 'audio/webm');
      formData.append('language', 'en');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.transcript) {
        throw new Error(data.error || 'Failed to transcribe audio. Please review or try again.');
      }

      onTranscriptionSuccess(data.transcript, recordingDuration);

    } catch (err: any) {
      console.error('Transcription conversion error:', err);
      setErrorMessage(err.message || 'Speech-to-text failed. Please try again or switch to text answer.');
      setState('recorded');
    }
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand-200)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Voice Answer Recorder</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">
              Record your spoken response clearly. You will review the transcript before submitting.
            </p>
          </div>
        </div>
      </div>

      {/* ── ERROR DISPLAY ──────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-lg)] text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p>{errorMessage}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancelToText} className="text-[10px] py-1 px-2.5">
                Use Text Answer
              </Button>
              {state === 'error' && (
                <Button variant="primary" size="sm" onClick={handleRecordAgain} className="text-[10px] py-1 px-2.5">
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STATE 1: IDLE / REQUESTING ──────────────────────────────── */}
      {state === 'idle' && (
        <div className="text-center py-6 space-y-4">
          <div className="h-16 w-16 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-2 border-[var(--color-brand-300)] rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Mic className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Ready to Speak Your Answer</h4>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
              Click the button below and speak your response. Maximum duration is 3 minutes.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              disabled={disabled}
              onClick={handleStartRecording}
              className="text-xs shadow-xs px-6 py-2.5"
              aria-label="Start Voice Recording"
            >
              <Mic className="w-4 h-4 mr-2" /> Start Recording
            </Button>
          </div>
        </div>
      )}

      {state === 'requesting' && (
        <div className="text-center py-8 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Requesting microphone access...</p>
        </div>
      )}

      {/* ── STATE 2: RECORDING / PAUSED ─────────────────────────────── */}
      {(state === 'recording' || state === 'paused') && (
        <div className="py-6 text-center space-y-5">
          {/* Recording Badge */}
          <div className="flex items-center justify-center gap-2">
            <div className={`h-3 w-3 rounded-full ${state === 'recording' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              {state === 'recording' ? '● Recording in Progress' : '❚❚ Recording Paused'}
            </span>
          </div>

          {/* Large Timer */}
          <div className="text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            {formatTime(recordingDuration)}
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium block">
            Max limit: 03:00 (Minimum 3 seconds)
          </span>

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {state === 'recording' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseRecording}
                className="text-xs"
                aria-label="Pause Recording"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResumeRecording}
                className="text-xs"
                aria-label="Resume Recording"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleStopRecording}
              className="text-xs bg-red-600 hover:bg-red-700 border-transparent shadow-xs"
              aria-label="Stop Recording"
            >
              <Square className="w-3.5 h-3.5 mr-1.5 fill-current" /> Stop Recording
            </Button>
          </div>
        </div>
      )}

      {/* ── STATE 3: RECORDED PREVIEW & CONVERT ─────────────────────── */}
      {state === 'recorded' && (
        <div className="py-4 space-y-5">
          <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlayback}
                className="h-10 w-10 rounded-full bg-[var(--color-brand-600)] text-white flex items-center justify-center shadow-xs hover:bg-[var(--color-brand-700)] transition-colors"
                aria-label={isPlayingAudio ? 'Pause playback' : 'Play audio preview'}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-primary)]">Your Recorded Answer</p>
                <span className="text-[11px] text-[var(--color-text-tertiary)] font-semibold">
                  Duration: {formatTime(recordingDuration)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRecordAgain}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Record Again
            </Button>
          </div>

          {audioUrl && (
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlayingAudio(false)}
              className="hidden"
            />
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancelToText}
              className="text-xs text-[var(--color-text-secondary)] font-semibold hover:underline"
            >
              Switch to typing answer
            </button>

            <Button
              variant="primary"
              size="md"
              onClick={handleConvertToText}
              className="text-xs shadow-xs w-full sm:w-auto"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Convert to Text & Review
            </Button>
          </div>
        </div>
      )}

      {/* ── STATE 4: TRANSCRIBING LOADING ───────────────────────────── */}
      {state === 'transcribing' && (
        <div className="text-center py-8 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Converting your answer to text...</h4>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Please wait while we process your audio transcript.</p>
          </div>
        </div>
      )}

      {/* ── PRIVACY NOTICE ─────────────────────────────────────────── */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          Your voice recording is used to convert your answer into text for interview evaluation. Recordings are not permanently stored.
        </span>
      </div>

    </div>
  );
}
