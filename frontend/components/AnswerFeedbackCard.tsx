"use client";

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  FileText, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronUp,
  BrainCircuit,
  Award
} from 'lucide-react';
import { AnswerEvaluationResult } from '@/lib/ai/interviewTypes';

interface AnswerFeedbackCardProps {
  evaluation: AnswerEvaluationResult;
  onProceed: () => void;
  isLastQuestion?: boolean;
  studentAnswerText?: string;
}

export function AnswerFeedbackCard({
  evaluation,
  onProceed,
  isLastQuestion = false,
  studentAnswerText
}: AnswerFeedbackCardProps) {
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(false);
  const [showBetterAnswer, setShowBetterAnswer] = useState(true);

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Very Good':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Good':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Needs Improvement':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const categories = [
    { label: 'Relevance', score: evaluation.scores.relevance },
    { label: 'Technical Accuracy', score: evaluation.scores.technical_accuracy },
    { label: 'Communication', score: evaluation.scores.communication },
    { label: 'Clarity', score: evaluation.scores.clarity },
    { label: 'Answer Structure', score: evaluation.scores.answer_structure },
    { label: 'Confidence', score: evaluation.scores.confidence }
  ];

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-brand-200)] shadow-[var(--shadow-sm)] p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* ── HEADER & OVERALL SCORE ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-600)] flex items-center gap-1">
            <BrainCircuit className="w-3.5 h-3.5" /> Your Answer Evaluation
          </span>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
            Performance: <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ml-1 ${getLevelBadgeColor(evaluation.performance_level)}`}>
              {evaluation.performance_level}
            </span>
          </h3>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-3 bg-[var(--color-bg-subtle)] px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] shrink-0 self-start sm:self-auto">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">Score</span>
            <span className="text-2xl font-extrabold text-[var(--color-brand-600)] leading-none">{evaluation.overall_score}</span>
            <span className="text-[11px] font-bold text-[var(--color-text-tertiary)]"> / 100</span>
          </div>
        </div>
      </div>

      {/* ── 6 CATEGORY SCORES BREAKDOWN ─────────────────────────────── */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
          Score Breakdown (Out of 10)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--color-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">{cat.label}</span>
                <span className="font-extrabold text-[var(--color-text-primary)]">{cat.score}/10</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    cat.score >= 8 ? 'bg-emerald-500' : cat.score >= 6 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${cat.score * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STRENGTHS & IMPROVEMENTS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* What You Did Well */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50/40 space-y-2">
          <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> What You Did Well
          </h4>
          <ul className="space-y-1.5 text-xs text-emerald-900 leading-relaxed">
            {evaluation.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas to Improve */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50/40 space-y-2">
          <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-amber-600" /> Areas to Improve
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-900 leading-relaxed">
            {evaluation.improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* ── MISSING CONCEPTS TAGS ────────────────────────────────────── */}
      {evaluation.missing_concepts && evaluation.missing_concepts.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">
            Suggested Key Concepts to Include
          </span>
          <div className="flex flex-wrap gap-2">
            {evaluation.missing_concepts.map((concept, i) => (
              <span key={i} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── BETTER ANSWER EXAMPLE (COLLAPSIBLE) ───────────────────────── */}
      {evaluation.better_answer && (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <button
            onClick={() => setShowBetterAnswer(!showBetterAnswer)}
            className="w-full bg-[var(--color-bg-subtle)] px-4 py-3 text-left flex items-center justify-between font-bold text-xs text-[var(--color-text-primary)] hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[var(--color-brand-700)]">
              <Sparkles className="w-3.5 h-3.5" /> Exemplary Model Answer (How to Answer)
            </span>
            {showBetterAnswer ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showBetterAnswer && (
            <div className="p-4 bg-white text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)] whitespace-pre-wrap">
              {evaluation.better_answer}
            </div>
          )}
        </div>
      )}

      {/* ── AI INTERVIEW TIP ─────────────────────────────────────────── */}
      {evaluation.interview_tip && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-[var(--radius-lg)] flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-blue-950">AI Interview Tip: </strong>
            {evaluation.interview_tip}
          </div>
        </div>
      )}

      {/* ── REVIEW ORIGINAL ANSWER (OPTIONAL) ────────────────────────── */}
      {studentAnswerText && (
        <div className="text-right">
          <button
            onClick={() => setShowOriginalAnswer(!showOriginalAnswer)}
            className="text-[11px] text-[var(--color-brand-600)] font-semibold hover:underline"
          >
            {showOriginalAnswer ? 'Hide My Answer' : 'Review My Original Answer'}
          </button>
          {showOriginalAnswer && (
            <div className="mt-2 p-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-left text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">
              {studentAnswerText}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIONS ─────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
        <Button 
          variant="primary" 
          size="md" 
          onClick={onProceed}
          className="text-xs shadow-xs"
        >
          {isLastQuestion ? 'Proceed to Final Evaluation' : 'Next Question'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

    </div>
  );
}
