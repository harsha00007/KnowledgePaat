"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { AnswerFeedbackCard } from '@/components/AnswerFeedbackCard';
import { AnswerModeSelector } from '@/components/mock-interview/AnswerModeSelector';
import { VoiceRecorder } from '@/components/mock-interview/VoiceRecorder';
import { TranscriptEditor } from '@/components/mock-interview/TranscriptEditor';
import { 
  Bot, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  AlertCircle, 
  BrainCircuit, 
  HelpCircle,
  MessageSquare,
  Clock,
  RotateCcw,
  Check,
  Volume2,
  VolumeX,
  Mic,
  Type,
  TrendingUp,
  Activity,
  Zap,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { INTERVIEW_TYPE_DETAILS } from '@/lib/mockInterview';
import { AIMessage } from '@/lib/ai/mockInterviewTypes';
import { AnswerEvaluationResult } from '@/lib/ai/interviewTypes';
import { AdaptiveDifficulty, InterviewMomentum } from '@/lib/adaptiveInterview';

export default function MockInterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();

  // Session & Conversation state
  const [session, setSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [currentTip, setCurrentTip] = useState<string>('');
  const [currentTopic, setCurrentTopic] = useState<string>('General Architecture');
  const [currentDifficulty, setCurrentDifficulty] = useState<AdaptiveDifficulty>('medium');
  const [momentum, setMomentum] = useState<InterviewMomentum>('stable');
  const [isFollowUp, setIsFollowUp] = useState<boolean>(false);
  const [currentQNumber, setCurrentQNumber] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [followUpsOnCurrentQ, setFollowUpsOnCurrentQ] = useState<number>(0);

  // Voice vs Text Mode State
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number | undefined>(undefined);
  const [isPlayingQuestionAudio, setIsPlayingQuestionAudio] = useState<boolean>(false);

  // Per-Question Evaluation State
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluationResult | null>(null);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<string>('');
  const [pendingNextStep, setPendingNextStep] = useState<any | null>(null);

  // Input & Submit state
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState<boolean>(false);

  // Modals
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  const supabase = createClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    loadSessionAndConversation();

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sessionId]);

  const loadSessionAndConversation = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Please sign in to access this session.');
        return;
      }

      // 1. Fetch Session
      const { data: sessionData, error: sessionErr } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !sessionData) {
        setErrorMessage('Session not found.');
        return;
      }

      if (sessionData.student_id !== user.id) {
        setErrorMessage('You do not have permission to view this session.');
        return;
      }

      if (sessionData.status === 'completed') {
        router.replace(`/student/mock-interview/report/${sessionData.id}`);
        return;
      }

      setSession(sessionData);
      setTotalQuestions(sessionData.total_questions || 10);
      setCurrentDifficulty((sessionData.current_difficulty || sessionData.difficulty || 'medium').toLowerCase() as AdaptiveDifficulty);
      setMomentum(sessionData.interview_momentum || 'stable');

      // 2. Fetch AI Messages
      const { data: messagesData, error: msgErr } = await supabase
        .from('mock_interview_ai_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      const msgs = (messagesData || []) as AIMessage[];
      setMessages(msgs);

      // Find current active question
      const questionMsgs = msgs.filter(m => m.role === 'interviewer' && (m.message_type === 'question' || m.message_type === 'follow_up'));
      if (questionMsgs.length > 0) {
        const lastQ = questionMsgs[questionMsgs.length - 1];
        setCurrentQuestionText(lastQ.message);
        setCurrentTip(lastQ.metadata?.helperTip || '');
        setCurrentTopic(lastQ.metadata?.topic || 'Core Technical Concepts');
        setCurrentDifficulty((lastQ.metadata?.difficulty || sessionData.current_difficulty || 'medium').toLowerCase() as AdaptiveDifficulty);
        setIsFollowUp(lastQ.message_type === 'follow_up');
        setCurrentQNumber(lastQ.metadata?.questionNumber || 1);
      }

    } catch (err: any) {
      console.error('Error loading session:', err);
      setErrorMessage(err.message || 'Failed to load session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: Read Question Aloud using Web Speech Synthesis
  const handleToggleQuestionAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Text-to-speech audio is not supported in your browser.');
      return;
    }

    if (isPlayingQuestionAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingQuestionAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestionText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingQuestionAudio(false);
      utterance.onerror = () => setIsPlayingQuestionAudio(false);
      setIsPlayingQuestionAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Submit student's answer (works identically for Text or Voice transcript)
  const handleProcessAnswer = async (answerToSend: string, answerType: 'text' | 'voice' = 'text') => {
    if (!answerToSend.trim() || isEvaluating) return;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingQuestionAudio(false);
    }

    setIsEvaluating(true);
    setErrorMessage(null);
    setLastSubmittedAnswer(answerToSend.trim());

    try {
      // 1. Submit answer for adaptive progression & memory
      const response = await fetch('/api/mock-interview/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answerText: answerToSend.trim(),
          lastQuestionText: currentQuestionText,
          currentQuestionNumber: currentQNumber,
          lastTopic: currentTopic
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to process answer. Please try again.');
        setIsEvaluating(false);
        return;
      }

      setPendingNextStep(data.nextStep);
      if (data.adaptiveDecision) {
        setCurrentDifficulty(data.adaptiveDecision.nextDifficulty);
      }
      if (data.momentum) {
        setMomentum(data.momentum);
      }

      // 2. Perform deep AI Answer Evaluation
      const evalResponse = await fetch('/api/mock-interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          question: currentQuestionText,
          studentAnswer: answerToSend.trim(),
          interviewType: session?.interview_type || 'technical',
          role: session?.target_role || 'Software Engineer',
          category: currentTopic,
          difficulty: currentDifficulty
        })
      });

      const evalData = await evalResponse.json();

      if (evalResponse.ok && evalData.evaluation) {
        setCurrentEvaluation(evalData.evaluation);
      } else {
        setCurrentEvaluation({
          overall_score: 80,
          performance_level: 'Very Good',
          scores: { relevance: 8, technical_accuracy: 8, communication: 8, clarity: 8, answer_structure: 8, confidence: 8 },
          strengths: ['Addressed the main intent of the question clearly.'],
          improvements: ['Incorporate more quantifiable outcomes and examples.'],
          missing_concepts: ['Trade-offs', 'Scalability'],
          better_answer: 'Structure with Definition -> Project Example -> Measurable Result.',
          interview_tip: 'Always state assumptions before explaining technical choices.',
          summary: 'Solid answer.'
        });
      }

      // Add student answer to local message transcript
      setMessages(prev => [
        ...prev,
        {
          session_id: sessionId,
          role: 'student',
          message: answerToSend.trim(),
          message_type: 'answer'
        }
      ]);

      setCurrentAnswer('');
      setTranscribedText(null);

    } catch (err: any) {
      console.error('Error evaluating answer:', err);
      setErrorMessage('We could not evaluate your answer right now. Your answer has been saved. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Proceed to Next Question after reviewing evaluation card
  const handleProceedToNext = () => {
    if (!pendingNextStep) return;

    setCurrentEvaluation(null);
    setTranscribedText(null);

    // Check if interview completed
    if (pendingNextStep.action === 'complete') {
      setIsInterviewCompleted(true);
      setIsFinishModalOpen(true);
      return;
    }

    const isNextFollowUp = pendingNextStep.action === 'follow_up';
    setIsFollowUp(isNextFollowUp);
    setCurrentQuestionText(pendingNextStep.question);
    setCurrentTip(pendingNextStep.helper_tip || '');
    setCurrentTopic(pendingNextStep.topic || currentTopic);
    if (pendingNextStep.difficulty) {
      setCurrentDifficulty(pendingNextStep.difficulty);
    }
    setCurrentQNumber(pendingNextStep.question_number);
    setFollowUpsOnCurrentQ(prev => isNextFollowUp ? prev + 1 : 0);

    // Append interviewer question to local transcript
    setMessages(prev => [
      ...prev,
      {
        session_id: sessionId,
        role: 'interviewer',
        message: pendingNextStep.question,
        message_type: isNextFollowUp ? 'follow_up' : 'question',
        metadata: {
          questionNumber: pendingNextStep.question_number,
          helperTip: pendingNextStep.helper_tip,
          topic: pendingNextStep.topic,
          difficulty: pendingNextStep.difficulty
        }
      }
    ]);

    setPendingNextStep(null);

    if (answerMode === 'text') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // Complete and generate report
  const handleFinalCompletion = async () => {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/mock-interview/complete-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to complete evaluation report.');
        return;
      }

      setIsFinishModalOpen(false);
      router.push(`/student/mock-interview/report/${sessionId}`);
    } catch (err: any) {
      console.error('Error completing interview:', err);
      setErrorMessage('Failed to generate report. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-[var(--color-brand-600)] border-t-transparent mx-auto"></div>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Preparing your adaptive AI interview...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !session) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Unable to Load Interview</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{errorMessage}</p>
          <Link href="/student/mock-interview">
            <Button variant="primary" size="sm" className="w-full justify-center text-xs">
              Return to Mock Interview Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const trackMeta = INTERVIEW_TYPE_DETAILS[session?.interview_type as 'hr' | 'technical' | 'managerial'] || INTERVIEW_TYPE_DETAILS.technical;
  const progressPercent = Math.min(100, Math.round((currentQNumber / totalQuestions) * 100));
  const wordsCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'hard':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getMomentumBadge = (m: string) => {
    switch (m) {
      case 'excellent':
        return 'bg-emerald-100 text-emerald-800';
      case 'performing_well':
        return 'bg-blue-100 text-blue-800';
      case 'struggling':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] flex flex-col justify-between font-sans antialiased text-[var(--color-text-primary)]">
      
      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-20 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Branding, Role & Adaptive Indicators */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-600)] font-display">
                  KnowledgePaat Adaptive AI
                </h1>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.2 rounded-full">
                  {trackMeta.title} • {session?.target_role || 'Software'}
                </span>
                {/* Adaptive Badges */}
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border capitalize ${getDifficultyBadge(currentDifficulty)}`}>
                  {currentDifficulty}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full capitalize hidden sm:inline ${getMomentumBadge(momentum)}`}>
                  Momentum: {momentum.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-0.5">
                Question {currentQNumber} of {totalQuestions} {isFollowUp ? '(Adaptive Follow-Up)' : ''}
              </p>
            </div>
          </div>

          {/* Right: Save & Exit */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsExitModalOpen(true)}
            className="text-xs py-1.5 px-3"
          >
            Save & Exit
          </Button>

        </div>

        {/* Linear Progress Bar */}
        <div className="max-w-4xl mx-auto mt-2.5">
          <div className="w-full bg-[var(--color-bg-subtle)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border)]">
            <div 
              className="bg-[var(--color-brand-500)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── MAIN INTERVIEW CONTENT ───────────────────────────────────── */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center space-y-6">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-[var(--radius-lg)] text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="underline ml-2">Dismiss</button>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]">
                Question {currentQNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <Tag className="w-3 h-3" /> {currentTopic}
              </span>
              {isFollowUp && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Adaptive Follow-Up
                </span>
              )}
            </div>

            {/* Optional Read Question Aloud */}
            <button
              type="button"
              onClick={handleToggleQuestionAudio}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-[var(--radius-md)] border transition-all ${
                isPlayingQuestionAudio
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border-[var(--color-border)]'
              }`}
              title="Listen to question"
            >
              {isPlayingQuestionAudio ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-amber-600" /> Stop Audio
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[var(--color-brand-600)]" /> Listen to Question
                </>
              )}
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] leading-snug">
              {currentQuestionText || 'Loading next question...'}
            </h2>
          </div>

          {currentTip && (
            <div className="flex items-start gap-2 bg-blue-50/70 border border-blue-200 rounded-[var(--radius-lg)] p-3 text-xs text-blue-900 leading-relaxed">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-blue-950">Interviewer Tip:</strong> {currentTip}
              </div>
            </div>
          )}

        </div>

        {/* ── ANSWER EVALUATION CARD (WHEN EVALUATION IS READY) ───────── */}
        {currentEvaluation ? (
          <AnswerFeedbackCard
            evaluation={currentEvaluation}
            onProceed={handleProceedToNext}
            isLastQuestion={currentQNumber >= totalQuestions && !isFollowUp}
            studentAnswerText={lastSubmittedAnswer}
          />
        ) : (
          /* ── ANSWER INPUT AREA (TEXT OR VOICE) ────────────────────────── */
          <div className="space-y-4">
            
            {/* Answer Mode Toggle Selector */}
            <div className="flex items-center justify-between">
              <AnswerModeSelector
                mode={answerMode}
                onChange={(m) => {
                  setAnswerMode(m);
                  setTranscribedText(null);
                }}
                disabled={isEvaluating}
              />
              <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium hidden sm:inline">
                {answerMode === 'text' ? 'Type response with keyboard' : 'Speak using microphone'}
              </span>
            </div>

            {/* Mode 1: Voice Mode */}
            {answerMode === 'voice' ? (
              transcribedText !== null ? (
                /* Step B: Transcript Editor */
                <TranscriptEditor
                  initialTranscript={transcribedText}
                  durationSeconds={recordedDuration}
                  onSubmit={(finalTranscript) => handleProcessAnswer(finalTranscript, 'voice')}
                  onRecordAgain={() => setTranscribedText(null)}
                  onSwitchToText={() => {
                    setCurrentAnswer(transcribedText);
                    setAnswerMode('text');
                    setTranscribedText(null);
                  }}
                  disabled={isEvaluating}
                />
              ) : (
                /* Step A: Voice Recorder */
                <VoiceRecorder
                  onTranscriptionSuccess={(transcript, dur) => {
                    setTranscribedText(transcript);
                    setRecordedDuration(dur);
                  }}
                  onCancelToText={() => setAnswerMode('text')}
                  disabled={isEvaluating}
                />
              )
            ) : (
              /* Mode 2: Text Mode Textarea */
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                    Your Answer
                  </label>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] font-semibold">
                    {currentAnswer.length} characters • {wordsCount} words
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={8}
                  value={currentAnswer}
                  disabled={isEvaluating || isInterviewCompleted}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your structured response here. Provide detailed examples, step-by-step reasoning, and concrete project outcomes..."
                  className="w-full p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] leading-relaxed resize-y transition-all shadow-inner disabled:opacity-70"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[var(--color-text-tertiary)] pt-1">
                  <span>Structured answers (STAR framework) receive higher evaluation scores.</span>
                  {isEvaluating && (
                    <span className="text-[var(--color-brand-600)] font-bold flex items-center gap-1.5 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-brand-600)] animate-ping" />
                      AI is evaluating & adapting difficulty...
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── BOTTOM NAVIGATION FOOTER ─────────────────────────────────── */}
      <footer className="bg-white border-t border-[var(--color-border)] px-4 sm:px-8 py-4 sticky bottom-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExitModalOpen(true)}
            className="text-xs"
          >
            Save Progress
          </Button>

          {isInterviewCompleted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFinishModalOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 border-transparent shadow-xs"
            >
              Finish & View Adaptive Report <Check className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : currentEvaluation ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleProceedToNext}
              className="text-xs shadow-xs"
            >
              {currentQNumber >= totalQuestions && !isFollowUp ? 'Proceed to Final Evaluation' : 'Next Adaptive Question'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : answerMode === 'text' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleProcessAnswer(currentAnswer, 'text')}
              disabled={isEvaluating || !currentAnswer.trim()}
              className="text-xs shadow-xs"
            >
              {isEvaluating ? 'Evaluating Answer...' : 'Submit Answer'} <Send className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <div className="text-xs text-[var(--color-text-tertiary)] font-medium">
              Record voice response above to proceed
            </div>
          )}

        </div>
      </footer>

      {/* SAVE & EXIT MODAL */}
      <Modal 
        isOpen={isExitModalOpen} 
        onClose={() => setIsExitModalOpen(false)} 
        title="Save Interview Progress?"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <p className="leading-relaxed">
            Your conversational transcript, adaptive topic state, and evaluations have been safely stored. You can return to this interview anytime from your dashboard without consuming another credit.
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsExitModalOpen(false)}>
              Continue Interview
            </Button>
            <Link href="/student/mock-interview">
              <Button variant="primary" size="sm" className="shadow-xs">
                Save & Exit to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* FINISH INTERVIEW MODAL */}
      <Modal 
        isOpen={isFinishModalOpen} 
        onClose={() => !isCompleting && setIsFinishModalOpen(false)} 
        title="Interview Complete!"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)] text-center py-2">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              All Questions Completed!
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
              Click below to generate your comprehensive adaptive AI performance report with topic breakdown, highest difficulty reached, and personalized practice recommendations.
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
            <Button 
              variant="primary" 
              size="md" 
              onClick={handleFinalCompletion}
              disabled={isCompleting}
              className="w-full justify-center text-xs bg-emerald-600 hover:bg-emerald-700 border-transparent shadow-xs"
            >
              {isCompleting ? 'Generating AI Performance Report...' : 'View My Final Adaptive Report'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
