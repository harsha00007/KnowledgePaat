"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { UpgradeModal } from '@/components/UpgradeModal';
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
  Building,
  Lock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calculateUserAccess, isContentAccessible, UserAccess } from '@/lib/subscription';
import { PLANS, normalizePlanId, PlanId } from '@/config/plans';

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
  minimum_plan?: string;
  access_type?: string;
};

export default function InterviewPrepPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [userAccess, setUserAccess] = useState<UserAccess>(calculateUserAccess(null));
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Modal State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState<string>('starter');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user subscription and purchased products for access control
      if (user) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setUserAccess(calculateUserAccess(subData));

        const { data: purchasesData } = await supabase
          .from('student_purchases')
          .select('product_id')
          .eq('student_id', user.id);

        if (purchasesData) {
          setOwnedProductIds(new Set(purchasesData.map(p => p.product_id)));
        }
      }

      // Fetch Categories
      const { data: catData } = await supabase.from('interview_categories').select('*').order('order_index');
      if (catData) setCategories(catData as Category[]);

      // Fetch Questions
      const { data: qData } = await supabase.from('interview_questions').select('*').order('created_at', { ascending: false });
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
      if (!user) return;

      const isCompleted = completedQuestionIds.has(questionId);
      
      setCompletedQuestionIds(prev => {
        const next = new Set(prev);
        if (isCompleted) next.delete(questionId);
        else next.add(questionId);
        return next;
      });

      if (isCompleted) {
        await supabase
          .from('student_question_progress')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', questionId);
      } else {
        await supabase
          .from('student_question_progress')
          .insert({ student_id: user.id, question_id: questionId, completed: true });
      }
    } catch (err) {
      console.error("Error toggling completion:", err);
    }
  };

  const checkQuestionAccess = (question: Question) => {
    const reqPlan = question?.minimum_plan || question?.access_type || 'free';
    if (userAccess.hasAccess(reqPlan)) return true;
    if (ownedProductIds.size > 0) return true; // Digital question pack or master bundle unlocks question bank
    return false;
  };

  // Filter Questions
  const filteredQuestions = questions.filter(q => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      q.title.toLowerCase().includes(query) || 
      (q.technology_tags && q.technology_tags.some(t => t.toLowerCase().includes(query))) ||
      (q.company_tags && q.company_tags.some(c => c.toLowerCase().includes(query)));

    const matchesCat = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDiff = difficultyFilter === '' || q.difficulty === difficultyFilter;
    const matchesComp = companyFilter === '' || (q.company_tags && q.company_tags.includes(companyFilter));
    
    const itemPlan = normalizePlanId(q.minimum_plan || q.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesCat && matchesDiff && matchesComp && matchesPlan;
  });

  const selectedQuestion = selectedQuestionIndex !== null ? filteredQuestions[selectedQuestionIndex] : null;

  const handleOpenQuestion = (index: number) => {
    const question = filteredQuestions[index];
    const isUnlocked = checkQuestionAccess(question);
    
    if (!isUnlocked) {
      setModalRequiredPlan(question?.minimum_plan || question?.access_type || 'free');
      setIsUpgradeModalOpen(true);
      return;
    }

    setSelectedQuestionIndex(index);
    setIsModalOpen(true);
  };

  const handleNextQuestion = () => {
    if (selectedQuestionIndex !== null && selectedQuestionIndex < filteredQuestions.length - 1) {
      setSelectedQuestionIndex(selectedQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (selectedQuestionIndex !== null && selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setDifficultyFilter('');
    setCompanyFilter('');
    setPlanFilter('');
  };

  const allCompanies = Array.from(new Set(questions.flatMap(q => q.company_tags || []))).filter(Boolean);
  const userPlanConfig = PLANS[userAccess.effectivePlan];

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER & METRIC SUMMARY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Interview Preparation</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Curated HR, Technical, and Aptitude questions with model answers and pro tips.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs font-semibold text-[var(--color-text-secondary)]">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Completed: <strong className="text-[var(--color-text-primary)]">{completedQuestionIds.size} / {questions.length}</strong></span>
            </div>

            {/* Plan Tier Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs shadow-xs">
              <span className="text-[var(--color-text-tertiary)]">Plan:</span>
              <span className={`font-bold ${userPlanConfig.badgeTextColor}`}>
                {userPlanConfig.name} Member
              </span>
            </div>
          </div>
        </div>

        {/* CATEGORY SELECTOR CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => setCategoryFilter('')} 
            className={`p-3.5 rounded-[var(--radius-xl)] border text-left transition-all ${
              categoryFilter === '' 
                ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">All Questions</span>
              <BookOpen className={`w-4 h-4 ${categoryFilter === '' ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)]">{questions.length} Questions</p>
          </button>

          {categories.map((cat) => {
            const count = questions.filter(q => q.category_id === cat.id).length;
            const isSelected = categoryFilter === cat.id;

            return (
              <button 
                key={cat.id} 
                onClick={() => setCategoryFilter(cat.id)}
                className={`p-3.5 rounded-[var(--radius-xl)] border text-left transition-all ${
                  isSelected 
                    ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-500)] shadow-xs' 
                    : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{cat.name}</span>
                  <Target className={`w-4 h-4 ${isSelected ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{count} Questions</p>
              </button>
            );
          })}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search questions, technologies (e.g. React, SQL), or concepts..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors bg-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <select 
              value={difficultyFilter} 
              onChange={e => setDifficultyFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select 
              value={companyFilter} 
              onChange={e => setCompanyFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Companies</option>
              {allCompanies.map(comp => <option key={comp} value={comp}>{comp}</option>)}
            </select>

            <select 
              value={planFilter} 
              onChange={e => setPlanFilter(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plan Tiers</option>
              <option value="free">Free Questions</option>
              <option value="starter">Starter Questions</option>
              <option value="pro">Pro Questions</option>
              <option value="premium">Premium Questions</option>
            </select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters} 
              className="col-span-2 sm:col-span-1 text-xs justify-center"
            >
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* QUESTIONS LIST */}
        {isFetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <EmptyState 
            title="No questions found"
            description="Try selecting a different category or clearing your search filters."
            action={<Button variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Button>}
          />
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => {
              const isCompleted = completedQuestionIds.has(q.id);
              const reqPlan = q.minimum_plan || q.access_type || 'free';
              const isUnlocked = isContentAccessible(reqPlan, userAccess);
              const planMeta = PLANS[normalizePlanId(reqPlan)];

              return (
                <div 
                  key={q.id}
                  onClick={() => handleOpenQuestion(idx)}
                  className={`rounded-[var(--radius-xl)] border p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    !isUnlocked 
                      ? 'bg-slate-50/70 border-[var(--color-border)] hover:border-[var(--color-brand-300)]' 
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-xs)]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(q.id); }}
                      className="mt-0.5 text-[var(--color-text-tertiary)] hover:text-emerald-600 transition-colors shrink-0"
                      title={isCompleted ? "Mark Incomplete" : "Mark Completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`text-sm font-bold group-hover:text-[var(--color-brand-600)] transition-colors leading-snug ${isCompleted ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                          {q.title}
                        </h3>
                        <PremiumBadge minimumPlan={reqPlan} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                        <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${
                          q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {q.difficulty}
                        </span>

                        <span className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
                          <Clock className="w-3 h-3" /> {q.estimated_time || '5 mins'}
                        </span>

                        {q.technology_tags && q.technology_tags.slice(0, 2).map(tech => (
                          <span key={tech} className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-1.5 py-0.2 rounded text-[10px] font-semibold border border-[var(--color-brand-200)]">
                            {tech}
                          </span>
                        ))}

                        {q.company_tags && q.company_tags.slice(0, 2).map(comp => (
                          <span key={comp} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-1.5 py-0.2 rounded text-[10px] font-semibold border border-[var(--color-border)]">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {!isUnlocked ? (
                      <Button variant="outline" size="sm" className="text-xs h-7.5 px-3 text-[var(--color-brand-600)] border-[var(--color-brand-200)] hover:bg-[var(--color-brand-50)]">
                        <Lock className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> {planMeta.name} Required
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                        View Answer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* QUESTION MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Interview Question" className="max-w-2xl">
        {selectedQuestion && (
          <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
            
            {/* Header in Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)] gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] border ${
                    selectedQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    selectedQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {selectedQuestion.difficulty}
                  </span>
                  <PremiumBadge minimumPlan={selectedQuestion.minimum_plan || selectedQuestion.access_type} />
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-snug">{selectedQuestion.title}</h2>
              </div>

              <button 
                onClick={() => handleToggleComplete(selectedQuestion.id)}
                className="p-2 rounded-full hover:bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-emerald-600 transition-colors shrink-0"
                title={completedQuestionIds.has(selectedQuestion.id) ? "Mark Incomplete" : "Mark Completed"}
              >
                {completedQuestionIds.has(selectedQuestion.id) ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Answer Section */}
            <div className="bg-[var(--color-bg-subtle)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <h4 className="font-bold text-[var(--color-brand-700)] mb-1.5 uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Ideal Answer Structure
              </h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedQuestion.answer}</p>
            </div>

            {/* Tips & Pitfalls */}
            {selectedQuestion.tips && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-[var(--radius-lg)]">
                <h4 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-700" /> Interview Pro Tips
                </h4>
                <p className="text-emerald-900 leading-relaxed">{selectedQuestion.tips}</p>
              </div>
            )}

            {selectedQuestion.common_mistakes && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-[var(--radius-lg)]">
                <h4 className="font-bold text-amber-950 mb-1 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Common Pitfalls to Avoid
                </h4>
                <p className="text-amber-900 leading-relaxed">{selectedQuestion.common_mistakes}</p>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrevQuestion}
                  disabled={selectedQuestionIndex === 0}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNextQuestion}
                  disabled={selectedQuestionIndex === filteredQuestions.length - 1}
                  className="text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* UPGRADE PROMPT MODAL */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        requiredPlan={modalRequiredPlan}
        featureTitle="exclusive interview questions and model answers"
      />

    </StudentLayout>
  );
}
