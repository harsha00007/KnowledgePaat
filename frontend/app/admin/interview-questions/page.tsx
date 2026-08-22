"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { PremiumBadge } from '@/components/PremiumBadge';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Power, 
  Trash2, 
  AlertTriangle,
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  BookOpen, 
  CheckCircle, 
  HelpCircle, 
  AlertCircle, 
  Lock, 
  UploadCloud,
  Target,
  Clock,
  Layers,
  Settings,
  BarChart3,
  Sparkles,
  Copy,
  Zap,
  Play,
  Flame,
  Check,
  X,
  RefreshCw,
  FolderPlus,
  Sliders,
  TrendingUp,
  Award
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { normalizePlanId, PLANS, PlanId } from '@/config/plans';

// ---------------- TYPES ---------------- //
type Category = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  status: string;
  is_active?: boolean;
  icon?: string;
  minimum_plan?: string;
  created_at?: string;
};

type Question = {
  id: string;
  category_id: string;
  title: string;
  question_type?: 'normal' | 'mcq' | 'descriptive';
  answer_type?: 'short' | 'long';
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_option?: 'A' | 'B' | 'C' | 'D' | string | null;
  explanation?: string | null;
  options?: string[];
  correct_option_index?: number;
  answer: string;
  tips: string | null;
  common_mistakes: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_time: string;
  company_tags: string[];
  technology_tags: string[];
  tags: string[];
  status: string;
  minimum_plan?: string;
  access_type?: string;
  created_at: string;
  updated_at: string;
  category?: { name: string };
};

type TestConfig = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  mode: 'practice' | 'timed_test' | 'ai_adaptive';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Adaptive';
  question_count: number;
  time_per_question: number; // seconds
  minimum_plan: string;
  is_recommended: boolean;
  status: 'Active' | 'Inactive';
  allowed_question_counts?: number[];
  allowed_time_limits?: number[];
  created_at?: string;
  updated_at?: string;
  category?: { name: string };
};

type PrepSettings = {
  id: string;
  practice_mode_enabled: boolean;
  timed_test_mode_enabled: boolean;
  ai_adaptive_mode_enabled: boolean;
  practice_minimum_plan: string;
  timed_test_minimum_plan: string;
  ai_adaptive_minimum_plan: string;
  allowed_question_counts: number[];
  allowed_time_limits: number[];
};

type TestAttemptStat = {
  id: string;
  title: string;
  mode: string;
  difficulty: string;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  student_id: string;
};

const initialNormalQuestionForm: Partial<Question> = {
  title: '',
  category_id: '',
  question_type: 'normal',
  answer_type: 'short',
  answer: '',
  tips: '',
  common_mistakes: '',
  difficulty: 'Medium',
  estimated_time: '2 mins',
  company_tags: [],
  technology_tags: [],
  tags: [],
  status: 'Active',
  minimum_plan: 'free'
};

const initialMcqQuestionForm: Partial<Question> = {
  title: '',
  category_id: '',
  question_type: 'mcq',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
  answer: '',
  tips: '',
  common_mistakes: '',
  difficulty: 'Medium',
  estimated_time: '2 mins',
  company_tags: [],
  technology_tags: [],
  tags: [],
  status: 'Active',
  minimum_plan: 'free'
};

const initialCategoryForm: Partial<Category> = {
  name: '',
  description: '',
  order_index: 0,
  status: 'Active',
  icon: 'BookOpen',
  minimum_plan: 'free'
};

const initialTestForm: Partial<TestConfig> = {
  title: '',
  description: '',
  category_id: '',
  mode: 'timed_test',
  difficulty: 'Medium',
  question_count: 10,
  time_per_question: 60,
  minimum_plan: 'free',
  is_recommended: false,
  status: 'Active'
};

export default function AdminInterviewPrepPage() {
  const [activeTab, setActiveTab] = useState<'questions' | 'categories' | 'tests' | 'settings' | 'analytics'>('questions');
  
  // Data States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [testConfigs, setTestConfigs] = useState<TestConfig[]>([]);
  const [prepSettings, setPrepSettings] = useState<PrepSettings>({
    id: 'global',
    practice_mode_enabled: true,
    timed_test_mode_enabled: true,
    ai_adaptive_mode_enabled: true,
    practice_minimum_plan: 'free',
    timed_test_minimum_plan: 'free',
    ai_adaptive_minimum_plan: 'premium',
    allowed_question_counts: [10, 20, 30, 40, 50],
    allowed_time_limits: [30, 45, 60, 90, 120]
  });
  const [attempts, setAttempts] = useState<TestAttemptStat[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Question Sub-tab: Normal Questions vs MCQ Questions
  const [questionSubTab, setQuestionSubTab] = useState<'normal' | 'mcq'>('normal');

  // Question Filters & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNormalModalOpen, setIsNormalModalOpen] = useState(false);
  const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questionFormData, setQuestionFormData] = useState<Partial<Question>>(initialNormalQuestionForm);
  const [questionFormErrors, setQuestionFormErrors] = useState<Record<string, string>>({});
  const [techInput, setTechInput] = useState('');
  const [compInput, setCompInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk Selection & Deletion State
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteSuccessMsg, setBulkDeleteSuccessMsg] = useState<string | null>(null);
  const [bulkDeleteErrorMsg, setBulkDeleteErrorMsg] = useState<string | null>(null);

  // Category Modals
  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>(initialCategoryForm);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryDeleteOpen, setIsCategoryDeleteOpen] = useState(false);
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});

  // Test Config Modals
  const [testFormData, setTestFormData] = useState<Partial<TestConfig>>(initialTestForm);
  const [selectedTest, setSelectedTest] = useState<TestConfig | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTestDeleteOpen, setIsTestDeleteOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
  const [testFormErrors, setTestFormErrors] = useState<Record<string, string>>({});
  const [availablePoolCount, setAvailablePoolCount] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsFetching(true);
    try {
      // 1. Fetch Categories
      const { data: catData } = await supabase
        .from('interview_categories')
        .select('*')
        .order('order_index', { ascending: true });
      if (catData) setCategories(catData as Category[]);

      // 2. Fetch Questions
      const { data: qData } = await supabase
        .from('interview_questions')
        .select(`
          *,
          interview_categories(name)
        `)
        .order('created_at', { ascending: false });
      if (qData) {
        setQuestions(qData.map((q: any) => ({ ...q, category: q.interview_categories })) as Question[]);
      }

      // 3. Fetch Test Configs
      const { data: testData } = await supabase
        .from('interview_test_configs')
        .select(`
          *,
          interview_categories(name)
        `)
        .order('created_at', { ascending: false });
      if (testData) {
        setTestConfigs(testData.map((t: any) => ({ ...t, category: t.interview_categories })) as TestConfig[]);
      }

      // 4. Fetch Global Prep Settings
      const { data: settingsData } = await supabase
        .from('interview_prep_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (settingsData) {
        setPrepSettings(settingsData as PrepSettings);
      }

      // 5. Fetch Test Attempts for Analytics
      const { data: attemptsData } = await supabase
        .from('student_test_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (attemptsData) {
        setAttempts(attemptsData as TestAttemptStat[]);
      }

    } catch (err) {
      console.error("Error fetching admin interview prep data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // ---------------- QUESTIONS TAB LOGIC ---------------- //
  const normalQuestions = questions.filter(q => q.question_type !== 'mcq' && !q.option_a);
  const mcqQuestions = questions.filter(q => q.question_type === 'mcq' || !!q.option_a);
  const currentPool = questionSubTab === 'normal' ? normalQuestions : mcqQuestions;

  const filteredQuestions = currentPool.filter(q => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      q.title.toLowerCase().includes(query) || 
      (q.category?.name || '').toLowerCase().includes(query) || 
      (q.technology_tags && q.technology_tags.some(t => t.toLowerCase().includes(query))) ||
      (q.company_tags && q.company_tags.some(c => c.toLowerCase().includes(query))) ||
      (q.answer && q.answer.toLowerCase().includes(query));

    const matchesStatus = statusFilter === '' || q.status === statusFilter;
    const matchesCat = categoryFilter === '' || q.category_id === categoryFilter;
    const matchesDiff = diffFilter === '' || q.difficulty === diffFilter;
    
    const itemPlan = normalizePlanId(q.minimum_plan || q.access_type);
    const matchesPlan = planFilter === '' || itemPlan === planFilter;

    return matchesSearch && matchesStatus && matchesCat && matchesDiff && matchesPlan;
  });

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAddNormalQuestionForm = () => {
    setQuestionFormData({ 
      ...initialNormalQuestionForm, 
      category_id: categories.length > 0 ? categories[0].id : '', 
      minimum_plan: 'free',
      question_type: 'normal',
      answer_type: 'short'
    });
    setQuestionFormErrors({});
    setSelectedQuestion(null);
    setIsNormalModalOpen(true);
  };

  const openAddMcqQuestionForm = () => {
    setQuestionFormData({ 
      ...initialMcqQuestionForm, 
      category_id: categories.length > 0 ? categories[0].id : '', 
      minimum_plan: 'free',
      question_type: 'mcq',
      correct_option: 'A'
    });
    setQuestionFormErrors({});
    setSelectedQuestion(null);
    setIsMcqModalOpen(true);
  };

  const openEditQuestionForm = (q: Question) => {
    const isMcq = q.question_type === 'mcq' || !!q.option_a;
    setQuestionFormData({
      ...q,
      question_type: isMcq ? 'mcq' : 'normal',
      answer_type: q.answer_type || (q.answer && q.answer.length > 200 ? 'long' : 'short'),
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_option: q.correct_option || 'A',
      explanation: q.explanation || '',
      minimum_plan: normalizePlanId(q.minimum_plan || q.access_type)
    });
    setQuestionFormErrors({});
    setSelectedQuestion(q);
    if (isMcq) {
      setIsMcqModalOpen(true);
    } else {
      setIsNormalModalOpen(true);
    }
  };

  const handleToggleQuestionStatus = async (q: Question) => {
    const newStatus = q.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('interview_questions')
        .update({ status: newStatus })
        .eq('id', q.id);
      if (error) throw error;

      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: newStatus } : item));
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || 'Error'));
    }
  };

  const handleSaveNormalQuestion = async () => {
    const errors: Record<string, string> = {};
    if (!questionFormData.title?.trim()) errors.title = "Question Title / Prompt is required.";
    if (!questionFormData.category_id) errors.category_id = "Category is required.";
    if (!questionFormData.difficulty) errors.difficulty = "Difficulty is required.";
    if (!questionFormData.answer?.trim()) errors.answer = "Ideal Model Answer is required for normal questions.";

    if (Object.keys(errors).length > 0) {
      setQuestionFormErrors(errors);
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        title: questionFormData.title?.trim(),
        category_id: questionFormData.category_id,
        question_type: 'normal',
        answer_type: questionFormData.answer_type || 'short',
        option_a: null,
        option_b: null,
        option_c: null,
        option_d: null,
        correct_option: null,
        correct_option_index: null,
        options: [],
        explanation: null,
        answer: questionFormData.answer?.trim(),
        tips: questionFormData.tips?.trim() || null,
        common_mistakes: questionFormData.common_mistakes?.trim() || null,
        difficulty: questionFormData.difficulty,
        estimated_time: questionFormData.estimated_time || '2 mins',
        company_tags: questionFormData.company_tags || [],
        technology_tags: questionFormData.technology_tags || [],
        tags: questionFormData.tags || [],
        status: questionFormData.status || 'Active',
        minimum_plan: questionFormData.minimum_plan || 'free',
        access_type: questionFormData.minimum_plan === 'free' ? 'Free' : 'Premium'
      };

      if (selectedQuestion) {
        let { error } = await supabase.from('interview_questions').update(payload).eq('id', selectedQuestion.id);
        if (error && (error.message?.includes('answer_type') || error.code === 'PGRST204')) {
          const { answer_type, ...safePayload } = payload;
          const retry = await supabase.from('interview_questions').update(safePayload).eq('id', selectedQuestion.id);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
      } else {
        let { error } = await supabase.from('interview_questions').insert(payload);
        if (error && (error.message?.includes('answer_type') || error.code === 'PGRST204')) {
          const { answer_type, ...safePayload } = payload;
          const retry = await supabase.from('interview_questions').insert(safePayload);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
      }

      setIsNormalModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert("Failed to save normal question: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMcqQuestion = async () => {
    const errors: Record<string, string> = {};
    if (!questionFormData.title?.trim()) errors.title = "Question Title / Prompt is required.";
    if (!questionFormData.category_id) errors.category_id = "Category is required.";
    if (!questionFormData.difficulty) errors.difficulty = "Difficulty is required.";

    const optA = questionFormData.option_a?.trim();
    const optB = questionFormData.option_b?.trim();
    const optC = questionFormData.option_c?.trim();
    const optD = questionFormData.option_d?.trim();

    if (!optA) errors.option_a = "Option A is required.";
    if (!optB) errors.option_b = "Option B is required.";
    if (!optC) errors.option_c = "Option C is required.";
    if (!optD) errors.option_d = "Option D is required.";
    if (!questionFormData.correct_option) errors.correct_option = "Correct Option (A, B, C, or D) is required.";
    if (!questionFormData.explanation?.trim()) errors.explanation = "Solution Explanation is required for MCQs.";

    if (optA && optB && optC && optD) {
      const optSet = new Set([optA, optB, optC, optD]);
      if (optSet.size < 4) {
        errors.option_a = "All 4 MCQ options must be distinct.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setQuestionFormErrors(errors);
      return;
    }

    setIsProcessing(true);
    try {
      const correctOpt = questionFormData.correct_option ? String(questionFormData.correct_option).toUpperCase().trim() : 'A';
      const correctIdx = correctOpt === 'A' ? 0 : correctOpt === 'B' ? 1 : correctOpt === 'C' ? 2 : correctOpt === 'D' ? 3 : 0;
      const optionsArr = [optA!, optB!, optC!, optD!];

      let modelAnswer = optA;
      if (correctOpt === 'B') modelAnswer = optB;
      else if (correctOpt === 'C') modelAnswer = optC;
      else if (correctOpt === 'D') modelAnswer = optD;

      const payload = {
        title: questionFormData.title?.trim(),
        category_id: questionFormData.category_id,
        question_type: 'mcq',
        answer_type: null,
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_option: correctOpt,
        correct_option_index: correctIdx,
        options: optionsArr,
        explanation: questionFormData.explanation?.trim() || null,
        answer: modelAnswer || 'MCQ',
        tips: questionFormData.tips?.trim() || null,
        common_mistakes: questionFormData.common_mistakes?.trim() || null,
        difficulty: questionFormData.difficulty,
        estimated_time: questionFormData.estimated_time || '2 mins',
        company_tags: questionFormData.company_tags || [],
        technology_tags: questionFormData.technology_tags || [],
        tags: questionFormData.tags || [],
        status: questionFormData.status || 'Active',
        minimum_plan: questionFormData.minimum_plan || 'free',
        access_type: questionFormData.minimum_plan === 'free' ? 'Free' : 'Premium'
      };

      if (selectedQuestion) {
        let { error } = await supabase.from('interview_questions').update(payload).eq('id', selectedQuestion.id);
        if (error && (error.message?.includes('answer_type') || error.code === 'PGRST204')) {
          const { answer_type, ...safePayload } = payload;
          const retry = await supabase.from('interview_questions').update(safePayload).eq('id', selectedQuestion.id);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
      } else {
        let { error } = await supabase.from('interview_questions').insert(payload);
        if (error && (error.message?.includes('answer_type') || error.code === 'PGRST204')) {
          const { answer_type, ...safePayload } = payload;
          const retry = await supabase.from('interview_questions').insert(safePayload);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
      }

      setIsMcqModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert("Failed to save MCQ: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('interview_questions').delete().eq('id', selectedQuestion.id);
      if (error) throw error;

      setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
      setSelectedQuestionIds(prev => prev.filter(id => id !== selectedQuestion.id));
      setIsDeleteModalOpen(false);
      setSelectedQuestion(null);
    } catch (err: any) {
      alert("Failed to delete question: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Selection & Deletion Helpers
  const isAllVisibleQuestionsSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestionIds.includes(q.id));

  const handleToggleSelectAllQuestions = () => {
    if (isAllVisibleQuestionsSelected) {
      const visibleIds = new Set(paginatedQuestions.map(q => q.id));
      setSelectedQuestionIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedQuestionIds, ...paginatedQuestions.map(q => q.id)]);
      setSelectedQuestionIds(Array.from(newIds));
    }
  };

  const handleToggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteQuestions = async () => {
    if (selectedQuestionIds.length === 0) return;
    setIsProcessing(true);
    setBulkDeleteErrorMsg(null);
    try {
      const { error } = await supabase
        .from('interview_questions')
        .delete()
        .in('id', selectedQuestionIds);

      if (error) throw error;

      const deletedCount = selectedQuestionIds.length;
      setQuestions(prev => prev.filter(q => !selectedQuestionIds.includes(q.id)));
      setSelectedQuestionIds([]);
      setIsBulkDeleteModalOpen(false);
      setBulkDeleteSuccessMsg(`✓ ${deletedCount} interview question${deletedCount > 1 ? 's' : ''} deleted successfully.`);
      setTimeout(() => setBulkDeleteSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      setBulkDeleteErrorMsg("Unable to delete the selected questions. No changes were made.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset bulk selection when page, filters, or tab changes
  useEffect(() => {
    setSelectedQuestionIds([]);
  }, [searchQuery, statusFilter, categoryFilter, diffFilter, planFilter, activeTab, questionSubTab, currentPage]);

  // ---------------- CATEGORIES TAB LOGIC ---------------- //
  const openAddCategory = () => {
    setCategoryFormData({ ...initialCategoryForm, order_index: categories.length + 1 });
    setSelectedCategory(null);
    setCategoryErrors({});
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setCategoryFormData({ ...cat, minimum_plan: normalizePlanId(cat.minimum_plan) });
    setSelectedCategory(cat);
    setCategoryErrors({});
    setIsCategoryModalOpen(true);
  };

  const handleToggleCategoryStatus = async (cat: Category) => {
    const newStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('interview_categories')
        .update({ status: newStatus, is_active: newStatus === 'Active' })
        .eq('id', cat.id);
      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: newStatus, is_active: newStatus === 'Active' } : c));
    } catch (err: any) {
      alert("Failed to toggle category status: " + (err.message || 'Error'));
    }
  };

  const handleSaveCategory = async () => {
    const errors: Record<string, string> = {};
    if (!categoryFormData.name?.trim()) errors.name = "Category Name is required.";

    if (Object.keys(errors).length > 0) {
      setCategoryErrors(errors);
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        name: categoryFormData.name?.trim(),
        description: categoryFormData.description || '',
        order_index: Number(categoryFormData.order_index) || 0,
        status: categoryFormData.status || 'Active',
        is_active: (categoryFormData.status || 'Active') === 'Active',
        icon: categoryFormData.icon || 'BookOpen',
        minimum_plan: categoryFormData.minimum_plan || 'free'
      };

      if (selectedCategory) {
        const { error } = await supabase.from('interview_categories').update(payload).eq('id', selectedCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('interview_categories').insert(payload);
        if (error) throw error;
      }

      setIsCategoryModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert("Failed to save category: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('interview_categories').delete().eq('id', selectedCategory.id);
      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== selectedCategory.id));
      setIsCategoryDeleteOpen(false);
      setSelectedCategory(null);
    } catch (err: any) {
      alert("Failed to delete category: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- TEST CONFIGURATIONS TAB LOGIC ---------------- //
  const calculatePoolCount = (catId?: string | null, diff?: string, mode?: string) => {
    let pool = questions.filter(q => q.status === 'Active');
    if (catId) {
      pool = pool.filter(q => q.category_id === catId);
    }
    if (diff && diff !== 'Mixed' && diff !== 'Adaptive') {
      pool = pool.filter(q => q.difficulty.toLowerCase() === diff.toLowerCase());
    }
    const testMode = mode || testFormData.mode || 'timed_test';
    if (testMode === 'timed_test' || testMode === 'ai_adaptive') {
      pool = pool.filter(q => q.question_type === 'mcq' || !!(q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option));
    }
    return pool.length;
  };

  const openAddTest = () => {
    const defaultCat = categories.length > 0 ? categories[0].id : '';
    setTestFormData({
      ...initialTestForm,
      category_id: defaultCat,
      question_count: 5,
      time_per_question: 60,
      minimum_plan: 'free',
      status: 'Active'
    });
    setSelectedTest(null);
    setTestFormErrors({});
    setAvailablePoolCount(calculatePoolCount(defaultCat, 'Medium', 'timed_test'));
    setIsTestModalOpen(true);
  };

  const openEditTest = (test: TestConfig) => {
    setTestFormData({
      ...test,
      minimum_plan: normalizePlanId(test.minimum_plan)
    });
    setSelectedTest(test);
    setTestFormErrors({});
    setAvailablePoolCount(calculatePoolCount(test.category_id, test.difficulty, test.mode));
    setIsTestModalOpen(true);
  };

  const handleDuplicateTest = async (test: TestConfig) => {
    try {
      const payload = {
        title: `${test.title} (Copy)`,
        description: test.description,
        category_id: test.category_id,
        mode: test.mode,
        difficulty: test.difficulty,
        question_count: test.question_count,
        time_per_question: test.time_per_question,
        minimum_plan: test.minimum_plan,
        is_recommended: false,
        status: 'Active'
      };

      const { error } = await supabase.from('interview_test_configs').insert(payload);
      if (error) throw error;

      await fetchAllData();
    } catch (err: any) {
      alert("Failed to duplicate test: " + (err.message || 'Error'));
    }
  };

  const handleToggleTestStatus = async (test: TestConfig) => {
    const newStatus = test.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('interview_test_configs')
        .update({ status: newStatus })
        .eq('id', test.id);
      if (error) throw error;

      setTestConfigs(prev => prev.map(t => t.id === test.id ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      alert("Failed to toggle test status: " + (err.message || 'Error'));
    }
  };

  const handleToggleRecommended = async (test: TestConfig) => {
    const newRec = !test.is_recommended;
    try {
      const { error } = await supabase
        .from('interview_test_configs')
        .update({ is_recommended: newRec })
        .eq('id', test.id);
      if (error) throw error;

      setTestConfigs(prev => prev.map(t => t.id === test.id ? { ...t, is_recommended: newRec } : t));
    } catch (err: any) {
      alert("Failed to toggle recommendation: " + (err.message || 'Error'));
    }
  };

  const handleSaveTest = async () => {
    const errors: Record<string, string> = {};
    if (!testFormData.title?.trim()) errors.title = "Test Title is required.";
    if (!testFormData.question_count || testFormData.question_count <= 0) errors.question_count = "Question count must be at least 1.";
    if (!testFormData.time_per_question || testFormData.time_per_question <= 0) errors.time_per_question = "Time per question is required.";

    const pool = calculatePoolCount(testFormData.category_id, testFormData.difficulty, testFormData.mode);
    const isMcqTest = testFormData.mode === 'timed_test' || testFormData.mode === 'ai_adaptive';

    if (pool === 0) {
      errors.pool = isMcqTest
        ? "There are 0 valid 4-option MCQs available in the question bank for this category and difficulty."
        : "There are 0 active questions available in the question bank for this category and difficulty.";
    } else if (testFormData.question_count && testFormData.question_count > pool) {
      errors.pool = isMcqTest
        ? `Only ${pool} valid MCQs are available in the question bank, but this test requires ${testFormData.question_count}. Please add more MCQs or reduce question count.`
        : `Only ${pool} active questions are available in the question bank, but this test is configured for ${testFormData.question_count}.`;
    }

    if (Object.keys(errors).length > 0) {
      setTestFormErrors(errors);
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        title: testFormData.title?.trim(),
        description: testFormData.description || '',
        category_id: testFormData.category_id || null,
        mode: testFormData.mode || 'timed_test',
        difficulty: testFormData.difficulty || 'Medium',
        question_count: Number(testFormData.question_count),
        time_per_question: Number(testFormData.time_per_question),
        minimum_plan: testFormData.minimum_plan || 'free',
        is_recommended: Boolean(testFormData.is_recommended),
        status: testFormData.status || 'Active'
      };

      if (selectedTest) {
        const { error } = await supabase.from('interview_test_configs').update(payload).eq('id', selectedTest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('interview_test_configs').insert(payload);
        if (error) throw error;
      }

      setIsTestModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert("Failed to save test configuration: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!selectedTest) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('interview_test_configs').delete().eq('id', selectedTest.id);
      if (error) throw error;

      setTestConfigs(prev => prev.filter(t => t.id !== selectedTest.id));
      setIsTestDeleteOpen(false);
      setSelectedTest(null);
    } catch (err: any) {
      alert("Failed to delete test: " + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPreview = (test: TestConfig) => {
    let pool = questions.filter(q => q.status === 'Active');
    if (test.category_id) pool = pool.filter(q => q.category_id === test.category_id);
    if (test.difficulty !== 'Mixed' && test.difficulty !== 'Adaptive') {
      pool = pool.filter(q => q.difficulty.toLowerCase() === test.difficulty.toLowerCase());
    }

    const selectedPool = pool.slice(0, test.question_count);
    setPreviewQuestions(selectedPool);
    setPreviewCurrentIndex(0);
    setSelectedTest(test);
    setIsPreviewModalOpen(true);
  };

  // ---------------- GLOBAL SETTINGS TAB LOGIC ---------------- //
  const handleSaveGlobalSettings = async () => {
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const payload = {
        practice_mode_enabled: prepSettings.practice_mode_enabled,
        timed_test_mode_enabled: prepSettings.timed_test_mode_enabled,
        ai_adaptive_mode_enabled: prepSettings.ai_adaptive_mode_enabled,
        practice_minimum_plan: prepSettings.practice_minimum_plan,
        timed_test_minimum_plan: prepSettings.timed_test_minimum_plan,
        ai_adaptive_minimum_plan: prepSettings.ai_adaptive_minimum_plan,
        allowed_question_counts: prepSettings.allowed_question_counts,
        allowed_time_limits: prepSettings.allowed_time_limits,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('interview_prep_settings')
        .upsert({ id: 'global', ...payload });

      if (error) throw error;

      setSettingsSuccessMsg("Global platform settings updated successfully.");
      setTimeout(() => setSettingsSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Failed to save settings: " + (err.message || 'Error'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ---------------- ANALYTICS CALCULATIONS ---------------- //
  const totalAttemptsCount = attempts.length;
  const avgScore = totalAttemptsCount > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + Number(curr.score_percentage || 0), 0) / totalAttemptsCount) 
    : 0;
  const passedAttempts = attempts.filter(a => Number(a.score_percentage) >= 70).length;
  const passRate = totalAttemptsCount > 0 ? Math.round((passedAttempts / totalAttemptsCount) * 100) : 0;
  const avgTimeSpent = totalAttemptsCount > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + Number(curr.time_spent_seconds || 0), 0) / totalAttemptsCount) 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-brand-200)] flex items-center gap-1">
                <Target className="w-3 h-3" /> Master Control
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Interview Preparation Management</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Control platform-wide question banks, topics, test configurations, timing, and subscription access.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/admin/interview-questions/import">
              <Button variant="outline" size="sm" className="text-xs shadow-xs">
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Bulk Import Questions
              </Button>
            </Link>

            {activeTab === 'questions' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={openAddNormalQuestionForm} className="text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Normal Question
                </Button>
                <Button variant="primary" size="sm" onClick={openAddMcqQuestionForm} className="text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add MCQ Question
                </Button>
              </div>
            )}

            {activeTab === 'categories' && (
              <Button variant="primary" size="sm" onClick={openAddCategory} className="text-xs shadow-xs">
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" /> Add Category
              </Button>
            )}

            {activeTab === 'tests' && (
              <Button variant="primary" size="sm" onClick={openAddTest} className="text-xs shadow-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Test Configuration
              </Button>
            )}
          </div>
        </div>

        {/* ── FIVE PRIMARY TABS ────────────────────────────────────────── */}
        <div className="border-b border-[var(--color-border)] flex items-center gap-2 overflow-x-auto pb-px">
          {[
            { id: 'questions', label: 'Questions Bank', icon: BookOpen, count: questions.length },
            { id: 'categories', label: 'Categories & Topics', icon: Layers, count: categories.length },
            { id: 'tests', label: 'Test Configurations', icon: Target, count: testConfigs.length },
            { id: 'settings', label: 'Modes & Settings', icon: Sliders },
            { id: 'analytics', label: 'Test Analytics', icon: BarChart3, count: attempts.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-[var(--color-brand-600)] text-[var(--color-brand-700)] bg-[var(--color-brand-50)]/40 rounded-t-[var(--radius-md)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-tertiary)]'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[var(--color-brand-200)] text-[var(--color-brand-800)]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* TAB 1: QUESTIONS BANK */}
        {/* ================================================================ */}
        {activeTab === 'questions' && (
          <div className="space-y-4">

            {/* Secondary Sub-tabs Toggle: Normal Questions vs MCQ Questions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-50/80 border border-[var(--color-border)] rounded-[var(--radius-xl)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setQuestionSubTab('normal'); setCurrentPage(1); setSelectedQuestionIds([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold transition-all ${
                    questionSubTab === 'normal'
                      ? 'bg-[var(--color-brand-600)] text-white shadow-xs'
                      : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span>📝 Normal Questions</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    questionSubTab === 'normal' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {normalQuestions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setQuestionSubTab('mcq'); setCurrentPage(1); setSelectedQuestionIds([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold transition-all ${
                    questionSubTab === 'mcq'
                      ? 'bg-[var(--color-brand-600)] text-white shadow-xs'
                      : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span>✅ MCQ Questions</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    questionSubTab === 'mcq' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {mcqQuestions.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {questionSubTab === 'normal' ? (
                  <Button variant="primary" size="sm" onClick={openAddNormalQuestionForm} className="text-xs shadow-xs w-full sm:w-auto">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Normal Question
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={openAddMcqQuestionForm} className="text-xs shadow-xs w-full sm:w-auto">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add MCQ Question
                  </Button>
                )}
              </div>
            </div>
            
            {/* Search & Filters */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={`Search ${questionSubTab === 'normal' ? 'normal written' : 'MCQ'} questions by title, category, or tags...`} 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <select 
                  value={categoryFilter} 
                  onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                  value={diffFilter} 
                  onChange={e => { setDiffFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <select 
                  value={statusFilter} 
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select 
                  value={planFilter} 
                  onChange={e => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium bg-white text-[var(--color-text-primary)] shadow-xs"
                >
                  <option value="">All Plan Tiers</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setCategoryFilter(''); setDiffFilter(''); setStatusFilter(''); setPlanFilter(''); setCurrentPage(1); }}
                  className="col-span-2 sm:col-span-1 text-xs justify-center"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              </div>
            </div>

            {/* Bulk Action Bar & Feedback Notifications */}
            {bulkDeleteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--radius-lg)] text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span>{bulkDeleteSuccessMsg}</span>
                <button onClick={() => setBulkDeleteSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
              </div>
            )}

            {selectedQuestionIds.length > 0 && (
              <div className="bg-indigo-50/90 border border-indigo-200 rounded-[var(--radius-xl)] p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                  <span className="flex h-5 w-5 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-[11px]">
                    {selectedQuestionIds.length}
                  </span>
                  <span>question{selectedQuestionIds.length > 1 ? 's' : ''} selected</span>
                  <button 
                    onClick={() => setSelectedQuestionIds([])}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 underline ml-2 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    disabled={isProcessing}
                    className="text-xs shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected ({selectedQuestionIds.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Questions Table */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-xs)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                  <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] font-bold text-[var(--color-text-primary)] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={isAllVisibleQuestionsSelected}
                          onChange={handleToggleSelectAllQuestions}
                          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                          title="Select all visible questions on this page"
                        />
                      </th>
                      <th className="py-3 px-4">Question Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Difficulty</th>
                      {questionSubTab === 'normal' ? (
                        <th className="py-3 px-4">Answer Type</th>
                      ) : (
                        <th className="py-3 px-4">Options & Key</th>
                      )}
                      <th className="py-3 px-4">Minimum Plan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {paginatedQuestions.map((q) => {
                      const isActive = q.status === 'Active';
                      const isMcq = q.question_type === 'mcq' || !!(q.option_a && q.option_b);
                      const reqPlan = q.minimum_plan || q.access_type || 'free';
                      const isSelected = selectedQuestionIds.includes(q.id);
                      const isLongAnswer = q.answer_type === 'long' || (q.answer && q.answer.length > 200);

                      return (
                        <tr key={q.id} className={`hover:bg-[var(--color-bg-subtle)] transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectQuestion(q.id)}
                              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <p className="font-bold text-[var(--color-text-primary)] line-clamp-1">{q.title}</p>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" /> {q.estimated_time || '2 mins'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                            {q.category?.name || 'General'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          {questionSubTab === 'normal' ? (
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isLongAnswer 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {isLongAnswer ? 'Long Answer' : 'Short Answer'}
                              </span>
                            </td>
                          ) : (
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> 4 Choices • Key: {q.correct_option || 'A'}
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <PremiumBadge minimumPlan={reqPlan} />
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedQuestion(q); setIsViewModalOpen(true); }}
                                className="p-1.5 rounded hover:bg-slate-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditQuestionForm(q)}
                                className="p-1.5 rounded hover:bg-slate-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                                title="Edit Question"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleQuestionStatus(q)}
                                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                                  isActive ? 'text-emerald-600 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'
                                }`}
                                title={isActive ? "Deactivate Question" : "Activate Question"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setSelectedQuestion(q); setIsDeleteModalOpen(true); }}
                                className="p-1.5 rounded hover:bg-red-50 text-[var(--color-text-tertiary)] hover:text-red-600 transition-colors"
                                title="Delete Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredQuestions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
                          No {questionSubTab === 'normal' ? 'normal' : 'MCQ'} questions match your current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-3 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-tertiary)]">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="py-0.5 px-2 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-bold text-[var(--color-text-primary)] px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="py-0.5 px-2 text-xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: CATEGORIES & TOPICS */}
        {/* ================================================================ */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const totalQ = questions.filter(q => q.category_id === cat.id).length;
                const activeQ = questions.filter(q => q.category_id === cat.id && q.status === 'Active').length;
                const isActive = (cat.status || 'Active') === 'Active';

                return (
                  <div 
                    key={cat.id} 
                    className={`p-5 rounded-[var(--radius-xl)] border bg-white shadow-[var(--shadow-xs)] flex flex-col justify-between space-y-4 transition-all ${
                      !isActive ? 'opacity-60 bg-slate-50' : 'hover:border-[var(--color-brand-300)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center font-bold">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{cat.name}</h3>
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">Order Index: {cat.order_index}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <PremiumBadge minimumPlan={cat.minimum_plan || 'free'} />
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {cat.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                        {cat.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                      <div className="space-x-1">
                        <span className="font-bold text-[var(--color-text-primary)]">{activeQ}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">/ {totalQ} Active Questions</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-1.5 rounded hover:bg-slate-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                          title="Edit Category"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleCategoryStatus(cat)}
                          className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                            isActive ? 'text-emerald-600 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={isActive ? "Deactivate Category" : "Activate Category"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedCategory(cat); setIsCategoryDeleteOpen(true); }}
                          className="p-1.5 rounded hover:bg-red-50 text-[var(--color-text-tertiary)] hover:text-red-600 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: TEST CONFIGURATIONS */}
        {/* ================================================================ */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testConfigs.map((test) => {
                const isActive = test.status === 'Active';
                const pool = calculatePoolCount(test.category_id, test.difficulty);
                const hasPoolIssue = pool < test.question_count;

                return (
                  <div 
                    key={test.id} 
                    className={`p-5 rounded-[var(--radius-xl)] border bg-white shadow-[var(--shadow-xs)] flex flex-col justify-between space-y-4 transition-all ${
                      !isActive ? 'opacity-60 bg-slate-50' : 'hover:border-[var(--color-brand-300)]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]">
                            {test.mode.replace('_', ' ')}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                            test.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            test.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            test.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {test.difficulty}
                          </span>
                          {test.is_recommended && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 fill-current" /> Recommended
                            </span>
                          )}
                        </div>

                        <PremiumBadge minimumPlan={test.minimum_plan} />
                      </div>

                      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">{test.title}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                        {test.description || 'Practice test driven by Admin configuration.'}
                      </p>
                    </div>

                    {/* Metadata & Pool Count Warning */}
                    <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {test.question_count} Questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {test.time_per_question}s / Q ({Math.round(test.time_per_question * test.question_count / 60)} mins)
                        </span>
                      </div>

                      {hasPoolIssue ? (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Only {pool} active questions in pool (Requires {test.question_count})</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Question pool healthy ({pool} available)
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenPreview(test)} 
                        className="text-[11px] py-1 px-2.5 shadow-xs"
                      >
                        <Play className="w-3 h-3 mr-1 text-[var(--color-brand-600)]" /> Preview Test
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleRecommended(test)}
                          className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                            test.is_recommended ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                          }`}
                          title={test.is_recommended ? "Remove Recommendation" : "Mark as Recommended"}
                        >
                          <Flame className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTest(test)}
                          className="p-1.5 rounded hover:bg-slate-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                          title="Duplicate Test"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditTest(test)}
                          className="p-1.5 rounded hover:bg-slate-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-600)] transition-colors"
                          title="Edit Test"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleTestStatus(test)}
                          className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                            isActive ? 'text-emerald-600 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={isActive ? "Deactivate Test" : "Activate Test"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedTest(test); setIsTestDeleteOpen(true); }}
                          className="p-1.5 rounded hover:bg-red-50 text-[var(--color-text-tertiary)] hover:text-red-600 transition-colors"
                          title="Delete Test"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {testConfigs.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-tertiary)] bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)]">
                  No test configurations created yet. Click "Create Test Configuration" above to get started.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: MODES & GLOBAL SETTINGS */}
        {/* ================================================================ */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            
            {settingsSuccessMsg && (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-[var(--radius-lg)] text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)] space-y-6">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Global Test Modes Configuration</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Control which test modes are active across the platform and their required subscription plan.
                </p>
              </div>

              {/* Mode 1: Practice Mode */}
              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Practice Question Bank</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">Self-paced question browsing with model answers and pro tips.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={prepSettings.practice_mode_enabled}
                      onChange={e => setPrepSettings(prev => ({ ...prev, practice_mode_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-brand-600)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Minimum Required Plan:</span>
                  <select
                    value={prepSettings.practice_minimum_plan}
                    onChange={e => setPrepSettings(prev => ({ ...prev, practice_minimum_plan: e.target.value }))}
                    className="border border-[var(--color-border)] rounded px-2.5 py-1 text-xs bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Mode 2: Timed Test Mode */}
              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[var(--radius-md)] bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Timed Assessment Tests</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">Real-time countdown assessments matching hiring sprint conditions.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={prepSettings.timed_test_mode_enabled}
                      onChange={e => setPrepSettings(prev => ({ ...prev, timed_test_mode_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-brand-600)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Minimum Required Plan:</span>
                  <select
                    value={prepSettings.timed_test_minimum_plan}
                    onChange={e => setPrepSettings(prev => ({ ...prev, timed_test_minimum_plan: e.target.value }))}
                    className="border border-[var(--color-border)] rounded px-2.5 py-1 text-xs bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Mode 3: AI Adaptive Mode */}
              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[var(--radius-md)] bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">AI Adaptive Mode</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">Dynamic difficulty scaling based on student answers & skill gap analysis.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={prepSettings.ai_adaptive_mode_enabled}
                      onChange={e => setPrepSettings(prev => ({ ...prev, ai_adaptive_mode_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-brand-600)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Minimum Required Plan:</span>
                  <select
                    value={prepSettings.ai_adaptive_minimum_plan}
                    onChange={e => setPrepSettings(prev => ({ ...prev, ai_adaptive_minimum_plan: e.target.value }))}
                    className="border border-[var(--color-border)] rounded px-2.5 py-1 text-xs bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveGlobalSettings}
                  disabled={isSavingSettings}
                  className="text-xs shadow-xs"
                >
                  {isSavingSettings ? 'Saving Settings...' : 'Save Global Settings'}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: ANALYTICS */}
        {/* ================================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)]">
                <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] block mb-1">Total Test Attempts</span>
                <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{totalAttemptsCount}</p>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Live Student Records</span>
              </div>

              <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)]">
                <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] block mb-1">Average Score</span>
                <p className="text-2xl font-extrabold text-[var(--color-brand-600)]">{avgScore}%</p>
                <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1 block">Across all active tests</span>
              </div>

              <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)]">
                <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] block mb-1">Pass Rate (&gt;= 70%)</span>
                <p className="text-2xl font-extrabold text-emerald-600">{passRate}%</p>
                <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1 block">{passedAttempts} successful completions</span>
              </div>

              <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)]">
                <span className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] block mb-1">Avg Time Per Test</span>
                <p className="text-2xl font-extrabold text-purple-600">{Math.round(avgTimeSpent / 60)}m {avgTimeSpent % 60}s</p>
                <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1 block">Real student test duration</span>
              </div>
            </div>

            {/* Attempts Breakdown Table */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-xs)]">
              <div className="p-4 border-b border-[var(--color-border)] font-bold text-sm text-[var(--color-text-primary)]">
                Recent Student Test Submissions
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                  <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] font-bold text-[var(--color-text-primary)] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Test Name</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Time Spent</th>
                      <th className="py-3 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">{att.title}</td>
                        <td className="py-3 px-4 capitalize">{att.mode.replace('_', ' ')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            att.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            att.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {att.difficulty}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${Number(att.score_percentage) >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {att.score_percentage}% ({att.correct_answers}/{att.total_questions})
                          </span>
                        </td>
                        <td className="py-3 px-4">{Math.round(att.time_spent_seconds / 60)}m {att.time_spent_seconds % 60}s</td>
                        <td className="py-3 px-4 text-right text-[11px] text-[var(--color-text-tertiary)]">
                          {new Date(att.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}

                    {attempts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
                          No student test attempts recorded yet. Attempts will automatically populate here as students complete tests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── NORMAL QUESTION CREATE/EDIT MODAL ───────────────────────── */}
      <Modal
        isOpen={isNormalModalOpen}
        onClose={() => setIsNormalModalOpen(false)}
        title={selectedQuestion ? "Edit Normal Interview Question" : "Add Normal Interview Question"}
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">
              Question Title / Prompt *
            </label>
            <textarea 
              rows={2}
              value={questionFormData.title || ''}
              onChange={e => setQuestionFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. What is database normalization and why is it important?"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
            />
            {questionFormErrors.title && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category *</label>
              <select
                value={questionFormData.category_id || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {questionFormErrors.category_id && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.category_id}</p>}
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Difficulty *</label>
              <select
                value={questionFormData.difficulty || 'Medium'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Answer Type *</label>
              <select
                value={questionFormData.answer_type || 'short'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, answer_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="short">Short Answer (1-3 sentences)</option>
                <option value="long">Long Answer (In-depth explanation)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Minimum Required Plan</label>
              <select
                value={questionFormData.minimum_plan || 'free'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, minimum_plan: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Visibility Status</label>
              <select
                value={questionFormData.status || 'Active'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="Active">Active (Published)</option>
                <option value="Inactive">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Ideal Model Answer *</label>
            <textarea
              rows={4}
              value={questionFormData.answer || ''}
              onChange={e => setQuestionFormData(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="Provide the comprehensive model answer for the student..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
            />
            {questionFormErrors.answer && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.answer}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Interview Pro Tips</label>
              <textarea
                rows={2}
                value={questionFormData.tips || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, tips: e.target.value }))}
                placeholder="Key advice on how to answer effectively."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Common Pitfalls to Avoid</label>
              <textarea
                rows={2}
                value={questionFormData.common_mistakes || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, common_mistakes: e.target.value }))}
                placeholder="Mistakes candidates often make."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsNormalModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNormalQuestion} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Normal Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MCQ QUESTION CREATE/EDIT MODAL ───────────────────────────── */}
      <Modal
        isOpen={isMcqModalOpen}
        onClose={() => setIsMcqModalOpen(false)}
        title={selectedQuestion ? "Edit MCQ Question" : "Add MCQ Question"}
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">
              MCQ Question Prompt / Problem Statement *
            </label>
            <textarea 
              rows={2}
              value={questionFormData.title || ''}
              onChange={e => setQuestionFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. What is the time complexity of Merge Sort in the worst case?"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none"
            />
            {questionFormErrors.title && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category *</label>
              <select
                value={questionFormData.category_id || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {questionFormErrors.category_id && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.category_id}</p>}
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Difficulty *</label>
              <select
                value={questionFormData.difficulty || 'Medium'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Minimum Plan</label>
              <select
                value={questionFormData.minimum_plan || 'free'}
                onChange={e => setQuestionFormData(prev => ({ ...prev, minimum_plan: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* MCQ 4 Options & Correct Answer Selector */}
          <div className="space-y-3 p-3.5 bg-slate-50 border border-[var(--color-border)] rounded-[var(--radius-lg)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--color-text-primary)]">
                Multiple Choice Options (4 Choices) *
              </span>
              <span className="text-[10px] text-[var(--color-text-tertiary)]">Select the correct choice [ A ] [ B ] [ C ] [ D ]</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A */}
              <div className={`p-2.5 rounded-[var(--radius-md)] border transition-all ${
                (questionFormData.correct_option || 'A') === 'A' ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-[var(--color-border)]'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[11px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono text-[10px]">A</span>
                    Option A
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="correct_opt_mcq"
                      checked={(questionFormData.correct_option || 'A') === 'A'}
                      onChange={() => setQuestionFormData(prev => ({ ...prev, correct_option: 'A' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  value={questionFormData.option_a || ''}
                  onChange={e => setQuestionFormData(prev => ({ ...prev, option_a: e.target.value }))}
                  placeholder="Enter Option A text..."
                  className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded text-xs bg-white outline-none"
                />
                {questionFormErrors.option_a && <p className="text-red-500 text-[10px] mt-0.5">{questionFormErrors.option_a}</p>}
              </div>

              {/* Option B */}
              <div className={`p-2.5 rounded-[var(--radius-md)] border transition-all ${
                questionFormData.correct_option === 'B' ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-[var(--color-border)]'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[11px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono text-[10px]">B</span>
                    Option B
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="correct_opt_mcq"
                      checked={questionFormData.correct_option === 'B'}
                      onChange={() => setQuestionFormData(prev => ({ ...prev, correct_option: 'B' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  value={questionFormData.option_b || ''}
                  onChange={e => setQuestionFormData(prev => ({ ...prev, option_b: e.target.value }))}
                  placeholder="Enter Option B text..."
                  className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded text-xs bg-white outline-none"
                />
                {questionFormErrors.option_b && <p className="text-red-500 text-[10px] mt-0.5">{questionFormErrors.option_b}</p>}
              </div>

              {/* Option C */}
              <div className={`p-2.5 rounded-[var(--radius-md)] border transition-all ${
                questionFormData.correct_option === 'C' ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-[var(--color-border)]'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[11px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono text-[10px]">C</span>
                    Option C
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="correct_opt_mcq"
                      checked={questionFormData.correct_option === 'C'}
                      onChange={() => setQuestionFormData(prev => ({ ...prev, correct_option: 'C' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  value={questionFormData.option_c || ''}
                  onChange={e => setQuestionFormData(prev => ({ ...prev, option_c: e.target.value }))}
                  placeholder="Enter Option C text..."
                  className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded text-xs bg-white outline-none"
                />
                {questionFormErrors.option_c && <p className="text-red-500 text-[10px] mt-0.5">{questionFormErrors.option_c}</p>}
              </div>

              {/* Option D */}
              <div className={`p-2.5 rounded-[var(--radius-md)] border transition-all ${
                questionFormData.correct_option === 'D' ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-[var(--color-border)]'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[11px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono text-[10px]">D</span>
                    Option D
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="correct_opt_mcq"
                      checked={questionFormData.correct_option === 'D'}
                      onChange={() => setQuestionFormData(prev => ({ ...prev, correct_option: 'D' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  value={questionFormData.option_d || ''}
                  onChange={e => setQuestionFormData(prev => ({ ...prev, option_d: e.target.value }))}
                  placeholder="Enter Option D text..."
                  className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded text-xs bg-white outline-none"
                />
                {questionFormErrors.option_d && <p className="text-red-500 text-[10px] mt-0.5">{questionFormErrors.option_d}</p>}
              </div>
            </div>

            {/* Explanation Field for MCQ */}
            <div className="pt-2">
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">
                Detailed Solution & Explanation *
              </label>
              <textarea
                rows={3}
                value={questionFormData.explanation || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Explain why this option is correct and provide technical context..."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white outline-none"
              />
              {questionFormErrors.explanation && <p className="text-red-500 text-[11px] mt-0.5">{questionFormErrors.explanation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Interview Pro Tips</label>
              <textarea
                rows={2}
                value={questionFormData.tips || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, tips: e.target.value }))}
                placeholder="Key advice on how to answer effectively."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Common Pitfalls to Avoid</label>
              <textarea
                rows={2}
                value={questionFormData.common_mistakes || ''}
                onChange={e => setQuestionFormData(prev => ({ ...prev, common_mistakes: e.target.value }))}
                placeholder="Mistakes candidates often make."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsMcqModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveMcqQuestion} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save MCQ Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── QUESTION VIEW MODAL ──────────────────────────────────────── */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Question Details"
        className="max-w-2xl"
      >
        {selectedQuestion && (
          <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                selectedQuestion.question_type === 'mcq' || selectedQuestion.option_a
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {selectedQuestion.question_type === 'mcq' || selectedQuestion.option_a ? 'MCQ (4 Choices)' : 'Normal Question'}
              </span>
              {selectedQuestion.question_type !== 'mcq' && !selectedQuestion.option_a && (
                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] border bg-blue-50 text-blue-700 border-blue-200">
                  {selectedQuestion.answer_type === 'long' || (selectedQuestion.answer && selectedQuestion.answer.length > 200) ? 'Long Answer' : 'Short Answer'}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                selectedQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                selectedQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                {selectedQuestion.difficulty}
              </span>
              <PremiumBadge minimumPlan={selectedQuestion.minimum_plan || selectedQuestion.access_type} />
              <span className="text-[10px] text-[var(--color-text-tertiary)]">Category: {selectedQuestion.category?.name}</span>
            </div>

            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{selectedQuestion.title}</h3>

            {/* If MCQ: Render 4 options with highlighted correct answer */}
            {(selectedQuestion.question_type === 'mcq' || selectedQuestion.option_a) ? (
              <div className="space-y-3">
                <span className="font-bold text-[11px] uppercase text-[var(--color-text-tertiary)] tracking-wider">
                  Options & Correct Answer
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'A', text: selectedQuestion.option_a },
                    { key: 'B', text: selectedQuestion.option_b },
                    { key: 'C', text: selectedQuestion.option_c },
                    { key: 'D', text: selectedQuestion.option_d }
                  ].map(opt => {
                    const isCorrect = (selectedQuestion.correct_option || '').toUpperCase() === opt.key;
                    return (
                      <div 
                        key={opt.key}
                        className={`p-3 rounded-[var(--radius-md)] border text-xs flex items-start gap-2.5 transition-all ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 shadow-xs' 
                            : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {opt.key}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{opt.text || 'N/A'}</p>
                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {(selectedQuestion.explanation || selectedQuestion.answer) && (
                  <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                    <h4 className="font-bold text-[var(--color-brand-700)] text-[11px] mb-1">Solution Explanation</h4>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {selectedQuestion.explanation || selectedQuestion.answer}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <h4 className="font-bold text-[var(--color-brand-700)] text-[11px] mb-1">Ideal Model Answer</h4>
                <p className="whitespace-pre-wrap leading-relaxed">{selectedQuestion.answer}</p>
              </div>
            )}

            {selectedQuestion.tips && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-[var(--radius-lg)] text-emerald-900">
                <h4 className="font-bold text-xs mb-1">💡 Pro Tips</h4>
                <p>{selectedQuestion.tips}</p>
              </div>
            )}

            {selectedQuestion.common_mistakes && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--radius-lg)] text-amber-900">
                <h4 className="font-bold text-xs mb-1">⚠️ Common Pitfalls</h4>
                <p>{selectedQuestion.common_mistakes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── QUESTION DELETE MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Question"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <p>Are you sure you want to permanently delete this interview question?</p>
          <p className="font-bold text-[var(--color-text-primary)]">{selectedQuestion?.title}</p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteQuestion} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── QUESTION BULK DELETE MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => !isProcessing && setIsBulkDeleteModalOpen(false)}
        title={`Delete ${selectedQuestionIds.length} Interview Question${selectedQuestionIds.length > 1 ? 's' : ''}?`}
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] bg-red-50/80 border border-red-200 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Permanent Bulk Deletion Warning</p>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                This action will permanently remove <strong>{selectedQuestionIds.length}</strong> selected interview question{selectedQuestionIds.length > 1 ? 's' : ''} from the database. This action cannot be undone.
              </p>
            </div>
          </div>

          {bulkDeleteErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {bulkDeleteErrorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsBulkDeleteModalOpen(false)} 
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={handleBulkDeleteQuestions} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : `Delete ${selectedQuestionIds.length} Question${selectedQuestionIds.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CATEGORY CREATE/EDIT MODAL ───────────────────────────────── */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={selectedCategory ? "Edit Category" : "Add Category"}
        className="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category Name *</label>
            <input 
              type="text" 
              value={categoryFormData.name || ''}
              onChange={e => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. React & Frontend"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
            />
            {categoryErrors.name && <p className="text-red-500 text-[11px] mt-0.5">{categoryErrors.name}</p>}
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Description</label>
            <textarea
              rows={2}
              value={categoryFormData.description || ''}
              onChange={e => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief overview of questions in this topic."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Minimum Plan</label>
              <select
                value={categoryFormData.minimum_plan || 'free'}
                onChange={e => setCategoryFormData(prev => ({ ...prev, minimum_plan: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Status</label>
              <select
                value={categoryFormData.status || 'Active'}
                onChange={e => setCategoryFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCategory} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CATEGORY DELETE MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isCategoryDeleteOpen}
        onClose={() => setIsCategoryDeleteOpen(false)}
        title="Delete Category"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <p>Are you sure you want to delete category <strong>{selectedCategory?.name}</strong>?</p>
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-[11px]">
            Warning: Questions linked to this category may be affected.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryDeleteOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteCategory} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── TEST CONFIG CREATE/EDIT MODAL ────────────────────────────── */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={selectedTest ? "Edit Test Configuration" : "Create Test Configuration"}
        className="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Test Title *</label>
            <input 
              type="text" 
              value={testFormData.title || ''}
              onChange={e => setTestFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Python Fundamentals Assessment"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
            />
            {testFormErrors.title && <p className="text-red-500 text-[11px] mt-0.5">{testFormErrors.title}</p>}
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Description</label>
            <textarea
              rows={2}
              value={testFormData.description || ''}
              onChange={e => setTestFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Overview displayed to students before starting."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Category / Topic</label>
              <select
                value={testFormData.category_id || ''}
                onChange={e => {
                  const val = e.target.value;
                  setTestFormData(prev => ({ ...prev, category_id: val }));
                  setAvailablePoolCount(calculatePoolCount(val, testFormData.difficulty));
                }}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="">All Categories (Mixed)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Mode</label>
              <select
                value={testFormData.mode || 'timed_test'}
                onChange={e => setTestFormData(prev => ({ ...prev, mode: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="timed_test">Timed Test</option>
                <option value="practice">Practice Mode</option>
                <option value="ai_adaptive">AI Adaptive</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Difficulty</label>
              <select
                value={testFormData.difficulty || 'Medium'}
                onChange={e => {
                  const val = e.target.value as any;
                  setTestFormData(prev => ({ ...prev, difficulty: val }));
                  setAvailablePoolCount(calculatePoolCount(testFormData.category_id, val));
                }}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
                <option value="Adaptive">Adaptive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Question Count *</label>
              <select
                value={testFormData.question_count || 10}
                onChange={e => setTestFormData(prev => ({ ...prev, question_count: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                {(prepSettings.allowed_question_counts || [10, 20, 30, 40, 50]).map(num => (
                  <option key={num} value={num}>{num} Questions</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Time Per Question *</label>
              <select
                value={testFormData.time_per_question || 60}
                onChange={e => setTestFormData(prev => ({ ...prev, time_per_question: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                {(prepSettings.allowed_time_limits || [30, 45, 60, 90, 120]).map(sec => (
                  <option key={sec} value={sec}>{sec} Seconds</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Minimum Plan</label>
              <select
                value={testFormData.minimum_plan || 'free'}
                onChange={e => setTestFormData(prev => ({ ...prev, minimum_plan: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs bg-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* Validation & Health Bar */}
          <div className="p-3 bg-slate-50 border border-[var(--color-border)] rounded-[var(--radius-lg)] space-y-1">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="text-[var(--color-text-secondary)]">Available Active Question Pool:</span>
              <span className={availablePoolCount && testFormData.question_count && availablePoolCount >= testFormData.question_count ? 'text-emerald-700' : 'text-amber-700'}>
                {availablePoolCount ?? 0} Questions Available
              </span>
            </div>
            {testFormErrors.pool && (
              <p className="text-amber-700 text-[11px] font-semibold flex items-center gap-1 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {testFormErrors.pool}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={testFormData.is_recommended || false}
                onChange={e => setTestFormData(prev => ({ ...prev, is_recommended: e.target.checked }))}
                className="rounded border-[var(--color-border)]"
              />
              <span className="font-bold text-[var(--color-text-primary)] text-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" /> Mark as Recommended for Students
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveTest} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── TEST PREVIEW MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Admin Test Preview: ${selectedTest?.title || 'Assessment'}`}
        className="max-w-2xl"
      >
        {selectedTest && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--color-brand-700)] uppercase">
                  {selectedTest.mode.replace('_', ' ')} • {selectedTest.difficulty} Difficulty
                </span>
                <h3 className="font-bold text-sm text-[var(--color-text-primary)]">{selectedTest.title}</h3>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] px-2.5 py-1 rounded border border-[var(--color-brand-200)]">
                  ⏱️ {selectedTest.time_per_question}s / Question
                </span>
              </div>
            </div>

            {previewQuestions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] font-bold">
                  <span>Question {previewCurrentIndex + 1} of {previewQuestions.length}</span>
                  <PremiumBadge minimumPlan={previewQuestions[previewCurrentIndex].minimum_plan || 'free'} />
                </div>

                <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white space-y-3">
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {previewQuestions[previewCurrentIndex].title}
                  </h4>
                  
                  <div className="bg-[var(--color-bg-subtle)] p-3 rounded text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    <strong className="text-[var(--color-brand-700)] block mb-1">Expected Solution Structure:</strong>
                    {previewQuestions[previewCurrentIndex].answer}
                  </div>

                  {previewQuestions[previewCurrentIndex].tips && (
                    <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded">
                      💡 <strong>Pro Tip:</strong> {previewQuestions[previewCurrentIndex].tips}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewCurrentIndex === 0}
                    onClick={() => setPreviewCurrentIndex(p => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewCurrentIndex === previewQuestions.length - 1}
                    onClick={() => setPreviewCurrentIndex(p => Math.min(previewQuestions.length - 1, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-amber-700 bg-amber-50 rounded border border-amber-200">
                ⚠️ No active questions in the question bank match this test's category & difficulty.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── TEST DELETE MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={isTestDeleteOpen}
        onClose={() => setIsTestDeleteOpen(false)}
        title="Delete Test Configuration"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs text-[var(--color-text-secondary)]">
          <p>Are you sure you want to permanently delete this test configuration?</p>
          <p className="font-bold text-[var(--color-text-primary)]">{selectedTest?.title}</p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsTestDeleteOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteTest} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete Test'}
            </Button>
          </div>
        </div>
      </Modal>

    </AdminLayout>
  );
}
