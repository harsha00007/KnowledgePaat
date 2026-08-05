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
  AlertTriangle
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

  // Extract unique companies
  const allCompanies = Array.from(new Set(questions.flatMap(q => q.company_tags)));

  // Filter Logic
  const filteredQuestions = questions.filter(q => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      searchQuery === '' || 
      q.title.toLowerCase().includes(searchLower) ||
      q.technology_tags.some(t => t.toLowerCase().includes(searchLower)) ||
      q.company_tags.some(c => c.toLowerCase().includes(searchLower));

    const matchesCategory = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDifficulty = difficultyFilter === '' || q.difficulty === difficultyFilter;
    const matchesCompany = companyFilter === '' || q.company_tags.includes(companyFilter);

    return matchesSearch && matchesCategory && matchesDifficulty && matchesCompany;
  });

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  const openQuestion = (index: number) => {
    setSelectedQuestionIndex(index);
    setIsModalOpen(true);
  };

  const currentQuestion = selectedQuestionIndex !== null ? filteredQuestions[selectedQuestionIndex] : null;

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* HEADER & PROGRESS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Preparation</h1>
            <p className="text-sm text-gray-500 mt-1">Prepare for interviews with curated questions and answers.</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Overall Progress</p>
              <p className="text-lg font-bold text-blue-900 leading-tight">
                {completedQuestionIds.size} / {questions.length} <span className="text-sm font-normal text-blue-700">Completed</span>
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:w-1/3">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search questions, tech, or company..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

          <div className="w-full lg:flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <select 
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select 
              value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Company</option>
              {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* CATEGORY CARDS */}
        {!categoryFilter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const catQCount = questions.filter(q => q.category_id === cat.id).length;
              return (
                <Card 
                  key={cat.id} 
                  className="p-5 border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {catQCount} Qs
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{cat.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{cat.description}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* QUESTIONS LIST */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {filteredQuestions.length} Questions Found
          </h2>
          
          {isFetching ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <EmptyState 
              title="No interview questions available."
              description="Try adjusting your filters or search terms."
              action={<Button onClick={resetFilters}>Clear Filters</Button>}
            />
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, index) => {
                const isCompleted = completedQuestionIds.has(q.id);
                
                return (
                  <Card key={q.id} className="p-5 border-gray-200 hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                    
                    <button 
                      onClick={() => handleToggleComplete(q.id)}
                      className="shrink-0 mt-1 md:mt-0 focus:outline-none"
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 hover:text-green-400" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {getCategoryName(q.category_id)}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' :
                          q.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" /> {q.estimated_time}
                        </span>
                      </div>
                      <h3 className={`text-base font-semibold leading-snug ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {q.title}
                      </h3>
                    </div>

                    <div className="shrink-0 pt-2 md:pt-0 border-t border-gray-100 md:border-t-0 md:pl-4">
                      <Button variant="outline" className="w-full md:w-auto text-sm" onClick={() => openQuestion(index)}>
                        View Answer
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* QUESTION DETAILS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Question Details" className="max-w-3xl">
        {currentQuestion && selectedQuestionIndex !== null && (
          <div className="space-y-6 flex flex-col">
            
            {/* Header / Meta */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                {getCategoryName(currentQuestion.category_id)}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                currentQuestion.difficulty === 'Easy' ? 'bg-green-50 text-green-700' :
                currentQuestion.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {currentQuestion.difficulty}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" /> {currentQuestion.estimated_time}
              </span>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Q: {currentQuestion.title}</h2>
              {currentQuestion.company_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentQuestion.company_tags.map(c => (
                    <span key={c} className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Answer */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Ideal Answer</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {currentQuestion.answer}
              </p>
            </div>

            {/* Tips & Mistakes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.tips && (
                <div className="border border-green-100 bg-green-50/30 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-800 flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" /> Pro Tips
                  </h3>
                  <p className="text-sm text-green-900/80">{currentQuestion.tips}</p>
                </div>
              )}
              {currentQuestion.common_mistakes && (
                <div className="border border-red-100 bg-red-50/30 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Common Mistakes
                  </h3>
                  <p className="text-sm text-red-900/80">{currentQuestion.common_mistakes}</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              
              {/* Prev/Next Nav */}
              <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none"
                  disabled={selectedQuestionIndex === 0}
                  onClick={() => setSelectedQuestionIndex(selectedQuestionIndex - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none"
                  disabled={selectedQuestionIndex === filteredQuestions.length - 1}
                  onClick={() => setSelectedQuestionIndex(selectedQuestionIndex + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Mark Complete */}
              <div className="w-full sm:w-auto order-1 sm:order-2">
                <Button 
                  variant={completedQuestionIds.has(currentQuestion.id) ? "outline" : "primary"}
                  className={`w-full sm:w-auto ${!completedQuestionIds.has(currentQuestion.id) && 'bg-green-600 hover:bg-green-700'}`}
                  onClick={() => handleToggleComplete(currentQuestion.id)}
                >
                  {completedQuestionIds.has(currentQuestion.id) ? (
                    <><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Completed</>
                  ) : (
                    <><Circle className="w-4 h-4 mr-2" /> Mark as Completed</>
                  )}
                </Button>
              </div>

            </div>

          </div>
        )}
      </Modal>

    </StudentLayout>
  );
}
