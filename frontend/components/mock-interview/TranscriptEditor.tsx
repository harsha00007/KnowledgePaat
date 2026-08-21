"use client";

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { 
  FileText, 
  RotateCcw, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Edit3, 
  Mic
} from 'lucide-react';

interface TranscriptEditorProps {
  initialTranscript: string;
  durationSeconds?: number;
  onSubmit: (finalTranscript: string) => void;
  onRecordAgain: () => void;
  onSwitchToText: () => void;
  disabled?: boolean;
}

export function TranscriptEditor({
  initialTranscript,
  durationSeconds,
  onSubmit,
  onRecordAgain,
  onSwitchToText,
  disabled = false
}: TranscriptEditorProps) {
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const wordsCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  const handleSubmit = () => {
    if (!transcript.trim()) return;
    onSubmit(transcript.trim());
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-brand-200)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Review Your Transcript
          </span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
            Generated Voice Transcript
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)] font-semibold">
          {durationSeconds !== undefined && (
            <span>Spoken Duration: {durationSeconds}s •</span>
          )}
          <span>{wordsCount} words</span>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
        Review your spoken answer below. You can edit any misheard words or add further technical details before submitting for evaluation.
      </p>

      {/* ── EDITABLE TRANSCRIPT TEXTAREA ────────────────────────────── */}
      <div className="space-y-1.5">
        <textarea
          rows={7}
          value={transcript}
          disabled={disabled}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Edit your transcribed answer..."
          className="w-full p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] leading-relaxed resize-y transition-all shadow-inner disabled:opacity-60"
        />
      </div>

      {/* ── ACTIONS ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onRecordAgain}
            className="text-xs w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Record Again
          </Button>

          <button
            type="button"
            disabled={disabled}
            onClick={onSwitchToText}
            className="text-xs text-[var(--color-text-secondary)] font-semibold hover:underline px-2"
          >
            Type from scratch
          </button>
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={disabled || !transcript.trim()}
          onClick={handleSubmit}
          className="text-xs shadow-xs w-full sm:w-auto"
        >
          Submit Answer for AI Evaluation <Send className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

    </div>
  );
}
