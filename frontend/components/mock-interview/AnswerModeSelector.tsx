"use client";

import React from 'react';
import { Type, Mic } from 'lucide-react';

interface AnswerModeSelectorProps {
  mode: 'text' | 'voice';
  onChange: (mode: 'text' | 'voice') => void;
  disabled?: boolean;
}

export function AnswerModeSelector({ mode, onChange, disabled = false }: AnswerModeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] self-start">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('text')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
          mode === 'text'
            ? 'bg-white text-[var(--color-brand-600)] shadow-xs border border-[var(--color-border)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        } disabled:opacity-50`}
        aria-label="Switch to Text Answer mode"
      >
        <Type className="w-3.5 h-3.5" /> Type Answer
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('voice')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
          mode === 'voice'
            ? 'bg-white text-[var(--color-brand-600)] shadow-xs border border-[var(--color-border)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        } disabled:opacity-50`}
        aria-label="Switch to Voice Answer mode"
      >
        <Mic className="w-3.5 h-3.5" /> Speak Answer
      </button>
    </div>
  );
}
