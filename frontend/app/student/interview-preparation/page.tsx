"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  CheckCircle,
  Circle,
  Clock,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Target,
  AlertTriangle,
  Users,
  Code,
  Brain,
  Building
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Category = {
  id: string;
  name: string;
  description: string;
};

type Question = {
  id: string;
  category_id: string;
  title: string;
  answer: string;
  tips: string | null;
  common_mistakes: string | null;
  difficulty: string;
  estimated_time: string;
  company_tags: string[];
  technology_tags: string[];
};

export default function InterviewPrepPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Modal State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch Categories
      const { data: catData } = await supabase.from('interview_categories').select('*').order('order_index');
      if (catData) setCategories(catData as Category[]);

      // Fetch Questions
      const { data: qData } = await supabase.from('interview_questions').select('*').order('order_index');
      if (qData) setQuestions(qData as Question[]);

      // Fetch Progress
      if (user) {
        const { data: progressData } = await supabase
          .from('student_question_progress')
          .select('question_id')
          .eq('student_id', user.id)
          .eq('completed', true);
          
        if (progressData) {
          setCompletedQuestionIds(new Set(progressData.map(p => p.question_id)));
        }
      }
    } catch (err) {
      console.error("Error fetching prep data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggleComplete = async (questionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      const isCompleted = completedQuestionIds.has(questionId);

      if (isCompleted) {
        await supabase
          .from('student_question_progress')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', questionId);
        
        setCompletedQuestionIds(prev => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      } else {
        await supabase
          .from('student_question_progress')
          .insert({ student_id: user.id, question_id: questionId, completed: true });
          
        setCompletedQuestionIds(prev => {
          const next = new Set(prev);
          next.add(questionId);
          return next;
        });
      }
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setDifficultyFilter('');
    setCompanyFilter('');
  };

  const allCompanies = Array.from(new Set(questions.flatMap(q => q.company_tags).filter(Boolean)));

  const filteredQuestions = questions.filter(q => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      searchQuery === '' || 
      q.title.toLowerCase().includes(searchLower) ||
      (q.technology_tags && q.technology_tags.some(t => t.toLowerCase().includes(searchLower))) ||
      (q.company_tags && q.company_tags.some(c => c.toLowerCase().includes(searchLower)));

    const matchesCategory = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDifficulty = difficultyFilter === '' || q.difficulty === difficultyFilter;
    const matchesCompany = companyFilter === '' || (q.company_tags && q.company_tags.includes(companyFilter));

    return matchesSearch && matchesCategory && matchesDifficulty && matchesCompany;
  });

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'General';

  const openQuestion = (index: number) => {
    setSelectedQuestionIndex(index);
    setIsModalOpen(true);
  };

  const currentQuestion = selectedQuestionIndex !== null ? filteredQuestions[selectedQuestionIndex] : null;

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER & PROGRESS BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Interview Preparation</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Curated interview questions and ideal answers across core categories.
            </p>
          </div>
          
          {/* Progress Pill */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-200)] bg-white px-4 py-2 shadow-xs flex items-center gap-3">
            <div className="h-8 w-8 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Completion</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                {completedQuestionIds.size} / {questions.length} Completed
              </p>
            </div>
          </div>
        </div>

        {/* CATEGORY SELECTOR CARDS */}
        {!categoryFilter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const catQCount = questions.filter(q => q.category_id === cat.id).length;
              return (
                <div 
                  key={cat.id} 
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] cursor-pointer transition-all flex flex-col justify-between group"
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 bg-[var(--color-brand-50)] text-[var(--color-brand-600)] rounded-[var(--radius-md)] flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2 py-0.5 rounded-full">
                      {catQCount} Qs
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] transition-colors mb-1">{cat.name}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search questions, skills, companies..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="hidden lg:block w-px h-6 bg-[var(--color-border)]"></div>

          <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select 
              value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Companies</option>
              {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* QUESTIONS LIST */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {filteredQuestions.length} Questions Available
            </h2>
            {categoryFilter && (
              <button 
                onClick={() => setCategoryFilter('')} 
                className="text-xs text-[var(--color-brand-600)] hover:underline font-semibold"
              >
                Show All Categories
              </button>
            )}
          </div>
          
          {isFetching ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <EmptyState 
              title="No interview questions found."
              description="Try adjusting your filter or search criteria."
              action={<Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>}
            />
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, index) => {
                const isCompleted = completedQuestionIds.has(q.id);
                
                return (
                  <div 
                    key={q.id} 
                    className={`rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] hover:border-[var(--color-brand-300)] transition-all flex flex-col md:flex-row md:items-center gap-3.5 ${isCompleted ? 'bg-[var(--color-bg-subtle)]' : ''}`}
                  >
                    <button 
                      onClick={() => handleToggleComplete(q.id)}
                      className="shrink-0 mt-0.5 md:mt-0 focus:outline-none"
                      aria-label={isCompleted ? "Mark incomplete" : "Mark completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-500 transition-colors" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2 py-0.5 rounded-full">
                          {getCategoryName(q.category_id)}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {q.difficulty}
                        </span>
                        {q.estimated_time && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> {q.estimated_time}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-semibold leading-snug ${isCompleted ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
                        {q.title}
                      </h3>
                    </div>

                    <div className="shrink-0 pt-2 md:pt-0 border-t border-[var(--color-border)] md:border-t-0">
                      <Button variant="outline" size="sm" className="w-full md:w-auto text-xs" onClick={() => openQuestion(index)}>
                        View Answer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* QUESTION DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Question Details" className="max-w-2xl">
        {currentQuestion && selectedQuestionIndex !== null && (
          <div className="space-y-5">
            
            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-2.5 py-0.5 rounded-full">
                {getCategoryName(currentQuestion.category_id)}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                currentQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                currentQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                {currentQuestion.difficulty}
              </span>
              {currentQuestion.estimated_time && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                  <Clock className="w-3.5 h-3.5" /> {currentQuestion.estimated_time}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-snug">Q: {currentQuestion.title}</h2>
              {currentQuestion.company_tags && currentQuestion.company_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentQuestion.company_tags.map(c => (
                    <span key={c} className="text-[11px] font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Answer */}
            <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
              <h3 className="text-xs font-bold text-[var(--color-brand-700)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Ideal Answer
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">
                {currentQuestion.answer}
              </p>
            </div>

            {/* Tips & Mistakes */}
            {(currentQuestion.tips || currentQuestion.common_mistakes) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.tips && (
                  <div className="border border-emerald-200 bg-emerald-50/60 rounded-[var(--radius-lg)] p-4">
                    <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                      <Target className="w-3.5 h-3.5" /> Pro Tips
                    </h3>
                    <p className="text-xs text-emerald-950 leading-relaxed">{currentQuestion.tips}</p>
                  </div>
                )}
                {currentQuestion.common_mistakes && (
                  <div className="border border-red-200 bg-red-50/60 rounded-[var(--radius-lg)] p-4">
                    <h3 className="text-xs font-bold text-red-800 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Common Pitfalls
                    </h3>
                    <p className="text-xs text-red-950 leading-relaxed">{currentQuestion.common_mistakes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={selectedQuestionIndex === 0}
                  onClick={() => setSelectedQuestionIndex(selectedQuestionIndex - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={selectedQuestionIndex === filteredQuestions.length - 1}
                  onClick={() => setSelectedQuestionIndex(selectedQuestionIndex + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <Button 
                variant={completedQuestionIds.has(currentQuestion.id) ? "outline" : "primary"}
                size="sm"
                className={`w-full sm:w-auto ${completedQuestionIds.has(currentQuestion.id) ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : ''}`}
                onClick={() => handleToggleComplete(currentQuestion.id)}
              >
                {completedQuestionIds.has(currentQuestion.id) ? (
                  <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Completed</>
                ) : (
                  <><Circle className="w-3.5 h-3.5 mr-1.5" /> Mark as Completed</>
                )}
              </Button>
            </div>

          </div>
        )}
      </Modal>

    </StudentLayout>
  );
}
