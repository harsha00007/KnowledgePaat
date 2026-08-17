"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  MockInterviewSession, 
  SessionQuestion, 
  getSessionDetails, 
  saveSessionAnswer, 
  submitMockInterview 
} from '@/lib/mockInterview';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function useMockInterview(sessionId: string) {
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const studentIdRef = useRef<string | null>(null);
  const supabase = createClient();

  // Load session data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Authentication required');
          return;
        }
        studentIdRef.current = user.id;

        const res = await getSessionDetails(supabase, sessionId);
        if (res.error || !res.session) {
          setError(res.error || 'Failed to load session');
          return;
        }

        // Security check: ensure student owns session
        if (res.session.student_id !== user.id) {
          setError('You do not have permission to access this interview session.');
          return;
        }

        setSession(res.session);
        setQuestions(res.questions);
        setAnswers(res.answersMap);
      } catch (err: any) {
        setError(err.message || 'An error occurred loading the interview.');
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionId) {
      loadData();
    }
  }, [sessionId, supabase]);

  // Persist specific question answer
  const persistAnswer = useCallback(async (questionId: string, text: string) => {
    if (!studentIdRef.current || !sessionId) return;
    setSaveStatus('saving');

    const success = await saveSessionAnswer(
      supabase,
      sessionId,
      questionId,
      studentIdRef.current,
      text
    );

    setSaveStatus(success ? 'saved' : 'error');
  }, [sessionId, supabase]);

  // Update answer in state with debounced autosave
  const updateCurrentAnswer = (text: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || session?.status === 'completed') return;

    setAnswers(prev => ({ ...prev, [currentQ.id]: text }));
    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistAnswer(currentQ.id, text);
    }, 1200);
  };

  // Immediate save on navigation
  const navigateToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const currentQ = questions[currentIndex];
    if (currentQ) {
      // Clear pending debounce and save immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      persistAnswer(currentQ.id, answers[currentQ.id] || '');
    }

    setCurrentIndex(targetIndex);
  };

  const nextQuestion = () => navigateToQuestion(currentIndex + 1);
  const prevQuestion = () => navigateToQuestion(currentIndex - 1);

  // Submit interview
  const submitInterview = async (): Promise<boolean> => {
    if (!studentIdRef.current || !sessionId) return false;
    setIsSubmitting(true);

    try {
      // Ensure current answer is saved
      const currentQ = questions[currentIndex];
      if (currentQ) {
        await persistAnswer(currentQ.id, answers[currentQ.id] || '');
      }

      const res = await submitMockInterview(supabase, sessionId, studentIdRef.current);
      if (!res.success) {
        setError(res.error);
        return false;
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit interview.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    session,
    questions,
    currentQuestion: questions[currentIndex] || null,
    currentIndex,
    totalQuestions: questions.length,
    currentAnswer: questions[currentIndex] ? (answers[questions[currentIndex].id] || '') : '',
    saveStatus,
    isLoading,
    error,
    isSubmitting,
    updateCurrentAnswer,
    nextQuestion,
    prevQuestion,
    navigateToQuestion,
    submitInterview
  };
}
